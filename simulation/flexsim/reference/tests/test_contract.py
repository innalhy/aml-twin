"""Acceptance checks of CONTRACT.md (contract 1.0) against the reference harness.

Run:  python3 -m unittest discover -s simulation/flexsim/reference/tests
Mac-tested, stdlib only. Nothing here runs in FlexSim.
"""

import csv
import json
import sys
import tempfile
import unittest
from pathlib import Path

HERE = Path(__file__).resolve().parent
REF = HERE.parent
sys.path.insert(0, str(REF))

from twinaml_ref import (Run, load_tables, load_scenario, run_scenario, learner_debrief,  # noqa: E402
                         instructor_debrief, write_events_csv, fmt_minute)
from twinaml_ref.scenario import ScenarioError  # noqa: E402
from twinaml_ref.trace import event_row, parse_detail  # noqa: E402
import compare_trace  # noqa: E402

T = load_tables()
MAIN = {"SYN-001": "SYN-A001", "SYN-002": "SYN-A002"}
ORDERS = {"SYN-A001": ("TX-2", "TX-3"), "SYN-A002": ("TX-L-2", "TX-L-3")}
DOCS = {"SYN-001": "EV-006", "SYN-002": "EV-016"}
PAYER = {"SYN-001": "EV-007", "SYN-002": "EV-017"}
ON_REQUEST = {e["evidence_id"] for e in T.raw["evidence_catalog"] if e["release"] == "on_request"}
KEY_FIELDS = ("authored_truth", "case_kind", "decisive_evidence", "expected_reasoning", "poor_actions",
              "acceptable_actions", "source_case_id")


def rows(run, account=None, types=None, drop_seq=False):
    out = [event_row(e) for e in run.events]
    if account:
        out = [r for r in out if r["account_id"] == account]
    if types:
        out = [r for r in out if r["event_type"] in types]
    if drop_seq:   # the other account's rows keep content but shift seq when this account adds events
        out = [{k: v for k, v in r.items() if k != "seq"} for r in out]
    return out


def other(cust):
    return "SYN-002" if cust == "SYN-001" else "SYN-001"


