#!/usr/bin/env python3
"""Export the existing investigation tables and exact record bodies for the Worker.

    python3 scripts/export-web-investigation.py
    python3 scripts/export-web-investigation.py --check

The generated pack is server-only. It contains delayed responses, but never
instructor answers or source paths. The source pack and tables are not changed.
"""

import argparse
import csv
import json
import subprocess
import sys
from datetime import datetime
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DATA = ROOT / "simulation/flexsim/data"
PACK = ROOT / "data/evidence/analyst-session-001"
OUTPUT = ROOT / "workers/api/src/investigation-pack.json"
TABLES = {
    "customers": "customers",
    "accounts": "accounts",
    "transactions": "transactions",
    "alerts": "alerts",
    "requests": "request_catalog",
    "initialState": "initial_state",
    "dueEvents": "due_events",
}


def require(condition, message):
    if not condition:
        raise ValueError(message)


def read_table(name):
    with (DATA / "tables" / f"{name}.csv").open(newline="", encoding="utf-8") as source:
        reader = csv.DictReader(source)
        require(reader.fieldnames and len(reader.fieldnames) == len(set(reader.fieldnames)), f"Bad header: {name}")
        rows = list(reader)
    require(all(None not in row and None not in row.values() for row in rows), f"Malformed row: {name}")
    return rows


def indexed(rows, field):
    result = {row[field]: row for row in rows}
    require(len(result) == len(rows) and "" not in result, f"Duplicate or missing {field}")
    return result


def integer(row, field, minimum=0):
    value = row[field]
    require(value.isascii() and value.isdecimal(), f"Invalid integer {field}: {value!r}")
    number = int(value)
    require(minimum <= number <= 2**53 - 1, f"Out-of-range {field}: {value!r}")
    return number


def evidence_path(record):
    path = (ROOT / record["instructor_path"]).resolve()
    release = record["release"]
    require(release in {"initial", "on_request"}, f"Unknown evidence release: {record['evidence_id']}")
    folder = "learner/records" if release == "initial" else "instructor/release/records"
    require(path.is_relative_to(PACK.resolve()) and path.parent == (PACK / folder).resolve()
            and path.suffix == ".md" and path.is_file(), f"Invalid evidence path: {record['evidence_id']}")
    if release == "initial":
        require((ROOT / record["learner_path"]).resolve() == path, "Initial learner path mismatch")
    else:
        require(not record["learner_path"], "Deferred response appears in initial learner records")
    return path


def validate(tables, evidence):
    customers = indexed(tables["customers"], "customer_id")
    accounts = indexed(tables["accounts"], "account_id")
    transfers = indexed(tables["transactions"], "transaction_id")
    indexed(tables["alerts"], "alert_id")
    records = indexed(evidence, "evidence_id")
    states = indexed(tables["initialState"], "customer_id")
    indexed(tables["dueEvents"], "event_id")
    requests = {(row["customer_id"], row["request_id"]): row for row in tables["requests"]}
    require(len(requests) == len(tables["requests"]), "Duplicate request option")

    for customer in customers.values():
        account = accounts[customer["account_id"]]
        require(account["holder_id"] == customer["customer_id"], "Customer account mismatch")
        integer(account, "opening_balance")
        for field in ["declared_monthly_income", "expected_monthly_credits", "expected_largest_credit"]:
            integer(customer, field)
    for account in accounts.values():
        if account["opening_balance"]:
            integer(account, "opening_balance")
    for transfer in transfers.values():
        require(transfer["from_account"] in accounts and transfer["to_account"] in accounts, "Unknown transfer account")
        integer(transfer, "amount", 1)
    for alert in tables["alerts"]:
        require(alert["account_id"] == customers[alert["customer_id"]]["account_id"], "Alert account mismatch")
        require(all(ref in transfers for ref in alert["transaction_ids"].split("|")), "Unknown alert transfer")

    responses = set()
    for record in evidence:
        require(record["customer_id"] in customers, "Unknown evidence customer")
        delay = integer(record, "service_minutes")
        if record["release"] == "initial":
            require(delay == 0 and not record["request_id"] and not record["prerequisite_evidence_id"], "Initial evidence has a gate")
        else:
            pair = (record["customer_id"], record["request_id"])
            require(pair in requests and pair not in responses and delay > 0, "Invalid response gate")
            require(all(record[field] == requests[pair][field] for field in ["service_minutes", "prerequisite_evidence_id"]), "Response gate mismatch")
            responses.add(pair)
        evidence_path(record)
    require(responses == set(requests), "Request has no response")
    for request in requests.values():
        require(request["customer_id"] in customers and request["request_id"], "Invalid request customer or ID")
        integer(request, "service_minutes", 1)
        prerequisite = request["prerequisite_evidence_id"]
        if prerequisite:
            require(prerequisite in records and records[prerequisite]["customer_id"] == request["customer_id"], "Invalid request prerequisite")
    for record in evidence:
        visited = set()
        current = record["evidence_id"]
        while current:
            require(current not in visited, "Cyclic evidence prerequisite")
            visited.add(current)
            current = records[current]["prerequisite_evidence_id"]

    require(set(states) == set(customers), "Initial state customer mismatch")
    for state in states.values():
        require(state["account_id"] == customers[state["customer_id"]]["account_id"], "Initial state account mismatch")
        for field in ["snapshot_balance", "executed_transfer_count", "pending_outgoing_total"]:
            integer(state, field)
        for ref in filter(None, state["pending_order_ids"].split("|")):
            require(ref in transfers and transfers[ref]["status"] == "pending"
                    and transfers[ref]["from_account"] == state["account_id"], "Invalid initial pending order")
    pending = {row["transaction_id"] for row in transfers.values() if row["status"] == "pending"}
    require({row["transaction_id"] for row in tables["dueEvents"]} == pending
            and len(tables["dueEvents"]) == len(pending), "Due events do not match pending orders")
    for event in tables["dueEvents"]:
        integer(event, "due_minute")
        integer(event, "amount", 1)
        transfer = transfers[event["transaction_id"]]
        require(all(event[field] == transfer[field] for field in ["from_account", "to_account", "amount", "unit"]), "Due event transfer mismatch")
        require(event["account_id"] == event["from_account"] == customers[event["customer_id"]]["account_id"]
                and event["due_at"] == transfer["scheduled_at"], "Due event owner or timestamp mismatch")


