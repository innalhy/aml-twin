"""Training sessions on one SQLite file.

The file is the store, so a restart keeps runs and workers on this machine
share them. Each request loads its own copy of a row. Closed runs older than
the TTL are deleted. The file also keeps at most `_CAP` sessions: oldest
closed rows go first, then the oldest open rows.
"""

from __future__ import annotations

import json
import os
import sqlite3
import uuid
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Any

from app.cases import ROOT, get_script
from app.machine import ChoiceError, SessionClosed, start_session, submit_choice, teaching_mark

_DEFAULT_CAP = 2000
_DEFAULT_TTL_SECONDS = 7 * 24 * 60 * 60

def _path_from_env() -> Path:
    raw = os.environ.get("TWINAML_SESSIONS_DB")
    if not raw:
        return ROOT / "data" / "local" / "sessions.sqlite"
    path = Path(raw)
    if not path.is_absolute():
        return ROOT / path
    return path


_PATH = _path_from_env()
_CAP = _DEFAULT_CAP
_TTL_SECONDS = _DEFAULT_TTL_SECONDS


def _apply_env_limits() -> None:
    global _CAP, _TTL_SECONDS
    raw_cap = os.environ.get("TWINAML_SESSION_CAP")
    if raw_cap:
        _CAP = max(1, int(raw_cap))
    raw_ttl = os.environ.get("TWINAML_SESSION_TTL_HOURS")
    if raw_ttl:
        _TTL_SECONDS = max(0, int(raw_ttl) * 60 * 60)


_apply_env_limits()


def use_store(path: Path, *, cap: int = _DEFAULT_CAP, ttl_seconds: int = _DEFAULT_TTL_SECONDS) -> None:
    """Point this process at a session file. Tests use this so they do not touch the VPS file."""

    global _PATH, _CAP, _TTL_SECONDS
    _PATH = path
    _CAP = max(1, cap)
    _TTL_SECONDS = max(0, ttl_seconds)
    path.parent.mkdir(parents=True, exist_ok=True)
    conn = _connect()
    conn.close()


def store_path() -> Path:
    return _PATH


