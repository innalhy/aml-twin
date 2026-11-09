"""Optional Neo4j connection.

The Streamlit app does not need this module to draw the twin. ``--write`` loads
the bundled CSV into a database and deletes only nodes already tagged
``twinaml-aml-week``. Reading typology counts is separate and does not delete.
"""

from __future__ import annotations

import argparse
import os
from dataclasses import dataclass

from neo4j import GraphDatabase

from twinaml_sandbox.constants import SANDBOX_TAG
from twinaml_sandbox.load import Bundle, load_bundled
from twinaml_sandbox.rules import stamp

DELETE_SANDBOX = """
MATCH (n {sandbox: $sandbox})
DETACH DELETE n
"""

MERGE_ENTITIES = """
UNWIND $rows AS row
MERGE (e:TwinEntity {account_id: row.account_id})
SET e.sandbox = $sandbox,
    e.customer_id = row.customer_id,
    e.name = row.name,
    e.segment = row.segment,
    e.role = row.role,
    e.kind = row.kind,
    e.opened_on = row.opened_on,
    e.kyc_narrative = row.kyc_narrative,
    e.case_label = row.case_label,
    e.device_id = row.device_id,
    e.city = row.city
"""

LABEL_BY_KIND = (
    (
        "bank_account",
        "Account",
        "MATCH (e:TwinEntity {sandbox: $sandbox, kind: $kind}) SET e:Account",
    ),
    (
        "wallet",
        "Wallet",
        "MATCH (e:TwinEntity {sandbox: $sandbox, kind: $kind}) SET e:Wallet",
    ),
    (
        "person",
        "Person",
        "MATCH (e:TwinEntity {sandbox: $sandbox, kind: $kind}) SET e:Person",
    ),
    (
        "device",
        "Device",
        "MATCH (e:TwinEntity {sandbox: $sandbox, kind: $kind}) SET e:Device",
    ),
)

CREATE_PAYMENTS = """
UNWIND $rows AS row
MATCH (a:TwinEntity {account_id: row.from_account, sandbox: $sandbox})
MATCH (b:TwinEntity {account_id: row.to_account, sandbox: $sandbox})
CREATE (a)-[:SENT {
  sandbox: $sandbox,
  txn_id: row.txn_id,
  amount_hkd: row.amount_hkd,
  booked_at: row.booked_at,
  channel: row.channel,
  memo: row.memo
}]->(b)
"""

CREATE_CONTROLS = """
UNWIND $rows AS row
MATCH (a:TwinEntity {account_id: row.from_id, sandbox: $sandbox})
MATCH (b:TwinEntity {account_id: row.to_id, sandbox: $sandbox})
CREATE (a)-[:CONTROLS {sandbox: $sandbox, note: row.note}]->(b)
"""

CREATE_DEVICES = """
UNWIND $rows AS row
MATCH (a:TwinEntity {account_id: row.from_id, sandbox: $sandbox})
MATCH (b:TwinEntity {account_id: row.to_id, sandbox: $sandbox})
CREATE (a)-[:USES_DEVICE {sandbox: $sandbox, note: row.note}]->(b)
"""

MARK_WATCHLIST = """
UNWIND $rows AS row
MATCH (w:TwinEntity {account_id: row.account_id, sandbox: $sandbox})
SET w:WatchlistWallet,
    w.list_name = row.list_name,
    w.list_reason = row.reason
"""

COUNT_SMURF = """
MATCH (p:TwinEntity)-[t:SENT]->(h:TwinEntity)
WHERE t.sandbox = $sandbox
  AND h.sandbox = $sandbox
  AND t.amount_hkd >= 5000
  AND t.amount_hkd < 10000
  AND h.kind = 'bank_account'
  AND h.segment <> 'merchant'
  AND h.segment <> 'employer'
WITH h, collect(t) AS ts, collect(DISTINCT p) AS payers,
     min(t.booked_at) AS t0, max(t.booked_at) AS t1
WHERE size(payers) >= 5
  AND reduce(s = 0.0, x IN ts | s + x.amount_hkd) >= 30000
  AND datetime(t1) <= datetime(t0) + duration({hours: 72})
RETURN count(h) AS cases
"""

