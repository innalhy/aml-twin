"""Ledger validation and the boundaries of the three network readings."""

from __future__ import annotations

import os
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

import pandas as pd

from twinaml_sandbox.constants import MAX_ACCOUNTS, MAX_TRANSACTIONS, SANDBOX_TAG
from twinaml_sandbox.graph_story import graph_cases
from twinaml_sandbox.ledger import (
    ACCOUNT_COLUMNS,
    RELATIONSHIP_COLUMNS,
    TRANSACTION_COLUMNS,
    WALLET_COLUMNS,
)
from twinaml_sandbox.load import (
    LedgerError,
    assemble,
    empty_relationships,
    empty_wallets,
    load_directory,
)
from twinaml_sandbox.neo4j_link import (
    Neo4jConfigError,
    Neo4jSettings,
    assert_write_confirmed,
    build_write_plan,
    settings_from_env,
    write_bundle,
)
from twinaml_sandbox.report import run_report
from twinaml_sandbox.rules import amount_alerts

_ENV_KEYS = (
    "NEO4J_URI",
    "NEO4J_USERNAME",
    "NEO4J_PASSWORD",
    "NEO4J_DATABASE",
    "NEO4J_SANDBOX_CONFIRM",
)


def _account(account_id: str, **overrides: object) -> dict[str, object]:
    row: dict[str, object] = {
        "account_id": account_id,
        "customer_id": account_id,
        "name": account_id,
        "segment": "retail",
        "role": "retail",
        "kind": "bank_account",
        "opened_on": "2026-01-01",
        "kyc_narrative": "",
        "case_label": "",
        "device_id": "",
        "city": "",
    }
    row.update(overrides)
    return row


def _payment(
    txn_id: str,
    from_account: str,
    to_account: str,
    amount: object = 1000,
    booked_at: str = "2026-03-03T10:00:00",
) -> dict[str, object]:
    return {
        "txn_id": txn_id,
        "booked_at": booked_at,
        "from_account": from_account,
        "to_account": to_account,
        "amount_hkd": amount,
        "channel": "fps",
        "memo": "",
        "planted_typology": "",
    }


def _bundle(
    accounts: list[dict[str, object]],
    transactions: list[dict[str, object]] | pd.DataFrame,
    relationships: pd.DataFrame | None = None,
    wallets: pd.DataFrame | None = None,
    source_name: str = "edge",
):
    tx_frame = (
        transactions
        if isinstance(transactions, pd.DataFrame)
        else pd.DataFrame(transactions, columns=TRANSACTION_COLUMNS)
    )
    return assemble(
        accounts=pd.DataFrame(accounts, columns=ACCOUNT_COLUMNS),
        transactions=tx_frame,
        relationships=empty_relationships() if relationships is None else relationships,
        wallets=empty_wallets() if wallets is None else wallets,
        source_name=source_name,
    )


def _wallet(account_id: str) -> dict[str, str]:
    return {"account_id": account_id, "list_name": "sandbox_mixer_watchlist", "reason": "test"}