def _connect() -> sqlite3.Connection:
    _PATH.parent.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(_PATH, timeout=5, isolation_level=None)
    try:
        conn.execute("PRAGMA journal_mode=WAL")
        conn.execute("PRAGMA busy_timeout=5000")
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS sessions (
                session_id TEXT PRIMARY KEY,
                case_id TEXT NOT NULL,
                status TEXT NOT NULL,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL,
                body TEXT NOT NULL
            )
            """
        )
        conn.execute("CREATE INDEX IF NOT EXISTS sessions_by_updated ON sessions (updated_at)")
    except Exception:
        conn.close()
        raise
    return conn


def _transaction(fn, *, write: bool):
    conn = _connect()
    try:
        conn.execute("BEGIN IMMEDIATE" if write else "BEGIN")
        result = fn(conn)
        conn.execute("COMMIT")
        return result
    except Exception:
        try:
            conn.execute("ROLLBACK")
        except sqlite3.Error:
            pass
        raise
    finally:
        conn.close()


def _cutoff() -> str:
    moment = datetime.now(timezone.utc) - timedelta(seconds=_TTL_SECONDS)
    return moment.replace(microsecond=0).isoformat().replace("+00:00", "Z")


def _evict(conn: sqlite3.Connection) -> None:
    conn.execute(
        "DELETE FROM sessions WHERE status = 'closed' AND updated_at < ?",
        (_cutoff(),),
    )
    count = int(conn.execute("SELECT COUNT(*) FROM sessions").fetchone()[0])
    extra = count - _CAP
    if extra <= 0:
        return
    closed = conn.execute(
        """
        SELECT session_id FROM sessions
        WHERE status = 'closed'
        ORDER BY updated_at ASC, rowid ASC
        LIMIT ?
        """,
        (extra,),
    ).fetchall()
    for (session_id,) in closed:
        conn.execute("DELETE FROM sessions WHERE session_id = ?", (session_id,))
    extra -= len(closed)
    if extra <= 0:
        return
    oldest = conn.execute(
        """
        SELECT session_id FROM sessions
        ORDER BY updated_at ASC, rowid ASC
        LIMIT ?
        """,
        (extra,),
    ).fetchall()
    for (session_id,) in oldest:
        conn.execute("DELETE FROM sessions WHERE session_id = ?", (session_id,))


def _save(conn: sqlite3.Connection, state: dict[str, Any]) -> None:
    conn.execute(
        """
        INSERT INTO sessions (session_id, case_id, status, created_at, updated_at, body)
        VALUES (?, ?, ?, ?, ?, ?)
        ON CONFLICT(session_id) DO UPDATE SET
            status = excluded.status,
            updated_at = excluded.updated_at,
            body = excluded.body
        """,
        (
            state["session_id"],
            state["case_id"],
            state["status"],
            state["created_at"],
            state["updated_at"],
            json.dumps(state, ensure_ascii=False),
        ),
    )


def _insert_new(conn: sqlite3.Connection, state: dict[str, Any]) -> None:
    conn.execute(
        """
        INSERT INTO sessions (session_id, case_id, status, created_at, updated_at, body)
        VALUES (?, ?, ?, ?, ?, ?)
        """,
        (
            state["session_id"],
            state["case_id"],
            state["status"],
            state["created_at"],
            state["updated_at"],
            json.dumps(state, ensure_ascii=False),
        ),
    )


def _load(conn: sqlite3.Connection, session_id: str) -> dict[str, Any] | None:
    row = conn.execute("SELECT body FROM sessions WHERE session_id = ?", (session_id,)).fetchone()
    if row is None:
        return None
    return json.loads(row[0])


def reset_sessions() -> None:
    def work(conn: sqlite3.Connection) -> None:
        conn.execute("DELETE FROM sessions")

    _transaction(work, write=True)


def _public_node(script: dict[str, Any], node_id: str) -> dict[str, Any]:
    node = next(item for item in script["nodes"] if item["id"] == node_id)
    view: dict[str, Any] = {
        "id": node["id"],
        "type": node["type"],
        "title": node["title"],
        "prompt": node.get("prompt", ""),
    }
    if node.get("terminal"):
        view["terminal"] = True
    media = _media(node.get("media_ref"))
    if media is not None:
        view.update(media)
    if node["type"] == "decision":
        view["choices"] = [
            {
                "id": choice["id"],
                "label": choice["label"],
                "rationale": choice.get("rationale", ""),
            }
            for choice in node.get("choices") or []
        ]
    return view


def _media(ref: str | None) -> dict[str, Any] | None:
    if not ref:
        return None
    if ref.startswith("/") or ".." in Path(ref).parts:
        return {"media_ref": ref, "media_missing": True}
    path = (ROOT / ref).resolve()
    try:
        path.relative_to(ROOT.resolve())
    except ValueError:
        return {"media_ref": ref, "media_missing": True}
    return {"media_ref": ref, "media_missing": not path.is_file()}


def _rules(script: dict[str, Any]) -> list[dict[str, Any]]:
    rows = []
    for rule in script.get("rules") or []:
        rows.append(
            {
                "id": rule["id"],
                "when": rule["when"],
                "then": rule["then"],
                "note": rule.get("note", ""),
                "flags": list(rule.get("flags") or []),
            }
        )
    return rows


def _script(state: dict[str, Any]) -> dict[str, Any]:
    script = get_script(state["case_id"])
    if script is None:
        raise KeyError(state["case_id"])
    return script


def _mark(state: dict[str, Any]) -> dict[str, Any]:
    disposition = state["twin"].get("disposition")
    return teaching_mark(_script(state), disposition if state["status"] == "closed" else None)


def _risk(state: dict[str, Any]) -> dict[str, Any]:
    risk = state["twin"].get("risk") or {}
    return {
        "score": risk.get("score"),
        "flags": list(risk.get("flags") or []),
    }


def view_session(state: dict[str, Any]) -> dict[str, Any]:
    script = _script(state)
    risk = _risk(state)
    return {
        "session_id": state["session_id"],
        "case_id": state["case_id"],
        "title": state["title"],
        "status": state["status"],
        "node": _public_node(script, state["node_id"]),
        "passed_scenes": [_public_node(script, node_id) for node_id in state["passed_scenes"]],
        "twin": json.loads(json.dumps(state["twin"])),
        "events": json.loads(json.dumps(state["events"])),
        "rules": _rules(script),
        "teaching": _mark(state),
        "created_at": state["created_at"],
        "updated_at": state["updated_at"],
        "risk": risk,
    }


def summary(state: dict[str, Any]) -> dict[str, Any]:
    mark = _mark(state)
    risk = _risk(state)
    return {
        "session_id": state["session_id"],
        "case_id": state["case_id"],
        "title": state["title"],
        "status": state["status"],
        "disposition": mark["disposition"],
        "bucket": mark["bucket"],
        "poor_path": mark["poor_path"],
        "incomplete": mark["incomplete"],
        "rule_follow": mark["rule_follow"],
        "phase": state["twin"].get("phase"),
        "score": risk["score"],
        "flags": risk["flags"],
        "event_count": len(state["events"]),
        "updated_at": state["updated_at"],
    }


def evidence(state: dict[str, Any]) -> dict[str, Any]:
    """Short audit card: what was mirrored, and which events prove the run."""

    mark = _mark(state)
    risk = _risk(state)
    types = [event["type"] for event in state["events"]]
    return {
        "session_id": state["session_id"],
        "case_id": state["case_id"],
        "title": state["title"],
        "status": state["status"],
        "mirrored": "initial_twin_state cloned at session start, then twin_patch and choice effects",
        "disposition": mark["disposition"],
        "bucket": mark["bucket"],
        "poor_path": mark["poor_path"],
        "rule_follow": mark["rule_follow"],
        "flags": risk["flags"],
        "event_types": types,
        "event_count": len(types),
        "override_count": sum(1 for event in state["events"] if event["type"] == "override"),
        "customer_id": (state["twin"].get("customer") or {}).get("id"),
    }


def open_session(case_id: str) -> dict[str, Any]:
    script = get_script(case_id)
    if script is None:
        raise KeyError(case_id)
    state = start_session(script)
    saved: dict[str, Any] | None = None
    for _ in range(5):
        state["session_id"] = uuid.uuid4().hex[:12]

        def work(conn: sqlite3.Connection, state: dict[str, Any] = state) -> None:
            _insert_new(conn, state)
            _evict(conn)

        try:
            _transaction(work, write=True)
        except sqlite3.IntegrityError:
            continue
        saved = state
        break
    if saved is None:
        raise RuntimeError("could not allocate a session id")
    return view_session(saved)


def fetch(session_id: str) -> dict[str, Any] | None:
    def work(conn: sqlite3.Connection) -> dict[str, Any] | None:
        _evict(conn)
        return _load(conn, session_id)

    state = _transaction(work, write=True)
    if state is None:
        return None
    return view_session(state)


def fetch_state(session_id: str) -> dict[str, Any] | None:
    def work(conn: sqlite3.Connection) -> dict[str, Any] | None:
        _evict(conn)
        return _load(conn, session_id)

    return _transaction(work, write=True)


def list_sessions() -> list[dict[str, Any]]:
    def work(conn: sqlite3.Connection) -> list[str]:
        _evict(conn)
        rows = conn.execute(
            "SELECT body FROM sessions ORDER BY updated_at DESC, rowid DESC"
        ).fetchall()
        return [row[0] for row in rows]

    blobs = _transaction(work, write=True)
    return [summary(json.loads(blob)) for blob in blobs]


def decide(session_id: str, choice_id: str) -> dict[str, Any]:
    def work(conn: sqlite3.Connection) -> dict[str, Any]:
        _evict(conn)
        state = _load(conn, session_id)
        if state is None:
            raise KeyError(session_id)
        script = get_script(state["case_id"])
        if script is None:
            raise KeyError(state["case_id"])
        submit_choice(state, script, choice_id)
        _save(conn, state)
        _evict(conn)
        return state

    state = _transaction(work, write=True)
    return view_session(state)
