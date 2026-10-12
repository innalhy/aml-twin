#!/usr/bin/env python3
"""Export the analyst-session-001 evidence pack as flat CSV tables for the FlexSim edition.

Python 3 standard library only. Paths are resolved from this file's location, so the
script runs from any working directory. The source pack is read, never written.

    python3 simulation/flexsim/data/export_tables.py          # regenerate tables/ and manifest.json
    python3 simulation/flexsim/data/export_tables.py --check  # re-derive and compare with committed files

Ledger rule (same as scripts/validate-evidence.py): one CSV row is one transfer. Executed rows
debit the source and credit the target when those accounts are internal. Pending rows do not
change any balance. Snapshot time is customers.json "snapshot_at" (simulation minute 0).
"""

import argparse
import csv
import io
import json
import sys
from datetime import datetime
from decimal import Decimal
from pathlib import Path

SCRIPT_DIR = Path(__file__).resolve().parent
REPO_ROOT = SCRIPT_DIR.parents[2]
PACK_REL = Path("data/evidence/analyst-session-001")
PACK = REPO_ROOT / PACK_REL
TABLES_DIR = SCRIPT_DIR / "tables"
MANIFEST = SCRIPT_DIR / "manifest.json"
PACK_ID = "analyst-session-001"


def timestamp(value):
    if not value.endswith("Z"):
        raise ValueError(f"Timestamp must be UTC: {value}")
    return datetime.fromisoformat(value.replace("Z", "+00:00"))


def read_csv(relative):
    with (PACK / relative).open(newline="") as source:
        reader = csv.DictReader(source)
        return list(reader), list(reader.fieldnames)


def render_csv(columns, rows):
    buffer = io.StringIO()
    writer = csv.DictWriter(buffer, fieldnames=columns, lineterminator="\n", extrasaction="raise")
    writer.writeheader()
    for row in rows:
        writer.writerow({column: ("" if row.get(column) is None else row[column]) for column in columns})
    return buffer.getvalue()


def minutes_from(snapshot, value):
    minutes = (timestamp(value) - snapshot).total_seconds() / 60
    return str(int(minutes)) if minutes.is_integer() else repr(minutes)


def plain(number):
    """Render a Decimal without exponent or trailing zeros."""
    text = format(number, "f")
    return text.rstrip("0").rstrip(".") if "." in text else text


