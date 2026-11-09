// Inspection queries for the tagged sandbox. Run after cypher/load_twin.cypher.
// These are the same shapes the Bloom notes tell the presenter to save.
// cycle_paths and mixer_paths count walks, including one count per starting
// node. The Streamlit case count is the deduplicated story count (3 on the
// bundled week). Use Browser or Bloom to see the paths. Use Streamlit for
// the before/after alert table.

// 1. Smurfing hub. Expect 1 hub on the bundled week (SYN-SM-HUB).
MATCH (p:TwinEntity)-[t:SENT]->(h:TwinEntity)
WHERE t.sandbox = "twinaml-aml-week"
  AND h.sandbox = "twinaml-aml-week"
  AND t.amount_hkd >= 5000
  AND t.amount_hkd < 10000
  AND h.kind = "bank_account"
  AND h.segment <> "merchant"
  AND h.segment <> "employer"
WITH h, collect(t) AS ts, collect(DISTINCT p) AS payers,
     min(t.booked_at) AS t0, max(t.booked_at) AS t1
WHERE size(payers) >= 5
  AND reduce(s = 0.0, x IN ts | s + x.amount_hkd) >= 30000
  AND datetime(t1) <= datetime(t0) + duration({hours: 72})
RETURN h.account_id AS hub,
       h.name AS name,
       size(payers) AS payers,
       reduce(s = 0.0, x IN ts | s + x.amount_hkd) AS amount_hkd,
       t0, t1;

// 2. Directed loops of 3 or 4 payments of at least HKD 5,000.
// The same loop is returned once for each starting account.
MATCH path = (a:TwinEntity)-[:SENT*3..4]->(a)
WHERE a.sandbox = "twinaml-aml-week"
  AND all(rel IN relationships(path) WHERE rel.sandbox = "twinaml-aml-week" AND rel.amount_hkd >= 5000)
RETURN [node IN nodes(path) | node.account_id] AS loop_ids, length(path) AS hops;

// 3. Payment paths of 1 to 4 hops that end on the sandbox mixer watchlist.
// On the bundled week these paths are the mule chain, including the
// video-KYC account SYN-DF-01. Bloom draws the path. The pass-through
// percentage test lives in the Streamlit rule.
MATCH (w:WatchlistWallet {sandbox: "twinaml-aml-week"})
MATCH path = (src:TwinEntity)-[:SENT*1..4]->(w)
WHERE src.sandbox = "twinaml-aml-week"
  AND all(node IN nodes(path) WHERE node.sandbox = "twinaml-aml-week")
RETURN [node IN nodes(path) | node.account_id] AS account_ids,
       [rel IN relationships(path) | rel.txn_id] AS txn_ids,
       w.account_id AS wallet;
