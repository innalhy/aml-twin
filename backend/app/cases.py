"""Load the case library from data/cases. The web app does not keep its own copy."""

from __future__ import annotations

import json
from functools import lru_cache
from pathlib import Path
from typing import Any

ROOT = Path(__file__).resolve().parents[2]
CASES_DIR = ROOT / "data" / "cases"


@lru_cache(maxsize=1)
def load_library() -> dict[str, dict[str, Any]]:
    library: dict[str, dict[str, Any]] = {}
    for path in sorted(CASES_DIR.glob("*.example.json")):
        script = json.loads(path.read_text(encoding="utf-8"))
        case_id = script["case_id"]
        if case_id in library:
            raise RuntimeError(f"duplicate case_id {case_id}")
        script["_file"] = path.name
        library[case_id] = script
    if not library:
        raise RuntimeError(f"no case scripts in {CASES_DIR}")
    return library


def get_script(case_id: str) -> dict[str, Any] | None:
    return load_library().get(case_id)


def list_cases() -> list[dict[str, Any]]:
    rows = []
    for script in load_library().values():
        teaching = script.get("teaching") or {}
        rows.append(
            {
                "case_id": script["case_id"],
                "title": script["title"],
                "summary": script.get("summary", ""),
                "locale": script.get("locale", ""),
                "file": script["_file"],
                "case_kind": teaching.get("case_kind"),
                "themes": teaching.get("themes") or [],
            }
        )
    return rows
