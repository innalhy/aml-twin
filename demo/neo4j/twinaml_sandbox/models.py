"""Result types shared by the rule engine, the network reading, and the app."""

from __future__ import annotations

from dataclasses import dataclass

import pandas as pd


@dataclass(frozen=True)
class RuleAlert:
    """One payment compared with the amount line, and with nothing else."""

    alert_id: str
    txn_id: str
    booked_at: str
    from_account: str
    to_account: str
    amount_hkd: int
    channel: str
    memo: str
    rule_code: str
    why: str

    def as_row(self) -> dict[str, object]:
        return {
            "alert_id": self.alert_id,
            "rule_code": self.rule_code,
            "txn_id": self.txn_id,
            "booked_at": self.booked_at,
            "from_account": self.from_account,
            "to_account": self.to_account,
            "amount_hkd": self.amount_hkd,
            "channel": self.channel,
            "memo": self.memo,
            "why": self.why,
        }


@dataclass(frozen=True)
class GraphCase:
    """One linked story found in the payment network."""

    case_id: str
    typology: str
    title: str
    why: str
    account_ids: tuple[str, ...]
    txn_ids: tuple[str, ...]
    amount_hkd: int
    narrative_labels: tuple[str, ...]
    kyc_notes: tuple[str, ...]
    context_ids: tuple[str, ...]

    def as_row(self) -> dict[str, object]:
        return {
            "case_id": self.case_id,
            "typology": self.typology,
            "title": self.title,
            "accounts": ", ".join(self.account_ids),
            "payments": len(self.txn_ids),
            "amount_hkd": self.amount_hkd,
            "narrative_labels": ", ".join(self.narrative_labels),
            "why": self.why,
        }


@dataclass(frozen=True)
class Report:
    """Rule alerts at two lines, plus the network cases for the same ledger."""

    threshold_hkd: int
    baseline_hkd: int
    rule_alerts: tuple[RuleAlert, ...]
    baseline_alerts: tuple[RuleAlert, ...]
    graph_cases: tuple[GraphCase, ...]
    comparison: pd.DataFrame

    @property
    def rule_count(self) -> int:
        return len(self.rule_alerts)

    @property
    def baseline_count(self) -> int:
        return len(self.baseline_alerts)

    @property
    def graph_count(self) -> int:
        return len(self.graph_cases)