class PaymentEngine(unittest.TestCase):
    """Each check runs per account, independently (the other account must look like no_hold)."""

    def assert_other_untouched(self, run, cust):
        o_acc = MAIN[other(cust)]
        base = Run(T, "base"); base.end()
        self.assertEqual(rows(run, o_acc, drop_seq=True), rows(base, o_acc, drop_seq=True))
        self.assertEqual(run.balance(o_acc), 10000)

    def test_no_hold_both_execute(self):
        run = Run(T, "no_hold"); run.end()
        for acc in MAIN.values():
            self.assertEqual(run.balance(acc), 10000)
            self.assertEqual([r["ref_id"] for r in rows(run, acc)], list(ORDERS[acc]))
        self.assertEqual(run.events[0]["event_type"], "run_start")
        self.assertEqual(run.events[-1]["event_type"], "run_end")
        self.assertEqual([e["seq"] for e in run.events], list(range(1, len(run.events) + 1)))

    def test_hold_at_10_blocks_both(self):
        for cust, acc in MAIN.items():
            run = Run(T, "b"); run.advance_to(10); run.hold(cust, "r"); run.end()
            self.assertEqual(run.balance(acc), 480000)
            self.assertEqual([(r["event_type"], r["ref_id"], r["detail"]) for r in rows(run, acc)],
                             [("hold_placed", "", "reason=r"), ("order_held", ORDERS[acc][0], "hold_since=10"),
                              ("order_held", ORDERS[acc][1], "hold_since=10")])
            self.assertTrue(all(o["status"] == "pending" for o in run.orders.values() if o["from_account"] == acc))
            self.assert_other_untouched(run, cust)

    def test_hold_at_20_first_executed_second_held(self):
        for cust, acc in MAIN.items():
            run = Run(T, "c"); run.advance_to(20); run.hold(cust, "r"); run.end()
            self.assertEqual(run.balance(acc), 250000)
            self.assertEqual(run.orders[ORDERS[acc][0]]["status"], "executed")
            self.assertEqual(run.orders[ORDERS[acc][1]]["status"], "pending")
            self.assertTrue(run.orders[ORDERS[acc][1]]["overdue"])
            self.assert_other_untouched(run, cust)

    def test_hold_exactly_at_due_minute_wins(self):
        for cust, acc in MAIN.items():
            run = Run(T, "f"); run.advance_to(18); run.hold(cust, "r"); run.end()
            self.assertEqual(run.balance(acc), 480000)
            held = rows(run, acc, {"order_held"})
            self.assertEqual([r["ref_id"] for r in held], list(ORDERS[acc]))
            self.assertEqual(held[0]["detail"], "hold_since=18")
            # hold_placed (phase 2) precedes order_held (phase 3) at minute 18
            self.assertLess(rows(run, acc, {"hold_placed"})[0]["seq"], held[0]["seq"])
            self.assert_other_untouched(run, cust)

    def test_release_after_both_due_executes_exactly_once(self):
        for cust, acc in MAIN.items():
            run = Run(T, "d"); run.advance_to(10); run.hold(cust, "r"); run.advance_to(30)
            run.release(cust, "ok"); run.end()
            ex = rows(run, acc, {"order_executed"})
            self.assertEqual([(r["ref_id"], r["sim_minute"], r["detail"].split(";")[1]) for r in ex],
                             [(ORDERS[acc][0], "30", "trigger=release"), (ORDERS[acc][1], "30", "trigger=release")])
            self.assertEqual(run.balance(acc), 10000)
            self.assert_other_untouched(run, cust)

    def test_release_between_due_minutes(self):
        for cust, acc in MAIN.items():
            run = Run(T, "d2"); run.advance_to(10); run.hold(cust, "r"); run.advance_to(20)
            run.release(cust, "ok"); run.end()
            ex = rows(run, acc, {"order_executed"})
            self.assertEqual([(r["ref_id"], r["sim_minute"], r["detail"].split(";")[1]) for r in ex],
                             [(ORDERS[acc][0], "20", "trigger=release"), (ORDERS[acc][1], "23", "trigger=due")])
            self.assertEqual(run.balance(acc), 10000)

    def test_release_exactly_at_due_leaves_order_to_phase3(self):
        for cust, acc in MAIN.items():
            run = Run(T, "r18"); run.advance_to(10); run.hold(cust, "r"); run.advance_to(18)
            run.release(cust, "ok"); run.end()
            ex = rows(run, acc, {"order_executed"})
            self.assertEqual(len(ex), 2)
            self.assertEqual((ex[0]["sim_minute"], ex[0]["detail"]), ("18", f"to={run.orders[ORDERS[acc][0]]['to_account']};trigger=due"))
            self.assertEqual(run.balance(acc), 10000)

    def test_hold_never_undoes_executed_transfer(self):
        run = Run(T, "x"); run.advance_to(19); run.hold("SYN-001", "late"); run.end()
        self.assertEqual(run.orders["TX-2"]["status"], "executed")
        self.assertEqual(run.balance("SYN-A001"), 250000)

    def test_insufficient_funds_branch(self):
        run = Run(T, "poor"); run.accounts["SYN-A001"]["balance"] = 100   # pack data cannot reach this
        run.end()
        self.assertEqual(run.orders["TX-2"]["status"], "failed_insufficient")
        self.assertEqual(rows(run, "SYN-A001", {"order_failed"})[0]["detail"], "reason=insufficient_funds;available=100")
        self.assertEqual(run.balance("SYN-A001"), 100)
        # terminal: a later release re-check must not revisit it
        run2 = Run(T, "poor2"); run2.accounts["SYN-A001"]["balance"] = 100; run2.end()
        self.assertEqual(len(rows(run2, "SYN-A001", {"order_failed"})), 2)

    def test_decimal_minutes_format(self):
        run = Run(T, "dec"); run.advance_to(17.5); run.hold("SYN-001", "r"); run.end()
        self.assertEqual(rows(run, "SYN-A001", {"hold_placed"})[0]["sim_minute"], "17.5")
        self.assertEqual(rows(run, "SYN-A001", {"order_held"})[0]["detail"], "hold_since=17.5")
        self.assertEqual(fmt_minute(18.0), "18")


