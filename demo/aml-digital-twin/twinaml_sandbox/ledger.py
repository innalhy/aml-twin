"""Author the synthetic week and write the bundled CSV files.

The rows in this module are the source for ``data/*.csv``. Detection code
reads those CSV files, not this module, so an uploaded file with the same
columns follows the same path.

Every person, account, and amount is fictional. ``case_label`` values are
narrative crosswalks to ``data/cases/``. They are not findings.
"""

from __future__ import annotations

import argparse
from pathlib import Path

import pandas as pd

DATA_DIR = Path(__file__).resolve().parent.parent / "data"

ACCOUNT_COLUMNS = [
    "account_id",
    "customer_id",
    "name",
    "segment",
    "role",
    "kind",
    "opened_on",
    "kyc_narrative",
    "case_label",
    "device_id",
    "city",
]

TRANSACTION_COLUMNS = [
    "txn_id",
    "booked_at",
    "from_account",
    "to_account",
    "amount_hkd",
    "channel",
    "memo",
    "planted_typology",
]

RELATIONSHIP_COLUMNS = ["from_id", "to_id", "rel_type", "note"]

WALLET_COLUMNS = ["account_id", "list_name", "reason"]

# account_id, customer_id, name, segment, role, kind, opened_on, kyc, case_label, device, city
_ACCOUNTS: list[tuple[str, str, str, str, str, str, str, str, str, str, str]] = [
    ("SYN-EMP-01", "SYN-CUS-EMP", "Harbour Staff Payroll", "employer", "employer", "bank_account", "2024-01-15", "", "", "DEV-EMP-01", "Kowloon"),
    ("SYN-RET-01", "SYN-CUS-01", "Ada Lam", "retail", "retail", "bank_account", "2019-04-02", "", "", "DEV-RET-01", "Kowloon"),
    ("SYN-RET-02", "SYN-CUS-02", "Ben Chow", "retail", "retail", "bank_account", "2018-11-20", "", "", "DEV-RET-02", "Kowloon"),
    ("SYN-RET-03", "SYN-CUS-03", "Cara Ng", "retail", "retail", "bank_account", "2021-06-01", "", "", "DEV-RET-03", "Hong Kong Island"),
    ("SYN-RET-04", "SYN-CUS-04", "Derek Poon", "retail", "retail", "bank_account", "2016-02-14", "", "", "DEV-RET-04", "Hong Kong Island"),
    ("SYN-RET-05", "SYN-CUS-05", "Elena Wu", "retail", "retail", "bank_account", "2020-09-09", "", "", "DEV-RET-05", "New Territories"),
    ("SYN-RET-06", "SYN-CUS-06", "Felix Ho", "retail", "retail", "bank_account", "2017-03-03", "", "", "DEV-RET-06", "New Territories"),
    ("SYN-MER-01", "SYN-CUS-MER1", "North Point Grocer", "merchant", "merchant", "bank_account", "2015-05-05", "", "", "DEV-MER-01", "Hong Kong Island"),
    ("SYN-MER-02", "SYN-CUS-MER2", "Quarry Bay Lettings", "merchant", "merchant", "bank_account", "2014-08-18", "", "", "DEV-MER-02", "Hong Kong Island"),
    ("SYN-INS-01", "SYN-CUS-INS", "Synthetic Cover Insurance", "merchant", "merchant", "bank_account", "2013-01-01", "", "", "DEV-INS-01", "Kowloon"),
    ("SYN-UNI-01", "SYN-CUS-UNI", "Kowloon Course Fees Desk", "merchant", "merchant", "bank_account", "2012-09-01", "", "", "DEV-UNI-01", "Kowloon"),
    (
        "SYN-SM-HUB",
        "SYN-CUS-HUB",
        "Ivan Tsang",
        "retail",
        "collector",
        "bank_account",
        "2026-02-20",
        "New account, opened just before the demo week.",
        "",
        "DEV-HUB-01",
        "Kowloon",
    ),
    ("SYN-SM-01", "SYN-CUS-SM01", "June Ip", "retail", "smurf", "bank_account", "2026-02-18", "", "", "DEV-SMURF-7", "Kowloon"),
    ("SYN-SM-02", "SYN-CUS-SM02", "Ken Lau", "retail", "smurf", "bank_account", "2026-02-18", "", "", "DEV-SMURF-7", "Kowloon"),
    ("SYN-SM-03", "SYN-CUS-SM03", "Lily Mok", "retail", "smurf", "bank_account", "2026-02-19", "", "", "DEV-SMURF-7", "Kowloon"),
    ("SYN-SM-04", "SYN-CUS-SM04", "Marco Shum", "retail", "smurf", "bank_account", "2026-02-19", "", "", "DEV-SMURF-7", "Kowloon"),
    ("SYN-SM-05", "SYN-CUS-SM05", "Nina Cheung", "retail", "smurf", "bank_account", "2026-02-21", "", "", "DEV-SMURF-7", "Kowloon"),
    ("SYN-SM-06", "SYN-CUS-SM06", "Oscar Fung", "retail", "smurf", "bank_account", "2026-02-22", "", "", "DEV-SMURF-7", "Kowloon"),
    ("SYN-SM-07", "SYN-CUS-SM07", "Polly Au", "retail", "smurf", "bank_account", "2026-02-24", "", "", "DEV-SMURF-7", "Kowloon"),
    ("SYN-SM-08", "SYN-CUS-SM08", "Quinn Ma", "retail", "smurf", "bank_account", "2026-02-25", "", "", "DEV-SMURF-7", "Kowloon"),
    (
        "DEV-SMURF-7",
        "DEV-SMURF-7",
        "Shared handset SMURF-7",
        "device",
        "device",
        "device",
        "",
        "One device id on every smurf sender.",
        "",
        "",
        "",
    ),
    (
        "SYN-CY-A",
        "SYN-CUS-CYA",
        "Aaron Bell",
        "retail",
        "cycle",
        "bank_account",
        "2025-11-01",
        "Memos say consulting and loan. The account has no merchant activity.",
        "triad-cashflow-001",
        "DEV-CY-A",
        "Kowloon",
    ),
    (
        "SYN-CY-B",
        "SYN-CUS-CYB",
        "Bea Cho",
        "retail",
        "cycle",
        "bank_account",
        "2025-11-02",
        "Memos say consulting and loan. The account has no merchant activity.",
        "triad-cashflow-001",
        "DEV-CY-B",
        "Kowloon",
    ),
    (
        "SYN-CY-C",
        "SYN-CUS-CYC",
        "Chris Dang",
        "retail",
        "cycle",
        "bank_account",
        "2025-11-03",
        "Memos say consulting and loan. The account has no merchant activity.",
        "triad-cashflow-001",
        "DEV-CY-C",
        "Kowloon",
    ),
    (
        "SYN-CY-D",
        "SYN-CUS-CYD",
        "Dana Eng",
        "retail",
        "cycle",
        "bank_account",
        "2025-11-04",
        "Memos say consulting and loan. The account has no merchant activity.",
        "triad-cashflow-001",
        "DEV-CY-D",
        "Kowloon",
    ),
    ("SYN-VIC-01", "SYN-CUS-V1", "Pak Ho", "retail", "victim", "bank_account", "2019-08-08", "", "", "DEV-V1", "Sha Tin"),
    ("SYN-VIC-02", "SYN-CUS-V2", "Rita Sung", "retail", "victim", "bank_account", "2020-01-12", "", "", "DEV-V2", "Sha Tin"),
    ("SYN-VIC-03", "SYN-CUS-V3", "Sam Wei", "retail", "victim", "bank_account", "2018-05-19", "", "", "DEV-V3", "Tsuen Wan"),
    (
        "SYN-MU-L1",
        "SYN-CUS-L1",
        "Lee Kwan",
        "retail",
        "mule",
        "bank_account",
        "2026-02-25",
        "Customer described the login as rented to a third party.",
        "mule-rent-001",
        "DEV-MU-L1",
        "Mong Kok",
    ),
    (
        "SYN-MU-L2",
        "SYN-CUS-L2",
        "Grey Cluster Desk",
        "retail",
        "mule",
        "bank_account",
        "2026-02-11",
        "Several inbound stories land on this account in the same week.",
        "greythunder-mule-001",
        "DEV-MU-L2",
        "Mong Kok",
    ),
    (
        "SYN-MU-L3",
        "SYN-CUS-L3",
        "Cash-out Desk",
        "retail",
        "mule",
        "bank_account",
        "2026-02-12",
        "Same-day pass-through toward a wallet on the sandbox watchlist.",
        "justicegate-crypto-001",
        "DEV-MU-L3",
        "Yau Ma Tei",
    ),
    (
        "SYN-MIX-01",
        "SYN-MIX-POOL",
        "SYN Mixer Pool",
        "wallet",
        "mixer",
        "wallet",
        "2026-01-01",
        "Synthetic pooling wallet used only inside this classroom ledger.",
        "justicegate-crypto-001",
        "",
        "",
    ),
    (
        "SYN-CTRL-01",
        "SYN-CTRL-01",
        "Synthetic recruiter",
        "person",
        "controller",
        "person",
        "",
        "Narrative stand-in for third-party control. No real person.",
        "mule-rent-001",
        "",
        "",
    ),
    (
        "SYN-DF-01",
        "SYN-CUS-DF",
        "Kai Mensah",
        "retail",
        "onboarding",
        "bank_account",
        "2026-03-01",
        "Video-KYC liveness failed twice, then passed.",
        "deepfake-hk-001",
        "DEV-DF-01",
        "Kowloon",
    ),
    (
        "SYN-TP-01",
        "SYN-CUS-TP",
        "Third Party Desk",
        "retail",
        "third_party",
        "bank_account",
        "2024-07-07",
        "Payer is not the account holder on the receiving account.",
        "",
        "DEV-TP-01",
        "Central",
    ),
    (
        "SYN-TB-01",
        "SYN-CUS-TB1",
        "Daybreak Shell Desk",
        "trade",
        "trade_cover",
        "bank_account",
        "2025-06-01",
        "Invoice memo says jewellery export. This sandbox holds no shipment record.",
        "daybreak-tbml-001",
        "DEV-TB-01",
        "Kwai Chung",
    ),
    (
        "SYN-TB-02",
        "SYN-CUS-TB2",
        "Overseas Buyer Desk",
        "trade",
        "trade_cover",
        "bank_account",
        "2025-06-02",
        "Counterparty named on the jewellery-export memo.",
        "daybreak-tbml-001",
        "DEV-TB-02",
        "Overseas desk",
    ),
]