def build_pack():
    subprocess.run([sys.executable, str(DATA / "export_tables.py"), "--check"], check=True)
    manifest = json.loads((DATA / "manifest.json").read_text(encoding="utf-8"))
    require(manifest["pack_id"] == PACK.name and manifest["pack_path"] == PACK.relative_to(ROOT).as_posix(), "Unexpected source pack")
    snapshot = manifest["snapshot_at"]
    require(snapshot.endswith("Z"), "Snapshot timestamp must be UTC")
    datetime.fromisoformat(snapshot.replace("Z", "+00:00"))
    tables = {key: read_table(name) for key, name in TABLES.items()}
    catalog = read_table("evidence_catalog")
    validate(tables, catalog)
    evidence = []
    for record in catalog:
        body = evidence_path(record).read_text(encoding="utf-8")
        require("Synthetic training record." in body and f"Record: {record['evidence_id']}" in body
                and f"Customer: {record['customer_id']}" in body, "Evidence body identity mismatch")
        evidence.append({
            "id": record["evidence_id"], "customerId": record["customer_id"],
            "title": record["title"], "source": record["source"], "body": body,
            "release": record["release"], "requestId": record["request_id"],
        })
    return {
        "snapshotAt": snapshot,
        "briefing": (PACK / "learner/START.md").read_text(encoding="utf-8"),
        "policy": (PACK / "learner/course-policy.md").read_text(encoding="utf-8"),
        **tables,
        "evidence": evidence,
    }


def self_check():
    for value in ["", "NaN", "1.5", "-1", " 1", str(2**53)]:
        try:
            integer({"value": value}, "value")
        except ValueError:
            continue
        raise ValueError(f"Integer guard accepted {value!r}")
    for source in ["README.md", "data/evidence/analyst-session-001/instructor/answer-key.md",
                   "data/evidence/analyst-session-001/instructor/release/records/EV-005.md"]:
        try:
            evidence_path({"evidence_id": "SELF-CHECK", "release": "initial",
                           "instructor_path": source, "learner_path": source})
        except ValueError:
            continue
        raise ValueError(f"Evidence path guard accepted {source}")


def main():
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--check", action="store_true", help="validate sources and compare the generated Worker pack")
    args = parser.parse_args()
    try:
        rendered = json.dumps(build_pack(), indent=2, ensure_ascii=False) + "\n"
        if args.check:
            self_check()
            require(OUTPUT.is_file() and OUTPUT.read_text(encoding="utf-8") == rendered,
                    "Worker pack is missing or stale; run export-web-investigation.py without --check")
            print("Worker investigation pack matches its sources.")
        else:
            OUTPUT.write_text(rendered, encoding="utf-8")
            print(f"Wrote {OUTPUT.relative_to(ROOT)}")
    except (ValueError, KeyError, OSError, subprocess.CalledProcessError) as error:
        parser.exit(1, f"Investigation export failed: {error}\n")


if __name__ == "__main__":
    main()
