"""Load the read-only snapshot tables from ``simulation/flexsim/data/tables/*.csv``.

Paths are resolved relative to this file, so the harness works from any working directory.
"""

import csv
from dataclasses import dataclass, field
from pathlib import Path
from typing import Dict, List, Tuple

TABLES_DIR = Path(__file__).resolve().parents[2] / "data" / "tables"
REPO_ROOT = Path(__file__).resolve().parents[4]
TABLE_NAMES = ("customers", "accounts", "transactions", "alerts", "request_catalog",
               "evidence_catalog", "due_events", "initial_state")
LEARNER_TABLES = ("customers", "accounts", "transactions", "alerts", "request_catalog")


def read_csv(path: Path) -> List[dict]:
    with open(path, newline="", encoding="utf-8") as fh:
        return list(csv.DictReader(fh))


@dataclass
class Tables:
    raw: Dict[str, List[dict]] = field(default_factory=dict)

    # --- derived lookups -------------------------------------------------------------
    @property
    def account_of(self) -> Dict[str, str]:
        return {c["customer_id"]: c["account_id"] for c in self.raw["customers"]}

    @property
    def customer_of(self) -> Dict[str, str]:
        return {c["account_id"]: c["customer_id"] for c in self.raw["customers"]}

    @property
    def request_catalog(self) -> Dict[Tuple[str, str], dict]:
        return {(r["customer_id"], r["request_id"]): r for r in self.raw["request_catalog"]}

    @property
    def evidence_catalog(self) -> Dict[str, dict]:
        return {e["evidence_id"]: e for e in self.raw["evidence_catalog"]}

    @property
    def known_customers(self) -> set:
        """Customers in customers.csv whose account_id has a run_accounts row (CONTRACT 4)."""
        internal = {r["account_id"] for r in self.raw["initial_state"]}
        return {c for c, a in self.account_of.items() if a in internal}

    def evidence_for_request(self, customer_id: str, request_id: str) -> dict:
        """The on_request record released by (customer_id, request_id). Engine-side only."""
        for e in self.raw["evidence_catalog"]:
            if e["customer_id"] == customer_id and e["request_id"] == request_id \
                    and e["release"] == "on_request":
                return e
        raise KeyError((customer_id, request_id))

    def due_minutes_of(self, account_id: str) -> List[float]:
        return sorted(float(d["due_minute"]) for d in self.raw["due_events"]
                      if d["account_id"] == account_id)

    def learner_tables(self) -> Dict[str, List[dict]]:
        """Only the tables a learner UI may bind to (CONTRACT 8.1)."""
        return {name: self.raw[name] for name in LEARNER_TABLES}


def load_tables(tables_dir: Path = TABLES_DIR) -> Tables:
    raw = {name: read_csv(Path(tables_dir) / f"{name}.csv") for name in TABLE_NAMES}
    return Tables(raw=raw)
