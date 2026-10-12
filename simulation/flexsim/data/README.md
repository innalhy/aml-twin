# FlexSim edition: data tables

Flat CSV tables derived from the read-only evidence pack
`data/evidence/analyst-session-001/`. They are the only input a FlexSim model (or the Python
reference harness in `../reference/`) needs to rebuild the snapshot state defined in
`../CONTRACT.md` section 2. The pack itself is never modified by anything in this folder.

Mac-tested: `export_tables.py` and `--check` were run with Python 3.13 on macOS. Nothing here
has been imported into FlexSim (no FlexSim install is available on this machine); the import
notes below are UNVERIFIED in FlexSim; `../flexscript/` (sources plus `ASSEMBLY.md`) owns the
exact FlexSim steps, and `../windows/` holds the assembly steps and validation checklist.

## Regenerate and check

From any working directory:

```bash
python3 simulation/flexsim/data/export_tables.py          # rewrite tables/*.csv and manifest.json
python3 simulation/flexsim/data/export_tables.py --check  # re-derive in memory and compare; exit 1 on drift
```

Python 3 standard library only. The script resolves the repository root from its own location
(`simulation/flexsim/data/` → repo root), reads the pack, and writes only into this folder.
`--check` fails if any table or the manifest differs from the committed file, or if an
unexpected `tables/*.csv` exists. Run it after any change to the pack; run the pack's own
validators too (`python3 scripts/validate-evidence.py`, `node scripts/validate-cases.mjs`).

The manifest (`manifest.json`) lists every table, its row count, column names and source pack
files. It contains no timestamp so the check is deterministic.

## Tables

All files: UTF-8, header row, `\n` line endings, RFC 4180 quoting. IDs are copied unchanged
from the pack (`SYN-001`, `SYN-A001`, `TX-2`, `EV-006`, `review_kyc_log`, `DUE-TX-2`, …).
Timestamps are ISO 8601 UTC with a `Z` suffix. Amounts are integers in SCU, the fictional
scenario currency unit. Multi-valued fields are pipe-separated (`|`), the convention the pack
already uses for `transaction_ids`.

| Table | Rows | Audience | Role at run time |
| --- | --- | --- | --- |
| `customers.csv` | 6 | learner | read-only snapshot |
| `accounts.csv` | 24 | learner | read-only snapshot |
| `transactions.csv` | 126 | learner | read-only snapshot (ledger history + the 4 pending orders) |
| `alerts.csv` | 6 | learner | read-only snapshot (review queue) |
| `request_catalog.csv` | 12 | learner | read-only snapshot (what the learner may ask for) |
| `evidence_catalog.csv` | 24 | **mixed** (see below) | read-only snapshot; drives evidence release |
| `due_events.csv` | 4 | instructor / engine | read-only snapshot; drives the payment engine |
| `initial_state.csv` | 6 | engine | read-only snapshot; seeds `run_accounts` on reset |

### customers.csv (from `learner/customers.json`)

One row per customer; the nested JSON is flattened.

| Column | Meaning |
| --- | --- |
| `customer_id` | `SYN-001` … `SYN-006`. Key. |
| `display_name`, `date_of_birth`, `occupation`, `employment_basis` | Declared profile. |
| `declared_monthly_income`, `expected_monthly_credits`, `expected_largest_credit` | Integers, SCU. |
| `expected_payment_purpose` | Free text. |
| `expected_counterparties` | Pipe-separated list (`Employer|Known project clients`). |
| `account_id` | The customer's single internal account. Every learner action resolves its account through this column. |
| `onboarded_at` | UTC timestamp. |
| `unit` | Always `SCU`. |

The JSON's top-level `synthetic`, `snapshot_at` and `unit_definition` fields are not in the
table; `snapshot_at` is recorded in `manifest.json`.

### accounts.csv (verbatim copy of `learner/accounts.csv`)

| Column | Meaning |
| --- | --- |
| `account_id` | `SYN-A001` … `SYN-A006` internal, `SYN-X01` … `SYN-X18` external. Key. |
| `holder_id`, `holder_name` | Customer ID and name for internal accounts; external rows have an empty `holder_id`. |
| `institution`, `account_type` | Descriptive. |
| `opened_at` | Empty for external accounts. |
| `opening_balance`, `opening_balance_at` | Balance baseline for internal accounts (0 at onboarding for A001/A002; 50000 at 2026-03-16 for A003–A006). Empty for external accounts, which are never debited or credited. |
| `unit` | `SCU`. |

