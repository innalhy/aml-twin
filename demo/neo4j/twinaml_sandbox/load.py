"""Load a sandbox ledger from CSV and check the columns the rules rely on."""

from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path

import pandas as pd

from twinaml_sandbox.constants import MAX_ACCOUNTS, MAX_TRANSACTIONS
from twinaml_sandbox.ledger import (
    ACCOUNT_COLUMNS,
    DATA_DIR,
    RELATIONSHIP_COLUMNS,
    TRANSACTION_COLUMNS,
    WALLET_COLUMNS,
)

PAYABLE_KINDS = frozenset({"bank_account", "wallet"})


class LedgerError(ValueError):
    """The CSV is present but the sandbox cannot run it."""


@dataclass
class Bundle:
    """One consistent ledger: accounts, payments, non-payment links, watchlist."""

    accounts: pd.DataFrame
    transactions: pd.DataFrame
    relationships: pd.DataFrame
    wallets: pd.DataFrame
    source_name: str

    def name_of(self, account_id: str) -> str:
        matches = self.accounts.loc[self.accounts["account_id"] == account_id, "name"]
        if matches.empty:
            return account_id
        return str(matches.iloc[0])

    def row_of(self, account_id: str) -> pd.Series:
        matches = self.accounts.loc[self.accounts["account_id"] == account_id]
        if matches.empty:
            raise LedgerError(f"Unknown account id {account_id}.")
        return matches.iloc[0]


def load_bundled() -> Bundle:
    """Load the CSV files shipped in ``demo/neo4j/data``."""
    return load_directory(DATA_DIR, source_name="bundled synthetic week")


def load_directory(directory: Path, source_name: str) -> Bundle:
    directory = Path(directory)
    return assemble(
        accounts=_read_table(directory / "accounts.csv", ACCOUNT_COLUMNS, "accounts.csv"),
        transactions=_read_table(
            directory / "transactions.csv", TRANSACTION_COLUMNS, "transactions.csv"
        ),
        relationships=_read_optional(
            directory / "relationships.csv", RELATIONSHIP_COLUMNS, "relationships.csv"
        ),
        wallets=_read_optional(
            directory / "reference_wallets.csv", WALLET_COLUMNS, "reference_wallets.csv"
        ),
        source_name=source_name,
    )


def assemble(
    accounts: pd.DataFrame,
    transactions: pd.DataFrame,
    relationships: pd.DataFrame,
    wallets: pd.DataFrame,
    source_name: str,
) -> Bundle:
    """Validate frames that may have come from an upload rather than a folder."""
    accounts = _prepare_accounts(accounts)
    transactions = _prepare_transactions(transactions)
    relationships = _prepare_relationships(relationships)
    wallets = _prepare_wallets(wallets)
    _check_size(accounts, transactions)
    _check_ids(accounts, transactions, relationships, wallets)
    return Bundle(
        accounts=accounts,
        transactions=transactions,
        relationships=relationships,
        wallets=wallets,
        source_name=source_name,
    )


def empty_relationships() -> pd.DataFrame:
    return pd.DataFrame(columns=RELATIONSHIP_COLUMNS)


def empty_wallets() -> pd.DataFrame:
    return pd.DataFrame(columns=WALLET_COLUMNS)


def _read_table(path: Path, columns: list[str], label: str) -> pd.DataFrame:
    if not path.is_file():
        raise LedgerError(f"Missing {label} at {path}.")
    frame = pd.read_csv(path, dtype=str, keep_default_na=False)
    return _require_columns(frame, columns, label)


def _read_optional(path: Path, columns: list[str], label: str) -> pd.DataFrame:
    if not path.is_file():
        return pd.DataFrame(columns=columns)
    frame = pd.read_csv(path, dtype=str, keep_default_na=False)
    return _require_columns(frame, columns, label)


def _require_columns(frame: pd.DataFrame, columns: list[str], label: str) -> pd.DataFrame:
    missing = [column for column in columns if column not in frame.columns]
    if missing:
        raise LedgerError(f"{label} is missing column(s): {', '.join(missing)}.")
    return frame.loc[:, columns].copy()


def _prepare_accounts(frame: pd.DataFrame) -> pd.DataFrame:
    prepared = _require_columns(frame, ACCOUNT_COLUMNS, "accounts.csv")
    for column in ACCOUNT_COLUMNS:
        prepared[column] = prepared[column].fillna("").astype(str).str.strip()
    prepared = prepared[prepared["account_id"] != ""].reset_index(drop=True)
    if prepared.empty:
        raise LedgerError("accounts.csv has no account rows.")
    duplicated = prepared.loc[prepared["account_id"].duplicated(), "account_id"].tolist()
    if duplicated:
        raise LedgerError(f"Duplicate account_id values: {duplicated}.")
    unknown_kinds = sorted(set(prepared["kind"]) - {"bank_account", "wallet", "person", "device"})
    if unknown_kinds:
        raise LedgerError(
            "accounts.csv kind must be bank_account, wallet, person, or device. "
            f"Found: {unknown_kinds}."
        )
    return prepared


