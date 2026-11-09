// TwinAML classroom sandbox load for Neo4j Desktop or a local Neo4j 5 Browser.
//
// This file does not start a database. Copy the four CSV files from ../data/
// into the Neo4j import directory under a folder named twinaml:
//
//   import/twinaml/accounts.csv
//   import/twinaml/transactions.csv
//   import/twinaml/relationships.csv
//   import/twinaml/reference_wallets.csv
//
// Then paste this script into Browser and run it. It deletes only nodes tagged
// sandbox = "twinaml-aml-week". Other graphs in the same database stay.
//
// Aura and Sandbox often block file:/// loads. Use the Python loader instead:
//   python -m twinaml_sandbox.neo4j_link --write
// See ../README.md. The Streamlit app does not need this load.

CREATE CONSTRAINT twin_entity_id IF NOT EXISTS
FOR (e:TwinEntity) REQUIRE e.account_id IS UNIQUE;

MATCH (n {sandbox: "twinaml-aml-week"})
DETACH DELETE n;

LOAD CSV WITH HEADERS FROM 'file:///twinaml/accounts.csv' AS row
MERGE (e:TwinEntity {account_id: row.account_id})
SET e.sandbox = "twinaml-aml-week",
    e.customer_id = row.customer_id,
    e.name = row.name,
    e.segment = row.segment,
    e.role = row.role,
    e.kind = row.kind,
    e.opened_on = row.opened_on,
    e.kyc_narrative = row.kyc_narrative,
    e.case_label = row.case_label,
    e.device_id = row.device_id,
    e.city = row.city;

MATCH (e:TwinEntity {sandbox: "twinaml-aml-week", kind: "bank_account"}) SET e:Account;
MATCH (e:TwinEntity {sandbox: "twinaml-aml-week", kind: "wallet"}) SET e:Wallet;
MATCH (e:TwinEntity {sandbox: "twinaml-aml-week", kind: "person"}) SET e:Person;
MATCH (e:TwinEntity {sandbox: "twinaml-aml-week", kind: "device"}) SET e:Device;

LOAD CSV WITH HEADERS FROM 'file:///twinaml/transactions.csv' AS row
MATCH (a:TwinEntity {account_id: row.from_account, sandbox: "twinaml-aml-week"})
MATCH (b:TwinEntity {account_id: row.to_account, sandbox: "twinaml-aml-week"})
CREATE (a)-[:SENT {
  sandbox: "twinaml-aml-week",
  txn_id: row.txn_id,
  amount_hkd: toFloat(row.amount_hkd),
  booked_at: row.booked_at,
  channel: row.channel,
  memo: row.memo
}]->(b);

LOAD CSV WITH HEADERS FROM 'file:///twinaml/relationships.csv' AS row
WITH row WHERE row.rel_type = "CONTROLS"
MATCH (a:TwinEntity {account_id: row.from_id, sandbox: "twinaml-aml-week"})
MATCH (b:TwinEntity {account_id: row.to_id, sandbox: "twinaml-aml-week"})
CREATE (a)-[:CONTROLS {sandbox: "twinaml-aml-week", note: row.note}]->(b);

LOAD CSV WITH HEADERS FROM 'file:///twinaml/relationships.csv' AS row
WITH row WHERE row.rel_type = "USES_DEVICE"
MATCH (a:TwinEntity {account_id: row.from_id, sandbox: "twinaml-aml-week"})
MATCH (b:TwinEntity {account_id: row.to_id, sandbox: "twinaml-aml-week"})
CREATE (a)-[:USES_DEVICE {sandbox: "twinaml-aml-week", note: row.note}]->(b);

LOAD CSV WITH HEADERS FROM 'file:///twinaml/reference_wallets.csv' AS row
MATCH (w:TwinEntity {account_id: row.account_id, sandbox: "twinaml-aml-week"})
SET w:WatchlistWallet,
    w.list_name = row.list_name,
    w.list_reason = row.reason;

// The planted_typology column stays in the CSV for the Streamlit facilitator
// toggle. It is not stored on SENT, so Bloom does not show the answer key.