# txn_id, booked_at, from, to, amount, channel, memo, planted_typology
_TRANSACTIONS: list[tuple[str, str, str, str, int, str, str, str]] = [
    ("T-PAY-01", "2026-03-02T09:00:00", "SYN-EMP-01", "SYN-RET-01", 22000, "salary", "March salary", "payroll"),
    ("T-PAY-02", "2026-03-02T09:00:00", "SYN-EMP-01", "SYN-RET-02", 21000, "salary", "March salary", "payroll"),
    ("T-PAY-03", "2026-03-02T09:00:00", "SYN-EMP-01", "SYN-RET-03", 9800, "salary", "March salary", "payroll"),
    ("T-PAY-04", "2026-03-02T09:00:00", "SYN-EMP-01", "SYN-RET-04", 7600, "salary", "March salary", "payroll"),
    ("T-RENT-OFF", "2026-03-02T11:00:00", "SYN-EMP-01", "SYN-MER-02", 15000, "CHATS", "Office rent", "office_rent"),
    ("T-RENT-01", "2026-03-03T08:30:00", "SYN-RET-01", "SYN-MER-02", 8500, "FPS", "Home rent", "rent"),
    ("T-GROC-01", "2026-03-03T12:10:00", "SYN-RET-02", "SYN-MER-01", 320, "card", "Groceries", "grocery"),
    ("T-GROC-02", "2026-03-03T12:40:00", "SYN-RET-03", "SYN-MER-01", 180, "card", "Groceries", "grocery"),
    ("T-GROC-03", "2026-03-03T18:05:00", "SYN-RET-04", "SYN-MER-01", 90, "card", "Groceries", "grocery"),
    ("T-LUNCH-01", "2026-03-03T13:00:00", "SYN-RET-02", "SYN-MER-01", 1280, "card", "Lunch", "petty"),
    ("T-SM-01", "2026-03-03T10:05:00", "SYN-SM-01", "SYN-SM-HUB", 6200, "FPS", "Loan", "smurfing"),
    ("T-SM-02", "2026-03-03T10:40:00", "SYN-SM-02", "SYN-SM-HUB", 6800, "FPS", "Loan", "smurfing"),
    ("T-SM-03", "2026-03-03T11:15:00", "SYN-SM-03", "SYN-SM-HUB", 7100, "FPS", "Gift", "smurfing"),
    ("T-SM-04", "2026-03-03T12:05:00", "SYN-SM-04", "SYN-SM-HUB", 7600, "FPS", "Gift", "smurfing"),
    ("T-SM-05", "2026-03-03T13:20:00", "SYN-SM-05", "SYN-SM-HUB", 8100, "FPS", "Loan", "smurfing"),
    ("T-SM-06", "2026-03-03T14:10:00", "SYN-SM-06", "SYN-SM-HUB", 8600, "FPS", "Loan", "smurfing"),
    ("T-SM-07", "2026-03-03T15:00:00", "SYN-SM-07", "SYN-SM-HUB", 9100, "FPS", "Gift", "smurfing"),
    ("T-SM-08", "2026-03-03T15:45:00", "SYN-SM-08", "SYN-SM-HUB", 9400, "FPS", "Gift", "smurfing"),
    ("T-TUIT-01", "2026-03-04T10:00:00", "SYN-RET-05", "SYN-UNI-01", 7200, "FPS", "Course fee", "tuition"),
    ("T-INS-01", "2026-03-04T10:20:00", "SYN-RET-06", "SYN-INS-01", 6000, "FPS", "Premium", "insurance"),
    ("T-TAXI-01", "2026-03-04T08:15:00", "SYN-RET-04", "SYN-RET-06", 1800, "FPS", "Taxi share", "petty"),
    ("T-BOOK-01", "2026-03-04T16:00:00", "SYN-RET-05", "SYN-UNI-01", 2400, "FPS", "Textbook", "petty"),
    ("T-CY-AB", "2026-03-04T09:00:00", "SYN-CY-A", "SYN-CY-B", 18000, "FPS", "Consulting", "circular"),
    ("T-CY-BC", "2026-03-04T11:00:00", "SYN-CY-B", "SYN-CY-C", 17500, "FPS", "Consulting", "circular"),
    ("T-CY-CD", "2026-03-04T14:00:00", "SYN-CY-C", "SYN-CY-D", 17000, "FPS", "Loan", "circular"),
    ("T-CY-DA", "2026-03-04T18:00:00", "SYN-CY-D", "SYN-CY-A", 16500, "FPS", "Loan", "circular"),
    ("T-MU-V1", "2026-03-05T09:10:00", "SYN-VIC-01", "SYN-MU-L1", 40000, "FPS", "Investment", "mule_in"),
    ("T-MU-V2", "2026-03-05T09:40:00", "SYN-VIC-02", "SYN-MU-L1", 55000, "FPS", "Investment", "mule_in"),
    ("T-MU-V3", "2026-03-05T10:05:00", "SYN-VIC-03", "SYN-MU-L1", 28000, "FPS", "Investment", "mule_in"),
    ("T-MU-12", "2026-03-05T12:00:00", "SYN-MU-L1", "SYN-MU-L2", 110000, "FPS", "Cash", "mule_hop"),
    ("T-DF-IN", "2026-03-05T13:00:00", "SYN-TP-01", "SYN-DF-01", 45000, "CHATS", "Supplier", "deepfake_in"),
    ("T-DF-OUT", "2026-03-05T15:30:00", "SYN-DF-01", "SYN-MU-L2", 40000, "FPS", "Supplier", "deepfake_out"),
    ("T-MU-23", "2026-03-05T18:00:00", "SYN-MU-L2", "SYN-MU-L3", 140000, "FPS", "Cash", "mule_hop"),
    ("T-MU-3M", "2026-03-05T21:00:00", "SYN-MU-L3", "SYN-MIX-01", 130000, "on-chain", "Pool", "mule_hop"),
    ("T-FAM-01", "2026-03-05T19:00:00", "SYN-RET-01", "SYN-RET-05", 5500, "FPS", "Family support", "family"),
    ("T-GROC-04", "2026-03-05T19:30:00", "SYN-RET-06", "SYN-MER-01", 240, "card", "Groceries", "grocery"),
    ("T-TB-01", "2026-03-06T10:30:00", "SYN-TB-01", "SYN-TB-02", 85000, "CHATS", "Jewellery export invoice", "trade_cover"),
]