COUNT_CYCLES = """
MATCH path = (a:TwinEntity)-[:SENT*3..4]->(a)
WHERE a.sandbox = $sandbox
  AND all(rel IN relationships(path) WHERE rel.sandbox = $sandbox AND rel.amount_hkd >= 5000)
RETURN count(path) AS paths
"""

COUNT_MIXER_PATHS = """
MATCH (w:WatchlistWallet {sandbox: $sandbox})
MATCH path = (src:TwinEntity)-[:SENT*1..4]->(w)
WHERE src.sandbox = $sandbox
  AND all(node IN nodes(path) WHERE node.sandbox = $sandbox)
RETURN count(path) AS paths, count(DISTINCT w) AS wallets
"""


class Neo4jConfigError(RuntimeError):
    """The optional Neo4j settings are incomplete or the write was not confirmed."""


@dataclass(frozen=True)
class Neo4jSettings:
    uri: str
    username: str
    password: str
    database: str


def load_local_env() -> None:
    """Load a ``.env`` file from the working directory when python-dotenv is installed."""
    try:
        from dotenv import load_dotenv
    except ImportError:
        return
    load_dotenv(override=False)


def settings_from_env() -> Neo4jSettings | None:
    """Return connection settings, or None when Neo4j was left unconfigured."""
    load_local_env()
    uri = os.environ.get("NEO4J_URI", "").strip()
    username = os.environ.get("NEO4J_USERNAME", "").strip()
    password = os.environ.get("NEO4J_PASSWORD", "").strip()
    if not uri and not username and not password:
        return None
    if not (uri and username and password):
        raise Neo4jConfigError(
            "Set NEO4J_URI, NEO4J_USERNAME, and NEO4J_PASSWORD together, or leave all three blank."
        )
    database = os.environ.get("NEO4J_DATABASE", "neo4j").strip() or "neo4j"
    return Neo4jSettings(uri=uri, username=username, password=password, database=database)


def assert_write_confirmed() -> None:
    """Refuse a write until the operator sets the sandbox confirm string."""
    load_local_env()
    confirm = os.environ.get("NEO4J_SANDBOX_CONFIRM", "").strip()
    if confirm != SANDBOX_TAG:
        raise Neo4jConfigError(
            "Refusing to write. Set NEO4J_SANDBOX_CONFIRM to twinaml-aml-week. "
            "The loader deletes only nodes already tagged with that sandbox id."
        )


def build_write_plan(bundle: Bundle) -> list[tuple[str, dict[str, object]]]:
    """Return Cypher and parameters. The planted typology column is not loaded."""
    params_sandbox: dict[str, object] = {"sandbox": SANDBOX_TAG}
    account_rows = bundle.accounts.to_dict(orient="records")
    payment_rows = [
        {
            "from_account": str(row.from_account),
            "to_account": str(row.to_account),
            "txn_id": str(row.txn_id),
            "amount_hkd": int(row.amount_hkd),
            "booked_at": stamp(row.booked_at),
            "channel": str(row.channel),
            "memo": str(row.memo),
        }
        for row in bundle.transactions.itertuples(index=False)
    ]
    controls = _relationship_rows(bundle, "CONTROLS")
    devices = _relationship_rows(bundle, "USES_DEVICE")
    wallet_rows = bundle.wallets.to_dict(orient="records")
    plan: list[tuple[str, dict[str, object]]] = [
        (DELETE_SANDBOX, params_sandbox),
        (MERGE_ENTITIES, {"sandbox": SANDBOX_TAG, "rows": account_rows}),
    ]
    for kind, _label, query in LABEL_BY_KIND:
        plan.append((query, {"sandbox": SANDBOX_TAG, "kind": kind}))
    plan.append((CREATE_PAYMENTS, {"sandbox": SANDBOX_TAG, "rows": payment_rows}))
    if controls:
        plan.append((CREATE_CONTROLS, {"sandbox": SANDBOX_TAG, "rows": controls}))
    if devices:
        plan.append((CREATE_DEVICES, {"sandbox": SANDBOX_TAG, "rows": devices}))
    if wallet_rows:
        plan.append((MARK_WATCHLIST, {"sandbox": SANDBOX_TAG, "rows": wallet_rows}))
    return plan


