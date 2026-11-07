"""Terminal dispositions for every script, without HTTP."""

from __future__ import annotations

import json
import unittest
from pathlib import Path

from app.effects import apply_patch
from app.machine import play, teaching_mark

ROOT = Path(__file__).resolve().parents[2]
CASES = ROOT / "data" / "cases"

DEEPFAKE = [
    {
        "choices": ["reject_onboarding"],
        "outcome": "n_outcome_reject",
        "disposition": "onboarding_rejected",
        "status": "rejected",
        "liveness": 0,
        "opened": False,
        "score": 20,
        "flags": ["ONBOARDING_REJECTED"],
        "transactions": 0,
    },
    {
        "choices": ["redo_liveness", "follow_r1"],
        "outcome": "n_outcome_blocked",
        "disposition": "blocked_by_rule",
        "status": "blocked_by_rule",
        "liveness": 2,
        "opened": False,
        "score": 20,
        "flags": ["R1_BLOCK"],
        "transactions": 0,
    },
    {
        "choices": ["pass_video", "file_str"],
        "outcome": "n_outcome_str",
        "disposition": "str_drafted",
        "status": "passed",
        "liveness": 0,
        "opened": True,
        "score": 45,
        "flags": ["KYC_SIGNALS_WAIVED", "THIRD_PARTY_BURST", "STR_DRAFTED"],
        "transactions": 3,
    },
    {
        "choices": ["pass_video", "edd_hold"],
        "outcome": "n_outcome_edd",
        "disposition": "edd_hold",
        "status": "passed",
        "liveness": 0,
        "opened": True,
        "score": 45,
        "flags": ["KYC_SIGNALS_WAIVED", "THIRD_PARTY_BURST", "EDD_HOLD"],
        "holds": ["outbound"],
        "transactions": 3,
    },
    {
        "choices": ["pass_video", "clear_alert"],
        "outcome": "n_outcome_miss",
        "disposition": "false_positive_cleared",
        "status": "passed",
        "liveness": 0,
        "opened": True,
        "score": 45,
        "flags": ["KYC_SIGNALS_WAIVED", "THIRD_PARTY_BURST", "R2_IGNORED"],
        "transactions": 3,
    },
    {
        "choices": ["redo_liveness", "override_r1", "file_str"],
        "outcome": "n_outcome_str",
        "disposition": "str_drafted",
        "status": "passed_by_override",
        "liveness": 2,
        "opened": True,
        "score": 60,
        "flags": ["R1_OVERRIDDEN", "THIRD_PARTY_BURST", "STR_DRAFTED"],
        "transactions": 3,
    },
    {
        "choices": ["redo_liveness", "override_r1", "edd_hold"],
        "outcome": "n_outcome_edd",
        "disposition": "edd_hold",
        "status": "passed_by_override",
        "liveness": 2,
        "opened": True,
        "score": 60,
        "flags": ["R1_OVERRIDDEN", "THIRD_PARTY_BURST", "EDD_HOLD"],
        "holds": ["outbound"],
        "transactions": 3,
    },
    {
        "choices": ["redo_liveness", "override_r1", "clear_alert"],
        "outcome": "n_outcome_miss",
        "disposition": "false_positive_cleared",
        "status": "passed_by_override",
        "liveness": 2,
        "opened": True,
        "score": 60,
        "flags": ["R1_OVERRIDDEN", "THIRD_PARTY_BURST", "R2_IGNORED"],
        "transactions": 3,
    },
]


def _load_all() -> list[dict]:
    return [json.loads(path.read_text(encoding="utf-8")) for path in sorted(CASES.glob("*.example.json"))]


def _terminal_paths(script: dict) -> list[tuple[list[str], str]]:
    by_id = {node["id"]: node for node in script["nodes"]}
    found: list[tuple[list[str], str]] = []

    def walk(node_id: str, choices: list[str], seen: frozenset[str]) -> None:
        if node_id in seen:
            raise AssertionError(f"{script['case_id']} cycles at {node_id}")
        node = by_id[node_id]
        if node["type"] == "outcome":
            found.append((choices, node_id))
            return
        nxt_seen = seen | {node_id}
        if node["type"] == "scene":
            walk(node["next"], choices, nxt_seen)
            return
        for choice in node.get("choices") or []:
            walk(choice["next"], choices + [choice["id"]], nxt_seen)

    walk(script["start_node_id"], [], frozenset())
    return found