class LedgerValidationTest(unittest.TestCase):
    def test_malformed_ledgers_are_refused(self) -> None:
        pair = [_account("A"), _account("B")]
        paid = [_payment("T1", "A", "B")]
        checks: list[tuple[object, str]] = [
            (
                lambda: _bundle([_account("A"), _account(" A ")], paid),
                "Duplicate account_id",
            ),
            (
                lambda: _bundle([_account("A", kind="atm")], paid),
                "kind must be",
            ),
            (
                lambda: _bundle(pair, [_payment("T1", "A", "B", 0)]),
                "positive whole number",
            ),
            (
                lambda: _bundle(pair, [_payment("T1", "A", "B", "12.5")]),
                "positive whole number",
            ),
            (
                lambda: _bundle(pair, [_payment("T1", "A", "B", -5)]),
                "positive whole number",
            ),
            (
                lambda: _bundle(pair, [_payment("T1", "A", "B", "")]),
                "amount_hkd must be a number",
            ),
            (
                lambda: _bundle(pair, [_payment("T1", "A", "B", booked_at="Tuesday")]),
                "ISO timestamp",
            ),
            (
                lambda: _bundle(
                    [_account("P", kind="person"), _account("B")],
                    [_payment("T1", "P", "B")],
                ),
                "kind person",
            ),
            (
                lambda: _bundle(
                    pair,
                    paid,
                    relationships=pd.DataFrame(
                        [{"from_id": "A", "to_id": "GHOST", "rel_type": "KNOWS", "note": ""}],
                        columns=RELATIONSHIP_COLUMNS,
                    ),
                ),
                "Relationship endpoints must exist",
            ),
            (
                lambda: _bundle(
                    pair,
                    paid,
                    wallets=pd.DataFrame([_wallet("A")], columns=WALLET_COLUMNS),
                ),
                "must have kind wallet",
            ),
            (
                lambda: _bundle(
                    [_account("MIX", kind="wallet"), _account("B")],
                    [_payment("T1", "B", "MIX")],
                    wallets=pd.DataFrame([_wallet("MIX"), _wallet("MIX")], columns=WALLET_COLUMNS),
                ),
                "Duplicate watchlist account_id",
            ),
            (
                lambda: _bundle([_account("   ")], paid),
                "no account rows",
            ),
            (
                lambda: _bundle(pair, pd.DataFrame(paid, columns=TRANSACTION_COLUMNS).drop(columns=["amount_hkd"])),
                "missing column",
            ),
            (
                lambda: _bundle(
                    [_account(f"A{index}") for index in range(MAX_ACCOUNTS + 1)],
                    [_payment("T1", "A0", "A1")],
                ),
                f"up to {MAX_ACCOUNTS} accounts",
            ),
            (
                lambda: _bundle(pair, [_payment("T1", "A", "B"), _payment("T1", "B", "A")]),
                "Duplicate txn_id",
            ),
            (
                lambda: _bundle(pair, [_payment("T1", "A", "GHOST")]),
                "Missing: GHOST",
            ),
            (
                lambda: _bundle(pair, [_payment("T1", "A", "B", booked_at="")]),
                "blank or unreadable",
            ),
            (
                lambda: _bundle(
                    [_account("MIX", kind="wallet"), _account("B")],
                    [_payment("T1", "B", "MIX")],
                    wallets=pd.DataFrame([_wallet("NOPE")], columns=WALLET_COLUMNS),
                ),
                "Watchlist account_id values must exist",
            ),
            (
                lambda: _bundle(
                    pair,
                    [_payment(f"T{index}", "A", "B") for index in range(MAX_TRANSACTIONS + 1)],
                ),
                f"up to {MAX_TRANSACTIONS} payments",
            ),
        ]
        for call, message in checks:
            with self.subTest(message=message):
                with self.assertRaisesRegex(LedgerError, message):
                    call()

    def test_whole_number_text_amounts_are_accepted(self) -> None:
        bundle = _bundle(
            [_account("  A  "), _account("B")],
            [_payment("T1", "  A  ", "B", "8000.0")],
        )
        self.assertEqual(bundle.accounts["account_id"].tolist(), ["A", "B"])
        self.assertEqual(int(bundle.transactions["amount_hkd"].iloc[0]), 8000)

    def test_duplicate_missing_and_oversize_books_are_refused(self) -> None:
        pair = [_account("A"), _account("B")]
        paid = [_payment("T1", "A", "B")]
        too_many = [
            _payment(f"T{index}", "A", "B", 1000, "2026-03-03T10:00:00")
            for index in range(MAX_TRANSACTIONS + 1)
        ]
        checks: list[tuple[object, str]] = [
            (
                lambda: _bundle(
                    pair,
                    [
                        _payment("T1", "A", "B"),
                        _payment(" T1 ", "B", "A", 2000, "2026-03-03T11:00:00"),
                    ],
                ),
                "Duplicate txn_id",
            ),
            (
                lambda: _bundle(pair, [_payment("T1", "A", "MISSING")]),
                "Missing: MISSING",
            ),
            (
                lambda: _bundle(pair, too_many),
                f"up to {MAX_TRANSACTIONS} payments",
            ),
            (
                lambda: _bundle(pair, [_payment("T1", "A", "B", booked_at="")]),
                "booked_at",
            ),
            (
                lambda: _bundle(pair, []),
                "no payment rows",
            ),
            (
                lambda: _bundle(
                    pair,
                    paid,
                    wallets=pd.DataFrame([_wallet("GONE")], columns=WALLET_COLUMNS),
                ),
                "Watchlist account_id values must exist",
            ),
        ]
        for call, message in checks:
            with self.subTest(message=message):
                with self.assertRaisesRegex(LedgerError, message):
                    call()

    def test_blank_ids_are_dropped_and_optional_files_may_be_absent(self) -> None:
        pair = [_account("A"), _account("B")]
        bundle = _bundle(
            pair,
            [_payment("   ", "A", "B", 1000), _payment("T1", "A", "B", 2000, "2026-03-03T11:00:00")],
            relationships=pd.DataFrame(
                [
                    {"from_id": "  ", "to_id": "A", "rel_type": "KNOWS", "note": ""},
                    {"from_id": "A", "to_id": "B", "rel_type": "CONTROLS", "note": "kept"},
                ],
                columns=RELATIONSHIP_COLUMNS,
            ),
        )
        self.assertEqual(bundle.transactions["txn_id"].tolist(), ["T1"])
        self.assertEqual(bundle.relationships["from_id"].tolist(), ["A"])
        self.assertEqual(bundle.relationships["rel_type"].tolist(), ["CONTROLS"])

        with tempfile.TemporaryDirectory() as folder:
            root = Path(folder)
            pd.DataFrame(pair, columns=ACCOUNT_COLUMNS).to_csv(root / "accounts.csv", index=False)
            with self.assertRaisesRegex(LedgerError, "Missing transactions.csv"):
                load_directory(root, "accounts only")
            pd.DataFrame([_payment("T9", "A", "B")], columns=TRANSACTION_COLUMNS).to_csv(
                root / "transactions.csv", index=False
            )
            loaded = load_directory(root, "no links")
            self.assertTrue(loaded.relationships.empty)
            self.assertTrue(loaded.wallets.empty)
            self.assertEqual(loaded.transactions["txn_id"].tolist(), ["T9"])

        with tempfile.TemporaryDirectory() as folder:
            with self.assertRaisesRegex(LedgerError, "Missing accounts.csv"):
                load_directory(Path(folder), "empty")


