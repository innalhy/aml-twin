"""Amount-line rule.

One payment is an alert when its amount is at or above the line. The rule
does not look at any other payment, account, or label.
"""

from __future__ import annotations

from twinaml_sandbox.load import Bundle
from twinaml_sandbox.models import RuleAlert


def amount_alerts(bundle: Bundle, threshold_hkd: int) -> tuple[RuleAlert, ...]:
    """Return isolated amount alerts for one classroom line."""
    if threshold_hkd < 0:
        raise ValueError("threshold_hkd must be zero or a positive number of HKD.")
    alerts: list[RuleAlert] = []
    matched = bundle.transactions.loc[
        bundle.transactions["amount_hkd"] >= int(threshold_hkd)
    ]
    for index, row in enumerate(matched.itertuples(index=False), start=1):
        amount = int(row.amount_hkd)
        alerts.append(
            RuleAlert(
                alert_id=f"R-{index:03d}",
                txn_id=str(row.txn_id),
                booked_at=stamp(row.booked_at),
                from_account=str(row.from_account),
                to_account=str(row.to_account),
                amount_hkd=amount,
                channel=str(row.channel),
                memo=str(row.memo),
                rule_code="R_AMOUNT",
                why=(
                    f"This payment is HKD {amount:,}. The amount line for this run is "
                    f"HKD {int(threshold_hkd):,}. The rule compares this row alone with that line."
                ),
            )
        )
    return tuple(alerts)


def stamp(value: object) -> str:
    """Format a booked_at value as ``YYYY-MM-DDTHH:MM:SS``."""
    formatter = getattr(value, "strftime", None)
    if callable(formatter):
        return formatter("%Y-%m-%dT%H:%M:%S")
    return str(value).replace(" ", "T")
