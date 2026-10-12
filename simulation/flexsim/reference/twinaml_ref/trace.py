"""Event trace writers (CONTRACT section 5): CSV and JSON Lines with identical keys."""

import csv
import json
from pathlib import Path
from typing import Dict, Iterable, List

from .engine import fmt_minute

EVENT_COLUMNS = ["seq", "sim_minute", "customer_id", "account_id", "event_type", "ref_id",
                 "amount", "balance_after", "detail"]

# CONTRACT section 5 detail grammar: `key=value;key=value;...` with the keys of each event type in
# this fixed order. Every key but the last holds a token (no ';'); the LAST key runs verbatim to
# the end of the string, so free text (reason, note, title) may contain ';' and '='.
DETAIL_KEYS = {
    "run_start": ("scenario_id", "pack", "contract"),
    "hold_placed": ("reason",), "hold_rejected": ("reason",),
    "hold_released": ("note",), "release_rejected": ("reason",),
    "request_accepted": ("due_minute",), "request_rejected": ("reason",),
    "evidence_released": ("request_id", "title"),
    "decision_recorded": ("decision", "cites", "note"),
    "decision_rejected": ("reason", "decision"),
    "action_rejected": ("reason", "action", "customer_id"),
    "order_executed": ("to", "trigger"), "order_held": ("hold_since",),
    "order_failed": ("reason", "available"),
    "clock_advanced": ("to_minute",), "run_end": ("final_minute",),
}
# Detail values that are numbers; a comparer may read them as numbers (18.0 == 18).
NUMERIC_DETAIL_KEYS = frozenset({"hold_since", "due_minute", "to_minute", "final_minute", "available"})


def parse_detail(event_type: str, detail: str) -> Dict[str, str]:
    """Split `detail` by the fixed key order of its event type (CONTRACT 5).

    Known keys are consumed in order; each non-final value ends at the next ';'; the final key
    takes the remainder verbatim. Raises ValueError when a key is missing or out of order.
    """
    keys = DETAIL_KEYS.get(event_type)
    if keys is None:
        raise ValueError(f"no detail grammar for event type {event_type!r}")
    out: Dict[str, str] = {}
    rest = detail
    for i, key in enumerate(keys):
        prefix = key + "="
        if not rest.startswith(prefix):
            raise ValueError(f"{event_type}: detail {detail!r} lacks key {key!r} at position {i}")
        rest = rest[len(prefix):]
        if i == len(keys) - 1:
            out[key] = rest
        else:
            out[key], _, rest = rest.partition(";")
    return out


def event_row(ev: dict) -> dict:
    """Stringify one event exactly as the trace schema prints it."""
    row = {k: ev.get(k, "") for k in EVENT_COLUMNS}
    row["sim_minute"] = fmt_minute(row["sim_minute"])
    for k in ("seq", "amount", "balance_after"):
        row[k] = "" if row[k] in ("", None) else str(int(row[k]))
    return row


def write_events_csv(events: Iterable[dict], path: Path) -> None:
    with open(path, "w", newline="", encoding="utf-8") as fh:
        w = csv.DictWriter(fh, fieldnames=EVENT_COLUMNS, lineterminator="\n")
        w.writeheader()
        for ev in events:
            w.writerow(event_row(ev))


def write_events_jsonl(events: Iterable[dict], path: Path) -> None:
    with open(path, "w", encoding="utf-8") as fh:
        for ev in events:
            fh.write(json.dumps(event_row(ev), ensure_ascii=False) + "\n")


def read_events_csv(path: Path) -> List[dict]:
    with open(path, newline="", encoding="utf-8") as fh:
        return list(csv.DictReader(fh))