_RELATIONSHIPS: list[tuple[str, str, str, str]] = [
    (
        "SYN-CTRL-01",
        "SYN-MU-L1",
        "CONTROLS",
        "Synthetic recruiter control on the rented login. Narrative label only.",
    ),
    (
        "SYN-CTRL-01",
        "SYN-MU-L2",
        "CONTROLS",
        "Synthetic recruiter control on the second-layer account.",
    ),
    (
        "SYN-CTRL-01",
        "SYN-MU-L3",
        "CONTROLS",
        "Synthetic recruiter control on the cash-out account.",
    ),
    ("SYN-SM-01", "DEV-SMURF-7", "USES_DEVICE", "Shared handset on the smurf senders."),
    ("SYN-SM-02", "DEV-SMURF-7", "USES_DEVICE", "Shared handset on the smurf senders."),
    ("SYN-SM-03", "DEV-SMURF-7", "USES_DEVICE", "Shared handset on the smurf senders."),
    ("SYN-SM-04", "DEV-SMURF-7", "USES_DEVICE", "Shared handset on the smurf senders."),
    ("SYN-SM-05", "DEV-SMURF-7", "USES_DEVICE", "Shared handset on the smurf senders."),
    ("SYN-SM-06", "DEV-SMURF-7", "USES_DEVICE", "Shared handset on the smurf senders."),
    ("SYN-SM-07", "DEV-SMURF-7", "USES_DEVICE", "Shared handset on the smurf senders."),
    ("SYN-SM-08", "DEV-SMURF-7", "USES_DEVICE", "Shared handset on the smurf senders."),
]

