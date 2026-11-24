"""Focused network pictures stay on one story, and remote tags stay out."""

from __future__ import annotations

import unittest

import pandas as pd

from twinaml_sandbox.ledger import ACCOUNT_COLUMNS, RELATIONSHIP_COLUMNS, TRANSACTION_COLUMNS
from twinaml_sandbox.load import assemble, empty_wallets
from twinaml_sandbox.models import GraphCase
from twinaml_sandbox.viz import _focus_txns, _story_index, _strip_remote_assets, _visible_ids


def _case(
    case_id: str,
    typology: str,
    accounts: tuple[str, ...],
    context: tuple[str, ...] = (),
    txn_ids: tuple[str, ...] = ("T1",),
) -> GraphCase:
    return GraphCase(
        case_id=case_id,
        typology=typology,
        title=case_id,
        why="",
        account_ids=accounts,
        txn_ids=txn_ids,
        amount_hkd=1000,
        narrative_labels=(),
        kyc_notes=(),
        context_ids=context,
    )


class VizFocusTest(unittest.TestCase):
    def test_mule_wins_a_shared_account_and_focus_leaves_the_other_story_out(self) -> None:
        smurf = _case("G-SMURF-HUB", "smurfing", ("HUB", "P1"), ("DEV",))
        mule = _case("G-MULE-MIX", "mule_to_mixer", ("MIX", "P1"), ("CTRL",))
        story = _story_index((smurf, mule))
        self.assertEqual(story["P1"], "mule_to_mixer")
        self.assertEqual(story["HUB"], "smurfing")
        self.assertEqual(story["MIX"], "mule_to_mixer")

        accounts = pd.DataFrame(
            [
                {
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
                for account_id in ("HUB", "P1", "DEV", "MIX", "CTRL", "BYSTANDER")
            ],
            columns=ACCOUNT_COLUMNS,
        )
        transactions = pd.DataFrame(
            [
                {
                    "txn_id": "T1",
                    "booked_at": "2026-03-03T10:00:00",
                    "from_account": "HUB",
                    "to_account": "P1",
                    "amount_hkd": 1000,
                    "channel": "fps",
                    "memo": "",
                    "planted_typology": "",
                }
            ],
            columns=TRANSACTION_COLUMNS,
        )
        relationships = pd.DataFrame(
            [
                {"from_id": "HUB", "to_id": "BYSTANDER", "rel_type": "KNOWS", "note": ""},
                {"from_id": "MIX", "to_id": "HUB", "rel_type": "CONTROLS", "note": ""},
            ],
            columns=RELATIONSHIP_COLUMNS,
        )
        bundle = assemble(
            accounts=accounts,
            transactions=transactions,
            relationships=relationships,
            wallets=empty_wallets(),
            source_name="focus",
        )
        visible = _visible_ids(bundle, (smurf, mule), story, "smurfing")
        self.assertEqual(visible, {"HUB", "P1", "DEV", "BYSTANDER"})
        self.assertNotIn("MIX", visible)
        self.assertNotIn("CTRL", visible)
        self.assertEqual(
            _visible_ids(bundle, (smurf, mule), story, None),
            {"HUB", "P1", "DEV", "MIX", "CTRL", "BYSTANDER"},
        )

    def test_remote_bootstrap_tags_are_removed_and_inline_script_stays(self) -> None:
        html = (
            '<script src="https://cdn.jsdelivr.net/npm/bootstrap"></script>'
            "<script>local()</script>"
            '<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap.css">'
        )
        cleaned = _strip_remote_assets(html)
        self.assertNotIn("jsdelivr", cleaned)
        self.assertIn("local()", cleaned)

    def test_focus_lists_only_that_storys_payments(self) -> None:
        smurf = _case("G-SMURF-HUB", "smurfing", ("HUB",), txn_ids=("T-SMURF",))
        mule = _case("G-MULE-MIX", "mule_to_mixer", ("MIX",), txn_ids=("T-MULE",))
        cases = (smurf, mule)
        self.assertEqual(_focus_txns(cases, None), {"T-SMURF", "T-MULE"})
        self.assertEqual(_focus_txns(cases, "all"), {"T-SMURF", "T-MULE"})
        self.assertEqual(_focus_txns(cases, "smurfing"), {"T-SMURF"})
        self.assertEqual(_focus_txns(cases, "circular_flow"), set())


if __name__ == "__main__":
    unittest.main()