### transactions.csv (verbatim copy of `learner/transactions.csv`)

One row is one transfer, not a debit/credit pair.

| Column | Meaning |
| --- | --- |
| `transaction_id` | Key. |
| `submitted_at` | Always at or before the snapshot. |
| `executed_at` | Empty for pending orders. |
| `scheduled_at` | Set only for pending orders; the due timestamp (minute 18 = `11:30:00Z`, minute 23 = `11:35:00Z`). |
| `from_account`, `to_account` | Account IDs. |
| `amount`, `unit` | Integer SCU. |
| `status` | `executed` (122 rows) or `pending` (4 rows: `TX-2`, `TX-3`, `TX-L-2`, `TX-L-3`). |
| `memo` | Payment reference text. |

Ledger rule (shared with `scripts/validate-evidence.py`): executed rows debit `from_account`
and credit `to_account` when those accounts are internal; pending rows change nothing. The
FlexSim model must not re-apply history rows at run time; `initial_state.csv` already holds the
result. Pending rows are copied into `run_orders` on reset.

### alerts.csv (verbatim copy of `learner/alerts.csv`)

| Column | Meaning |
| --- | --- |
| `alert_id` | `AL-001` … `AL-006`. Key. |
| `customer_id`, `account_id` | Alert subject. |
| `created_at`, `priority`, `status`, `trigger_code` | Queue metadata; `status` is `unassigned` in the snapshot. |
| `transaction_ids` | Pipe-separated transfer IDs the alert cites. |
| `summary` | Learner-visible text. |

### request_catalog.csv (verbatim copy of `learner/request-catalog.csv`)

| Column | Meaning |
| --- | --- |
| `customer_id`, `request_id` | Composite key (12 pairs: 6 requests × 2 main customers). |
| `title` | Learner-visible label. |
| `service_minutes` | Delay from acceptance to release (15, 8, 20, 5, 10, 12). |
| `prerequisite_evidence_id` | Must be learner-visible when the request is made (`EV-006` / `EV-016` for `verify_payer`); empty otherwise. |

This table does **not** say which record a request releases; that mapping is in
`evidence_catalog.csv`, which is why the two are kept separate. Identical gates for both
customers are intentional: request mechanics must not reveal which case is legitimate.

### evidence_catalog.csv (merged from `instructor/evidence-index.csv` and `learner/evidence-index.csv`)

| Column | Meaning |
| --- | --- |
| `evidence_id` | `EV-001` … `EV-024`. Key. |
| `customer_id` | Owning customer. |
| `title`, `source` | Document metadata. **Learner-visible only once the record is available.** |
| `release` | `initial` (12 rows, available at minute 0) or `on_request` (12 rows). |
| `request_id` | For `on_request` rows, the request that releases this record; empty for `initial`. |
| `service_minutes`, `prerequisite_evidence_id` | Copied from the instructor index; equal to the catalog gate of `(customer_id, request_id)`. `0` / empty for `initial`. |
| `learner_path` | Repo-relative path of the record in the learner bundle. Filled for `initial` rows only; **empty for `on_request` rows** because those files are not in the learner bundle. |
| `instructor_path` | Repo-relative path of the record file for every row (`data/evidence/analyst-session-001/learner/records/…` or `…/instructor/release/records/…`). |

Learner/instructor boundary: a FlexSim learner UI must list, open and allow citing only rows
whose `available_from_minute` is set and `<= now` (CONTRACT section 2.4). For `on_request`
rows that means nothing — not the title, not the source, not the path — is displayed until the
`evidence_released` event for that row. When the release happens the runtime loads the document
text from `instructor_path`. The `instructor_path` and `request_id` columns are engine data;
they are not an instructor "answer", but they must not be rendered in a learner table either,
because a full list of titles would disclose the response set before it is earned.

### due_events.csv (from `instructor/events.csv` joined with `learner/transactions.csv`)