class AmountLineTest(unittest.TestCase):
    def test_line_includes_equals_and_refuses_a_negative_line(self) -> None:
        bundle = _bundle(
            [_account("A"), _account("B")],
            [
                _payment("T-LO", "A", "B", 9999, "2026-03-03T10:00:00"),
                _payment("T-EQ", "A", "B", 10000, "2026-03-03T11:00:00"),
                _payment("T-HI", "A", "B", 10001, "2026-03-03T12:00:00"),
            ],
        )
        on_line = amount_alerts(bundle, 10000)
        self.assertEqual([alert.txn_id for alert in on_line], ["T-EQ", "T-HI"])
        self.assertEqual([alert.alert_id for alert in on_line], ["R-001", "R-002"])
        everyone = [alert.txn_id for alert in amount_alerts(bundle, 0)]
        self.assertEqual(everyone, ["T-LO", "T-EQ", "T-HI"])
        with self.assertRaisesRegex(ValueError, "threshold_hkd must be zero"):
            amount_alerts(bundle, -1)


class DetectorBoundaryTest(unittest.TestCase):
    def test_smurf_cutoffs(self) -> None:
        hit = graph_cases(self._smurf(5, 6000))
        self.assertEqual(len(hit), 1)
        case = hit[0]
        self.assertEqual(case.typology, "smurfing")
        self.assertEqual(case.case_id, "G-SMURF-HUB")
        self.assertEqual(case.amount_hkd, 30000)
        self.assertEqual(case.txn_ids, ("T1", "T2", "T3", "T4", "T5"))

        self.assertEqual(graph_cases(self._smurf(4, 8000)), ())
        self.assertEqual(graph_cases(self._smurf(5, 5000)), ())
        self.assertEqual(graph_cases(self._smurf(5, 10000)), ())
        self.assertEqual(graph_cases(self._smurf(5, 6000, hub_segment="merchant")), ())
        self.assertEqual(graph_cases(self._smurf(5, 6000, hub_segment="employer")), ())
        spread = (
            "2026-03-03T10:00:00",
            "2026-03-03T11:00:00",
            "2026-03-03T12:00:00",
            "2026-03-03T13:00:00",
            "2026-03-06T11:00:00",
        )
        self.assertEqual(graph_cases(self._smurf(5, 8000, times=spread)), ())

    def test_smurf_counts_payers_once_and_keeps_the_richer_window(self) -> None:
        repeated = self._smurf_payments(
            [("P1", 8000), ("P2", 8000), ("P3", 8000), ("P4", 8000), ("P1", 8000)],
            start="2026-03-03T10:00:00",
        )
        self.assertEqual(graph_cases(repeated), ())

        richer = self._smurf_payments(
            [(f"A{index}", 6000) for index in range(1, 6)]
            + [(f"B{index}", 7000) for index in range(1, 6)],
            start="2026-03-01T10:00:00",
            second_start="2026-03-05T12:00:00",
            split_after=5,
        )
        chosen = graph_cases(richer)
        self.assertEqual(len(chosen), 1)
        self.assertEqual(chosen[0].amount_hkd, 35000)
        self.assertEqual(chosen[0].txn_ids, ("T6", "T7", "T8", "T9", "T10"))

        tied = self._smurf_payments(
            [(f"A{index}", 6000) for index in range(1, 6)]
            + [(f"B{index}", 6000) for index in range(1, 6)],
            start="2026-03-01T10:00:00",
            second_start="2026-03-06T12:00:00",
            split_after=5,
        )
        earlier = graph_cases(tied)
        self.assertEqual(len(earlier), 1)
        self.assertEqual(earlier[0].amount_hkd, 30000)
        self.assertEqual(earlier[0].txn_ids, ("T1", "T2", "T3", "T4", "T5"))

    def test_shared_device_is_claimed_only_when_every_payer_uses_it(self) -> None:
        shared = graph_cases(
            self._smurf(
                5,
                6000,
                devices={f"P{index}": "DEV1" for index in range(1, 6)},
                device_accounts=("DEV1",),
            )
        )
        self.assertEqual(len(shared), 1)
        self.assertIn("The senders share device DEV1.", shared[0].why)
        self.assertEqual(shared[0].context_ids, ("DEV1",))

        partial = graph_cases(
            self._smurf(
                5,
                6000,
                devices={"P1": "DEV1", "P2": "DEV1", "P3": "DEV1", "P4": "DEV1", "P5": "DEV2"},
                device_accounts=("DEV1", "DEV2"),
            )
        )
        self.assertEqual(len(partial), 1)
        self.assertNotIn("share device", partial[0].why)
        self.assertIn("The payment pattern is enough for this case.", partial[0].why)
        self.assertEqual(partial[0].context_ids, ("DEV1",))

        unnamed = graph_cases(
            self._smurf(5, 6000, devices={f"P{index}": "PHONE-9" for index in range(1, 6)})
        )
        self.assertEqual(len(unnamed), 1)
        self.assertIn("The senders share device PHONE-9.", unnamed[0].why)
        self.assertEqual(unnamed[0].context_ids, ())

    def test_smurf_keeps_an_exact_window_and_refuses_a_wallet_hub(self) -> None:
        exact = (
            "2026-03-03T10:00:00",
            "2026-03-04T10:00:00",
            "2026-03-05T10:00:00",
            "2026-03-06T09:00:00",
            "2026-03-06T10:00:00",
        )
        kept = graph_cases(self._smurf(5, 6000, times=exact))
        self.assertEqual(len(kept), 1)
        self.assertEqual(kept[0].amount_hkd, 30000)
        self.assertEqual(kept[0].txn_ids, ("T1", "T2", "T3", "T4", "T5"))

        one_second_over = exact[:-1] + ("2026-03-06T10:00:01",)
        self.assertEqual(graph_cases(self._smurf(5, 6000, times=one_second_over)), ())

        floor = graph_cases(self._smurf(6, 5000))
        self.assertEqual(len(floor), 1)
        self.assertEqual(floor[0].amount_hkd, 30000)
        self.assertEqual(floor[0].txn_ids, ("T1", "T2", "T3", "T4", "T5", "T6"))

        self.assertEqual(graph_cases(self._smurf(5, 6000, hub_kind="wallet")), ())

    def test_cycle_cutoffs(self) -> None:
        closed = graph_cases(
            self._cycle(
                [
                    ("T1", "A", "B", 5000, "2026-03-03T10:00:00"),
                    ("T2", "B", "C", 5000, "2026-03-03T11:00:00"),
                    ("T3", "C", "A", 5000, "2026-03-06T10:00:00"),
                ]
            )
        )
        self.assertEqual(len(closed), 1)
        self.assertEqual(closed[0].typology, "circular_flow")
        self.assertEqual(set(closed[0].txn_ids), {"T1", "T2", "T3"})
        self.assertEqual(closed[0].amount_hkd, 15000)

        two_hop = self._cycle(
            [
                ("T1", "A", "B", 5000, "2026-03-03T10:00:00"),
                ("T2", "B", "A", 5000, "2026-03-03T11:00:00"),
            ]
        )
        self.assertEqual(graph_cases(two_hop), ())
        short_hop = self._cycle(
            [
                ("T1", "A", "B", 4999, "2026-03-03T10:00:00"),
                ("T2", "B", "C", 5000, "2026-03-03T11:00:00"),
                ("T3", "C", "A", 5000, "2026-03-03T12:00:00"),
            ]
        )
        self.assertEqual(graph_cases(short_hop), ())
        late = self._cycle(
            [
                ("T1", "A", "B", 5000, "2026-03-03T10:00:00"),
                ("T2", "B", "C", 5000, "2026-03-03T11:00:00"),
                ("T3", "C", "A", 5000, "2026-03-06T10:00:01"),
            ]
        )
        self.assertEqual(graph_cases(late), ())

    def test_cycle_keeps_four_hops_and_the_earlier_payment(self) -> None:
        four = graph_cases(
            self._ring(
                ["A", "B", "C", "D"],
                ["2026-03-03T10:00:00", "2026-03-03T11:00:00", "2026-03-03T12:00:00", "2026-03-03T13:00:00"],
            )
        )
        self.assertEqual(len(four), 1)
        self.assertEqual(four[0].typology, "circular_flow")
        self.assertEqual(set(four[0].account_ids), {"A", "B", "C", "D"})
        self.assertEqual(set(four[0].txn_ids), {"T1", "T2", "T3", "T4"})
        self.assertEqual(four[0].amount_hkd, 20000)

        five = graph_cases(
            self._ring(
                ["A", "B", "C", "D", "E"],
                [f"2026-03-03T1{index}:00:00" for index in range(5)],
            )
        )
        self.assertEqual(five, ())

        repeated_edge = [
            ("T-EARLY", "A", "B", 5000, "2026-03-03T10:00:00"),
            ("T-LATE", "A", "B", 9000, "2026-03-03T11:00:00"),
            ("T2", "B", "C", 5000, "2026-03-03T12:00:00"),
            ("T3", "C", "A", 5000, "2026-03-03T13:00:00"),
        ]
        chosen = graph_cases(self._cycle(repeated_edge))
        self.assertEqual(len(chosen), 1)
        self.assertIn("T-EARLY", chosen[0].txn_ids)
        self.assertNotIn("T-LATE", chosen[0].txn_ids)
        self.assertEqual(chosen[0].amount_hkd, 15000)

        same_time = [
            ("T-B", "A", "B", 8000, "2026-03-03T10:00:00"),
            ("T-A", "A", "B", 5000, "2026-03-03T10:00:00"),
            ("T2", "B", "C", 5000, "2026-03-03T11:00:00"),
            ("T3", "C", "A", 5000, "2026-03-03T12:00:00"),
        ]
        tied = graph_cases(self._cycle(same_time))
        self.assertEqual(len(tied), 1)
        self.assertIn("T-A", tied[0].txn_ids)
        self.assertNotIn("T-B", tied[0].txn_ids)
        self.assertEqual(tied[0].amount_hkd, 15000)

    def test_cycle_keeps_a_merchant_or_employer_hop(self) -> None:
        for segment in ("merchant", "employer"):
            accounts = [
                _account("A"),
                _account("B", segment=segment),
                _account("C"),
            ]
            payments = [
                _payment("T1", "A", "B", 5000, "2026-03-03T10:00:00"),
                _payment("T2", "B", "C", 5000, "2026-03-03T11:00:00"),
                _payment("T3", "C", "A", 5000, "2026-03-03T12:00:00"),
            ]
            cases = graph_cases(_bundle(accounts, payments, source_name=f"cycle-{segment}"))
            self.assertEqual(len(cases), 1, segment)
            self.assertEqual(cases[0].typology, "circular_flow", segment)
            self.assertEqual(set(cases[0].account_ids), {"A", "B", "C"}, segment)
            self.assertEqual(set(cases[0].txn_ids), {"T1", "T2", "T3"}, segment)
            self.assertEqual(cases[0].amount_hkd, 15000, segment)

    def test_mule_pass_through_cutoffs(self) -> None:
        kept = graph_cases(self._mule())
        self.assertEqual(len(kept), 1)
        case = kept[0]
        self.assertEqual(case.typology, "mule_to_mixer")
        self.assertEqual(case.case_id, "G-MULE-MIX")
        self.assertEqual(set(case.txn_ids), {"T-IN", "T-OUT"})
        self.assertIn("SRC", case.account_ids)
        self.assertEqual(case.amount_hkd, 35000)

        direct = graph_cases(self._mule(direct_only=True))
        self.assertEqual(len(direct), 1)
        self.assertEqual(direct[0].txn_ids, ("T-OUT",))

        self.assertEqual(graph_cases(self._mule(watch=False)), ())

        failures = [
            self._mule(outbound_amount=14999),
            self._mule(outbound_at="2026-03-03T09:00:00"),
            self._mule(outbound_at="2026-03-04T22:00:01"),
            self._mule(pt_segment="merchant"),
        ]
        for bundle in failures:
            with self.subTest(bundle=bundle.source_name):
                cases = graph_cases(bundle)
                self.assertEqual(len(cases), 1)
                self.assertEqual(cases[0].txn_ids, ("T-OUT",))
                self.assertNotIn("SRC", cases[0].account_ids)

    def test_mule_stops_after_four_hops_and_ignores_non_control_links(self) -> None:
        kept = graph_cases(self._mule_chain())
        self.assertEqual(len(kept), 1)
        case = kept[0]
        self.assertEqual(case.case_id, "G-MULE-MIX")
        self.assertEqual(set(case.account_ids), {"S", "P1", "P2", "P3", "MIX"})
        self.assertNotIn("U", case.account_ids)
        self.assertEqual(set(case.txn_ids), {"T-S", "T-1", "T-2", "T-3"})
        self.assertNotIn("T-U", case.txn_ids)
        self.assertEqual(case.amount_hkd, 64000)
        self.assertEqual(case.context_ids, ("BOSS",))
        self.assertNotIn("PAL", case.context_ids)
        self.assertIn("BOSS", case.why)
        self.assertNotIn("PAL", case.why)

        blocked = graph_cases(self._mule_chain(block_middle=True))
        self.assertEqual(len(blocked), 1)
        self.assertEqual(set(blocked[0].account_ids), {"P2", "P3", "MIX"})
        self.assertNotIn("P1", blocked[0].account_ids)
        self.assertEqual(set(blocked[0].txn_ids), {"T-2", "T-3"})
        self.assertEqual(blocked[0].amount_hkd, 32000)

    def test_cycle_stops_at_four_accounts(self) -> None:
        four = graph_cases(self._ring("ABCD"))
        self.assertEqual(len(four), 1)
        self.assertEqual(four[0].typology, "circular_flow")
        self.assertEqual(four[0].txn_ids, ("T1", "T2", "T3", "T4"))
        self.assertEqual(four[0].amount_hkd, 20000)
        self.assertEqual(graph_cases(self._ring("ABCDE")), ())

    def test_mule_path_stops_at_four_hops(self) -> None:
        names = ("A", "B", "C", "D", "E", "MIX")
        accounts = [_account(name) for name in names[:-1]]
        accounts.append(_account("MIX", kind="wallet", segment="wallet"))
        payments = [
            _payment(f"H{index}", names[index], names[index + 1], 20000, f"2026-03-03T1{index}:00:00")
            for index in range(len(names) - 1)
        ]
        wallets = pd.DataFrame([_wallet("MIX")], columns=WALLET_COLUMNS)
        cases = graph_cases(_bundle(accounts, payments, wallets=wallets, source_name="five-hops"))
        self.assertEqual(len(cases), 1)
        self.assertEqual(cases[0].account_ids, ("B", "C", "D", "E", "MIX"))
        self.assertEqual(cases[0].txn_ids, ("H1", "H2", "H3", "H4"))
        self.assertEqual(cases[0].amount_hkd, 80000)
        self.assertNotIn("A", cases[0].account_ids)
        self.assertNotIn("H0", cases[0].txn_ids)

    def _ring(self, names: str):
        accounts = [_account(name) for name in names]
        payments = [
            _payment(
                f"T{index + 1}",
                names[index],
                names[(index + 1) % len(names)],
                5000,
                f"2026-03-03T1{index}:00:00",
            )
            for index in range(len(names))
        ]
        return _bundle(accounts, payments, source_name=f"ring-{names}")

    def _smurf(
        self,
        payers: int,
        amount: int,
        times: tuple[str, ...] | None = None,
        hub_segment: str = "retail",
        devices: dict[str, str] | None = None,
        device_accounts: tuple[str, ...] = (),
        hub_kind: str = "bank_account",
    ):
        if times is None:
            times = tuple(f"2026-03-03T10:{index:02d}:00" for index in range(payers))
        devices = devices or {}
        accounts = [
            _account(f"P{index}", device_id=devices.get(f"P{index}", ""))
            for index in range(1, payers + 1)
        ]
        accounts.append(_account("HUB", segment=hub_segment, kind=hub_kind))
        accounts.extend(_account(device_id, kind="device", segment="device") for device_id in device_accounts)
        payments = [
            _payment(f"T{index}", f"P{index}", "HUB", amount, times[index - 1])
            for index in range(1, payers + 1)
        ]
        return _bundle(accounts, payments, source_name=f"smurf-{payers}-{amount}-{hub_segment}")

    def _smurf_payments(
        self,
        slices: list[tuple[str, int]],
        start: str,
        second_start: str | None = None,
        split_after: int | None = None,
    ):
        payers = list(dict.fromkeys(payer for payer, _amount in slices))
        accounts = [_account(payer) for payer in payers]
        accounts.append(_account("HUB"))
        payments = []
        for index, (payer, amount) in enumerate(slices, start=1):
            if split_after is not None and index > split_after:
                assert second_start is not None
                day, _clock = second_start.split("T")
                booked_at = f"{day}T12:{index - split_after:02d}:00"
            else:
                day, _clock = start.split("T")
                booked_at = f"{day}T10:{index:02d}:00"
            payments.append(_payment(f"T{index}", payer, "HUB", amount, booked_at))
        return _bundle(accounts, payments, source_name="smurf-windows")

    def _cycle(self, hops: list[tuple[str, str, str, int, str]]):
        names = list(dict.fromkeys(node for _txn, source, target, _amount, _at in hops for node in (source, target)))
        accounts = [_account(name) for name in names]
        payments = [
            _payment(txn_id, source, target, amount, booked_at)
            for txn_id, source, target, amount, booked_at in hops
        ]
        return _bundle(accounts, payments, source_name="cycle")

    def _ring(self, nodes: list[str] | str, times: list[str] | None = None):
        if isinstance(nodes, str):
            nodes = list(nodes)
        if times is None:
            times = [f"2026-03-03T1{index}:00:00" for index in range(len(nodes))]
        hops = []
        for index, (source, target) in enumerate(zip(nodes, nodes[1:] + nodes[:1], strict=True), start=1):
            hops.append((f"T{index}", source, target, 5000, times[index - 1]))
        return self._cycle(hops)

    def _mule(
        self,
        outbound_amount: int = 15000,
        outbound_at: str = "2026-03-04T22:00:00",
        pt_segment: str = "retail",
        watch: bool = True,
        direct_only: bool = False,
    ):
        accounts = [
            _account("SRC"),
            _account("PT", segment=pt_segment),
            _account("MIX", kind="wallet", segment="wallet"),
        ]
        if direct_only:
            payments = [_payment("T-OUT", "SRC", "MIX", 1000)]
        else:
            payments = [
                _payment("T-IN", "SRC", "PT", 20000, "2026-03-03T10:00:00"),
                _payment("T-OUT", "PT", "MIX", outbound_amount, outbound_at),
            ]
        wallets = (
            pd.DataFrame([_wallet("MIX")], columns=WALLET_COLUMNS) if watch else empty_wallets()
        )
        label = f"mule-{outbound_amount}-{outbound_at}-{pt_segment}-{watch}-{direct_only}"
        return _bundle(accounts, payments, wallets=wallets, source_name=label)

    def _mule_chain(self, block_middle: bool = False):
        wallets = pd.DataFrame([_wallet("MIX")], columns=WALLET_COLUMNS)
        mixer = _account("MIX", kind="wallet", segment="wallet")
        if block_middle:
            accounts = [_account("P1"), _account("P2"), _account("P3"), mixer]
            payments = [
                _payment("T-1", "P1", "P2", 16000, "2026-03-03T10:00:00"),
                _payment("T-2", "P2", "P3", 16000, "2026-03-05T10:00:01"),
                _payment("T-3", "P3", "MIX", 16000, "2026-03-05T11:00:00"),
            ]
            return _bundle(accounts, payments, wallets=wallets, source_name="chain-blocked")
        accounts = [
            _account("U"),
            _account("S"),
            _account("P1"),
            _account("P2"),
            _account("P3"),
            mixer,
            _account("BOSS", kind="person", segment="person"),
            _account("PAL", kind="person", segment="person"),
        ]
        payments = [
            _payment("T-U", "U", "S", 20000, "2026-03-03T08:00:00"),
            _payment("T-S", "S", "P1", 16000, "2026-03-03T09:00:00"),
            _payment("T-1", "P1", "P2", 16000, "2026-03-03T10:00:00"),
            _payment("T-2", "P2", "P3", 16000, "2026-03-03T11:00:00"),
            _payment("T-3", "P3", "MIX", 16000, "2026-03-03T12:00:00"),
        ]
        relationships = pd.DataFrame(
            [
                {"from_id": "BOSS", "to_id": "P3", "rel_type": "CONTROLS", "note": ""},
                {"from_id": "PAL", "to_id": "P3", "rel_type": "KNOWS", "note": ""},
            ],
            columns=RELATIONSHIP_COLUMNS,
        )
        return _bundle(
            accounts,
            payments,
            relationships=relationships,
            wallets=wallets,
            source_name="chain-open",
        )