def _prepare_transactions(frame: pd.DataFrame) -> pd.DataFrame:
    prepared = _require_columns(frame, TRANSACTION_COLUMNS, "transactions.csv")
    for column in ("txn_id", "from_account", "to_account", "channel", "memo", "planted_typology"):
        prepared[column] = prepared[column].fillna("").astype(str).str.strip()
    prepared = prepared[prepared["txn_id"] != ""].reset_index(drop=True)
    if prepared.empty:
        raise LedgerError("transactions.csv has no payment rows.")
    duplicated = prepared.loc[prepared["txn_id"].duplicated(), "txn_id"].tolist()
    if duplicated:
        raise LedgerError(f"Duplicate txn_id values: {duplicated}.")
    amounts: list[int] = []
    for raw in prepared["amount_hkd"].astype(str):
        try:
            value = float(raw)
        except ValueError as exc:
            raise LedgerError(f"amount_hkd must be a number. Found {raw!r}.") from exc
        if value <= 0 or not value.is_integer():
            raise LedgerError(f"amount_hkd must be a positive whole number of HKD. Found {raw!r}.")
        amounts.append(int(value))
    prepared["amount_hkd"] = amounts
    prepared["booked_at"] = _parse_booked_at(prepared["booked_at"])
    return prepared.sort_values(["booked_at", "txn_id"], kind="mergesort").reset_index(drop=True)


def _parse_booked_at(series: pd.Series) -> pd.Series:
    if pd.api.types.is_datetime64_any_dtype(series):
        parsed = pd.to_datetime(series)
    else:
        try:
            parsed = pd.to_datetime(series, format="ISO8601")
        except (ValueError, TypeError) as exc:
            raise LedgerError(
                "booked_at must be an ISO timestamp such as 2026-03-03T10:05:00."
            ) from exc
    if parsed.isna().any():
        raise LedgerError("booked_at has a blank or unreadable value.")
    return parsed


def _prepare_relationships(frame: pd.DataFrame) -> pd.DataFrame:
    if frame is None or frame.empty:
        return empty_relationships()
    prepared = _require_columns(frame, RELATIONSHIP_COLUMNS, "relationships.csv")
    for column in RELATIONSHIP_COLUMNS:
        prepared[column] = prepared[column].fillna("").astype(str).str.strip()
    prepared = prepared[prepared["from_id"] != ""].reset_index(drop=True)
    return prepared


def _prepare_wallets(frame: pd.DataFrame) -> pd.DataFrame:
    if frame is None or frame.empty:
        return empty_wallets()
    prepared = _require_columns(frame, WALLET_COLUMNS, "reference_wallets.csv")
    for column in WALLET_COLUMNS:
        prepared[column] = prepared[column].fillna("").astype(str).str.strip()
    prepared = prepared[prepared["account_id"] != ""].reset_index(drop=True)
    duplicated = prepared.loc[prepared["account_id"].duplicated(), "account_id"].tolist()
    if duplicated:
        raise LedgerError(f"Duplicate watchlist account_id values: {duplicated}.")
    return prepared


def _check_size(accounts: pd.DataFrame, transactions: pd.DataFrame) -> None:
    if len(accounts) > MAX_ACCOUNTS:
        raise LedgerError(
            f"This sandbox accepts up to {MAX_ACCOUNTS} accounts. The file has {len(accounts)}."
        )
    if len(transactions) > MAX_TRANSACTIONS:
        raise LedgerError(
            f"This sandbox accepts up to {MAX_TRANSACTIONS} payments. "
            f"The file has {len(transactions)}."
        )


def _check_ids(
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
        raise LedgerError(
            "Every payment endpoint must exist in accounts.csv. Missing: "
            + ", ".join(missing_ends)
            + "."
        )
    kinds = accounts.set_index("account_id")["kind"]
    for row in transactions.itertuples(index=False):
        for endpoint in (row.from_account, row.to_account):
            kind = kinds.loc[endpoint]
            if kind not in PAYABLE_KINDS:
                raise LedgerError(
                    f"Payment {row.txn_id} uses {endpoint}, which has kind {kind}. "
                    "Payments can only start or end on a bank_account or a wallet."
                )
    if not relationships.empty:
        missing_rel = sorted((set(relationships["from_id"]) | set(relationships["to_id"])) - ids)
        if missing_rel:
            raise LedgerError(
                "Relationship endpoints must exist in accounts.csv. Missing: "
                + ", ".join(missing_rel)
                + "."
            )
    if not wallets.empty:
        missing_wallets = sorted(set(wallets["account_id"]) - ids)
        if missing_wallets:
            raise LedgerError(
                "Watchlist account_id values must exist in accounts.csv. Missing: "
                + ", ".join(missing_wallets)
                + "."
            )
        for wallet_id in wallets["account_id"]:
            if kinds.loc[wallet_id] != "wallet":
                raise LedgerError(
                    f"Watchlist id {wallet_id} must have kind wallet in accounts.csv."
                )