class Idempotency(unittest.TestCase):
    def test_duplicate_actions_never_duplicate(self):
        for cust, acc in MAIN.items():
            run = Run(T, "e")
            run.request(cust, "request_supporting_documents"); run.advance_to(3)
            run.request(cust, "request_supporting_documents"); run.advance_to(10); run.hold(cust, "r")
            run.advance_to(12); run.hold(cust, "r"); run.advance_to(25); run.release(cust, "n")
            run.advance_to(26); run.release(cust, "n"); run.end()
            types = [r["event_type"] for r in rows(run, acc)]
            self.assertEqual(types.count("evidence_released"), 1)
            self.assertEqual(types.count("order_executed"), 2)
            self.assertIn("request_rejected", types)
            self.assertEqual(rows(run, acc, {"request_rejected"})[0]["detail"], "reason=duplicate")
            self.assertEqual(rows(run, acc, {"hold_rejected"})[0]["detail"], "reason=already_held")
            self.assertEqual(rows(run, acc, {"release_rejected"})[0]["detail"], "reason=not_held")
            self.assertEqual(run.balance(acc), 10000)

    def test_rejected_request_does_not_block_retry(self):
        run = Run(T, "retry")
        run.request("SYN-001", "verify_payer")
        run.request("SYN-001", "request_supporting_documents"); run.advance_to(8)
        self.assertEqual(run.request("SYN-001", "verify_payer")["event_type"], "request_accepted")

    def test_unknown_request_and_decision(self):
        run = Run(T, "u")
        self.assertEqual(run.request("SYN-003", "review_kyc_log")["detail"], "reason=unknown_request")
        self.assertEqual(run.request("SYN-001", "nope")["detail"], "reason=unknown_request")
        self.assertEqual(run.decide("SYN-001", "approve", [], "")["detail"], "reason=unknown_decision;decision=approve")

    def test_advance_backwards_ignored(self):
        run = Run(T, "back"); run.advance_to(10)
        n = len(run.events)
        run.advance_to(5); run.advance_to(10); run.advance_by(0); run.advance_by(-3)
        self.assertEqual(run.now, 10)
        self.assertEqual(len(run.events), n, "an advance with target <= now writes nothing (4.9)")
        self.assertEqual([r["detail"] for r in rows(run, types={"clock_advanced"})], ["to_minute=10"])

    # ---- C: unknown customer_id -------------------------------------------------------------
    def test_unknown_customer_rejected_with_run_level_event(self):
        run = Run(T, "unk")
        before = (json.dumps(run.accounts, sort_keys=True), dict(run.evidence))
        expect = []
        for action, call in (("hold", lambda: run.hold("SYN-999", "r")),
                             ("release", lambda: run.release("SYN-999", "n")),
                             ("request", lambda: run.request("SYN-999", "review_kyc_log")),
                             ("decide", lambda: run.decide("SYN-999", "closure", ["EV-001"], "n"))):
            ev = event_row(call())
            self.assertEqual((ev["event_type"], ev["customer_id"], ev["account_id"], ev["ref_id"], ev["balance_after"]),
                             ("action_rejected", "", "", "", ""))
            self.assertEqual(ev["detail"], f"reason=unknown_customer;action={action};customer_id=SYN-999")
            expect.append(ev["detail"])
        self.assertEqual([r["detail"] for r in rows(run, types={"action_rejected"})], expect)
        self.assertEqual((json.dumps(run.accounts, sort_keys=True), dict(run.evidence)), before)
        self.assertEqual((run.requests, run.decisions, run.next_decision), ({}, [], 1))
        run.end()
        self.assertEqual(run.balance("SYN-A001"), 10000)
        # the debrief ignores run-level rows: no section for SYN-999, no crash
        d = learner_debrief(run.events, T, run.run_until)
        self.assertEqual(set(d["customers"]), {"SYN-001", "SYN-002"})

    def test_load_scenario_refuses_unknown_customer(self):
        sc = {"scenario_id": "bad", "run_until_minute": 30,
              "actions": [{"at_minute": 1, "customer_id": "SYN-999", "action": "hold", "params": {"reason": "x"}}]}
        with tempfile.TemporaryDirectory() as td:
            p = Path(td) / "bad.json"
            p.write_text(json.dumps(sc), encoding="utf-8")
            with self.assertRaises(ScenarioError) as ctx:
                load_scenario(p, T)
            self.assertIn("unknown customer_id 'SYN-999'", str(ctx.exception))
            sc["actions"][0]["customer_id"] = "SYN-003"      # background customer: known, replayable
            p.write_text(json.dumps(sc), encoding="utf-8")
            self.assertEqual(load_scenario(p, T)["actions"][0]["customer_id"], "SYN-003")


