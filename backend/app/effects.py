"""Apply schema 0.1 patches the way docs/effects.md describes."""

from __future__ import annotations

import json
from typing import Any


class ScriptError(ValueError):
    """A patch or node pointer does not match the script contract."""


def _copy(value: Any) -> Any:
    if value is not None and isinstance(value, (dict, list)):
        return json.loads(json.dumps(value))
    return value


def _parent(state: dict[str, Any], parts: list[str]) -> dict[str, Any] | None:
    current: Any = state
    for key in parts[:-1]:
        if not isinstance(current, dict) or key not in current:
            return None
        current = current[key]
    if not isinstance(current, dict):
        return None
    return current


def apply_patch(twin: dict[str, Any], patch: dict[str, Any] | None) -> list[str]:
    """Apply one patch in key order. Return flags that were newly appended."""

    if patch is None:
        return []
    if not isinstance(patch, dict):
        raise ScriptError("patch is not an object")

    added: list[str] = []
    for key, value in patch.items():
        if not key or key.startswith(".") or key.endswith(".") or ".." in key:
            raise ScriptError(f'empty path segment in "{key}"')
        parts = key.split(".")
        last = parts[-1]
        if last == "flags_add":
            if not isinstance(value, list) or any(not isinstance(item, str) for item in value):
                raise ScriptError(f"{key} must be an array of strings")
            target = parts[:-1] + ["flags"]
            parent = _parent(twin, target)
            leaf = target[-1]
            if parent is None or not isinstance(parent.get(leaf), list):
                raise ScriptError(f"{key} needs an existing array at {'.'.join(target)}")
            flags: list[str] = parent[leaf]
            for item in value:
                if item not in flags:
                    flags.append(item)
                    added.append(item)
            continue
        if last == "score_delta":
            if isinstance(value, bool) or not isinstance(value, (int, float)):
                raise ScriptError(f"{key} must be a finite number")
            target = parts[:-1] + ["score"]
            parent = _parent(twin, target)
            leaf = target[-1]
            if parent is None or isinstance(parent.get(leaf), bool) or not isinstance(parent.get(leaf), (int, float)):
                raise ScriptError(f"{key} needs an existing number at {'.'.join(target)}")
            parent[leaf] = parent[leaf] + value
            continue
        if last.endswith("_add") or last.endswith("_delta"):
            raise ScriptError(
                f"{key} uses an undefined suffix. Defined suffixes are flags_add and score_delta."
            )
        parent = _parent(twin, parts)
        if parent is None:
            raise ScriptError(f"{key} has no parent object")
        parent[parts[-1]] = _copy(value)
    return added