_WALLETS: list[tuple[str, str, str]] = [
    (
        "SYN-MIX-01",
        "sandbox_mixer_watchlist",
        "Synthetic wallet labelled as a mixer for this classroom twin. Not a real service.",
    ),
]


def account_frame() -> pd.DataFrame:
    frame = pd.DataFrame(_ACCOUNTS, columns=ACCOUNT_COLUMNS)
    _require_unique(frame, "account_id", "accounts")
    return frame


def transaction_frame() -> pd.DataFrame:
    frame = pd.DataFrame(_TRANSACTIONS, columns=TRANSACTION_COLUMNS)
    frame["booked_at"] = pd.to_datetime(frame["booked_at"])
    frame["amount_hkd"] = frame["amount_hkd"].astype(int)
    _require_unique(frame, "txn_id", "transactions")
    return frame.sort_values(["booked_at", "txn_id"], kind="mergesort").reset_index(drop=True)


def relationship_frame() -> pd.DataFrame:
    return pd.DataFrame(_RELATIONSHIPS, columns=RELATIONSHIP_COLUMNS)


def wallet_frame() -> pd.DataFrame:
    frame = pd.DataFrame(_WALLETS, columns=WALLET_COLUMNS)
    _require_unique(frame, "account_id", "reference wallets")
    return frame