class EvidenceAndRequests(unittest.TestCase):
    def test_prerequisite_and_timing_8_then_20(self):
        for cust, acc in MAIN.items():
            run = Run(T, "h")
            self.assertEqual(run.request(cust, "verify_payer")["detail"], f"reason=prerequisite_missing:{DOCS[cust]}")
            run.request(cust, "request_supporting_documents")
            self.assertFalse(run.is_visible(DOCS[cust]))
            run.advance_to(8)
            self.assertTrue(run.is_visible(DOCS[cust]))
            ev = run.request(cust, "verify_payer")
            self.assertEqual((ev["event_type"], ev["detail"]), ("request_accepted", "due_minute=28"))
            run.advance_to(20)
            self.assertEqual(run.decide(cust, "escalation", [PAYER[cust]], "n")["detail"],
                             f"reason=evidence_not_available:{PAYER[cust]};decision=escalation")
            run.advance_to(28)
            self.assertTrue(run.is_visible(PAYER[cust]))
            self.assertEqual(run.decide(cust, "escalation", [PAYER[cust]], "n")["event_type"], "decision_recorded")
            # phase 1 before phase 2 at minute 8 and 28
            r = rows(run, acc)
            m8 = [x["event_type"] for x in r if x["sim_minute"] == "8"]
            self.assertEqual(m8, ["evidence_released", "request_accepted"])
            m28 = [x["event_type"] for x in r if x["sim_minute"] == "28"]
            self.assertEqual(m28, ["evidence_released", "decision_recorded"])
            self.assertEqual(run.balance(acc), 10000)   # waiting for evidence never delays payments

    def test_phase1_ordering_by_evidence_id(self):
        run = Run(T, "p1"); run.request("SYN-001", "review_kyc_log"); run.advance_to(5)
        run.request("SYN-001", "verify_recipients"); run.advance_to(15)
        self.assertEqual([r["ref_id"] for r in rows(run, "SYN-A001", {"evidence_released"})], ["EV-005", "EV-009"])

    def test_nothing_released_after_run_end(self):
        run = Run(T, "late", run_until_minute=20); run.advance_to(10); run.request("SYN-001", "review_kyc_log"); run.end()
        self.assertFalse(run.is_visible("EV-005"))
        self.assertEqual(run.requests[("SYN-001", "review_kyc_log")]["status"], "requested")
        self.assertEqual(run.orders["TX-3"]["status"], "pending")

    def test_decision_does_not_hold_and_closure_does_not_release(self):
        for cust, acc in MAIN.items():
            run = Run(T, "dec"); run.advance_to(10)
            run.decide(cust, "escalation", [], "escalate"); run.end()
            self.assertEqual(run.balance(acc), 10000)
            run = Run(T, "cl"); run.advance_to(10); run.hold(cust, "r"); run.advance_to(20)
            run.decide(cust, "closure", [], "close"); run.end()
            self.assertTrue(run.accounts[acc]["held"])
            self.assertEqual(run.balance(acc), 480000)

    def test_decision_citing_foreign_record_rejected(self):
        run = Run(T, "fr")
        self.assertIn("evidence_not_available:EV-011", run.decide("SYN-001", "closure", ["EV-001", "EV-011"], "")["detail"])
        self.assertEqual(run.decide("SYN-001", "closure", ["EV-001"], "")["ref_id"], "D1")
        self.assertEqual(run.decide("SYN-002", "closure", ["EV-011"], "")["ref_id"], "D2")


class IsolationAndReset(unittest.TestCase):
    def test_actions_on_one_account_do_not_affect_other(self):
        base = Run(T, "base"); base.end()
        sc = load_scenario(REF / "scenarios" / "cross_account_isolation.json")
        run = run_scenario(sc, T)
        self.assertEqual(rows(run, "SYN-A002", drop_seq=True), rows(base, "SYN-A002", drop_seq=True))
        self.assertEqual(run.accounts["SYN-A002"], base.accounts["SYN-A002"])
        self.assertEqual({k: v for k, v in run.evidence.items() if T.evidence_catalog[k]["customer_id"] == "SYN-002"},
                         {k: v for k, v in base.evidence.items() if T.evidence_catalog[k]["customer_id"] == "SYN-002"})

    def test_actions_on_syn_002_do_not_affect_syn_001(self):
        """Mirror of cross_account_isolation.json with SYN-002 acting; every SYN-A001 row equals no_hold."""
        base = Run(T, "base"); base.end()
        run = Run(T, "iso2")
        run.request("SYN-002", "request_supporting_documents"); run.proceed_to(5); run.hold("SYN-002", "Payer and recipients unverified")
        run.proceed_to(12); run.decide("SYN-002", "continue_review", ["EV-011", "EV-016"], "Waiting for checks")
        run.proceed_to(20); run.release("SYN-002", "Concerns resolved")
        run.proceed_to(27); run.decide("SYN-002", "closure", ["EV-011", "EV-016"], "Closed"); run.end()
        self.assertEqual(rows(run, "SYN-A001", drop_seq=True), rows(base, "SYN-A001", drop_seq=True))
        self.assertEqual(run.accounts["SYN-A001"], base.accounts["SYN-A001"])
        self.assertEqual({k: v for k, v in run.evidence.items() if T.evidence_catalog[k]["customer_id"] == "SYN-001"},
                         {k: v for k, v in base.evidence.items() if T.evidence_catalog[k]["customer_id"] == "SYN-001"})
        self.assertEqual(run.balance("SYN-A002"), 10000)
        self.assertEqual([r["detail"] for r in rows(run, "SYN-A002", {"order_executed"})],
                         ["to=SYN-X05;trigger=release", "to=SYN-X06;trigger=due"])

    def test_reset_restores_snapshot_and_replays_identically(self):
        run = Run(T, "no_hold")
        run.request("SYN-001", "request_supporting_documents"); run.advance_to(10); run.hold("SYN-001", "r")
        run.decide("SYN-001", "continue_review", ["EV-001"], ""); run.end()
        run.reset()
        self.assertEqual(run.now, 0)
        self.assertEqual([run.balance(a) for a in MAIN.values()], [480000, 480000])
        self.assertTrue(all(o["status"] == "pending" and not o["overdue"] for o in run.orders.values()))
        self.assertEqual(len(run.visible_evidence()), 12)
        self.assertFalse(any(run.is_visible(e) for e in ON_REQUEST))
        self.assertFalse(any(a["held"] for a in run.accounts.values()))
        self.assertEqual((run.requests, run.decisions, run.next_decision), ({}, [], 1))
        self.assertEqual([e["seq"] for e in run.events], [1])
        run.end()
        base = Run(T, "no_hold"); base.end()
        self.assertEqual(rows(run), rows(base))


