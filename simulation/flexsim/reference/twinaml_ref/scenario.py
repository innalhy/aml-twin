"""Scenario files (CONTRACT section 6) and their replay."""

import json
from pathlib import Path
from typing import Optional

from .engine import Run, PACK_ID, CONTRACT_VERSION, DEFAULT_RUN_UNTIL
from .tables import Tables, load_tables

ACTIONS = {"hold", "release", "request", "decide", "advance"}


class ScenarioError(ValueError):
    pass


def load_scenario(path: Path, tables: Optional[Tables] = None) -> dict:
    """Load and validate a scenario file. `tables` (default: the data tables) supplies the known
    customers; an action on a customer_id outside customers.csv is refused here, before replay."""
    with open(path, encoding="utf-8") as fh:
        sc = json.load(fh)
    known = (tables or load_tables()).known_customers
    if not sc.get("scenario_id"):
        raise ScenarioError(f"{path}: scenario_id is required")
    if sc.get("pack_id", PACK_ID) != PACK_ID:
        raise ScenarioError(f"{path}: pack_id must be {PACK_ID}")
    if str(sc.get("contract_version", CONTRACT_VERSION)) != CONTRACT_VERSION:
        raise ScenarioError(f"{path}: contract_version must be {CONTRACT_VERSION}")
    until = sc.get("run_until_minute", DEFAULT_RUN_UNTIL)
    if not until or until <= 0:
        raise ScenarioError(f"{path}: run_until_minute must be > 0")
    actions = sc.get("actions", [])
    for a in actions:
        if a.get("action") not in ACTIONS:
            raise ScenarioError(f"{path}: unknown action {a.get('action')!r}")
        if a.get("at_minute", -1) < 0 or a["at_minute"] > until:
            raise ScenarioError(f"{path}: at_minute out of range in {a}")
        if a["action"] != "advance" and not a.get("customer_id"):
            raise ScenarioError(f"{path}: customer_id required for {a['action']}")
        if a["action"] != "advance" and a["customer_id"] not in known:
            raise ScenarioError(f"{path}: unknown customer_id {a['customer_id']!r} in {a} "
                                f"(not in customers.csv with an internal account)")
    sc["run_until_minute"] = until
    sc["actions"] = sorted(actions, key=lambda a: a["at_minute"])   # stable: ties keep order
    return sc


def apply_action(run: Run, a: dict) -> None:
    p = a.get("params", {}) or {}
    kind, cust = a["action"], a.get("customer_id", "")
    if kind == "hold":
        run.hold(cust, p.get("reason", ""))
    elif kind == "release":
        run.release(cust, p.get("note", ""))
    elif kind == "request":
        run.request(cust, p.get("request_id", ""))
    elif kind == "decide":
        run.decide(cust, p.get("decision", ""), p.get("evidence_ids", []) or [], p.get("note", ""))
    elif kind == "advance":
        run.advance_action(p.get("to_minute", run.now))


def run_scenario(sc: dict, tables: Optional[Tables] = None, run: Optional[Run] = None) -> Run:
    """Replay a loaded scenario. Pass an existing `run` to test reset (it is reset first)."""
    if run is None:
        run = Run(tables, sc["scenario_id"], sc["run_until_minute"])
    else:
        run.scenario_id, run.run_until = sc["scenario_id"], float(sc["run_until_minute"])
        run.reset()
    for a in sc["actions"]:
        if a["at_minute"] < run.now:
            raise ScenarioError(f"{sc['scenario_id']}: action at {a['at_minute']} after the clock "
                                f"already reached {run.now} (an `advance` jumped past it)")
        run.proceed_to(a["at_minute"])      # the runner advances on its own: no clock_advanced (4.7)
        apply_action(run, a)
    run.end()
    return run
