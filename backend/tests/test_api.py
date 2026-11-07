"""Session routes on the demo API."""

from __future__ import annotations

import unittest

from fastapi.testclient import TestClient

from app.main import app
from app.sessions import reset_sessions


class ApiTest(unittest.TestCase):
    def setUp(self) -> None:
        reset_sessions()
        self.client = TestClient(app)

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


if __name__ == "__main__":
    unittest.main()
