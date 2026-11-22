"""Session routes on the demo API."""

from __future__ import annotations

import json
import sqlite3
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

from fastapi.testclient import TestClient

from app.cases import ROOT
from app.effects import ScriptError
from app.main import app
from app.sessions import (
    _media,
    _path_from_env,
    decide,
    fetch_state,
    open_session,
    reset_sessions,
    store_path,
    use_store,
)


class ApiTest(unittest.TestCase):
    def setUp(self) -> None:
        self._tmp = tempfile.TemporaryDirectory()
        use_store(Path(self._tmp.name) / "sessions.sqlite")
        reset_sessions()
        self.client = TestClient(app)

    def tearDown(self) -> None:
        self._tmp.cleanup()

    def _stamp(self, session_id: str, updated_at: str) -> None:
        conn = sqlite3.connect(store_path())
        try:
            conn.execute(
                "UPDATE sessions SET updated_at = ? WHERE session_id = ?",
                (updated_at, session_id),
            )
            conn.commit()
        finally:
            conn.close()

    def _stored(self, session_id: str):
        conn = sqlite3.connect(store_path())
        try:
            return conn.execute(
                """
                SELECT case_id, status, created_at, updated_at, body
                FROM sessions WHERE session_id = ?
                """,
                (session_id,),
            ).fetchone()
        finally:
            conn.close()

    def test_health_stays(self) -> None:
        response = self.client.get("/health")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json(), {"status": "ok", "service": "twinaml-api"})

    def test_case_list_includes_the_library(self) -> None:
        body = self.client.get("/cases").json()
        ids = [row["case_id"] for row in body["cases"]]
        self.assertIn("deepfake-hk-001", ids)
        self.assertIn("hk-hkma-cdd-001", ids)
        self.assertGreaterEqual(len(ids), 11)

    def test_case_and_session_publish_rule_flags(self) -> None:
        detail = self.client.get("/cases/deepfake-hk-001")
        self.assertEqual(detail.status_code, 200, detail.text)
        rule = next(item for item in detail.json()["rules"] if item["id"] == "R1_LIVENESS_TWICE")
        self.assertEqual(rule["flags"], ["R1_BLOCK", "R1_OVERRIDDEN"])
        rule["flags"].append("INJECTED")

        again = self.client.get("/cases/deepfake-hk-001").json()
        rule_again = next(item for item in again["rules"] if item["id"] == "R1_LIVENESS_TWICE")
        self.assertEqual(rule_again["flags"], ["R1_BLOCK", "R1_OVERRIDDEN"])

        opened = self.client.post("/sessions", json={"case_id": "deepfake-hk-001"})
        self.assertEqual(opened.status_code, 201, opened.text)
        session_rule = next(item for item in opened.json()["rules"] if item["id"] == "R1_LIVENESS_TWICE")
        self.assertEqual(session_rule["flags"], ["R1_BLOCK", "R1_OVERRIDDEN"])

    def test_deepfake_reject_path_and_dashboard_read_the_same_session(self) -> None:
        opened = self.client.post("/sessions", json={"case_id": "deepfake-hk-001"})
        self.assertEqual(opened.status_code, 201, opened.text)
        session = opened.json()
        self.assertEqual(session["node"]["type"], "decision")
        self.assertTrue(any(scene.get("media_missing") for scene in session["passed_scenes"]))

        closed = self.client.post(
            f"/sessions/{session['session_id']}/decisions",
            json={"choice_id": "reject_onboarding"},
        )
        self.assertEqual(closed.status_code, 200, closed.text)
        body = closed.json()
        self.assertEqual(body["status"], "closed")
        self.assertEqual(body["twin"]["disposition"], "onboarding_rejected")
        self.assertTrue(body["teaching"]["rule_follow"])
        self.assertFalse(body["teaching"]["poor_path"])
        types = [event["type"] for event in body["events"]]
        self.assertEqual(types[0], "session_started")
        self.assertEqual(types[-1], "session_closed")

        listed = self.client.get("/sessions").json()["sessions"]
        self.assertEqual(listed[0]["session_id"], session["session_id"])
        self.assertEqual(listed[0]["disposition"], "onboarding_rejected")
        self.assertEqual(listed[0]["rule_follow"], True)

        again = self.client.get(f"/sessions/{session['session_id']}")
        self.assertEqual(again.json()["events"], body["events"])

        evidence = self.client.get(f"/sessions/{session['session_id']}/evidence")
        self.assertEqual(evidence.status_code, 200)
        self.assertEqual(evidence.json()["customer_id"], "SYN-HK-001")
        self.assertIn("session_closed", evidence.json()["event_types"])

        blocked = self.client.post(
            f"/sessions/{session['session_id']}/decisions",
            json={"choice_id": "reject_onboarding"},
        )
        self.assertEqual(blocked.status_code, 409)

    def test_unknown_choice_and_unknown_case(self) -> None:
        missing = self.client.post("/sessions", json={"case_id": "no-such-case"})
        self.assertEqual(missing.status_code, 404)
        opened = self.client.post("/sessions", json={"case_id": "deepfake-hk-001"}).json()
        bad = self.client.post(
            f"/sessions/{opened['session_id']}/decisions",
            json={"choice_id": "not-a-choice"},
        )
        self.assertEqual(bad.status_code, 400)

    def test_rejected_choice_does_not_rewrite_the_row(self) -> None:
        opened = self.client.post("/sessions", json={"case_id": "deepfake-hk-001"}).json()
        before = self._stored(opened["session_id"])
        bad = self.client.post(
            f"/sessions/{opened['session_id']}/decisions",
            json={"choice_id": "not-a-choice"},
        )
        self.assertEqual(bad.status_code, 400)
        self.assertEqual(self._stored(opened["session_id"]), before)

    def test_closed_session_decision_leaves_the_row(self) -> None:
        opened = self.client.post("/sessions", json={"case_id": "deepfake-hk-001"}).json()
        closed = self.client.post(
            f"/sessions/{opened['session_id']}/decisions",
            json={"choice_id": "reject_onboarding"},
        )
        self.assertEqual(closed.status_code, 200, closed.text)
        before = self._stored(opened["session_id"])
        blocked = self.client.post(
            f"/sessions/{opened['session_id']}/decisions",
            json={"choice_id": "reject_onboarding"},
        )
        self.assertEqual(blocked.status_code, 409)
        self.assertIn("already closed", blocked.json()["detail"])
        self.assertEqual(self._stored(opened["session_id"]), before)

    def test_session_id_collision_retries_then_stops(self) -> None:
        taken = "a" * 12
        conn = sqlite3.connect(store_path())
        try:
            conn.execute(
                """
                INSERT INTO sessions (session_id, case_id, status, created_at, updated_at, body)
                VALUES (?, ?, ?, ?, ?, ?)
                """,
                (
                    taken,
                    "deepfake-hk-001",
                    "open",
                    "2026-01-01T00:00:00Z",
                    "2026-01-01T00:00:00Z",
                    "{}",
                ),
            )
            conn.commit()
        finally:
            conn.close()

        class _Hex:
            def __init__(self, value: str) -> None:
                self.hex = value

        with patch("app.sessions.uuid.uuid4", side_effect=[_Hex("a" * 32), _Hex("b" * 32)]):
            view = open_session("deepfake-hk-001")
        self.assertEqual(view["session_id"], "b" * 12)
        self.assertEqual(self._stored(taken)[4], "{}")

        with patch("app.sessions.uuid.uuid4", side_effect=[_Hex("a" * 32)] * 5):
            with self.assertRaisesRegex(RuntimeError, "could not allocate a session id"):
                open_session("deepfake-hk-001")
        conn = sqlite3.connect(store_path())
        try:
            count = int(conn.execute("SELECT COUNT(*) FROM sessions").fetchone()[0])
        finally:
            conn.close()
        self.assertEqual(count, 2)
        self.assertIsNotNone(self._stored("b" * 12))

    def test_second_branch_stays_on_the_server(self) -> None:
        opened = self.client.post("/sessions", json={"case_id": "deepfake-hk-001"}).json()
        step = self.client.post(
            f"/sessions/{opened['session_id']}/decisions",
            json={"choice_id": "pass_video"},
        )
        self.assertEqual(step.status_code, 200, step.text)
        body = step.json()
        self.assertEqual(body["status"], "open")
        self.assertEqual(body["node"]["id"], "n_alert_triage")
        self.assertEqual(body["twin"]["account"]["opened"], True)
        self.assertIn("THIRD_PARTY_BURST", body["twin"]["risk"]["flags"])
        choice_ids = [choice["id"] for choice in body["node"]["choices"]]
        self.assertIn("clear_alert", choice_ids)
        self.assertNotIn("effects", body["node"]["choices"][0])

    def test_player_view_is_a_copy_of_the_stored_row(self) -> None:
        opened = self.client.post("/sessions", json={"case_id": "deepfake-hk-001"}).json()
        from app.sessions import fetch

        view = fetch(opened["session_id"])
        self.assertIsNotNone(view)
        assert view is not None
        view["twin"]["disposition"] = "tampered"
        view["events"].append({"seq": 99, "type": "tamper", "at": "2000-01-01T00:00:00Z"})

        again = self.client.get(f"/sessions/{opened['session_id']}")
        self.assertNotEqual(again.json()["twin"].get("disposition"), "tampered")
        self.assertNotIn("tamper", [event["type"] for event in again.json()["events"]])

    def test_dashboard_and_evidence_do_not_stat_media(self) -> None:
        opened = self.client.post("/sessions", json={"case_id": "deepfake-hk-001"}).json()
        with patch("app.sessions._media", wraps=_media) as media:
            listed = self.client.get("/sessions")
            card = self.client.get(f"/sessions/{opened['session_id']}/evidence")
            self.assertEqual(listed.status_code, 200)
            self.assertEqual(card.status_code, 200)
            media.assert_not_called()
        with patch("app.sessions._media", wraps=_media) as media:
            detail = self.client.get(f"/sessions/{opened['session_id']}")
            self.assertEqual(detail.status_code, 200)
            self.assertGreater(media.call_count, 0)

    def test_session_is_reread_from_the_file(self) -> None:
        opened = self.client.post("/sessions", json={"case_id": "deepfake-hk-001"}).json()
        conn = sqlite3.connect(store_path())
        try:
            row = conn.execute("SELECT body FROM sessions WHERE session_id = ?", (opened["session_id"],)).fetchone()
        finally:
            conn.close()
        self.assertIsNotNone(row)
        assert row is not None
        self.assertEqual(json.loads(row[0])["session_id"], opened["session_id"])
        again = self.client.get(f"/sessions/{opened['session_id']}")
        self.assertEqual(again.json()["node"]["id"], opened["node"]["id"])

    def test_cap_drops_the_oldest_session(self) -> None:
        use_store(store_path(), cap=2)
        ids = [
            self.client.post("/sessions", json={"case_id": "deepfake-hk-001"}).json()["session_id"]
            for _ in range(3)
        ]
        listed = [row["session_id"] for row in self.client.get("/sessions").json()["sessions"]]
        self.assertEqual(listed, [ids[2], ids[1]])
        self.assertEqual(self.client.get(f"/sessions/{ids[0]}").status_code, 404)

    def test_cap_drops_a_closed_session_before_an_open_one(self) -> None:
        use_store(store_path(), cap=2)
        first = self.client.post("/sessions", json={"case_id": "deepfake-hk-001"}).json()
        closed = self.client.post(
            f"/sessions/{first['session_id']}/decisions",
            json={"choice_id": "reject_onboarding"},
        )
        self.assertEqual(closed.status_code, 200, closed.text)
        second = self.client.post("/sessions", json={"case_id": "deepfake-hk-001"}).json()
        third = self.client.post("/sessions", json={"case_id": "deepfake-hk-001"}).json()
        listed = [row["session_id"] for row in self.client.get("/sessions").json()["sessions"]]
        self.assertEqual(listed, [third["session_id"], second["session_id"]])
        self.assertEqual(self.client.get(f"/sessions/{first['session_id']}").status_code, 404)

    def test_closed_sessions_expire_and_open_sessions_stay(self) -> None:
        use_store(store_path(), ttl_seconds=60)
        closed = self.client.post("/sessions", json={"case_id": "deepfake-hk-001"}).json()
        done = self.client.post(
            f"/sessions/{closed['session_id']}/decisions",
            json={"choice_id": "reject_onboarding"},
        )
        self.assertEqual(done.status_code, 200, done.text)
        opened = self.client.post("/sessions", json={"case_id": "deepfake-hk-001"}).json()
        self._stamp(closed["session_id"], "2000-01-01T00:00:00Z")
        self._stamp(opened["session_id"], "2000-01-01T00:00:00Z")

        self.assertEqual(self.client.get(f"/sessions/{closed['session_id']}").status_code, 404)
        self.assertEqual(self.client.get(f"/sessions/{opened['session_id']}").status_code, 200)
        listed = [row["session_id"] for row in self.client.get("/sessions").json()["sessions"]]
        self.assertEqual(listed, [opened["session_id"]])

    def test_media_refs_cannot_leave_the_repo(self) -> None:
        self.assertIsNone(_media(None))
        self.assertIsNone(_media(""))
        escapes = ("/etc/passwd", "../README.md", "data/../../README.md")
        for ref in escapes:
            with self.subTest(ref=ref):
                self.assertEqual(_media(ref), {"media_ref": ref, "media_missing": True})
        self.assertEqual(_media("README.md"), {"media_ref": "README.md", "media_missing": False})
        missing = "data/media/no-such-clip.bin"
        self.assertEqual(_media(missing), {"media_ref": missing, "media_missing": True})

    def test_missing_session_and_blank_ids_are_refused(self) -> None:
        self.assertEqual(self.client.get("/sessions/does-not-exist").status_code, 404)
        self.assertEqual(self.client.get("/sessions/does-not-exist/evidence").status_code, 404)
        missing = self.client.post(
            "/sessions/does-not-exist/decisions",
            json={"choice_id": "reject_onboarding"},
        )
        self.assertEqual(missing.status_code, 404)

        blank_case = self.client.post("/sessions", json={"case_id": ""})
        self.assertEqual(blank_case.status_code, 422)
        opened = self.client.post("/sessions", json={"case_id": "deepfake-hk-001"}).json()
        blank_choice = self.client.post(
            f"/sessions/{opened['session_id']}/decisions",
            json={"choice_id": ""},
        )
        self.assertEqual(blank_choice.status_code, 422)
        again = self.client.get(f"/sessions/{opened['session_id']}")
        self.assertEqual(again.status_code, 200)
        self.assertEqual(again.json()["status"], "open")
        self.assertEqual(again.json()["node"]["id"], opened["node"]["id"])

    def test_incomplete_exit_is_marked_on_the_dashboard(self) -> None:
        opened = self.client.post("/sessions", json={"case_id": "hk-triad-cashflow-001"})
        self.assertEqual(opened.status_code, 201, opened.text)
        session_id = opened.json()["session_id"]
        for choice_id in ("cash_ok", "str_only"):
            step = self.client.post(
                f"/sessions/{session_id}/decisions",
                json={"choice_id": choice_id},
            )
            self.assertEqual(step.status_code, 200, step.text)
        closed = step.json()
        self.assertEqual(closed["status"], "closed")
        self.assertEqual(closed["teaching"]["bucket"], "incomplete")
        self.assertTrue(closed["teaching"]["incomplete"])
        self.assertFalse(closed["teaching"]["poor_path"])
        self.assertFalse(closed["teaching"]["rule_follow"])

        listed = self.client.get("/sessions").json()["sessions"]
        self.assertEqual(listed[0]["session_id"], session_id)
        self.assertEqual(listed[0]["bucket"], "incomplete")
        self.assertTrue(listed[0]["incomplete"])
        self.assertFalse(listed[0]["rule_follow"])

        evidence = self.client.get(f"/sessions/{session_id}/evidence").json()
        self.assertEqual(evidence["bucket"], "incomplete")
        self.assertEqual(evidence["override_count"], 0)
        self.assertEqual(evidence["event_count"], len(evidence["event_types"]))

    def test_evidence_counts_one_override_on_the_deepfake_path(self) -> None:
        opened = self.client.post("/sessions", json={"case_id": "deepfake-hk-001"}).json()
        session_id = opened["session_id"]
        for choice_id in ("redo_liveness", "override_r1", "file_str"):
            step = self.client.post(
                f"/sessions/{session_id}/decisions",
                json={"choice_id": choice_id},
            )
            self.assertEqual(step.status_code, 200, step.text)
        evidence = self.client.get(f"/sessions/{session_id}/evidence").json()
        self.assertEqual(evidence["override_count"], 1)
        self.assertEqual(evidence["event_types"].count("override"), 1)

    def test_a_choice_that_cannot_walk_is_not_saved(self) -> None:
        opened = self.client.post("/sessions", json={"case_id": "deepfake-hk-001"}).json()
        before = fetch_state(opened["session_id"])
        self.assertIsNotNone(before)
        assert before is not None
        node_id = before["node_id"]
        broken = {
            "case_id": "deepfake-hk-001",
            "title": "Synthetic",
            "start_node_id": node_id,
            "initial_twin_state": {"disposition": None},
            "nodes": [
                {
                    "id": node_id,
                    "type": "decision",
                    "choices": [{"id": "bad", "label": "Bad", "next": "n_missing"}],
                }
            ],
        }
        with patch("app.sessions.get_script", return_value=broken):
            with self.assertRaisesRegex(ScriptError, "node n_missing is missing"):
                decide(opened["session_id"], "bad")
        after = fetch_state(opened["session_id"])
        self.assertEqual(after, before)

    def test_session_id_collision_retries_then_stops(self) -> None:
        seeded = self.client.post("/sessions", json={"case_id": "deepfake-hk-001"}).json()
        conn = sqlite3.connect(store_path())
        try:
            conn.execute(
                "UPDATE sessions SET session_id = ? WHERE session_id = ?",
                ("deadbeefdead", seeded["session_id"]),
            )
            conn.commit()
            count = int(conn.execute("SELECT COUNT(*) FROM sessions").fetchone()[0])
        finally:
            conn.close()
        self.assertEqual(count, 1)

        class _FakeUuid:
            def __init__(self, hex_value: str) -> None:
                self.hex = hex_value

        with patch(
            "app.sessions.uuid.uuid4",
            side_effect=[
                _FakeUuid("deadbeefdead"),
                _FakeUuid("deadbeefdead"),
                _FakeUuid("cafebabe0000"),
            ],
        ):
            opened = open_session("deepfake-hk-001")
        self.assertEqual(opened["session_id"], "cafebabe0000")

        with patch("app.sessions.uuid.uuid4", return_value=_FakeUuid("deadbeefdead")):
            with self.assertRaisesRegex(RuntimeError, "could not allocate a session id"):
                open_session("deepfake-hk-001")
        conn = sqlite3.connect(store_path())
        try:
            rows = conn.execute("SELECT session_id FROM sessions ORDER BY rowid").fetchall()
        finally:
            conn.close()
        self.assertEqual([row[0] for row in rows], ["deadbeefdead", "cafebabe0000"])

    def test_equal_timestamps_drop_the_earlier_row(self) -> None:
        use_store(store_path(), cap=2)
        first = self.client.post("/sessions", json={"case_id": "deepfake-hk-001"}).json()["session_id"]
        second = self.client.post("/sessions", json={"case_id": "deepfake-hk-001"}).json()["session_id"]
        self._stamp(first, "2026-03-03T10:00:00Z")
        self._stamp(second, "2026-03-03T10:00:00Z")
        third = self.client.post("/sessions", json={"case_id": "deepfake-hk-001"}).json()["session_id"]
        listed = [row["session_id"] for row in self.client.get("/sessions").json()["sessions"]]
        self.assertEqual(listed[0], third)
        self.assertIn(second, listed)
        self.assertNotIn(first, listed)
        self.assertEqual(self.client.get(f"/sessions/{first}").status_code, 404)
        self.assertEqual(self.client.get(f"/sessions/{second}").status_code, 200)

    def test_relative_session_path_is_joined_to_the_repo(self) -> None:
        with patch.dict("os.environ", {"TWINAML_SESSIONS_DB": "data/local/other.sqlite"}):
            self.assertEqual(_path_from_env(), ROOT / "data" / "local" / "other.sqlite")
        with patch.dict("os.environ", {"TWINAML_SESSIONS_DB": "/tmp/abs-sessions.sqlite"}):
            self.assertEqual(_path_from_env(), Path("/tmp/abs-sessions.sqlite"))
        with patch.dict("os.environ", {"TWINAML_SESSIONS_DB": ""}):
            self.assertEqual(_path_from_env(), ROOT / "data" / "local" / "sessions.sqlite")


if __name__ == "__main__":
    unittest.main()
