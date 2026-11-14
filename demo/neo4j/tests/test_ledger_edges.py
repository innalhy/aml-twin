"""Ledger validation and the boundaries of the three network readings."""

from __future__ import annotations

import os
import unittest
from unittest.mock import patch

import pandas as pd

from twinaml_sandbox.constants import MAX_ACCOUNTS, SANDBOX_TAG
from twinaml_sandbox.graph_story import graph_cases
from twinaml_sandbox.ledger import (
    ACCOUNT_COLUMNS,
    RELATIONSHIP_COLUMNS,
    TRANSACTION_COLUMNS,
    WALLET_COLUMNS,
)
from twinaml_sandbox.load import LedgerError, assemble, empty_relationships, empty_wallets
from twinaml_sandbox.neo4j_link import Neo4jConfigError, assert_write_confirmed, settings_from_env
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

    def _smurf(
        self,
        payers: int,
        amount: int,
        times: tuple[str, ...] | None = None,
        hub_segment: str = "retail",
    ):
        if times is None:
            times = tuple(f"2026-03-03T10:{index:02d}:00" for index in range(payers))
        accounts = [_account(f"P{index}") for index in range(1, payers + 1)]
        accounts.append(_account("HUB", segment=hub_segment))
        payments = [
            _payment(f"T{index}", f"P{index}", "HUB", amount, times[index - 1])
            for index in range(1, payers + 1)
        ]
        return _bundle(accounts, payments, source_name=f"smurf-{payers}-{amount}-{hub_segment}")

    def _cycle(self, hops: list[tuple[str, str, str, int, str]]):
        accounts = [_account("A"), _account("B"), _account("C")]
        payments = [_payment(txn_id, source, target, amount, booked_at) for txn_id, source, target, amount, booked_at in hops]
        return _bundle(accounts, payments, source_name="cycle")

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


if __name__ == "__main__":
    unittest.main()