def build_tables():
    profile = json.loads((PACK / "learner/customers.json").read_text())
    snapshot = timestamp(profile["snapshot_at"])
    customers = profile["customers"]
    accounts, account_columns = read_csv("learner/accounts.csv")
    transactions, transaction_columns = read_csv("learner/transactions.csv")
    alerts, alert_columns = read_csv("learner/alerts.csv")
    catalog, catalog_columns = read_csv("learner/request-catalog.csv")
    instructor_index, _ = read_csv("instructor/evidence-index.csv")
    learner_index, _ = read_csv("learner/evidence-index.csv")
    due_events, _ = read_csv("instructor/events.csv")

    tables = {}

    # customers.csv: one row per customer, list fields pipe-separated.
    customer_columns = [
        "customer_id", "display_name", "date_of_birth", "occupation", "employment_basis",
        "declared_monthly_income", "expected_monthly_credits", "expected_largest_credit",
        "expected_payment_purpose", "expected_counterparties", "account_id", "onboarded_at", "unit",
    ]
    customer_rows = []
    for customer in customers:
        row = dict(customer)
        row["expected_counterparties"] = "|".join(customer["expected_counterparties"])
        customer_rows.append(row)
    tables["customers"] = (customer_columns, customer_rows, ["learner/customers.json"])

    # accounts.csv, transactions.csv, alerts.csv, request_catalog.csv: verbatim copies.
    tables["accounts"] = (account_columns, accounts, ["learner/accounts.csv"])
    tables["transactions"] = (transaction_columns, transactions, ["learner/transactions.csv"])
    tables["alerts"] = (alert_columns, alerts, ["learner/alerts.csv"])
    tables["request_catalog"] = (catalog_columns, catalog, ["learner/request-catalog.csv"])

    # evidence_catalog.csv: instructor index plus learner/instructor paths relative to repo root.
    learner_paths = {row["evidence_id"]: row["path"] for row in learner_index}
    evidence_columns = [
        "evidence_id", "customer_id", "title", "source", "release", "request_id",
        "service_minutes", "prerequisite_evidence_id", "learner_path", "instructor_path",
    ]
    evidence_rows = []
    for record in instructor_index:
        learner_path = ""
        if record["release"] == "initial":
            learner_path = (PACK_REL / "learner" / learner_paths[record["evidence_id"]]).as_posix()
        evidence_rows.append({
            "evidence_id": record["evidence_id"],
            "customer_id": record["customer_id"],
            "title": record["title"],
            "source": record["source"],
            "release": record["release"],
            "request_id": record["request_id"],
            "service_minutes": record["service_minutes"],
            "prerequisite_evidence_id": record["prerequisite_evidence_id"],
            "learner_path": learner_path,
            "instructor_path": (PACK_REL / record["path"]).as_posix(),
        })
    tables["evidence_catalog"] = (evidence_columns, evidence_rows,
                                  ["instructor/evidence-index.csv", "learner/evidence-index.csv"])

    # due_events.csv: instructor events plus order details and the due minute.
    by_transaction = {row["transaction_id"]: row for row in transactions}
    due_columns = [
        "event_id", "due_minute", "due_at", "customer_id", "account_id", "transaction_id",
        "from_account", "to_account", "amount", "unit", "event_type", "action_if_eligible", "eligibility",
    ]
    due_rows = []
    for event in due_events:
        order = by_transaction[event["transaction_id"]]
        due_minute = minutes_from(snapshot, order["scheduled_at"])
        if Decimal(due_minute) != Decimal(event["session_minute"]):
            raise ValueError(f"Due minute mismatch for {event['transaction_id']}")
        due_rows.append({
            "event_id": event["event_id"],
            "due_minute": due_minute,
            "due_at": order["scheduled_at"],
            "customer_id": event["customer_id"],
            "account_id": order["from_account"],
            "transaction_id": event["transaction_id"],
            "from_account": order["from_account"],
            "to_account": order["to_account"],
            "amount": order["amount"],
            "unit": order["unit"],
            "event_type": event["event_type"],
            "action_if_eligible": event["action_if_eligible"],
            "eligibility": event["eligibility"],
        })
    due_rows.sort(key=lambda row: (Decimal(row["due_minute"]), row["account_id"], row["transaction_id"]))
    tables["due_events"] = (due_columns, due_rows, ["instructor/events.csv", "learner/transactions.csv"])

    # initial_state.csv: internal accounts with the snapshot balance derived by the ledger rule.
    internal = {customer["account_id"]: customer for customer in customers}
    balances = {account["account_id"]: Decimal(account["opening_balance"])
                for account in accounts if account["account_id"] in internal}
    executed_count = {account_id: 0 for account_id in balances}
    pending = {account_id: [] for account_id in balances}
    ordered = sorted(transactions, key=lambda row: (row["executed_at"] or row["submitted_at"], row["transaction_id"]))
    for row in ordered:
        amount = Decimal(row["amount"])
        if row["status"] == "pending":
            if row["from_account"] in pending:
                pending[row["from_account"]].append((timestamp(row["scheduled_at"]), row["transaction_id"], amount))
            continue
        if row["status"] != "executed":
            raise ValueError(f"Unknown status: {row['transaction_id']}")
        if row["from_account"] in balances:
            balances[row["from_account"]] -= amount
            executed_count[row["from_account"]] += 1
        if row["to_account"] in balances:
            balances[row["to_account"]] += amount
            executed_count[row["to_account"]] += 1
    state_columns = [
        "account_id", "customer_id", "holder_name", "snapshot_balance", "unit", "account_status",
        "executed_transfer_count", "pending_order_ids", "pending_outgoing_total",
    ]
    state_rows = []
    for account in accounts:
        account_id = account["account_id"]
        if account_id not in balances:
            continue
        orders = sorted(pending[account_id])
        state_rows.append({
            "account_id": account_id,
            "customer_id": account["holder_id"],
            "holder_name": account["holder_name"],
            "snapshot_balance": plain(balances[account_id]),
            "unit": account["unit"],
            "account_status": "open",
            "executed_transfer_count": str(executed_count[account_id]),
            "pending_order_ids": "|".join(transaction_id for _, transaction_id, _ in orders),
            "pending_outgoing_total": plain(sum((amount for _, _, amount in orders), Decimal(0))),
        })
    tables["initial_state"] = (state_columns, state_rows,
                               ["learner/accounts.csv", "learner/transactions.csv", "learner/customers.json"])

    rendered = {name: render_csv(columns, rows) for name, (columns, rows, _) in tables.items()}
    manifest = {
        "pack_id": PACK_ID,
        "pack_path": PACK_REL.as_posix(),
        "snapshot_at": profile["snapshot_at"],
        "generated_by": "simulation/flexsim/data/export_tables.py",
        "tables": [
            {
                "name": name,
                "file": f"tables/{name}.csv",
                "rows": len(rows),
                "columns": columns,
                "sources": [(PACK_REL / source).as_posix() for source in sources],
            }
            for name, (columns, rows, sources) in tables.items()
        ],
    }
    return rendered, json.dumps(manifest, indent=2) + "\n"