def write_csv(directory: Path | None = None) -> Path:
    """Write the four bundled CSV files. Returns the directory."""
    target = directory or DATA_DIR
    target.mkdir(parents=True, exist_ok=True)
    accounts = account_frame()
    transactions = transaction_frame()
    relationships = relationship_frame()
    wallets = wallet_frame()
    _check_references(accounts, transactions, relationships, wallets)
    accounts.to_csv(target / "accounts.csv", index=False)
    exported = transactions.copy()
    exported["booked_at"] = exported["booked_at"].dt.strftime("%Y-%m-%dT%H:%M:%S")
    exported.to_csv(target / "transactions.csv", index=False)
    relationships.to_csv(target / "relationships.csv", index=False)
    wallets.to_csv(target / "reference_wallets.csv", index=False)
    return target


def _require_unique(frame: pd.DataFrame, column: str, label: str) -> None:
    duplicated = frame[column][frame[column].duplicated()].tolist()
    if duplicated:
        raise ValueError(f"Duplicate {column} in {label}: {duplicated}")


def _check_references(
    accounts: pd.DataFrame,
    transactions: pd.DataFrame,
    relationships: pd.DataFrame,
    wallets: pd.DataFrame,
) -> None:
    ids = set(accounts["account_id"])
    missing_ends = sorted(
        (set(transactions["from_account"]) | set(transactions["to_account"])) - ids
    )
    if missing_ends:
        raise ValueError(f"Transaction endpoint missing from accounts: {missing_ends}")
    missing_rel = sorted((set(relationships["from_id"]) | set(relationships["to_id"])) - ids)
    if missing_rel:
        raise ValueError(f"Relationship endpoint missing from accounts: {missing_rel}")
    missing_wallets = sorted(set(wallets["account_id"]) - ids)
    if missing_wallets:
        raise ValueError(f"Watchlist id missing from accounts: {missing_wallets}")


def main() -> None:
    parser = argparse.ArgumentParser(description="Rewrite the bundled sandbox CSV files.")
    parser.add_argument(
        "--write",
        action="store_true",
        help="Write data/accounts.csv, transactions.csv, relationships.csv, and reference_wallets.csv.",
    )
    args = parser.parse_args()
    if not args.write:
        parser.error("Pass --write to rewrite the bundled CSV files.")
    directory = write_csv()
    print(f"Wrote sandbox CSV files to {directory}")


if __name__ == "__main__":
    main()