class ReportColumnTest(unittest.TestCase):
    def test_before_and_after_follow_different_lines(self) -> None:
        accounts = [_account(f"P{index}") for index in range(1, 6)]
        accounts.extend((_account("HUB"), _account("BIG"), _account("OTHER")))
        payments = [
            _payment(f"T{index}", f"P{index}", "HUB", 6000, f"2026-03-03T10:{index:02d}:00")
            for index in range(1, 6)
        ]
        payments.append(_payment("T-BIG", "BIG", "OTHER", 15000, "2026-03-03T09:00:00"))
        payments.append(_payment("T-SMALL", "BIG", "OTHER", 1000, "2026-03-03T08:00:00"))
        bundle = _bundle(accounts, payments, source_name="columns")

        raised = run_report(bundle, 20_000)
        self.assertNotIn("T-SMALL", set(raised.comparison["txn_id"]))
        self.assertEqual(
            raised.comparison["txn_id"].tolist(),
            ["T1", "T2", "T3", "T4", "T5", "T-BIG"],
        )
        smurf_rows = raised.comparison.loc[raised.comparison["graph_story"] == "smurfing"]
        self.assertTrue((smurf_rows["before_rule"] == "No").all())
        self.assertTrue((smurf_rows["after_rule"] == "No").all())
        big = raised.comparison.loc[raised.comparison["txn_id"] == "T-BIG"].iloc[0]
        self.assertEqual(big["before_rule"], "Yes")
        self.assertEqual(big["after_rule"], "No")
        self.assertEqual(str(big["graph_story"]), "—")

        lowered = run_report(bundle, 5_000)
        self.assertNotIn("T-SMALL", set(lowered.comparison["txn_id"]))
        by_id = lowered.comparison.set_index("txn_id")
        self.assertEqual(by_id.loc["T1", "before_rule"], "No")
        self.assertEqual(by_id.loc["T1", "after_rule"], "Yes")
        self.assertEqual(by_id.loc["T-BIG", "before_rule"], "Yes")
        self.assertEqual(by_id.loc["T-BIG", "after_rule"], "Yes")
        self.assertEqual(by_id.loc["T1", "graph_story"], "smurfing")


