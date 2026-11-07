"""Load the case library from data/cases/index.json.

The web app does not keep its own copy. Scripts are cached for the process.
The filename and the node index live beside the script. get_script returns a
read-only view, so a request cannot write a key onto the cached object.
"""

from __future__ import annotations

import hashlib
import json
import re
from collections.abc import Mapping
from dataclasses import dataclass
from functools import lru_cache
from pathlib import Path
from types import MappingProxyType
from typing import Any

ROOT = Path(__file__).resolve().parents[2]
CASES_DIR = ROOT / "data" / "cases"
MAX_SCRIPT_BYTES = 24 * 1024
_RULE_FLAG = re.compile(r"^R\d+_")


class CaseLibraryError(RuntimeError):
    """index.json and the script files do not agree."""


@dataclass(frozen=True)
class CompiledCase:
    case_id: str
    file: str
    sha256: str
    script: Mapping[str, Any]
    nodes: Mapping[str, dict[str, Any]]
    choices: Mapping[str, Mapping[str, dict[str, Any]]]
    acceptable: frozenset[str]
    poor: frozenset[str]
    incomplete: frozenset[str]
    rule_flags: frozenset[str]


def _sha256(raw: bytes) -> str:
    return hashlib.sha256(raw).hexdigest()


def _flags_added(script: dict[str, Any]) -> set[str]:
    found: set[str] = set()

    def take(patch: Any) -> None:
        if not isinstance(patch, dict):
            return
        for key, value in patch.items():
            if key.endswith("flags_add") and isinstance(value, list):
                found.update(item for item in value if isinstance(item, str))

    for node in script["nodes"]:
        take(node.get("twin_patch"))
        for choice in node.get("choices") or []:
            take(choice.get("effects"))
    return found


def _check_script(script: dict[str, Any], file_name: str) -> None:
    seen: set[str] = set()
    for node in script["nodes"]:
        node_id = node["id"]
        if node_id in seen:
            raise CaseLibraryError(f"{file_name}: duplicate node id {node_id}")
        seen.add(node_id)
    added = _flags_added(script)
    listed: set[str] = set()
    for rule in script.get("rules") or []:
        flags = rule.get("flags") or []
        if not flags:
            raise CaseLibraryError(f"{file_name}: rule {rule.get('id')} has no flags")
        for flag in flags:
            listed.add(flag)
            if flag not in added:
                raise CaseLibraryError(
                    f"{file_name}: rule {rule.get('id')} flag {flag} is not written by flags_add"
                )
    for flag in added:
        if _RULE_FLAG.match(flag) and flag not in listed:
            raise CaseLibraryError(
                f"{file_name}: flag {flag} is a rule flag and is not listed on rules[].flags"
            )


def _compile(script: dict[str, Any], row: dict[str, Any]) -> CompiledCase:
    nodes = {node["id"]: node for node in script["nodes"]}
    choices: dict[str, Mapping[str, dict[str, Any]]] = {}
    for node in script["nodes"]:
        by_choice = {choice["id"]: choice for choice in node.get("choices") or []}
        choices[node["id"]] = MappingProxyType(by_choice)
    teaching = script.get("teaching") or {}
    rule_flags: set[str] = set()
    for rule in script.get("rules") or []:
        rule_flags.update(rule.get("flags") or [])
    return CompiledCase(
        case_id=row["case_id"],
        file=row["file"],
        sha256=row["sha256"],
        script=MappingProxyType(script),
        nodes=MappingProxyType(nodes),
        choices=MappingProxyType(choices),
        acceptable=frozenset(teaching.get("acceptable_dispositions") or []),
        poor=frozenset(teaching.get("poor_dispositions") or []),
        incomplete=frozenset(teaching.get("incomplete_dispositions") or []),
        rule_flags=frozenset(rule_flags),
    )


@lru_cache(maxsize=1)
def load_library() -> dict[str, CompiledCase]:
    index_path = CASES_DIR / "index.json"
    if not index_path.is_file():
        raise CaseLibraryError(
            f"missing {index_path}. From the repo root run: node scripts/validate-cases.mjs"
        )
    index = json.loads(index_path.read_text(encoding="utf-8"))
    rows = index.get("cases")
    if not isinstance(rows, list) or not rows:
        raise CaseLibraryError(f"{index_path} has no cases")
    library: dict[str, CompiledCase] = {}
    for row in rows:
        file_name = row["file"]
        path = CASES_DIR / file_name
        raw = path.read_bytes()
        if len(raw) > MAX_SCRIPT_BYTES:
            raise CaseLibraryError(f"{file_name} is {len(raw)} bytes; the limit is {MAX_SCRIPT_BYTES}")
        digest = _sha256(raw)
        if digest != row["sha256"] or len(raw) != row["bytes"]:
            raise CaseLibraryError(
                f"{file_name} does not match index.json. From the repo root run: node scripts/validate-cases.mjs"
            )
        script = json.loads(raw.decode("utf-8"))
        if script.get("case_id") != row["case_id"]:
            raise CaseLibraryError(f"{file_name} case_id does not match index.json")
        if row["case_id"] in library:
            raise CaseLibraryError(f"duplicate case_id {row['case_id']}")
        _check_script(script, file_name)
        library[row["case_id"]] = _compile(script, row)
    return library


def library_case(script: Mapping[str, Any]) -> CompiledCase | None:
    case_id = script.get("case_id")
    if not isinstance(case_id, str):
        return None
    case = load_library().get(case_id)
    if case is None or case.script is not script:
        return None
    return case


def get_script(case_id: str) -> Mapping[str, Any] | None:
    case = load_library().get(case_id)
    if case is None:
        return None
    return case.script


def list_cases() -> list[dict[str, Any]]:
    rows = []
    for case in load_library().values():
        script = case.script
        teaching = script.get("teaching") or {}
        rows.append(
            {
                "case_id": case.case_id,
                "title": script["title"],
                "summary": script.get("summary", ""),
                "locale": script.get("locale", ""),
                "file": case.file,
                "case_kind": teaching.get("case_kind"),
                "themes": list(teaching.get("themes") or []),
            }
        )
    return rows
