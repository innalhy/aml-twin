"""Session routes on the demo API."""

from __future__ import annotations

import json
import sqlite3
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

from fastapi.testclient import TestClient

from app.main import app
from app.sessions import _media, reset_sessions, store_path, use_store


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


if __name__ == "__main__":
    unittest.main()