class GuidedMode(unittest.TestCase):
    def test_advance_to_next_event(self):
        run = Run(T, "g"); run.request("SYN-001", "request_supporting_documents")
        self.assertEqual(run.advance_to_next_event(), 8)
        self.assertTrue(run.is_visible("EV-006"))             # phase 1 ran on arrival
        self.assertEqual(run.advance_to_next_event(), 18)
        self.assertEqual(run.orders["TX-2"]["status"], "pending")   # phase 3 of 18 waits
        run.hold("SYN-001", "r")                              # ... so a hold here still wins
        self.assertEqual(run.advance_to_next_event(), 23)
        self.assertEqual(run.orders["TX-2"]["status"], "pending")
        self.assertEqual(run.orders["TX-L-2"]["status"], "executed")
        run.release("SYN-001", "ok")                          # TX-2 overdue -> executes now
        self.assertEqual(run.orders["TX-2"]["status"], "executed")
        self.assertEqual(run.orders["TX-3"]["status"], "pending")   # due now: left to phase 3
        self.assertEqual(run.advance_to_next_event(), 30)     # nothing scheduled -> run_until
        self.assertEqual(run.orders["TX-3"]["status"], "executed")
        self.assertEqual(run.balance("SYN-A001"), 10000)

    def test_advance_by_duration_and_cap(self):
        run = Run(T, "g2"); run.advance_by(6); self.assertEqual(run.now, 6)
        run.advance_by(6); run.advance_by(6)                  # 12, 18
        self.assertEqual(run.now, 18)
        self.assertEqual(run.orders["TX-2"]["status"], "pending")
        run.advance_by(100)
        self.assertEqual(run.now, 30)
        self.assertEqual(run.balance("SYN-A001"), 10000)
        self.assertEqual(rows(run, types={"clock_advanced"})[-1]["detail"], "to_minute=30")   # capped target
        n = len(run.events)
        self.assertEqual(run.advance_by(0), 30)                 # ignored, no event, no error
        self.assertEqual(len(run.events), n)

    def test_guided_clicks_and_scenario_advance_produce_identical_rows(self):
        """B: Run.advance_to / advance_by / advance_to_next_event each write one clock_advanced row
        exactly as the scenario `advance` action does; end() and the runner write none."""
        g = Run(T, "advance_log_only")
        g.advance_to(8); g.advance_by(2); g.hold("SYN-001", "Payer and recipients unverified")
        g.advance_to_next_event(); g.advance_to_next_event(); g.advance_to_next_event(); g.end()
        s = run_scenario(load_scenario(REF / "scenarios" / "advance_log_only.json"), T)
        self.assertEqual(rows(g), rows(s))
        self.assertEqual([r["detail"] for r in rows(g, types={"clock_advanced"})],
                         ["to_minute=8", "to_minute=10", "to_minute=18", "to_minute=23", "to_minute=30"])
        # clock_advanced is written at the CURRENT minute, before the clock moves
        ca = rows(g, types={"clock_advanced"})
        self.assertEqual([r["sim_minute"] for r in ca], ["0", "8", "10", "18", "23"])
        # end() alone (no_hold) writes no clock_advanced
        base = Run(T, "no_hold"); base.end()
        self.assertEqual(rows(base, types={"clock_advanced"}), [])

    def test_scenario_advance_is_log_only(self):
        a = run_scenario(load_scenario(REF / "scenarios" / "advance_log_only.json"), T)
        b = run_scenario(load_scenario(REF / "scenarios" / "hold_at_10_syn_001.json"), T)
        strip = lambda run: [{k: v for k, v in r.items() if k != "seq"} for r in rows(run)
                             if r["event_type"] not in ("clock_advanced", "run_start")]
        self.assertEqual(strip(a), strip(b))
        self.assertEqual(rows(a, types={"clock_advanced"})[0]["detail"], "to_minute=8")


