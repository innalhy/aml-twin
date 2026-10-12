"""Debrief (CONTRACT section 8).

``learner_debrief`` reads ONLY the event log plus learner-visible tables. It never touches
``answer-key.json`` or unreleased records and produces no score.
``instructor_debrief`` is a separate artefact built only when explicitly asked.
"""

import json
from pathlib import Path
from typing import Dict, List, Optional

from .engine import fmt_minute, wall_clock, SNAPSHOT_AT
from .tables import Tables, REPO_ROOT
from .trace import parse_detail

ANSWER_KEY = REPO_ROOT / "data/evidence/analyst-session-001/instructor/answer-key.json"


def _kv(event: dict) -> Dict[str, str]:
    """Detail of one event by the fixed key order of CONTRACT 5 (free text last, verbatim)."""
    return parse_detail(event["event_type"], event["detail"])


def _due_minutes(tables: Tables, account_id: str) -> List[float]:
    """From learner-visible transactions.csv: pending rows' scheduled_at minus the snapshot."""
    from datetime import datetime, timezone
    mins = []
    for tx in tables.raw["transactions"]:
        if tx["from_account"] == account_id and tx["status"] == "pending" and tx["scheduled_at"]:
            at = datetime.strptime(tx["scheduled_at"], "%Y-%m-%dT%H:%M:%SZ").replace(tzinfo=timezone.utc)
            mins.append((at - SNAPSHOT_AT).total_seconds() / 60)
    return sorted(mins)


def _hold_position(minute: float, dues: List[float]) -> str:
    if not dues:
        return "no due minutes"
    if minute in dues:
        return "at due minute"
    if minute < dues[0]:
        return "before first due"
    if minute > dues[-1]:
        return "after both due"
    return "between due minutes"


def _ledger_balance(tables: Tables, account_id: str) -> int:
    bal = 0
    for tx in tables.raw["transactions"]:
        if tx["status"] != "executed":
            continue
        if tx["from_account"] == account_id:
            bal -= int(tx["amount"])
        if tx["to_account"] == account_id:
            bal += int(tx["amount"])
    for a in tables.raw["accounts"]:
        if a["account_id"] == account_id and a["opening_balance"]:
            bal += int(a["opening_balance"])
    return bal


def learner_debrief(events: List[dict], tables: Tables, run_until: float) -> dict:
    final_minute = next((float(e["sim_minute"]) for e in events if e["event_type"] == "run_end"),
                        run_until)
    initial_ev = {}  # learner-visible subset of the catalog: initial rows only
    for e in tables.raw["evidence_catalog"]:
        if e["release"] == "initial":
            initial_ev.setdefault(e["customer_id"], []).append(e["evidence_id"])
    main = [c["customer_id"] for c in tables.raw["customers"] if c["customer_id"] in ("SYN-001", "SYN-002")]
    customers = sorted(set(main) | {e["customer_id"] for e in events if e["customer_id"]})
    out = {"final_minute": fmt_minute(final_minute), "customers": {}}
    for cust in customers:
        acc_id = tables.account_of[cust]
        evs = [e for e in events if e["customer_id"] == cust]
        dues = _due_minutes(tables, acc_id)
        released = {}   # evidence_id -> minute, from events only
        for e in evs:
            if e["event_type"] == "evidence_released":
                released[e["ref_id"]] = float(e["sim_minute"])
        # holds
        holds, open_hold = [], None
        for e in evs:
            m = float(e["sim_minute"])
            if e["event_type"] == "hold_placed":
                open_hold = {"placed_minute": fmt_minute(m), "position": _hold_position(m, dues),
                             "reason": _kv(e).get("reason", "")}
            elif e["event_type"] == "hold_released" and open_hold:
                open_hold.update(released_minute=fmt_minute(m),
                                 duration_minutes=fmt_minute(m - float(open_hold["placed_minute"])))
                holds.append(open_hold)
                open_hold = None
        if open_hold:
            open_hold.update(released_minute=None, open_at_run_end=True,
                             duration_minutes=fmt_minute(final_minute - float(open_hold["placed_minute"])))
            holds.append(open_hold)
        # orders
        orders = {}
        for e in evs:
            if e["event_type"] not in ("order_executed", "order_held", "order_failed"):
                continue
            o = orders.setdefault(e["ref_id"], {"held_at_due": False, "outcome": "held, still pending at run end"})
            m = fmt_minute(float(e["sim_minute"]))
            if e["event_type"] == "order_held":
                o["held_at_due"] = True
            elif e["event_type"] == "order_failed":
                o["outcome"] = "failed insufficient funds"
            else:
                trig = _kv(e).get("trigger", "")
                o["outcome"] = (f"held at due minute, released and executed at {m}" if o["held_at_due"]
                                else f"executed at {m} ({trig})")
        for tx in tables.raw["transactions"]:
            if tx["from_account"] == acc_id and tx["status"] == "pending":
                orders.setdefault(tx["transaction_id"], {"held_at_due": False,
                                  "outcome": "pending, never checked before run end"})
        balances = [int(e["balance_after"]) for e in evs if str(e["balance_after"]) != ""]
        final_balance = balances[-1] if balances else _ledger_balance(tables, acc_id)
        # requests
        requests = []
        for e in evs:
            if e["event_type"] == "request_accepted":
                done = next((fmt_minute(float(x["sim_minute"])) for x in evs
                             if x["event_type"] == "evidence_released"
                             and _kv(x).get("request_id") == e["ref_id"]), None)
                requests.append({"request_id": e["ref_id"], "requested_minute": fmt_minute(float(e["sim_minute"])),
                                 "completed_minute": done or "outstanding at run end", "accepted": True})
            elif e["event_type"] == "request_rejected":
                requests.append({"request_id": e["ref_id"], "minute": fmt_minute(float(e["sim_minute"])),
                                 "accepted": False, "reason": _kv(e).get("reason", "")})
        # decisions
        decisions = []
        for e in evs:
            if e["event_type"] != "decision_recorded":
                continue
            m = float(e["sim_minute"])
            kv = _kv(e)
            cites = [c for c in kv.get("cites", "").split("|") if c]
            available = sorted(set(initial_ev.get(cust, [])) | {k for k, v in released.items() if v <= m})
            outstanding = [r["request_id"] for r in requests if r["accepted"]
                           and float(r["requested_minute"]) <= m
                           and (r["completed_minute"] == "outstanding at run end"
                                or float(r["completed_minute"]) > m)]
            flags = []
            if outstanding:
                flags.append(f"decided with {len(outstanding)} requests outstanding")
            if not kv.get("note"):
                flags.append("empty note")
            if not cites:
                flags.append("cited nothing")
            decisions.append({"decision_id": e["ref_id"], "seq": int(e["seq"]), "minute": fmt_minute(m),
                              "wall_clock": wall_clock(m), "decision": kv.get("decision"), "cites": cites, "note": kv.get("note", ""),
                              "evidence_available": available, "requests_outstanding": outstanding,
                              "flags": flags})
        # consistency flags (CONTRACT 8.1): "afterwards" is (sim_minute, seq) greater than the
        # decision's, so an execution in phase 3 of the decision's own minute counts.
        flags = []
        for d in decisions:
            stamp = (float(d["minute"]), d["seq"])
            if d["decision"] == "escalation" and any(
                    e["event_type"] == "order_executed"
                    and (float(e["sim_minute"]), int(e["seq"])) > stamp for e in evs):
                flags.append("escalation recorded while orders executed afterwards")
            if d["decision"] == "closure" and d["requests_outstanding"]:
                flags.append("closure while a request is outstanding")
        if decisions and decisions[-1]["decision"] == "closure" and holds and holds[-1].get("open_at_run_end"):
            flags.append("hold still in place at run end after closure")
        out["customers"][cust] = {
            "account_id": acc_id,
            "timeline": [{"seq": int(e["seq"]), "minute": fmt_minute(float(e["sim_minute"])),
                          "wall_clock": wall_clock(float(e["sim_minute"])), "event_type": e["event_type"],
                          "ref_id": e["ref_id"], "detail": e["detail"]} for e in evs],
            "holds": holds, "orders": orders, "final_balance": final_balance,
            "requests": requests, "decisions": decisions, "consistency_flags": sorted(set(flags))}
    return out


