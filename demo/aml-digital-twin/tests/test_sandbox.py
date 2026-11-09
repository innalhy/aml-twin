"""Checks for the bundled week: the amount line moves, the network cases do not."""

from __future__ import annotations

import os
import unittest
from pathlib import Path

import pandas as pd

from twinaml_sandbox.constants import SANDBOX_TAG
from twinaml_sandbox.graph_story import graph_cases
from twinaml_sandbox.ledger import (
    account_frame,
    relationship_frame,
    transaction_frame,
    wallet_frame,
    write_csv,
)
from twinaml_sandbox.load import LedgerError, assemble, load_bundled
from twinaml_sandbox.neo4j_link import (
    DELETE_SANDBOX,
    Neo4jConfigError,
    assert_write_confirmed,
    build_write_plan,
)
from twinaml_sandbox.report import hidden_from_rule, isolated_rule_count, run_report
from twinaml_sandbox.viz import network_html

ROOT = Path(__file__).resolve().parents[1]
CYPHER = ROOT / "cypher"


class BundledWeekTest(unittest.TestCase):
    @classmethod
    def setUpClass(cls) -> None:
        cls.bundle = load_bundled()

    def test_csv_matches_the_authoring_module(self) -> None:
        bundled_accounts = self.bundle.accounts.reset_index(drop=True)
        authored = account_frame()
        pd.testing.assert_frame_equal(bundled_accounts, authored)
        bundled_tx = self.bundle.transactions.reset_index(drop=True)
        authored_tx = transaction_frame()
        pd.testing.assert_frame_equal(bundled_tx, authored_tx)
        pd.testing.assert_frame_equal(self.bundle.relationships, relationship_frame())
        pd.testing.assert_frame_equal(self.bundle.wallets, wallet_frame())

    def test_week_shape(self) -> None:
        self.assertGreaterEqual(len(self.bundle.accounts), 30)
        self.assertEqual(len(self.bundle.transactions), 37)
        self.assertIn("SYN-MIX-01", set(self.bundle.accounts["account_id"]))
        self.assertIn("deepfake-hk-001", set(self.bundle.accounts["case_label"]))

    def test_amount_line_stress(self) -> None:
        baseline = run_report(self.bundle, 10_000)
        tightened = run_report(self.bundle, 5_000)
        self.assertEqual(baseline.rule_count, 16)
        self.assertEqual(tightened.rule_count, 30)
        floor = run_report(self.bundle, 1_000)
        self.assertEqual(floor.rule_count, 33)
        self.assertEqual(floor.graph_count, 3)
        self.assertEqual(baseline.graph_count, 3)
        self.assertEqual(tightened.graph_count, 3)
        self.assertEqual(
            {case.typology for case in baseline.graph_cases},
            {"smurfing", "circular_flow", "mule_to_mixer"},
        )
        self.assertEqual(
            [case.txn_ids for case in baseline.graph_cases],
            [case.txn_ids for case in tightened.graph_cases],
        )

    def test_smurf_slices_are_invisible_at_the_starting_line(self) -> None:
        baseline = run_report(self.bundle, 10_000)
        tightened = run_report(self.bundle, 5_000)
        smurf = next(case for case in baseline.graph_cases if case.typology == "smurfing")
        self.assertEqual(len(smurf.txn_ids), 8)
        self.assertEqual(smurf.amount_hkd, 62_900)
        self.assertIn("DEV-SMURF-7", smurf.context_ids)
        listed = {alert.txn_id for alert in baseline.rule_alerts}
        self.assertTrue(set(smurf.txn_ids).isdisjoint(listed))
        self.assertTrue(set(smurf.txn_ids).issubset({alert.txn_id for alert in tightened.rule_alerts}))
        self.assertEqual(hidden_from_rule(baseline, "smurfing"), 8)
        self.assertEqual(hidden_from_rule(tightened, "smurfing"), 0)

    def test_cycle_and_mule_link_rows_the_amount_rule_already_lists(self) -> None:
        report = run_report(self.bundle, 10_000)
        listed = {alert.txn_id for alert in report.rule_alerts}
        cycle = next(case for case in report.graph_cases if case.typology == "circular_flow")
        mule = next(case for case in report.graph_cases if case.typology == "mule_to_mixer")
        self.assertEqual(set(cycle.account_ids), {"SYN-CY-A", "SYN-CY-B", "SYN-CY-C", "SYN-CY-D"})
        self.assertTrue(set(cycle.txn_ids).issubset(listed))
        self.assertEqual(cycle.narrative_labels, ("hk-triad-cashflow-001",))
        self.assertTrue({"SYN-DF-01", "SYN-MIX-01", "SYN-MU-L1"}.issubset(mule.account_ids))
        self.assertIn("SYN-CTRL-01", mule.context_ids)
        self.assertIn("deepfake-hk-001", mule.narrative_labels)
        self.assertTrue(set(mule.txn_ids).issubset(listed))
        self.assertEqual(hidden_from_rule(report, "circular_flow"), 0)
        self.assertEqual(hidden_from_rule(report, "mule_to_mixer"), 0)

    def test_ordinary_large_payments_stay_outside_the_network_cases(self) -> None:
        report = run_report(self.bundle, 10_000)
        covered = {txn_id for case in report.graph_cases for txn_id in case.txn_ids}
        for txn_id in ("T-PAY-01", "T-PAY-02", "T-RENT-OFF", "T-TB-01"):
            self.assertIn(txn_id, {alert.txn_id for alert in report.rule_alerts})
            self.assertNotIn(txn_id, covered)
        self.assertEqual(isolated_rule_count(report), 4)

    def test_labels_are_not_detector_inputs(self) -> None:
        original = {case.typology: set(case.txn_ids) for case in graph_cases(self.bundle)}
        accounts = self.bundle.accounts.copy()
        accounts["role"] = "retail"
        accounts["case_label"] = ""
        accounts["kyc_narrative"] = ""
        accounts["device_id"] = ""
        transactions = self.bundle.transactions.copy()
        transactions["planted_typology"] = "payroll"
        scrambled = assemble(
            accounts=accounts,
            transactions=transactions,
            relationships=self.bundle.relationships.iloc[0:0].copy(),
            wallets=self.bundle.wallets.copy(),
            source_name="scrambled labels",
        )
        found = {case.typology: set(case.txn_ids) for case in graph_cases(scrambled)}
        self.assertEqual(found, original)

    def test_comparison_keeps_both_rule_columns_when_the_line_is_unchanged(self) -> None:
        report = run_report(self.bundle, 10_000)
        self.assertIn("before_rule", report.comparison.columns)
        self.assertIn("after_rule", report.comparison.columns)
        self.assertTrue((report.comparison["before_rule"] == report.comparison["after_rule"]).all())
        smurf_rows = report.comparison.loc[report.comparison["graph_story"] == "smurfing"]
        self.assertEqual(len(smurf_rows), 8)
        self.assertTrue((smurf_rows["before_rule"] == "No").all())

    def test_network_html_is_offline(self) -> None:
        html = network_html(self.bundle, graph_cases(self.bundle), focus="mule_to_mixer")
        self.assertIn("SYN-MIX-01", html)
        self.assertIn("SYN-DF-01", html)
        self.assertNotIn("unpkg.com", html)
        self.assertNotIn("cdn.jsdelivr.net", html)
        self.assertNotIn("cdnjs.cloudflare.com", html)

    def test_rejects_a_payment_from_a_device(self) -> None:
        accounts = account_frame()
        transactions = transaction_frame()
        transactions.loc[transactions["txn_id"] == "T-PAY-01", "from_account"] = "DEV-SMURF-7"
        with self.assertRaises(LedgerError):
            assemble(
                accounts=accounts,
                transactions=transactions,
                relationships=relationship_frame(),
                wallets=wallet_frame(),
                source_name="bad device payment",
            )