class LearnerInstructorSeparation(unittest.TestCase):
    def test_learner_view_never_shows_unreleased_records(self):
        for cust in MAIN:
            run = Run(T, "sep"); run.request(cust, "request_supporting_documents")
            for minute in (0, 5, 7.9):
                run.advance_to(minute)
                self.assertFalse({e["evidence_id"] for e in run.visible_evidence()} & ON_REQUEST, cust)
            run.advance_to(8)
            self.assertEqual({e["evidence_id"] for e in run.visible_evidence()} & ON_REQUEST, {DOCS[cust]})
            self.assertEqual(len(run.visible_evidence()), 13)
            self.assertFalse({e["evidence_id"] for e in run.visible_evidence()} & (ON_REQUEST - {DOCS[cust]}))
        for e in T.raw["evidence_catalog"]:
            self.assertEqual(bool(e["learner_path"]), e["release"] == "initial")

    def test_request_accepted_event_does_not_name_evidence(self):
        run = Run(T, "sep2"); ev = run.request("SYN-001", "review_kyc_log")
        self.assertNotIn("EV-", json.dumps(event_row(ev)))

    def test_learner_debrief_has_no_answer_key_fields_or_hidden_titles(self):
        for name in ("no_hold", "request_prerequisites_syn_001", "evidence_timing_syn_002", "rejections"):
            run = run_scenario(load_scenario(REF / "scenarios" / f"{name}.json"), T)
            text = json.dumps(learner_debrief(run.events, T, run.run_until))
            for field in KEY_FIELDS + ("laundering", "impersonator", "legitimate_project"):
                self.assertNotIn(field, text, f"{name}: learner debrief leaks {field}")
            released = {e["ref_id"] for e in run.events if e["event_type"] == "evidence_released"}
            # an ID the learner typed into a rejected citation is echoed back as their own input
            typed = {e["detail"].split("evidence_not_available:")[1].split(";")[0]
                     for e in run.events if "evidence_not_available:" in e["detail"]}
            released_titles = {T.evidence_catalog[r]["title"] for r in released}   # EV-005/EV-015 share a title
            for e in T.raw["evidence_catalog"]:
                if e["release"] == "on_request" and e["evidence_id"] not in released:
                    if e["title"] not in released_titles:
                        self.assertNotIn(e["title"], text, f"{name}: unreleased title of {e['evidence_id']} in learner debrief")
                    self.assertNotIn(e["instructor_path"], text)
                    if e["evidence_id"] not in typed:
                        self.assertNotIn(e["evidence_id"], text, f"{name}: unreleased {e['evidence_id']} in learner debrief")
            self.assertNotIn("score", text.lower().replace("scu", ""))

    def test_instructor_debrief_is_separate_and_explicit(self):
        run = run_scenario(load_scenario(REF / "scenarios" / "request_prerequisites_syn_001.json"), T)
        learner = learner_debrief(run.events, T, run.run_until)
        instr = instructor_debrief(learner, T)
        self.assertIn("authored_truth", json.dumps(instr))
        # E: per decisive ID {available, cited, requested} at the latest decision; no score
        self.assertEqual(instr["cases"]["SYN-001"]["decisive_evidence"], {
            "EV-005": {"available": False, "cited": False, "requested": False},
            "EV-007": {"available": True, "cited": True, "requested": True},
            "EV-009": {"available": False, "cited": False, "requested": False}})
        self.assertNotIn("score", json.dumps(instr["cases"]).lower())
        self.assertNotIn("authored_truth", json.dumps(learner))
        # available-but-uncited and requested-but-not-yet-available are told apart
        run = run_scenario(load_scenario(REF / "scenarios" / "evidence_timing_syn_002.json"), T)
        instr = instructor_debrief(learner_debrief(run.events, T, run.run_until), T)
        self.assertTrue(all(v == {"available": True, "cited": True, "requested": True}
                            for v in instr["cases"]["SYN-002"]["decisive_evidence"].values()))
        run = Run(T, "late"); run.request("SYN-001", "review_kyc_log"); run.advance_to(10)
        run.decide("SYN-001", "continue_review", ["EV-001"], "waiting"); run.end()
        instr = instructor_debrief(learner_debrief(run.events, T, run.run_until), T)
        self.assertEqual(instr["cases"]["SYN-001"]["decisive_evidence"]["EV-005"],
                         {"available": False, "cited": False, "requested": True})

    def test_learner_debrief_content(self):
        run = run_scenario(load_scenario(REF / "scenarios" / "release_between_due_syn_001.json"), T)
        d = learner_debrief(run.events, T, run.run_until)["customers"]["SYN-001"]
        self.assertEqual(d["holds"][0]["position"], "before first due")
        self.assertEqual(d["holds"][0]["duration_minutes"], "10")
        self.assertEqual(d["orders"]["TX-2"]["outcome"], "held at due minute, released and executed at 20")
        self.assertEqual(d["orders"]["TX-3"]["outcome"], "executed at 23 (due)")
        self.assertEqual(d["final_balance"], 10000)
        run = run_scenario(load_scenario(REF / "scenarios" / "decision_does_not_hold_syn_002.json"), T)
        d = learner_debrief(run.events, T, run.run_until)["customers"]["SYN-002"]
        self.assertIn("escalation recorded while orders executed afterwards", d["consistency_flags"])
        self.assertIn("hold still in place at run end after closure", d["consistency_flags"])
        run = run_scenario(load_scenario(REF / "scenarios" / "run_until_20.json"), T)
        d = learner_debrief(run.events, T, run.run_until)["customers"]["SYN-001"]
        self.assertEqual(d["orders"]["TX-3"]["outcome"], "pending, never checked before run end")
        self.assertEqual(d["requests"][0]["completed_minute"], "outstanding at run end")

    def test_escalation_flag_uses_minute_then_seq(self):
        """D: flag iff an order_executed has (sim_minute, seq) > the escalation's (sim_minute, seq)."""
        # run_until 20: escalation in phase 2 of 18 precedes TX-2's phase-3 execution at 18 -> flagged
        run = Run(T, "esc18", run_until_minute=20); run.advance_to(18)
        run.decide("SYN-001", "escalation", ["EV-001"], "same minute"); run.end()
        d = learner_debrief(run.events, T, run.run_until)["customers"]["SYN-001"]
        self.assertEqual(d["decisions"][0]["minute"], "18")
        self.assertIn("escalation recorded while orders executed afterwards", d["consistency_flags"])
        # run_until 20: escalation at 19 is after TX-2 and TX-3 never runs -> not flagged
        run = Run(T, "esc19", run_until_minute=20); run.advance_to(19)
        run.decide("SYN-001", "escalation", ["EV-001"], "after"); run.end()
        d = learner_debrief(run.events, T, run.run_until)["customers"]["SYN-001"]
        self.assertEqual(d["orders"]["TX-3"]["outcome"], "pending, never checked before run end")
        self.assertNotIn("escalation recorded while orders executed afterwards", d["consistency_flags"])
        # the other account's executions never flag this customer
        run = Run(T, "esc_other"); run.advance_to(25)
        run.decide("SYN-001", "escalation", ["EV-001"], "late"); run.end()
        d = learner_debrief(run.events, T, run.run_until)
        self.assertEqual(d["customers"]["SYN-001"]["consistency_flags"], [])

    def test_detail_free_text_with_separators_round_trips(self):
        """A: the last key (reason / note / title) runs verbatim to the end and may hold ';' and '='."""
        reason = "step 1; due_minute=18; see note=x"
        note = ";starts with a semicolon = and an equals"
        rnote = "released; balance=ok"
        run = Run(T, "kv"); run.advance_to(10); run.hold("SYN-001", reason)
        run.decide("SYN-001", "continue_review", ["EV-001", "EV-002"], note)
        run.advance_to(25); run.release("SYN-001", rnote); run.end()
        ev = {e["event_type"]: e for e in run.events if e["customer_id"] == "SYN-001"}
        self.assertEqual(parse_detail("hold_placed", ev["hold_placed"]["detail"]), {"reason": reason})
        self.assertEqual(parse_detail("hold_released", ev["hold_released"]["detail"]), {"note": rnote})
        self.assertEqual(parse_detail("decision_recorded", ev["decision_recorded"]["detail"]),
                         {"decision": "continue_review", "cites": "EV-001|EV-002", "note": note})
        d = learner_debrief(run.events, T, run.run_until)["customers"]["SYN-001"]
        self.assertEqual(d["holds"][0]["reason"], reason)
        self.assertEqual(d["decisions"][0]["note"], note)
        self.assertEqual(d["decisions"][0]["cites"], ["EV-001", "EV-002"])
        self.assertNotIn("empty note", d["decisions"][0]["flags"])
        # order events still parse and the empty-note flag still fires on a genuinely empty note
        self.assertEqual(parse_detail("order_executed", "to=SYN-X02;trigger=release"), {"to": "SYN-X02", "trigger": "release"})
        self.assertEqual(parse_detail("decision_rejected", "reason=evidence_not_available:EV-007;decision=escalation"),
                         {"reason": "evidence_not_available:EV-007", "decision": "escalation"})
        self.assertEqual(parse_detail("decision_recorded", "decision=closure;cites=;note=")["note"], "")
        with self.assertRaises(ValueError):
            parse_detail("order_executed", "trigger=due;to=SYN-X02")      # keys out of order
        # the CSV round trip keeps the text byte-for-byte
        with tempfile.TemporaryDirectory() as td:
            out = Path(td) / "kv.csv"
            write_events_csv(run.events, out)
            with open(out, newline="", encoding="utf-8") as fh:
                back = {r["event_type"]: r for r in csv.DictReader(fh) if r["customer_id"] == "SYN-001"}
            self.assertEqual(back["hold_placed"]["detail"], f"reason={reason}")
            self.assertEqual(back["decision_recorded"]["detail"], f"decision=continue_review;cites=EV-001|EV-002;note={note}")


