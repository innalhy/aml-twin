#!/usr/bin/env python3
"""Check the paired investigation fixtures without installing dependencies."""

import argparse
import csv
import json
import re
from datetime import datetime
from decimal import Decimal
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DEFAULT_PACK = ROOT / "data/evidence/analyst-session-001"
HIDDEN_FIELDS = {
    "authored_truth", "case_kind", "source_case_id", "acceptable_actions",
    "poor_actions", "decisive_evidence", "is_laundering", "is_legitimate",
}


def require(condition, message):
    if not condition:
        raise ValueError(message)


def timestamp(value):
    require(value.endswith("Z"), f"Timestamp must be UTC: {value}")
    return datetime.fromisoformat(value.replace("Z", "+00:00"))


def table(path):
    with path.open(newline="") as source:
        reader = csv.DictReader(source)
        require(reader.fieldnames and len(reader.fieldnames) == len(set(reader.fieldnames)), f"Bad CSV header: {path.name}")
        rows = list(reader)
    require(all(None not in row and None not in row.values() for row in rows), f"Malformed CSV row: {path.name}")
    return rows


def indexed(rows, key):
    result = {row[key]: row for row in rows}
    require(len(result) == len(rows), f"Duplicate {key}")
    return result


def check_public_fields(value):
    if isinstance(value, dict):
        require(not HIDDEN_FIELDS.intersection(value), "Instructor answer field appears in learner data")
        for child in value.values():
            check_public_fields(child)
    elif isinstance(value, list):
        for child in value:
            check_public_fields(child)


