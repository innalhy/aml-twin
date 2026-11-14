"""Case library checks and rule-flag recording.

The loader refuses a script whose index row, node ids, or rule flags disagree.
The state machine records a rule event only for flags listed on rules[].flags.
"""

from __future__ import annotations

import hashlib
import json
import tempfile
import unittest
from collections.abc import Iterator
from contextlib import contextmanager
from pathlib import Path
from unittest.mock import patch

from app.cases import CaseLibraryError, get_script, library_case, load_library
from app.machine import play, start_session, submit_choice

CASE_ID = "deepfake-hk-001"


def _raw(script: dict) -> bytes:
    return json.dumps(script, separators=(",", ":")).encode()


def _valid_script(case_id: str = "case-a", extra_flags: list[str] | None = None) -> dict:
    flags = ["LISTED_FLAG", *(extra_flags or [])]
    return {
        "case_id": case_id,
        "title": "Synthetic",
        "nodes": [
            {
                "id": "n1",
                "choices": [
                    {
                        "id": "hold",
                        "effects": {"risk.flags_add": flags},
                    }
                ],
            }
        ],
        "rules": [{"id": "R1", "flags": ["LISTED_FLAG"]}],
    }


def _write(directory: Path, rows: list[tuple[str, dict, dict | None]]) -> None:
    cases = []
    for file_name, script, override in rows:
        raw = _raw(script)
        (directory / file_name).write_bytes(raw)
        row = {
            "case_id": script["case_id"],
            "file": file_name,
            "sha256": hashlib.sha256(raw).hexdigest(),
            "bytes": len(raw),
        }
        if override:
            row.update(override)
        cases.append(row)
    (directory / "index.json").write_text(json.dumps({"cases": cases}), encoding="utf-8")


@contextmanager
def _isolated(directory: Path) -> Iterator[None]:
    load_library.cache_clear()
    with patch("app.cases.CASES_DIR", directory):
        try:
            yield
        finally:
            load_library.cache_clear()