class GoldenTraces(unittest.TestCase):
    def test_every_scenario_reproduces_its_golden_trace(self):
        scenarios = sorted((REF / "scenarios").glob("*.json"))
        self.assertGreaterEqual(len(scenarios), 20)
        with tempfile.TemporaryDirectory() as td:
            for path in scenarios:
                sc = load_scenario(path)
                golden = REF / "traces" / f"{sc['scenario_id']}.events.csv"
                self.assertTrue(golden.exists(), f"missing golden trace {golden}")
                run = run_scenario(sc, T)
                out = Path(td) / golden.name
                write_events_csv(run.events, out)
                ok, lines = compare_trace.compare(out, golden)
                self.assertTrue(ok, f"{sc['scenario_id']}: " + "\n".join(lines))

    def test_contract_table_A_B_C_F_D_balances(self):
        expect = {"no_hold": (10000, 10000), "hold_at_10_syn_001": (480000, 10000), "hold_at_20_syn_001": (250000, 10000),
                  "hold_at_18_exact_due_syn_001": (480000, 10000), "release_after_due_syn_001": (10000, 10000),
                  "hold_at_10_syn_002": (10000, 480000), "hold_at_20_syn_002": (10000, 250000),
                  "hold_at_18_exact_due_syn_002": (10000, 480000), "release_after_due_syn_002": (10000, 10000)}
        for sid, (a1, a2) in expect.items():
            with open(REF / "traces" / f"{sid}.summary.json", encoding="utf-8") as fh:
                s = json.load(fh)
            self.assertEqual((s["accounts"]["SYN-A001"]["balance"], s["accounts"]["SYN-A002"]["balance"]), (a1, a2), sid)

    def test_comparer_self_test(self):
        self.assertEqual(compare_trace.self_test(None), 0)

    def test_comparer_normalises_numbers_inside_detail_but_not_free_text(self):
        """F: hold_since=10.0 == hold_since=10; a number inside a reason is compared verbatim."""
        golden = REF / "traces" / "hold_at_10_syn_001.events.csv"
        with open(golden, newline="", encoding="utf-8") as fh:
            rs = list(csv.DictReader(fh))
        with tempfile.TemporaryDirectory() as td:
            def write(rows_, name):
                p = Path(td) / name
                with open(p, "w", newline="", encoding="utf-8") as fh:
                    w = csv.DictWriter(fh, fieldnames=list(rs[0].keys()), lineterminator="\n")
                    w.writeheader(); w.writerows(rows_)
                return p
            same = [dict(r) for r in rs]
            for r in same:
                if r["event_type"] == "order_held":
                    r["detail"] = "hold_since=10.0"
                if r["event_type"] == "run_end":
                    r["detail"] = "final_minute=30.00"
            ok, lines = compare_trace.compare(write(same, "same.csv"), golden)
            self.assertTrue(ok, lines)
            diff = [dict(r) for r in rs]
            for r in diff:
                if r["event_type"] == "hold_placed":
                    r["detail"] = r["detail"] + " 10.0"
            ok, lines = compare_trace.compare(write(diff, "diff.csv"), golden)
            self.assertFalse(ok)
            self.assertTrue(any("MISMATCH" in ln and "detail" in ln for ln in lines), lines)
        self.assertEqual(compare_trace.norm_detail("order_failed", "reason=insufficient_funds;available=100.0"),
                         "reason=insufficient_funds;available=100")
        self.assertEqual(compare_trace.norm_detail("hold_placed", "reason=x=1.0;y"), "reason=x=1.0;y")
        self.assertEqual(compare_trace.norm_detail("nonsense", "a=1.0"), "a=1.0")

    def test_trace_csv_has_contract_columns(self):
        with open(REF / "traces" / "no_hold.events.csv", newline="", encoding="utf-8") as fh:
            r = list(csv.reader(fh))
        self.assertEqual(r[0], ["seq", "sim_minute", "customer_id", "account_id", "event_type", "ref_id", "amount", "balance_after", "detail"])
        self.assertEqual(r[1][4], "run_start")
        self.assertEqual(r[-1][8], "final_minute=30")


if __name__ == "__main__":
    unittest.main()