def instructor_debrief(learner: dict, tables: Tables, answer_key_path: Optional[Path] = None) -> dict:
    """Separate artefact (8.2). Loads answer-key.json only here, only when called."""
    with open(answer_key_path or ANSWER_KEY, encoding="utf-8") as fh:
        key = json.load(fh)
    out = {"source": "instructor/answer-key.json", "rubric": key.get("rubric", []),
           "learner_debrief": learner, "cases": {}}
    final = float(learner["final_minute"])
    catalog = tables.evidence_catalog
    for case in key.get("cases", []):
        cust = case["customer_id"]
        ld = learner["customers"].get(cust, {})
        decisions = ld.get("decisions", [])
        # 8.2: coverage is judged at the current (latest) decision; with no decision, at run end.
        if decisions:
            available = set(decisions[-1]["evidence_available"])
            cited = set(decisions[-1]["cites"])
        else:
            available = ({e for e, c in catalog.items() if c["customer_id"] == cust and c["release"] == "initial"}
                         | {t["ref_id"] for t in ld.get("timeline", []) if t["event_type"] == "evidence_released"})
            cited = set()
        accepted = {r["request_id"] for r in ld.get("requests", []) if r["accepted"]}
        dues = _due_minutes(tables, tables.account_of[cust])
        impact = 0.0
        for tx, o in ld.get("orders", {}).items():
            due = dues[0] if tx.endswith("-2") else dues[-1] if dues else 0.0
            if "released and executed at" in o["outcome"]:
                impact += float(o["outcome"].rsplit(" ", 1)[-1]) - due
            elif o["outcome"].startswith("held"):
                impact += final - due
        out["cases"][cust] = {
            "case_kind": case["case_kind"], "authored_truth": case["authored_truth"],
            # per decisive ID: was it available at the current decision, cited there, and was the
            # request that releases it ever accepted (initial records need no request). No score.
            "decisive_evidence": {
                e: {"available": e in available, "cited": e in cited,
                    "requested": catalog[e]["release"] == "initial" or catalog[e]["request_id"] in accepted}
                for e in case["decisive_evidence"]},
            "acceptable_actions": case["acceptable_actions"], "poor_actions": case["poor_actions"],
            "current_decision": decisions[-1]["decision"] if decisions else None,
            "customer_impact_minutes": fmt_minute(impact)}
    return out