class LibraryGuardTest(unittest.TestCase):
    def test_cached_script_is_read_only_and_stable(self) -> None:
        load_library.cache_clear()
        first = get_script(CASE_ID)
        self.assertIsNotNone(first)
        assert first is not None
        second = get_script(CASE_ID)
        self.assertIs(first, second)
        self.assertIsNotNone(library_case(first))
        with self.assertRaises(TypeError):
            first["title"] = "tampered"
        self.assertNotEqual(get_script(CASE_ID)["title"], "tampered")

        copied = json.loads(json.dumps(dict(first)))
        self.assertIsNone(library_case(copied))

    def test_cached_and_copied_scripts_record_the_same_rule_flags(self) -> None:
        load_library.cache_clear()
        cached = get_script(CASE_ID)
        assert cached is not None
        copied = json.loads(json.dumps(dict(cached)))
        choices = ["redo_liveness", "override_r1", "file_str"]
        cached_state = play(cached, choices)
        copied_state = play(copied, choices)

        def flagged(state: dict) -> list[list[str]]:
            return [event["payload"]["flags"] for event in state["events"] if event["type"] == "rule_flagged"]

        self.assertEqual(flagged(cached_state), [["R1_OVERRIDDEN"]])
        self.assertEqual(flagged(copied_state), [["R1_OVERRIDDEN"]])
        overrides = [event for event in cached_state["events"] if event["type"] == "override"]
        self.assertEqual([event["payload"]["flags"] for event in overrides], [["R1_OVERRIDDEN"]])

    def test_non_rule_flag_is_allowed_when_it_is_not_an_r_flag(self) -> None:
        script = _valid_script(extra_flags=["KYC_WAIVED"])
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            _write(root, [("one.example.json", script, None)])
            with _isolated(root):
                library = load_library()
        self.assertEqual(set(library), {"case-a"})
        self.assertEqual(library["case-a"].rule_flags, frozenset({"LISTED_FLAG"}))

    def test_index_mismatch_duplicate_and_flag_rules_are_refused(self) -> None:
        script = _valid_script()
        raw = _raw(script)
        cases = [
            ("sha", {"sha256": "0" * 64}, "does not match index.json"),
            ("bytes", {"bytes": len(raw) + 1}, "does not match index.json"),
            ("case_id", {"case_id": "other-id"}, "case_id does not match index.json"),
        ]
        for name, override, message in cases:
            with self.subTest(name=name):
                with tempfile.TemporaryDirectory() as tmp:
                    root = Path(tmp)
                    _write(root, [("one.example.json", script, override)])
                    with _isolated(root):
                        with self.assertRaisesRegex(CaseLibraryError, message):
                            load_library()

        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            _write(
                root,
                [
                    ("one.example.json", script, None),
                    ("two.example.json", _valid_script(), None),
                ],
            )
            with _isolated(root):
                with self.assertRaisesRegex(CaseLibraryError, "duplicate case_id case-a"):
                    load_library()

    def test_script_shape_errors_name_the_file(self) -> None:
        duplicated = _valid_script()
        duplicated["nodes"].append({"id": "n1"})
        unlisted = _valid_script(extra_flags=["R9_GHOST"])
        missing_flags = _valid_script()
        missing_flags["rules"] = [{"id": "R1", "flags": []}]
        never_written = _valid_script()
        never_written["rules"] = [{"id": "R1", "flags": ["NEVER_WRITTEN"]}]
        checks = [
            (duplicated, "duplicate node id n1"),
            (unlisted, "flag R9_GHOST is a rule flag and is not listed"),
            (missing_flags, "rule R1 has no flags"),
            (never_written, "flag NEVER_WRITTEN is not written by flags_add"),
        ]
        for script, message in checks:
            with self.subTest(message=message):
                with tempfile.TemporaryDirectory() as tmp:
                    root = Path(tmp)
                    _write(root, [("bad.example.json", script, None)])
                    with _isolated(root):
                        with self.assertRaisesRegex(CaseLibraryError, message):
                            load_library()

    def test_missing_index_empty_catalog_and_oversize_script_are_refused(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            with _isolated(root):
                with self.assertRaisesRegex(CaseLibraryError, "missing"):
                    load_library()
            (root / "index.json").write_text('{"cases": []}', encoding="utf-8")
            with _isolated(root):
                with self.assertRaisesRegex(CaseLibraryError, "has no cases"):
                    load_library()
            blob = b"x" * (24 * 1024 + 1)
            (root / "huge.example.json").write_bytes(blob)
            (root / "index.json").write_text(
                json.dumps(
                    {
                        "cases": [
                            {
                                "case_id": "huge",
                                "file": "huge.example.json",
                                "sha256": "0" * 64,
                                "bytes": len(blob),
                            }
                        ]
                    }
                ),
                encoding="utf-8",
            )
            with _isolated(root):
                with self.assertRaisesRegex(CaseLibraryError, "the limit is"):
                    load_library()


class RuleFlagRecordingTest(unittest.TestCase):
    def _script(self) -> dict:
        return {
            "case_id": "synthetic-flags",
            "title": "Synthetic",
            "start_node_id": "n_decide",
            "initial_twin_state": {"disposition": None, "risk": {"flags": []}},
            "teaching": {"acceptable_dispositions": ["held"]},
            "rules": [{"id": "R1", "when": "x", "then": "y", "flags": ["LISTED_FLAG"]}],
            "nodes": [
                {
                    "id": "n_decide",
                    "type": "decision",
                    "choices": [
                        {
                            "id": "hold",
                            "label": "Hold",
                            "effects": {
                                "risk.flags_add": [
                                    "LISTED_FLAG",
                                    "R9_NOT_LISTED",
                                    "SOMETHING_OVERRIDDEN",
                                ],
                                "disposition": "held",
                            },
                            "next": "n_out",
                        },
                        {
                            "id": "override_anyway",
                            "label": "Override",
                            "effects": {"disposition": "held"},
                            "next": "n_out",
                        },
                    ],
                },
                {"id": "n_out", "type": "outcome"},
            ],
        }

    def test_only_listed_flags_become_rule_events(self) -> None:
        state = start_session(self._script())
        submit_choice(state, self._script(), "hold")
        flagged = [event for event in state["events"] if event["type"] == "rule_flagged"]
        self.assertEqual([event["payload"]["flags"] for event in flagged], [["LISTED_FLAG"]])
        self.assertFalse(any(event["type"] == "override" for event in state["events"]))

    def test_choice_id_override_is_recorded_without_an_override_flag(self) -> None:
        state = play(self._script(), ["override_anyway"])
        overrides = [event for event in state["events"] if event["type"] == "override"]
        self.assertEqual(len(overrides), 1)
        self.assertEqual(overrides[0]["choice_id"], "override_anyway")
        self.assertEqual(overrides[0]["payload"]["flags"], [])
        self.assertFalse(any(event["type"] == "rule_flagged" for event in state["events"]))


if __name__ == "__main__":
    unittest.main()
