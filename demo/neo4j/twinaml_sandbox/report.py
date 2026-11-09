"""Join the amount rule and the network reading into one classroom report."""

from __future__ import annotations

import pandas as pd

from twinaml_sandbox.constants import BASELINE_THRESHOLD_HKD
from twinaml_sandbox.graph_story import graph_cases
from twinaml_sandbox.load import Bundle
from twinaml_sandbox.models import GraphCase, Report, RuleAlert
from twinaml_sandbox.rules import amount_alerts, stamp


def run_report(
    bundle: Bundle,
    threshold_hkd: int,
    baseline_hkd: int = BASELINE_THRESHOLD_HKD,
) -> Report:
    """Evaluate one amount line against the fixed baseline and the network cases."""
    current = amount_alerts(bundle, threshold_hkd)
    baseline = amount_alerts(bundle, baseline_hkd)
    cases = graph_cases(bundle)
    comparison = comparison_table(bundle, baseline, current, cases, baseline_hkd, threshold_hkd)
    return Report(
        threshold_hkd=int(threshold_hkd),
        baseline_hkd=int(baseline_hkd),
        rule_alerts=current,
        baseline_alerts=baseline,
        graph_cases=cases,
        comparison=comparison,
    )


def alerts_frame(alerts: tuple[RuleAlert, ...]) -> pd.DataFrame:
    if not alerts:
        return pd.DataFrame(
            columns=[
                "alert_id",
                "rule_code",
                "txn_id",
                "booked_at",
                "from_account",
                "to_account",
                "amount_hkd",
                "channel",
                "memo",
                "why",
            ]
        )
    return pd.DataFrame([alert.as_row() for alert in alerts])


def cases_frame(cases: tuple[GraphCase, ...]) -> pd.DataFrame:
    if not cases:
        return pd.DataFrame(
            columns=[
                "case_id",
                "typology",
                "title",
                "accounts",
                "payments",
                "amount_hkd",
                "narrative_labels",
                "why",
            ]
        )
    return pd.DataFrame([case.as_row() for case in cases])


def comparison_table(
    bundle: Bundle,
    baseline_alerts: tuple[RuleAlert, ...],
    current_alerts: tuple[RuleAlert, ...],
    cases: tuple[GraphCase, ...],
    baseline_hkd: int,
    threshold_hkd: int,
) -> pd.DataFrame:
    """One row per payment that either rule line, or any network case, selected."""
    baseline_ids = {alert.txn_id for alert in baseline_alerts}
    current_ids = {alert.txn_id for alert in current_alerts}
    story_by_txn: dict[str, str] = {}
    for case in cases:
        for txn_id in case.txn_ids:
            story_by_txn[txn_id] = case.typology
    selected = baseline_ids | current_ids | set(story_by_txn)
    rows: list[dict[str, object]] = []
    for record in bundle.transactions.itertuples(index=False):
        txn_id = str(record.txn_id)
        if txn_id not in selected:
            continue
        rows.append(
            {
                "txn_id": txn_id,
                "booked_at": stamp(record.booked_at),
                "from_account": str(record.from_account),
                "from_name": bundle.name_of(str(record.from_account)),
                "to_account": str(record.to_account),
                "to_name": bundle.name_of(str(record.to_account)),
                "amount_hkd": int(record.amount_hkd),
                "memo": str(record.memo),
                "before_rule": "Yes" if txn_id in baseline_ids else "No",
                "after_rule": "Yes" if txn_id in current_ids else "No",
                "graph_story": story_by_txn.get(txn_id, "—"),
            }
        )
    frame = pd.DataFrame(rows)
    frame.attrs["baseline_hkd"] = int(baseline_hkd)
    frame.attrs["threshold_hkd"] = int(threshold_hkd)
    if frame.empty:
        return frame
    return frame.sort_values(["graph_story", "booked_at", "txn_id"], kind="mergesort").reset_index(
        drop=True
    )


def isolated_rule_count(report: Report) -> int:
    """Rule alerts at the current line whose payment is outside every network case."""
    covered = {txn_id for case in report.graph_cases for txn_id in case.txn_ids}
    return sum(1 for alert in report.rule_alerts if alert.txn_id not in covered)


def hidden_from_rule(report: Report, typology: str) -> int:
    """Payments inside one network story that the current amount line does not list."""
    listed = {alert.txn_id for alert in report.rule_alerts}
    hidden = 0
    for case in report.graph_cases:
        if case.typology != typology:
            continue
        hidden += sum(1 for txn_id in case.txn_ids if txn_id not in listed)
    return hidden