def validate(pack):
    profile = json.loads((pack / "learner/customers.json").read_text())
    require(profile["synthetic"] is True, "Missing synthetic profile marker")
    snapshot = timestamp(profile["snapshot_at"])
    customers = indexed(profile["customers"], "customer_id")
    accounts = indexed(table(pack / "learner/accounts.csv"), "account_id")
    transactions = indexed(table(pack / "learner/transactions.csv"), "transaction_id")
    alerts = indexed(table(pack / "learner/alerts.csv"), "alert_id")
    evidence = indexed(table(pack / "instructor/evidence-index.csv"), "evidence_id")
    initial = indexed(table(pack / "learner/evidence-index.csv"), "evidence_id")
    requests = table(pack / "learner/request-catalog.csv")
    due = indexed(table(pack / "instructor/events.csv"), "transaction_id")
    key = json.loads((pack / "instructor/answer-key.json").read_text())
    require(key["snapshot_at"] == profile["snapshot_at"], "Snapshot mismatch")
    require((len(customers), len(accounts), len(transactions), len(alerts), len(evidence)) == (6, 24, 126, 6, 24), "Unexpected pack inventory")

    balances = {}
    for customer_id, customer in customers.items():
        require(customer_id.startswith("SYN-"), "Customer identifier is not synthetic")
        account = accounts[customer["account_id"]]
        require(account["holder_id"] == customer_id and account["holder_name"] == customer["display_name"], f"Account holder mismatch: {customer_id}")
        require(account["opened_at"] == customer["onboarded_at"], f"Onboarding date mismatch: {customer_id}")
        require(timestamp(account["opened_at"]) <= timestamp(account["opening_balance_at"]) <= snapshot, f"Invalid balance baseline: {customer_id}")
        require(customer["unit"] == account["unit"] == "SCU", "Unit mismatch")
        balances[customer["account_id"]] = Decimal(account["opening_balance"])
    for transaction_id, row in sorted(transactions.items(), key=lambda item: (item[1]["executed_at"] or item[1]["submitted_at"], item[0])):
        source, target = row["from_account"], row["to_account"]
        require(source in accounts and target in accounts and source != target, f"Bad transfer accounts: {transaction_id}")
        amount = Decimal(row["amount"])
        require(amount.is_finite() and amount > 0 and row["unit"] == "SCU", f"Bad transfer amount: {transaction_id}")
        submitted = timestamp(row["submitted_at"])
        require(submitted <= snapshot, f"Future submission in snapshot: {transaction_id}")
        for account_id in [source, target]:
            if account_id in balances:
                require(timestamp(accounts[account_id]["opened_at"]) <= submitted, f"Transfer before onboarding: {transaction_id}")
        if row["status"] == "pending":
            require(not row["executed_at"] and timestamp(row["scheduled_at"]) > snapshot, f"Pending order misrepresented: {transaction_id}")
            continue
        require(row["status"] == "executed" and row["executed_at"], f"Unknown transfer status: {transaction_id}")
        executed = timestamp(row["executed_at"])
        require(submitted <= executed <= snapshot, f"Bad execution chronology: {transaction_id}")
        for account_id in [source, target]:
            if account_id in balances:
                require(timestamp(accounts[account_id]["opening_balance_at"]) <= executed, f"Transfer predates balance baseline: {transaction_id}")
        if source in balances:
            balances[source] -= amount
            require(balances[source] >= 0, f"Negative internal balance: {transaction_id}")
        if target in balances:
            balances[target] += amount

    for alert in alerts.values():
        require(alert["customer_id"] in customers, "Unknown alert customer")
        require(alert["account_id"] == customers[alert["customer_id"]]["account_id"], "Alert account mismatch")
        require(timestamp(alert["created_at"]) <= snapshot, "Future alert in snapshot")
        for transaction_id in alert["transaction_ids"].split("|"):
            require(transaction_id in transactions, f"Unknown alert transfer: {transaction_id}")
            row = transactions[transaction_id]
            require(alert["account_id"] in [row["from_account"], row["to_account"]], "Alert transfer belongs to another customer")

    catalog = {(row["customer_id"], row["request_id"]): row for row in requests}
    require(len(catalog) == len(requests) == 12, "Duplicate or missing request option")
    expected_initial = set()
    request_pairs = set()
    expected_files = set()
    for evidence_id, record in evidence.items():
        require(record["customer_id"] in customers, "Unknown evidence customer")
        path = (pack / record["path"]).resolve()
        expected_files.add(path)
        require(path.is_relative_to(pack.resolve()) and path.is_file(), f"Invalid evidence path: {evidence_id}")
        text = path.read_text()
        require(f"Record: {evidence_id}" in text and f"Customer: {record['customer_id']}" in text, f"Evidence identity mismatch: {evidence_id}")
        require("Synthetic training record." in text, f"Unmarked synthetic record: {evidence_id}")
        for transaction_id in re.findall(r"\bTX-[A-Z0-9]+(?:-[A-Z0-9]+)*\b", text):
            require(transaction_id in transactions, f"Broken document transfer link: {evidence_id}/{transaction_id}")
        if record["release"] == "initial":
            expected_initial.add(evidence_id)
            require(path.parent == (pack / "learner/records").resolve(), "Initial record outside learner folder")
            require(record["service_minutes"] == "0" and not record["request_id"] and not record["prerequisite_evidence_id"], "Initial evidence has a release gate")
            public = initial[evidence_id]
            require((pack / "learner" / public["path"]).resolve() == path, "Public evidence path mismatch")
            require(all(public[field] == record[field] for field in ["customer_id", "title", "source"]), "Public evidence metadata mismatch")
        else:
            require(record["release"] == "on_request" and path.parent == (pack / "instructor/release/records").resolve(), "Deferred evidence is exposed initially")
            pair = (record["customer_id"], record["request_id"])
            require(pair in catalog and pair not in request_pairs, "Missing or duplicated response gate")
            request_pairs.add(pair)
            require(int(record["service_minutes"]) > 0, "Missing request delay")
            require(all(record[field] == catalog[pair][field] for field in ["service_minutes", "prerequisite_evidence_id"]), "Catalog release gate mismatch")
            prerequisite = record["prerequisite_evidence_id"]
            if prerequisite:
                require(prerequisite in evidence and evidence[prerequisite]["customer_id"] == record["customer_id"], "Invalid request prerequisite")
    require(set(initial) == expected_initial and len(initial) == 12, "Initial evidence set is wrong")
    require(request_pairs == set(catalog), "Orphan request option")
    actual_files = {path.resolve() for folder in ["learner/records", "instructor/release/records"] for path in (pack / folder).glob("*.md")}
    require(actual_files == expected_files, "Unindexed evidence file")

    def earliest_release(evidence_id, visited=frozenset()):
        require(evidence_id not in visited, "Cyclic evidence release gate")
        record = evidence[evidence_id]
        prerequisite = record["prerequisite_evidence_id"]
        return int(record["service_minutes"]) + (earliest_release(prerequisite, visited | {evidence_id}) if prerequisite else 0)

    for evidence_id in evidence:
        earliest_release(evidence_id)
    for customer_id in ["SYN-001", "SYN-002"]:
        gates = {row["request_id"]: (row["service_minutes"], bool(row["prerequisite_evidence_id"])) for row in requests if row["customer_id"] == customer_id}
        if customer_id == "SYN-001":
            first_gates = gates
        else:
            require(gates == first_gates, "Release mechanics disclose the case class")
    require(earliest_release("EV-007") == earliest_release("EV-017") == 28, "Payer verification sequence changed")

    pending = {transaction_id for transaction_id, row in transactions.items() if row["status"] == "pending"}
    require(set(due) == pending and len(due) == 4, "Due events do not match pending orders")
    for transaction_id, event in due.items():
        row = transactions[transaction_id]
        minute = (timestamp(row["scheduled_at"]) - snapshot).total_seconds() / 60
        require(Decimal(event["session_minute"]) == Decimal(str(minute)), "Order due time mismatch")
        require(event["customer_id"] == accounts[row["from_account"]]["holder_id"], "Due event customer mismatch")
        require(event["event_type"] == "outgoing_order_due", "Unknown event type")
    require(sorted(int(event["session_minute"]) for event in due.values()) == [18, 18, 23, 23], "Unexpected event schedule")

    require(sum(item["points"] for item in key["rubric"]) == 100, "Rubric does not total 100")
    require(len(key["cases"]) == 2 and len(key["background_cases"]) == 4, "Missing instructor case")
    for case in key["cases"]:
        customer_id = case["customer_id"]
        require(customer_id in customers, "Unknown instructor case customer")
        for field in ["initial_evidence", "decisive_evidence", "corroborating_evidence"]:
            for evidence_id in case.get(field, []):
                require(evidence_id in evidence and evidence[evidence_id]["customer_id"] == customer_id, "Instructor evidence reference mismatch")
        require(evidence[case["screening_evidence"]]["customer_id"] == customer_id, "Screening reference mismatch")
        account_id = customers[customer_id]["account_id"]
        incoming = sum(Decimal(row["amount"]) for row in transactions.values() if row["to_account"] == account_id)
        outgoing = sum(Decimal(row["amount"]) for row in transactions.values() if row["from_account"] == account_id)
        require((incoming, outgoing, balances[account_id]) == (480000, 470000, 480000), "Paired payment totals or snapshot balance differ")
        require(case["money_if_both_orders_execute"] == {"incoming": int(incoming), "outgoing": int(outgoing), "retained": int(incoming - outgoing)}, "Instructor financial totals mismatch")
    for case in key["background_cases"]:
        require(evidence[case["evidence_id"]]["customer_id"] == case["customer_id"], "Background evidence mismatch")

    learner = pack / "learner"
    allowed = {"START.md", "course-policy.md", "customers.json", "accounts.csv", "transactions.csv", "alerts.csv", "evidence-index.csv", "request-catalog.csv"}
    actual = {path.relative_to(learner).as_posix() for path in learner.rglob("*") if path.is_file()}
    expected = allowed | {row["path"] for row in initial.values()}
    require(actual == expected, "Unexpected file in initial learner bundle")
    for path in learner.rglob("*"):
        require(not path.is_symlink(), "Symlink in learner bundle")
        if not path.is_file():
            continue
        if path.suffix == ".json":
            check_public_fields(json.loads(path.read_text()))
        elif path.suffix == ".csv":
            check_public_fields(table(path))
        elif path.suffix == ".md":
            require("instructor/" not in path.read_text() and "answer-key" not in path.read_text(), "Learner document links to instructor answers")
    original = json.loads((ROOT / "data/cases/01-deepfake-hk-001.example.json").read_text())
    burst = next(node for node in original["nodes"] if node["id"] == "n_burst")
    require([(row["id"], row["amount"]) for row in burst["twin_patch"]["transactions"]] == [(transaction_id, int(transactions[transaction_id]["amount"])) for transaction_id in ["TX-1", "TX-2", "TX-3"]], "Deepfake amounts differ from the original case")
    print(f"Validated {len(customers)} customers, {len(accounts)} accounts, {len(transactions)} transfers, {len(alerts)} alerts, and {len(evidence)} evidence records.")
    print("Initial learner bundle: 12 records; deferred responses: 12; matched order due times: 18 and 23 minutes; rubric: 100 points.")
    print("Internal snapshot balances (SCU): " + ", ".join(f"{account_id}={balance}" for account_id, balance in sorted(balances.items())))


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--pack", type=Path, default=DEFAULT_PACK)
    args = parser.parse_args()
    try:
        validate(args.pack)
    except (ValueError, KeyError, OSError) as error:
        parser.exit(1, f"Evidence validation failed: {error}\n")