def write_bundle(settings: Neo4jSettings, bundle: Bundle) -> dict[str, int]:
    """Replace this sandbox's tagged nodes with the ledger. Other nodes stay."""
    assert_write_confirmed()
    plan = build_write_plan(bundle)
    with GraphDatabase.driver(
        settings.uri,
        auth=(settings.username, settings.password),
        connection_timeout=8,
    ) as driver:
        driver.verify_connectivity()
        with driver.session(database=settings.database) as session:
            for query, params in plan:
                session.run(query, params)
            summary = session.run(
                """
                MATCH (n {sandbox: $sandbox})
                OPTIONAL MATCH (n)-[r {sandbox: $sandbox}]->()
                RETURN count(DISTINCT n) AS nodes, count(r) AS relationships
                """,
                {"sandbox": SANDBOX_TAG},
            ).single()
    return {"nodes": int(summary["nodes"]), "relationships": int(summary["relationships"])}


def read_typology_counts(settings: Neo4jSettings) -> dict[str, int]:
    """Run the three inspection queries. This does not delete or create data."""
    queries = {
        "smurf_hubs": COUNT_SMURF,
        "cycle_paths": COUNT_CYCLES,
        "mixer_paths": COUNT_MIXER_PATHS,
    }
    counts: dict[str, int] = {}
    with GraphDatabase.driver(
        settings.uri,
        auth=(settings.username, settings.password),
        connection_timeout=8,
    ) as driver:
        driver.verify_connectivity()
        with driver.session(database=settings.database) as session:
            for name, query in queries.items():
                record = session.run(query, {"sandbox": SANDBOX_TAG}).single()
                counts[name] = int(record[0]) if record is not None else 0
    return counts


def ping(settings: Neo4jSettings) -> str:
    """Return a short status line after ``RETURN 1``."""
    with GraphDatabase.driver(
        settings.uri,
        auth=(settings.username, settings.password),
        connection_timeout=8,
    ) as driver:
        driver.verify_connectivity()
        with driver.session(database=settings.database) as session:
            record = session.run("RETURN 1 AS ok").single()
    if record is None or int(record["ok"]) != 1:
        raise Neo4jConfigError("Neo4j answered, but the ping query did not return 1.")
    return f"Connected to {settings.database}."


def _relationship_rows(bundle: Bundle, rel_type: str) -> list[dict[str, str]]:
    if bundle.relationships.empty:
        return []
    matched = bundle.relationships.loc[bundle.relationships["rel_type"] == rel_type]
    return [
        {"from_id": str(row.from_id), "to_id": str(row.to_id), "note": str(row.note)}
        for row in matched.itertuples(index=False)
    ]


def main() -> None:
    parser = argparse.ArgumentParser(description="Load the TwinAML sandbox ledger into Neo4j.")
    parser.add_argument(
        "--write",
        action="store_true",
        help="Delete nodes tagged twinaml-aml-week and load the bundled CSV.",
    )
    parser.add_argument(
        "--counts",
        action="store_true",
        help="Print smurf, cycle, and mixer-path counts. Does not write.",
    )
    args = parser.parse_args()
    if not args.write and not args.counts:
        parser.error("Pass --write, --counts, or both.")
    settings = settings_from_env()
    if settings is None:
        raise SystemExit(
            "Neo4j is not configured. Set NEO4J_URI, NEO4J_USERNAME, and NEO4J_PASSWORD."
        )
    if args.write:
        summary = write_bundle(settings, load_bundled())
        print(
            f"Loaded sandbox {SANDBOX_TAG}: {summary['nodes']} nodes, "
            f"{summary['relationships']} relationships."
        )
    if args.counts:
        counts = read_typology_counts(settings)
        print(
            "smurf_hubs={smurf_hubs} cycle_paths={cycle_paths} mixer_paths={mixer_paths}".format(
                **counts
            )
        )


if __name__ == "__main__":
    main()