class Neo4jPlanTest(unittest.TestCase):
    def test_write_plan_is_scoped_and_hides_the_answer_key(self) -> None:
        plan = build_write_plan(load_bundled())
        self.assertIn("DETACH DELETE", plan[0][0])
        self.assertEqual(plan[0][0], DELETE_SANDBOX)
        self.assertEqual(plan[0][1]["sandbox"], SANDBOX_TAG)
        blob = " ".join(query for query, _params in plan)
        self.assertNotIn("planted_typology", blob)
        for _query, params in plan:
            rows = params.get("rows", [])
            for row in rows:
                self.assertNotIn("planted_typology", row)

    def test_write_is_refused_without_the_confirm_string(self) -> None:
        previous = os.environ.get("NEO4J_SANDBOX_CONFIRM")
        os.environ["NEO4J_SANDBOX_CONFIRM"] = ""
        try:
            with self.assertRaises(Neo4jConfigError):
                assert_write_confirmed()
        finally:
            if previous is None:
                os.environ.pop("NEO4J_SANDBOX_CONFIRM", None)
            else:
                os.environ["NEO4J_SANDBOX_CONFIRM"] = previous

    def test_cypher_files_name_the_sandbox_tag(self) -> None:
        load_script = (CYPHER / "load_twin.cypher").read_text(encoding="utf-8")
        stories = (CYPHER / "stories.cypher").read_text(encoding="utf-8")
        notes = (CYPHER / "bloom_perspective.md").read_text(encoding="utf-8")
        self.assertIn(SANDBOX_TAG, load_script)
        self.assertIn("LOAD CSV", load_script)
        self.assertIn("WatchlistWallet", load_script)
        self.assertNotIn("planted_typology: row.planted_typology", load_script)
        self.assertIn("SYN-SM-HUB", stories)
        self.assertIn("amount_hkd >= 5000", stories)
        self.assertIn("WatchlistWallet", stories)
        self.assertIn("TwinAML sandbox week", notes)
        self.assertIn("deepfake-hk-001", notes)


class RewriteCsvTest(unittest.TestCase):
    def test_write_csv_round_trip(self) -> None:
        import tempfile

        with tempfile.TemporaryDirectory() as folder:
            write_csv(Path(folder))
            from twinaml_sandbox.load import load_directory

            loaded = load_directory(Path(folder), source_name="temp")
        self.assertEqual(len(loaded.transactions), len(transaction_frame()))


if __name__ == "__main__":
    unittest.main()