| Column | Meaning |
| --- | --- |
| `event_id` | `DUE-TX-2`, `DUE-TX-L-2`, `DUE-TX-3`, `DUE-TX-L-3`. Key. |
| `due_minute` | Simulation minute (18 or 23) derived from `scheduled_at − snapshot_at`; the script asserts it equals the pack's `session_minute`. |
| `due_at` | The order's `scheduled_at`. |
| `customer_id`, `account_id` | Paying customer and account (`account_id == from_account`). |
| `transaction_id`, `from_account`, `to_account`, `amount`, `unit` | Copied from the order row. |
| `event_type` | `outgoing_order_due`. |
| `action_if_eligible`, `eligibility` | The pack's prose rule; CONTRACT section 4.4 is the normative form. |

Rows are sorted by `(due_minute, account_id, transaction_id)`, which is the phase 3 check
order of CONTRACT section 3.

### initial_state.csv (derived from `accounts.csv`, `transactions.csv`, `customers.json`)

One row per internal account. This is what `run_accounts` is rebuilt from on every reset.

| Column | Meaning |
| --- | --- |
| `account_id`, `customer_id`, `holder_name` | Key and labels. |
| `snapshot_balance` | Balance at minute 0 by the ledger rule: 480000 for `SYN-A001` and `SYN-A002`; 70977, 91655, 45936, 71133 for `SYN-A003` … `SYN-A006` (matches `scripts/validate-evidence.py` output). |
| `unit` | `SCU`. |
| `account_status` | `open`. |
| `executed_transfer_count` | Executed rows touching the account (1 for the main accounts, 30 for each background account). |
| `pending_order_ids` | Pipe-separated pending outgoing orders in `(scheduled_at, transaction_id)` order; empty for background accounts. |
| `pending_outgoing_total` | Sum of those orders (470000 for the main accounts, 0 otherwise). |

## How FlexSim should import the tables (UNVERIFIED in FlexSim)

Intended mapping: one FlexSim **Global Table** per CSV, named exactly after the file stem
(`customers`, `accounts`, `transactions`, `alerts`, `request_catalog`, `evidence_catalog`,
`due_events`, `initial_state`), first CSV row as column headers, all cells imported as text and
converted where FlexScript needs numbers (`balance`, `amount`, `due_minute`, `service_minutes`).
Keying is by name, never by row number: FlexScript looks rows up by `account_id`,
`transaction_id`, `evidence_id` or `(customer_id, request_id)` so that re-ordering a CSV cannot
change behaviour. The exact import mechanism (the Global Table import option or a FlexScript
CSV reader), the FlexSim version it was checked against, and the documentation URLs are the
responsibility of `../flexscript/` (see its `README.md` and `ASSEMBLY.md`; `../windows/` holds the
assembly steps and validation checklist); do not treat anything in this section as a tested
procedure.

Multi-valued cells (`expected_counterparties`, `transaction_ids`, `pending_order_ids`) are
split on `|` after import.

## Reset procedure in terms of data

Two kinds of tables exist at run time:

| Kind | Tables | On reset |
| --- | --- | --- |
| Read-only snapshot | the eight CSVs above, imported once | untouched |
| Run state | `run_accounts`, `run_orders`, `run_requests`, `run_evidence`, `run_decisions`, `run_events` (CONTRACT section 2) | cleared and rebuilt |

Rebuild rules (CONTRACT section 4.8):

1. `run_accounts` ← one row per `initial_state.csv` row: `balance = snapshot_balance`,
   `account_status = open`, `held = false`, `hold_reason` and `hold_since_minute` empty.
2. `run_orders` ← one row per `due_events.csv` row: `status = pending`, `executed_minute`
   empty, `overdue = false`.
3. `run_requests` ← empty.
4. `run_evidence` ← one row per `evidence_catalog.csv` row: `available_from_minute = 0` when
   `release = initial`, empty when `release = on_request`.
5. `run_decisions` ← empty; decision counter ← 1.
6. `run_events` ← empty; `seq` ← 1; then write `run_start` at minute 0; clock ← 0.

A reset therefore restores 480000 / 480000 on the main accounts, four `pending` orders, twelve
visible records and twelve hidden ones, and no holds, requests or decisions. Running the same
scenario after a reset must reproduce the same trace (CONTRACT section 7, example G).

## What is not here

- No instructor answer material. `instructor/answer-key.json` and `answer-key.md` are not
  exported; an optional instructor debrief reads them directly from the pack (CONTRACT 8.2).
- No evidence document text. Records are read from `learner_path` / `instructor_path` at the
  moment they are shown.
- No run state. Traces and expected traces live in `../reference/`.
