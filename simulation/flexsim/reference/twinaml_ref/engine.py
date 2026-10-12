"""The twin state machine of CONTRACT.md sections 1-5 (contract 1.0).

One ``Run`` holds the run-state tables of section 2, applies the actions of section 4 with
the three-phase ordering of section 3, and appends events in the schema of section 5.
"""

from datetime import datetime, timedelta, timezone
from typing import Dict, List, Optional, Sequence

from .tables import Tables, load_tables

PACK_ID = "analyst-session-001"
CONTRACT_VERSION = "1.0"
SNAPSHOT_AT = datetime(2026, 4, 15, 11, 12, tzinfo=timezone.utc)
DEFAULT_RUN_UNTIL = 30.0
DECISIONS = ("closure", "continue_review", "escalation")


def fmt_minute(m: float) -> str:
    """Section 1: integral minutes without a fractional part, else shortest round-trip."""
    m = float(m)
    return str(int(m)) if m.is_integer() else repr(m)


def wall_clock(m: float) -> str:
    return (SNAPSHOT_AT + timedelta(minutes=float(m))).strftime("%Y-%m-%dT%H:%M:%SZ")


class Run:
    """One play from reset to end. ``reset()`` rebuilds everything from the read-only tables."""

    def __init__(self, tables: Optional[Tables] = None, scenario_id: str = "guided",
                 run_until_minute: float = DEFAULT_RUN_UNTIL):
        self.t = tables or load_tables()
        self.scenario_id = scenario_id
        self.run_until = float(run_until_minute)
        self.reset()

    # ------------------------------------------------------------------ 4.8 reset
    def reset(self) -> None:
        self.accounts: Dict[str, dict] = {}
        for r in self.t.raw["initial_state"]:
            self.accounts[r["account_id"]] = {
                "account_id": r["account_id"], "customer_id": r["customer_id"],
                "balance": int(r["snapshot_balance"]), "account_status": "open",
                "held": False, "hold_reason": "", "hold_since_minute": None}
        self.orders: Dict[str, dict] = {}
        for d in self.t.raw["due_events"]:
            self.orders[d["transaction_id"]] = {
                "transaction_id": d["transaction_id"], "from_account": d["from_account"],
                "to_account": d["to_account"], "amount": int(d["amount"]),
                "due_minute": float(d["due_minute"]), "status": "pending",
                "executed_minute": None, "overdue": False}
        self.requests: Dict[tuple, dict] = {}
        self.evidence: Dict[str, Optional[float]] = {
            e["evidence_id"]: (0.0 if e["release"] == "initial" else None)
            for e in self.t.raw["evidence_catalog"]}
        self.decisions: List[dict] = []
        self.events: List[dict] = []
        self.now = 0.0
        self.next_seq = 1
        self.next_decision = 1
        self.ended = False
        self._due_checks_pending = True   # phase 3 of `now` not yet run (section 1.1)
        self._emit("run_start", detail=f"scenario_id={self.scenario_id};pack={PACK_ID};"
                                       f"contract={CONTRACT_VERSION}")

    # ------------------------------------------------------------------ helpers
    def _emit(self, event_type: str, customer_id: str = "", ref_id: str = "",
              amount="", detail: str = "") -> dict:
        account_id = self.t.account_of.get(customer_id, "") if customer_id else ""
        ev = {"seq": self.next_seq, "sim_minute": self.now, "customer_id": customer_id,
              "account_id": account_id, "event_type": event_type, "ref_id": ref_id,
              "amount": amount,
              "balance_after": self.accounts[account_id]["balance"] if account_id else "",
              "detail": detail}
        self.events.append(ev)
        self.next_seq += 1
        return ev

    def _account(self, customer_id: str) -> dict:
        return self.accounts[self.t.account_of[customer_id]]

    def _unknown(self, action: str, customer_id: str) -> Optional[dict]:
        """Section 4: a customer_id not in customers.csv, or without a run_accounts row, is
        rejected with a run-level `action_rejected` event (no account to attach it to)."""
        if customer_id in self.t.known_customers:
            return None
        return self._emit("action_rejected",
                          detail=f"reason=unknown_customer;action={action};customer_id={customer_id}")

    def is_visible(self, evidence_id: str, at: Optional[float] = None) -> bool:
        """Section 2.4: learner-visible iff available_from_minute is set and <= now."""
        avail = self.evidence.get(evidence_id)
        return avail is not None and avail <= (self.now if at is None else at)

    def visible_evidence(self) -> List[dict]:
        """What a learner UI may list right now (title, source, path); nothing else."""
        return [e for e in self.t.raw["evidence_catalog"] if self.is_visible(e["evidence_id"])]

    def balance(self, account_id: str) -> int:
        return self.accounts[account_id]["balance"]

    # ------------------------------------------------------------------ 4.1 / 4.2 holds
    def hold(self, customer_id: str, reason: str = "") -> dict:
        rejected = self._unknown("hold", customer_id)
        if rejected:
            return rejected
        acc = self._account(customer_id)
        if acc["held"]:
            return self._emit("hold_rejected", customer_id, detail="reason=already_held")
        acc.update(held=True, hold_reason=reason, hold_since_minute=self.now)
        return self._emit("hold_placed", customer_id, detail=f"reason={reason}")

    def release(self, customer_id: str, note: str = "") -> dict:
        rejected = self._unknown("release", customer_id)
        if rejected:
            return rejected
        acc = self._account(customer_id)
        if not acc["held"]:
            return self._emit("release_rejected", customer_id, detail="reason=not_held")
        acc.update(held=False, hold_reason="", hold_since_minute=None)
        ev = self._emit("hold_released", customer_id, detail=f"note={note}")
        # 4.3 release re-check: strictly overdue pending orders of this account only.
        for o in sorted((o for o in self.orders.values() if o["from_account"] == acc["account_id"]
                         and o["status"] == "pending" and o["due_minute"] < self.now),
                        key=lambda o: (o["due_minute"], o["transaction_id"])):
            self._check_order(o, "release")
        return ev

    # ------------------------------------------------------------------ 4.4 eligibility
    def _check_order(self, o: dict, trigger: str) -> None:
        if o["status"] != "pending":
            return
        acc = self.accounts[o["from_account"]]
        cust = acc["customer_id"]
        if acc["account_status"] != "open":
            return
        if acc["held"]:
            o["overdue"] = True
            self._emit("order_held", cust, o["transaction_id"], o["amount"],
                       f"hold_since={fmt_minute(acc['hold_since_minute'])}")
            return
        if acc["balance"] < o["amount"]:
            o["status"] = "failed_insufficient"
            self._emit("order_failed", cust, o["transaction_id"], o["amount"],
                       f"reason=insufficient_funds;available={acc['balance']}")
            return
        acc["balance"] -= o["amount"]
        o.update(status="executed", executed_minute=self.now)
        self._emit("order_executed", cust, o["transaction_id"], o["amount"],
                   f"to={o['to_account']};trigger={trigger}")

    # ------------------------------------------------------------------ 4.5 request
    def request(self, customer_id: str, request_id: str) -> dict:
        rejected = self._unknown("request", customer_id)
        if rejected:
            return rejected
        key = (customer_id, request_id)
        cat = self.t.request_catalog.get(key)
        if cat is None:
            return self._emit("request_rejected", customer_id, request_id,
                              detail="reason=unknown_request")
        if key in self.requests:
            return self._emit("request_rejected", customer_id, request_id,
                              detail="reason=duplicate")
        prereq = cat["prerequisite_evidence_id"]
        if prereq and not self.is_visible(prereq):
            return self._emit("request_rejected", customer_id, request_id,
                              detail=f"reason=prerequisite_missing:{prereq}")
        due = self.now + float(cat["service_minutes"])
        self.requests[key] = {
            "customer_id": customer_id, "request_id": request_id,
            "evidence_id": self.t.evidence_for_request(customer_id, request_id)["evidence_id"],
            "requested_minute": self.now, "due_minute": due, "status": "requested"}
        return self._emit("request_accepted", customer_id, request_id,
                          detail=f"due_minute={fmt_minute(due)}")

    # ------------------------------------------------------------------ 4.6 decide
    def decide(self, customer_id: str, decision: str, evidence_ids: Sequence[str] = (),
               note: str = "") -> dict:
        rejected = self._unknown("decide", customer_id)
        if rejected:
            return rejected
        if decision not in DECISIONS:
            return self._emit("decision_rejected", customer_id,
                              detail=f"reason=unknown_decision;decision={decision}")
        cat = self.t.evidence_catalog
        for eid in evidence_ids:
            if eid not in cat or cat[eid]["customer_id"] != customer_id or not self.is_visible(eid):
                return self._emit("decision_rejected", customer_id,
                                  detail=f"reason=evidence_not_available:{eid};decision={decision}")
        did = f"D{self.next_decision}"
        self.next_decision += 1
        self.decisions.append({"decision_id": did, "minute": self.now, "customer_id": customer_id,
                               "decision": decision, "evidence_ids": list(evidence_ids),
                               "note": note})
        return self._emit("decision_recorded", customer_id, did,
                          detail=f"decision={decision};cites={'|'.join(evidence_ids)};note={note}")

    # ------------------------------------------------------------------ section 3 phases
    def _phase1(self, m: float) -> None:
        due = [r for r in self.requests.values() if r["due_minute"] == m and r["status"] == "requested"]
        for r in sorted(due, key=lambda r: (r["due_minute"], r["customer_id"], r["evidence_id"])):
            r["status"] = "completed"
            self.evidence[r["evidence_id"]] = m
            title = self.t.evidence_catalog[r["evidence_id"]]["title"]
            self._emit("evidence_released", r["customer_id"], r["evidence_id"],
                       detail=f"request_id={r['request_id']};title={title}")

    def _phase3(self, m: float) -> None:
        due = [o for o in self.orders.values() if o["due_minute"] == m and o["status"] == "pending"]
        for o in sorted(due, key=lambda o: (o["due_minute"], o["from_account"], o["transaction_id"])):
            self._check_order(o, "due")

    def _leave_current_minute(self) -> None:
        if self._due_checks_pending:
            self._phase3(self.now)
            self._due_checks_pending = False

    # ------------------------------------------------------------------ 1.1 / 4.7 clock
    def scheduled_minutes(self) -> List[float]:
        """All scheduled minutes strictly after now (request completions, pending due minutes)."""
        s = {r["due_minute"] for r in self.requests.values() if r["status"] == "requested"}
        s |= {o["due_minute"] for o in self.orders.values() if o["status"] == "pending"}
        return sorted(m for m in s if m > self.now)

    def proceed_to(self, target: float) -> float:
        """Move the clock WITHOUT a clock_advanced event: process (now, target] per section 1.1
        and leave phase 3 of `target` for the next move. Only the scenario runner (reaching an
        action's at_minute, 4.7) and `end()` use this; learner advances go through `advance_to`."""
        target = min(float(target), self.run_until)
        if target <= self.now or self.ended:
            return self.now                          # 4.9: clock never moves backward
        self._leave_current_minute()
        for m in [m for m in self.scheduled_minutes() if m < target]:
            self.now = m
            self._phase1(m)
            self._phase3(m)
        self.now = target
        self._phase1(target)
        self._due_checks_pending = True
        return self.now

    def _advance(self, target: float) -> Optional[dict]:
        """4.7: any advance (guided click or scenario action) with target > now writes exactly one
        clock_advanced event (to_minute = the capped target) at the current minute, then moves the
        clock. target <= now (or an ended run) is ignored and writes nothing (4.9)."""
        target = min(float(target), self.run_until)
        if target <= self.now or self.ended:
            return None
        ev = self._emit("clock_advanced", detail=f"to_minute={fmt_minute(target)}")
        self.proceed_to(target)
        return ev

    def advance_to(self, target: float) -> float:
        self._advance(target)
        return self.now

    def advance_to_next_event(self) -> float:
        nxt = self.scheduled_minutes()
        return self.advance_to(nxt[0] if nxt else self.run_until)

    def advance_by(self, duration: float) -> float:
        """d <= 0 gives target <= now, which is ignored without an event (4.9)."""
        return self.advance_to(self.now + float(duration))

    def advance_action(self, to_minute: float) -> Optional[dict]:
        """Scenario-file `advance`: same rule as a guided click; returns the event or None."""
        return self._advance(to_minute)

    def end(self) -> dict:
        """Run until `run_until_minute`, run the due checks scheduled there, write run_end.
        Ending is not an advance: no clock_advanced event is written."""
        if self.ended:
            return self.events[-1]
        self.proceed_to(self.run_until)
        self._leave_current_minute()
        self.ended = True
        return self._emit("run_end", detail=f"final_minute={fmt_minute(self.now)}")

    # ------------------------------------------------------------------ state snapshot
    def summary(self) -> dict:
        return {
            "scenario_id": self.scenario_id, "pack_id": PACK_ID,
            "contract_version": CONTRACT_VERSION, "final_minute": fmt_minute(self.now),
            "event_count": len(self.events),
            "accounts": {a: {"balance": acc["balance"], "held": acc["held"]}
                         for a, acc in self.accounts.items()},
            "orders": {k: {"status": o["status"],
                           "executed_minute": None if o["executed_minute"] is None
                           else fmt_minute(o["executed_minute"]), "overdue": o["overdue"]}
                       for k, o in self.orders.items()},
            "visible_evidence": [e["evidence_id"] for e in self.visible_evidence()],
            "requests": [{"customer_id": r["customer_id"], "request_id": r["request_id"],
                          "status": r["status"], "due_minute": fmt_minute(r["due_minute"])}
                         for r in self.requests.values()],
            "decisions": [{**d, "minute": fmt_minute(d["minute"])} for d in self.decisions],
        }
