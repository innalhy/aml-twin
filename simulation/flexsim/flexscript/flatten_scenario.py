#!/usr/bin/env python3
"""Flatten a CONTRACT section 6 scenario JSON into the CSV that 12_replayScenario.fs reads.

    python3 flatten_scenario.py <scenario.json> [out_dir]

Writes <out_dir>/<scenario_id>.actions.csv. out_dir defaults to the CURRENT WORKING
DIRECTORY, never to the folder of the source JSON (an earlier version wrote next to the
source and littered reference/scenarios/). Columns:
    scenario_id, run_until_minute, at_minute, customer_id, action, p1, p2, p3
rows stable-sorted by at_minute (ties keep array order = phase 2 submission order).
Parameter mapping: hold p1=reason; release p1=note; request p1=request_id;
decide p1=decision, p2=evidence_ids joined by "|", p3=note; advance p1=to_minute.
An empty scenario gets one row with action "none" so the Global Table is never
empty. Import the file into the Global Table `scenario_actions` (first row as
column headers), then run `replayScenario();` in the Script Console.

Validation (mirrors reference/twinaml_ref/scenario.py, so a file this script accepts is
one the reference runner accepts; the FlexScript repeats the same checks at replay time):
  * scenario_id required; pack_id / contract_version, when present, must match;
  * run_until_minute > 0; every at_minute in [0, run_until_minute];
  * action in {hold, release, request, decide, advance}; customer_id required for the
    first four and must be a known customer (in ../data/tables/customers.csv with an
    account_id present in ../data/tables/initial_state.csv), else the row is refused
    by number (CONTRACT 4 "Unknown customer", CONTRACT 6 customer_id);
  * an action whose at_minute is behind the clock an earlier `advance` already moved
    to (target = min(to_minute, run_until_minute)) is refused by number, exactly where
    run_scenario() would raise ScenarioError.
Exit status 1 with the reason on stderr when a file is refused; nothing is written.

Mac-tested with Python 3.13 (stdlib only). This script never touches FlexSim.
"""

import csv
import json
import sys
from pathlib import Path

COLUMNS = ["scenario_id", "run_until_minute", "at_minute", "customer_id", "action", "p1", "p2", "p3"]
PACK_ID = "analyst-session-001"
CONTRACT_VERSION = "1.0"
ACTIONS = ("hold", "release", "request", "decide", "advance")
TABLES_DIR = Path(__file__).resolve().parent.parent / "data" / "tables"


class Refused(Exception):
    pass


def fmt(n) -> str:
    f = float(n)
    return str(int(f)) if f.is_integer() else repr(f)


def known_customers(tables_dir: Path = TABLES_DIR) -> set:
    """Customers in customers.csv whose account_id has an initial_state row (Tables.known_customers)."""
    with open(tables_dir / "initial_state.csv", newline="", encoding="utf-8") as fh:
        internal = {r["account_id"] for r in csv.DictReader(fh)}
    with open(tables_dir / "customers.csv", newline="", encoding="utf-8") as fh:
        return {c["customer_id"] for c in csv.DictReader(fh) if c["account_id"] in internal}


def flatten(path: Path, known: set) -> tuple[str, list[dict]]:
    sc = json.loads(path.read_text(encoding="utf-8"))
    sid = sc.get("scenario_id")
    if not sid:
        raise Refused(f"{path}: scenario_id is required")
    if sc.get("pack_id", PACK_ID) != PACK_ID or str(sc.get("contract_version", CONTRACT_VERSION)) != CONTRACT_VERSION:
        raise Refused(f"{path}: pack_id/contract_version mismatch")
    until = sc.get("run_until_minute", 30)
    if not until or float(until) <= 0:
        raise Refused(f"{path}: run_until_minute must be > 0")
    raw = sc.get("actions", []) or []
    for n, a in enumerate(raw):
        kind = a.get("action")
        if kind not in ACTIONS:
            raise Refused(f"{path}: action {n} has unknown action {kind!r}")
        at = a.get("at_minute", -1)
        if at < 0 or at > until:
            raise Refused(f"{path}: action {n} ({kind}) has at_minute {at!r} outside [0, {fmt(until)}]")
        if kind != "advance":
            cust = a.get("customer_id", "")
            if not cust:
                raise Refused(f"{path}: action {n} ({kind} at minute {fmt(at)}) lacks customer_id")
            if cust not in known:
                raise Refused(f"{path}: action {n} ({kind} at minute {fmt(at)}) names unknown customer_id "
                              f"{cust!r} (not in customers.csv with an internal account); file refused")
    actions = sorted(raw, key=lambda a: a["at_minute"])   # stable
    rows = []
    clock = 0.0   # where run_scenario() would have moved the clock before each action
    for i, a in enumerate(actions, start=1):
        p = a.get("params", {}) or {}
        kind = a["action"]
        at = float(a["at_minute"])
        if at < clock:
            raise Refused(f"{path}: row {i} ({kind}) is stamped at_minute {fmt(at)} but an earlier advance "
                          f"already moved the clock to {fmt(clock)}; the reference runner would refuse it")
        clock = max(clock, at)
        p1 = p2 = p3 = ""
        if kind == "hold":
            p1 = p.get("reason", "")
        elif kind == "release":
            p1 = p.get("note", "")
        elif kind == "request":
            p1 = p.get("request_id", "")
        elif kind == "decide":
            p1 = p.get("decision", "")
            p2 = "|".join(p.get("evidence_ids", []) or [])
            p3 = p.get("note", "")
        elif kind == "advance":
            to_minute = float(p.get("to_minute", at))
            p1 = fmt(to_minute)
            clock = max(clock, min(to_minute, float(until)))   # CONTRACT 4.7: capped target
        rows.append({"scenario_id": sid, "run_until_minute": fmt(until), "at_minute": fmt(at),
                     "customer_id": a.get("customer_id", ""), "action": kind, "p1": p1, "p2": p2, "p3": p3})
    if not rows:
        rows.append({"scenario_id": sid, "run_until_minute": fmt(until), "at_minute": "0",
                     "customer_id": "", "action": "none", "p1": "", "p2": "", "p3": ""})
    return sid, rows


def main(argv: list[str]) -> int:
    if len(argv) < 2:
        print(__doc__)
        return 2
    src = Path(argv[1])
    out_dir = Path(argv[2]) if len(argv) > 2 else Path.cwd()
    try:
        sid, rows = flatten(src, known_customers())
    except Refused as e:
        print(f"refused: {e}", file=sys.stderr)
        return 1
    out_dir.mkdir(parents=True, exist_ok=True)
    out = out_dir / f"{sid}.actions.csv"
    with open(out, "w", newline="", encoding="utf-8") as fh:
        w = csv.DictWriter(fh, fieldnames=COLUMNS, lineterminator="\n")
        w.writeheader()
        w.writerows(rows)
    print(out)
    return 0


if __name__ == "__main__":
    raise SystemExit(main(sys.argv))