class EffectsTest(unittest.TestCase):
    def test_flags_do_not_duplicate_and_score_adds(self) -> None:
        twin = {"risk": {"score": 20, "flags": ["R1_BLOCK"]}, "account": {"opened": False}}
        added = apply_patch(
            twin,
            {"risk.flags_add": ["R1_BLOCK", "R2_IGNORED"], "risk.score_delta": 25, "account.holds": ["outbound"]},
        )
        self.assertEqual(added, ["R2_IGNORED"])
        self.assertEqual(twin["risk"]["flags"], ["R1_BLOCK", "R2_IGNORED"])
        self.assertEqual(twin["risk"]["score"], 45)
        self.assertEqual(twin["account"]["holds"], ["outbound"])


class DeepfakeTest(unittest.TestCase):
    def test_eight_endings(self) -> None:
        script = json.loads((CASES / "01-deepfake-hk-001.example.json").read_text(encoding="utf-8"))
        initial = json.dumps(script["initial_twin_state"])
        for path in DEEPFAKE:
            state = play(script, path["choices"])
            twin = state["twin"]
            label = " → ".join(path["choices"])
            self.assertEqual(state["node_id"], path["outcome"], label)
            self.assertEqual(twin["phase"], "closed", label)
            self.assertEqual(twin["disposition"], path["disposition"], label)
            self.assertEqual(twin["kyc"]["status"], path["status"], label)
            self.assertEqual(twin["kyc"]["liveness_failures"], path["liveness"], label)
            self.assertEqual(twin["account"]["opened"], path["opened"], label)
            self.assertEqual(twin["risk"]["score"], path["score"], label)
            self.assertEqual(twin["risk"]["flags"], path["flags"], label)
            self.assertEqual(len(twin["transactions"]), path["transactions"], label)
            if "holds" in path:
                self.assertEqual(twin["account"]["holds"], path["holds"], label)
            self.assertEqual(json.dumps(script["initial_twin_state"]), initial)
            types = [event["type"] for event in state["events"]]
            self.assertEqual(types[0], "session_started")
            self.assertIn("decision_made", types)
            self.assertEqual(types[-1], "session_closed")
            self.assertEqual([event["seq"] for event in state["events"]], list(range(1, len(types) + 1)))

    def test_override_and_poor_path_are_marked(self) -> None:
        script = json.loads((CASES / "01-deepfake-hk-001.example.json").read_text(encoding="utf-8"))
        override = play(script, ["redo_liveness", "override_r1", "file_str"])
        self.assertTrue(any(event["type"] == "override" for event in override["events"]))
        self.assertTrue(any(event["type"] == "rule_flagged" for event in override["events"]))
        mark = teaching_mark(script, override["twin"]["disposition"])
        self.assertTrue(mark["rule_follow"])
        self.assertFalse(mark["poor_path"])

        poor = play(script, ["pass_video", "clear_alert"])
        mark = teaching_mark(script, poor["twin"]["disposition"])
        self.assertTrue(mark["poor_path"])
        self.assertFalse(mark["rule_follow"])
        self.assertEqual(poor["events"][-1]["payload"]["poor_path"], True)


class LibraryTest(unittest.TestCase):
    def test_every_terminal_path_matches_the_outcome_patch(self) -> None:
        scripts = _load_all()
        self.assertGreaterEqual(len(scripts), 11)
        for script in scripts:
            teaching = script.get("teaching") or {}
            known = set(teaching.get("acceptable_dispositions") or [])
            known.update(teaching.get("poor_dispositions") or [])
            known.update(teaching.get("incomplete_dispositions") or [])
            paths = _terminal_paths(script)
            self.assertGreater(len(paths), 0, script["case_id"])
            for choices, outcome_id in paths:
                state = play(script, choices)
                self.assertEqual(state["status"], "closed", script["case_id"])
                self.assertEqual(state["node_id"], outcome_id, script["case_id"])
                disposition = state["twin"]["disposition"]
                self.assertIn(disposition, known, f"{script['case_id']} {choices}")
                mark = teaching_mark(script, disposition)
                self.assertEqual(mark["disposition"], disposition)
                self.assertEqual(state["events"][-1]["type"], "session_closed")


if __name__ == "__main__":
    unittest.main()