def write_outputs(rendered, manifest_text):
    TABLES_DIR.mkdir(parents=True, exist_ok=True)
    for name, text in rendered.items():
        (TABLES_DIR / f"{name}.csv").write_text(text)
    MANIFEST.write_text(manifest_text)


def check_outputs(rendered, manifest_text):
    problems = []
    for name, text in rendered.items():
        path = TABLES_DIR / f"{name}.csv"
        if not path.is_file():
            problems.append(f"missing {path.relative_to(REPO_ROOT)}")
        elif path.read_text() != text:
            problems.append(f"stale {path.relative_to(REPO_ROOT)}")
    if not MANIFEST.is_file():
        problems.append(f"missing {MANIFEST.relative_to(REPO_ROOT)}")
    elif MANIFEST.read_text() != manifest_text:
        problems.append(f"stale {MANIFEST.relative_to(REPO_ROOT)}")
    extra = sorted(path.name for path in TABLES_DIR.glob("*.csv")) if TABLES_DIR.is_dir() else []
    for name in extra:
        if name[:-4] not in rendered:
            problems.append(f"unexpected tables/{name}")
    return problems


def main():
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--check", action="store_true", help="compare the derived tables with the committed files")
    args = parser.parse_args()
    try:
        rendered, manifest_text = build_tables()
    except (ValueError, KeyError, OSError, json.JSONDecodeError) as error:
        parser.exit(1, f"Export failed: {error}\n")
    counts = {name: text.count("\n") - 1 for name, text in rendered.items()}
    if args.check:
        problems = check_outputs(rendered, manifest_text)
        if problems:
            parser.exit(1, "Table check failed:\n  " + "\n  ".join(problems) + "\nRun export_tables.py without --check to regenerate.\n")
        print("Tables match the pack: " + ", ".join(f"{name}={rows}" for name, rows in counts.items()))
        return
    write_outputs(rendered, manifest_text)
    print(f"Wrote {len(rendered)} tables to {TABLES_DIR.relative_to(REPO_ROOT)} and {MANIFEST.relative_to(REPO_ROOT)}")
    for name, rows in counts.items():
        print(f"  {name}.csv: {rows} rows")


if __name__ == "__main__":
    sys.exit(main())