class Neo4jGuardTest(unittest.TestCase):
    def setUp(self) -> None:
        self._saved = {key: os.environ.get(key) for key in _ENV_KEYS}
        for key in _ENV_KEYS:
            os.environ.pop(key, None)
        self._env_patch = patch("twinaml_sandbox.neo4j_link.load_local_env")
        self._driver_patch = patch("twinaml_sandbox.neo4j_link.GraphDatabase.driver")
        self._env_patch.start()
        self.driver = self._driver_patch.start()

    def tearDown(self) -> None:
        self._driver_patch.stop()
        self._env_patch.stop()
        for key, value in self._saved.items():
            if value is None:
                os.environ.pop(key, None)
            else:
                os.environ[key] = value

    def test_settings_do_not_open_a_driver(self) -> None:
        for key in _ENV_KEYS:
            self.assertNotIn(key, os.environ)
        self.assertIsNone(settings_from_env())
        self.driver.assert_not_called()

        os.environ["NEO4J_URI"] = "bolt://127.0.0.1:7687"
        with self.assertRaisesRegex(Neo4jConfigError, "together"):
            settings_from_env()
        self.driver.assert_not_called()

        os.environ["NEO4J_USERNAME"] = "reader"
        os.environ["NEO4J_PASSWORD"] = "secret"
        settings = settings_from_env()
        self.assertIsNotNone(settings)
        assert settings is not None
        self.assertEqual(settings.database, "neo4j")
        self.assertEqual(settings.username, "reader")
        self.driver.assert_not_called()

        for confirm in ("", "twinaml", "TWINAML-AML-WEEK", SANDBOX_TAG + "-extra"):
            with self.subTest(confirm=confirm):
                os.environ["NEO4J_SANDBOX_CONFIRM"] = confirm
                with self.assertRaisesRegex(Neo4jConfigError, "Refusing to write"):
                    assert_write_confirmed()
        os.environ["NEO4J_SANDBOX_CONFIRM"] = "  " + SANDBOX_TAG + "  "
        assert_write_confirmed()
        self.driver.assert_not_called()

    def test_blank_database_name_stays_on_the_default(self) -> None:
        os.environ["NEO4J_URI"] = "bolt://127.0.0.1:7687"
        os.environ["NEO4J_USERNAME"] = "reader"
        os.environ["NEO4J_PASSWORD"] = "secret"
        os.environ["NEO4J_DATABASE"] = "   "
        settings = settings_from_env()
        self.assertIsNotNone(settings)
        assert settings is not None
        self.assertEqual(settings.database, "neo4j")
        self.driver.assert_not_called()

    def test_write_checks_the_confirm_string_before_it_connects(self) -> None:
        bundle = _bundle([_account("A"), _account("B")], [_payment("T1", "A", "B")])
        settings = Neo4jSettings("bolt://127.0.0.1:7687", "reader", "secret", "neo4j")
        with self.assertRaisesRegex(Neo4jConfigError, "Refusing to write"):
            write_bundle(settings, bundle)
        self.driver.assert_not_called()

        os.environ["NEO4J_SANDBOX_CONFIRM"] = SANDBOX_TAG
        session = self.driver.return_value.__enter__.return_value.session.return_value.__enter__.return_value
        session.run.return_value.single.return_value = {"nodes": 2, "relationships": 1}
        summary = write_bundle(settings, bundle)
        self.assertEqual(summary, {"nodes": 2, "relationships": 1})
        self.driver.assert_called_once_with(
            settings.uri,
            auth=(settings.username, settings.password),
            connection_timeout=8,
        )
        self.driver.return_value.__enter__.return_value.verify_connectivity.assert_called_once_with()
        self.driver.return_value.__enter__.return_value.session.assert_called_once_with(database="neo4j")
        self.assertGreaterEqual(session.run.call_count, 2)
        for call in session.run.call_args_list:
            self.assertEqual(call.args[1]["sandbox"], SANDBOX_TAG)


