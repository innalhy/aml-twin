"""Twin state machine. Rules stay in the script. This module only applies patches and records events."""

from __future__ import annotations

import copy
from datetime import datetime, timezone
from typing import Any

from app.cases import library_case
from app.effects import ScriptError, apply_patch


class ChoiceError(ValueError):
    """The trainee asked for a choice the waiting node does not offer."""


class SessionClosed(ValueError):
    """A decision arrived after the outcome node."""


def _now() -> str:
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z")


def _nodes(script: dict[str, Any]) -> dict[str, dict[str, Any]]:
    case = library_case(script)
    if case is not None:
        return case.nodes
    return {node["id"]: node for node in script["nodes"]}


def _rule_flags(script: dict[str, Any]) -> frozenset[str]:
    case = library_case(script)
    if case is not None:
        return case.rule_flags
    found: set[str] = set()
    for rule in script.get("rules") or []:
        found.update(rule.get("flags") or [])
    return frozenset(found)


def _event(
    events: list[dict[str, Any]],
    kind: str,
    *,
    node_id: str | None = None,
    choice_id: str | None = None,
    payload: dict[str, Any] | None = None,
) -> None:
    item: dict[str, Any] = {
        "seq": len(events) + 1,
        "type": kind,
        "at": _now(),
    }
    if node_id is not None:
        item["node_id"] = node_id
    if choice_id is not None:
        item["choice_id"] = choice_id
    if payload:
        item["payload"] = payload
    events.append(item)


def _note_flags(
    script: dict[str, Any],
    events: list[dict[str, Any]],
    node_id: str,
    new_flags: list[str],
    choice_id: str | None = None,
) -> None:
    known = _rule_flags(script)
    rule_flags = [flag for flag in new_flags if flag in known]
    if rule_flags:
        _event(
            events,
            "rule_flagged",
            node_id=node_id,
            choice_id=choice_id,
            payload={"flags": rule_flags},
        )
    override_flags = [flag for flag in rule_flags if "OVERRIDDEN" in flag]
    override = bool(choice_id and "override" in choice_id.lower()) or bool(override_flags)
    if override:
        _event(
            events,
            "override",
            node_id=node_id,
            choice_id=choice_id,
            payload={"flags": override_flags},
        )


def teaching_mark(script: dict[str, Any], disposition: str | None) -> dict[str, Any]:
    case = library_case(script)
    if case is not None:
        acceptable = case.acceptable
        poor = case.poor
        incomplete = case.incomplete
    else:
        teaching = script.get("teaching") or {}
        acceptable = set(teaching.get("acceptable_dispositions") or [])
        poor = set(teaching.get("poor_dispositions") or [])
        incomplete = set(teaching.get("incomplete_dispositions") or [])
    if disposition is None:
        return {
            "disposition": None,
            "bucket": "open",
            "poor_path": False,
            "incomplete": False,
            "rule_follow": None,
        }
    if disposition in poor:
        bucket = "poor"
        rule_follow = False
    elif disposition in incomplete:
        bucket = "incomplete"
        rule_follow = False
    elif disposition in acceptable:
        bucket = "acceptable"
        rule_follow = True
    else:
        bucket = "unlisted"
        rule_follow = False
    return {
        "disposition": disposition,
        "bucket": bucket,
        "poor_path": disposition in poor,
        "incomplete": disposition in incomplete,
        "rule_follow": rule_follow,
    }


def _walk(
    script: dict[str, Any],
    twin: dict[str, Any],
    node_id: str,
    events: list[dict[str, Any]],
) -> tuple[dict[str, Any], list[str]]:
    by_id = _nodes(script)
    node = by_id.get(node_id)
    if node is None:
        raise ScriptError(f"node {node_id} is missing")
    scenes: list[str] = []
    limit = len(script["nodes"]) + 2
    for _ in range(limit):
        added = apply_patch(twin, node.get("twin_patch"))
        _event(events, "node_entered", node_id=node["id"], payload={"node_type": node["type"]})
        _note_flags(script, events, node["id"], added)
        if node["type"] == "outcome":
            mark = teaching_mark(script, twin.get("disposition"))
            _event(events, "session_closed", node_id=node["id"], payload=mark)
            return node, scenes
        if node["type"] == "scene":
            scenes.append(node["id"])
            nxt = node.get("next")
            node = by_id.get(nxt)
            if node is None:
                raise ScriptError(f"scene next {nxt} is missing")
            continue
        if node["type"] == "decision":
            return node, scenes
        raise ScriptError(f"unknown node type {node.get('type')}")
    raise ScriptError("play exceeded the node step limit")


def start_session(script: dict[str, Any]) -> dict[str, Any]:
    twin = copy.deepcopy(script["initial_twin_state"])
    events: list[dict[str, Any]] = []
    _event(events, "session_started", payload={"case_id": script["case_id"]})
    node, scenes = _walk(script, twin, script["start_node_id"], events)
    now = _now()
    return {
        "case_id": script["case_id"],
        "title": script["title"],
        "status": "closed" if node["type"] == "outcome" else "open",
        "node_id": node["id"],
        "twin": twin,
        "events": events,
        "passed_scenes": scenes,
        "created_at": now,
        "updated_at": now,
    }


def submit_choice(state: dict[str, Any], script: dict[str, Any], choice_id: str) -> None:
    if state["status"] != "open":
        raise SessionClosed("session is already closed")
    node = _nodes(script).get(state["node_id"])
    if node is None or node["type"] != "decision":
        raise SessionClosed("session is not waiting for a choice")
    case = library_case(script)
    if case is not None:
        choice = case.choices.get(node["id"], {}).get(choice_id)
    else:
        choice = next((item for item in node.get("choices") or [] if item["id"] == choice_id), None)
    if choice is None:
        raise ChoiceError(f"unknown choice {choice_id}")
    added = apply_patch(state["twin"], choice.get("effects"))
    _event(
        state["events"],
        "decision_made",
        node_id=node["id"],
        choice_id=choice_id,
        payload={"label": choice.get("label", "")},
    )
    _note_flags(script, state["events"], node["id"], added, choice_id)
    nxt, scenes = _walk(script, state["twin"], choice["next"], state["events"])
    state["node_id"] = nxt["id"]
    state["passed_scenes"] = scenes
    state["status"] = "closed" if nxt["type"] == "outcome" else "open"
    state["updated_at"] = _now()


def play(script: dict[str, Any], choice_ids: list[str]) -> dict[str, Any]:
    """Drive a session with a fixed choice list. Used by tests. Returns the closed state."""

    state = start_session(script)
    for choice_id in choice_ids:
        submit_choice(state, script, choice_id)
    return state
