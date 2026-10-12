# Extension: background alerts SYN-003 … SYN-006

Status: design note, contract version 1.0. UNVERIFIED in FlexSim. Optional; the MVP ships the
two paired cases only.

## What the background alerts are

Four ordinary review items from `alerts.csv`: `AL-003` (SYN-003, `CREDIT_EXCEPTION`), `AL-004`
(SYN-004, `REPEATED_REFERENCE`), `AL-005` (SYN-005, `UNFAMILIAR_PAYEE`), `AL-006` (SYN-006,
`REFUND_REVIEW`). Each has one initial record (`EV-021` … `EV-024`, `release = initial`), a
30-transfer account history in `transactions.csv`, a snapshot balance in `initial_state.csv`
(70977, 91655, 45936, 71133 SCU), **no pending orders** (`pending_order_ids` empty) and **no
request catalog rows**. Their purpose in the pack is to give the learner routine files to compare
with the paired cases and to create prioritisation work (START.md task 1).

## What the contract already allows

Nothing in `../CONTRACT.md` has to change:

- `hold`, `release` and `decide` accept any customer with an internal account (§4: "Every action
  names a `customer_id`; the account is the customer's single internal account"). A hold on
  `SYN-A003` sets `held = true` and emits `hold_placed` with `balance_after = 70977`; it blocks
  nothing because there is no order to check, and the debrief Orders section for that account is
  empty.
- `request` on a background customer is `request_rejected reason=unknown_request` (§4.5 rule 1),
  because `(SYN-003, *)` is not in `request_catalog.csv`.
- A decision may cite only the customer's own visible records, so exactly one ID (`EV-021` for
  SYN-003, and so on) is citable (§4.6).
- The learner debrief renders a background customer's section only when it has events (§8.1).

## What changes in the model when enabled

| Area | MVP | With background alerts |
| --- | --- | --- |
| 3D tokens (`3d-layout.md`) | `Token_AL-001`, `Token_AL-002` | six tokens; `Q_Incoming` holds all six at reset in `alert_id` order |
| `Current case` combo box | 2 entries | 6 entries; background rows show `priority = normal` so the learner can prioritise |
| Request panel | 6 rows per case | empty for a background case, with the text "No further checks are offered for this alert" |
| Hold panel | active | active (the policy allows a provisional hold whenever "a material identity or funds concern is unresolved"); the orders list reads "no pending orders" |
| Decision panel | active | active; the multi-select offers one record |
| Debrief | two sections | two sections plus one per background customer with events |

Workflow states for a background token are limited to `new`, `in_review`, `completed`
(`awaiting_evidence` is unreachable because no request can be accepted).

## Content boundary

`instructor/answer-key.json → background_cases[].resolution` is instructor-only like the rest of
the key. The learner can read the same reconciliation from `EV-021` … `EV-024` and the ledger;
the UI must not present the key's one-line resolution as a hint. The instructor debrief may list it
in its instructor-only block.

## Suggested use once enabled

A guided run that starts with the six alerts in `Q_Incoming` lets the learner demonstrate
START.md task 1 (prioritise and explain the order of review) by which token they open first and
how long they declare for each via "Advance by work duration" (default 6 minutes per item, from
the classroom `review_work_minutes`). Reviewing all four background alerts at 6 minutes each costs
24 simulation minutes, more than the 18 minutes until the first due order, which is the intended
tension: the two high-priority alerts carry the only pending money. No new tables, events or
contract rules are needed to make that visible.