class WritePlanScopeTest(unittest.TestCase):
    def test_controls_and_devices_are_written_and_knows_is_not(self) -> None:
        accounts = [
            _account("A"),
            _account("B"),
            _account("DEV", kind="device", segment="device"),
            _account("BOSS", kind="person", segment="person"),
        ]
        mixed = pd.DataFrame(
            [
                {"from_id": "BOSS", "to_id": "A", "rel_type": "CONTROLS", "note": "runs"},
                {"from_id": "A", "to_id": "DEV", "rel_type": "USES_DEVICE", "note": "handset"},
                {"from_id": "A", "to_id": "B", "rel_type": "KNOWS", "note": "social"},
            ],
            columns=RELATIONSHIP_COLUMNS,
        )
        plan = build_write_plan(
            _bundle(accounts, [_payment("T1", "A", "B")], relationships=mixed)
        )
        self.assertIn("DETACH DELETE", plan[0][0])
        self.assertEqual(plan[0][1]["sandbox"], SANDBOX_TAG)
        controls = [
            params["rows"]
            for query, params in plan
            if "[:CONTROLS" in query and "rows" in params
        ]
        devices = [
            params["rows"]
            for query, params in plan
            if "[:USES_DEVICE" in query and "rows" in params
        ]
        self.assertEqual(controls, [[{"from_id": "BOSS", "to_id": "A", "note": "runs"}]])
        self.assertEqual(devices, [[{"from_id": "A", "to_id": "DEV", "note": "handset"}]])
        payments = next(params["rows"] for query, params in plan if "[:SENT" in query)
        self.assertEqual(
            set(payments[0]),
            {
                "from_account",
                "to_account",
                "txn_id",
                "amount_hkd",
                "booked_at",
                "channel",
                "memo",
            },
        )
        for _query, params in plan:
            self.assertEqual(params["sandbox"], SANDBOX_TAG)
            self.assertNotIn("social", str(params.get("rows", "")))
            self.assertNotIn("KNOWS", str(params.get("rows", "")))

        knows_only = pd.DataFrame(
            [{"from_id": "A", "to_id": "B", "rel_type": "KNOWS", "note": "social"}],
            columns=RELATIONSHIP_COLUMNS,
        )
        quiet = build_write_plan(
            _bundle([_account("A"), _account("B")], [_payment("T1", "A", "B")], relationships=knows_only)
        )
        joined = "\n".join(query for query, _params in quiet)
        self.assertNotIn("[:CONTROLS", joined)
        self.assertNotIn("[:USES_DEVICE", joined)
        self.assertNotIn("KNOWS", joined)


if __name__ == "__main__":
    unittest.main()
