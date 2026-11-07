"""In-memory training sessions. One API process is the store."""

from __future__ import annotations

import threading
import uuid
from pathlib import Path
from typing import Any

from app.cases import ROOT, get_script
from app.machine import ChoiceError, SessionClosed, start_session, submit_choice, teaching_mark

_LOCK = threading.Lock()
_SESSIONS: dict[str, dict[str, Any]] = {}


def reset_sessions() -> None:
    with _LOCK:
        _SESSIONS.clear()


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
            }
        )
    return rows


def view_session(state: dict[str, Any]) -> dict[str, Any]:
    script = get_script(state["case_id"])
    if script is None:
        raise KeyError(state["case_id"])
    disposition = state["twin"].get("disposition")
    mark = teaching_mark(script, disposition if state["status"] == "closed" else None)
    risk = state["twin"].get("risk") or {}
    return {
        "session_id": state["session_id"],
        "case_id": state["case_id"],
        "title": state["title"],
        "status": state["status"],
        "node": _public_node(script, state["node_id"]),
        "passed_scenes": [_public_node(script, node_id) for node_id in state["passed_scenes"]],
        "twin": state["twin"],
        "events": state["events"],
        "rules": _rules(script),
        "teaching": mark,
        "created_at": state["created_at"],
        "updated_at": state["updated_at"],
        "risk": {
            "score": risk.get("score"),
            "flags": list(risk.get("flags") or []),
        },
    }


def summary(state: dict[str, Any]) -> dict[str, Any]:
    full = view_session(state)
    return {
        "session_id": state["session_id"],
        "case_id": state["case_id"],
        "title": state["title"],
        "status": state["status"],
        "disposition": full["teaching"]["disposition"],
        "bucket": full["teaching"]["bucket"],
        "poor_path": full["teaching"]["poor_path"],
        "incomplete": full["teaching"]["incomplete"],
        "rule_follow": full["teaching"]["rule_follow"],
        "phase": state["twin"].get("phase"),
        "score": full["risk"]["score"],
        "flags": full["risk"]["flags"],
        "event_count": len(state["events"]),
        "updated_at": state["updated_at"],
    }


def evidence(state: dict[str, Any]) -> dict[str, Any]:
    """Short audit card: what was mirrored, and which events prove the run."""

    full = view_session(state)
    types = [event["type"] for event in state["events"]]
    return {
        "session_id": state["session_id"],
        "case_id": state["case_id"],
        "title": state["title"],
        "status": state["status"],
        "mirrored": "initial_twin_state cloned at session start, then twin_patch and choice effects",
        "disposition": full["teaching"]["disposition"],
        "bucket": full["teaching"]["bucket"],
        "poor_path": full["teaching"]["poor_path"],
        "rule_follow": full["teaching"]["rule_follow"],
        "flags": full["risk"]["flags"],
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
    state["session_id"] = uuid.uuid4().hex[:12]
    with _LOCK:
        _SESSIONS[state["session_id"]] = state
    return view_session(state)


def fetch(session_id: str) -> dict[str, Any] | None:
    with _LOCK:
        state = _SESSIONS.get(session_id)
    if state is None:
        return None
    return view_session(state)


def fetch_state(session_id: str) -> dict[str, Any] | None:
    with _LOCK:
        return _SESSIONS.get(session_id)


def list_sessions() -> list[dict[str, Any]]:
    with _LOCK:
        states = list(_SESSIONS.values())
    states.sort(key=lambda item: item["updated_at"], reverse=True)
    return [summary(state) for state in states]


def decide(session_id: str, choice_id: str) -> dict[str, Any]:
    with _LOCK:
        state = _SESSIONS.get(session_id)
        if state is None:
            raise KeyError(session_id)
        script = get_script(state["case_id"])
        if script is None:
            raise KeyError(state["case_id"])
        try:
            submit_choice(state, script, choice_id)
        except ChoiceError:
            raise
        except SessionClosed:
            raise
    return view_session(state)
