# TwinAML FlexSim edition: simulation contract

Status: contract version 1.0. Mac-tested only where this document says so; nothing in this
folder has been run inside FlexSim (see `flexscript/README.md`). This file is the single source
of truth for the run-time semantics. The Python reference harness in `reference/` and the
FlexScript sources in `flexscript/` must both implement exactly what is written here. Where they
disagree, this document wins and the implementation is wrong.

Errata applied without a version bump (golden traces unchanged): the `detail` grammar of
section 5 is now explicit (free-text key last, verbatim); section 4.7 defines one
`clock_advanced` rule for guided clicks and scenario `advance` actions and resolves the former
4.7 / 4.9 contradiction; section 4 adds the `action_rejected reason=unknown_customer` event for
a `customer_id` outside `customers.csv`; sections 8.1 and 8.2 state the exact order-outcome
strings, the `(sim_minute, seq)` rule of the escalation flag, and the shape of the instructor's
decisive-evidence coverage.

Source pack: `data/evidence/analyst-session-001/` (read-only). Flat tables derived from it:
`simulation/flexsim/data/tables/*.csv` (see `data/README.md`). The classroom rules this contract
makes precise are `learner/course-policy.md` and the `parameters` block of
`instructor/answer-key.json`; this contract never contradicts them, it only removes ambiguity.

Terms: SCU is the fictional scenario currency unit. "Learner" is the trainee operating the
model. "Instructor" is the person running the debrief. "Run" is one play from reset to end.

---

## 1. Clock

| Item | Rule |
| --- | --- |
| Unit | Simulation minutes as a non-negative decimal number. Scenario files and the authored pack use integers; implementations must accept decimals (FlexSim's model time is a double). |
| Origin | Minute 0 is the pack snapshot `2026-04-15T11:12:00Z`. |
| Wall clock | `wall = 2026-04-15T11:12:00Z + minutes`. Minute 18 is `11:30:00Z`, minute 23 is `11:35:00Z`, minute 28 is `11:40:00Z`. Wall clock is for display only; all comparisons use minutes. |
| Trace formatting | A minute that is an integer is written without a fractional part (`18`, never `18.0`). Otherwise the shortest decimal that round-trips (`18.5`). |
| Direction | The clock only moves forward. There is no rewind; `reset` starts a new run at minute 0. |
| End of run | `run_until_minute` from the scenario, or the learner's choice in guided mode. Default when nothing is given: 30. |

### 1.1 Guided mode

The learner-facing model is paused by default. Reading documents does not consume simulation
time. The learner moves the clock in one of two ways:

- **Advance to next event**: target = the smallest scheduled minute strictly greater than now
  among (a) pending request completions and (b) due minutes of orders that are still pending.
  If none exists, target = `run_until_minute`.
- **Advance by work duration**: target = now + d, d > 0 chosen by the learner (for example the
  six-minute "review work" from the instructor key). Capped at `run_until_minute`.

Advancing from `now` to `target` processes every scheduled minute in `(now, target]` in order
using the phase rules of section 3, then leaves the clock paused at `target`. The due-order
checks scheduled at `target` itself are **not** run until the clock leaves `target` (or the run
ends there). This is what makes a hold placed at minute 18 beat an order due at minute 18.

Either control first writes one `clock_advanced` event at the current minute (section 4.7); a
click whose target is `<= now` is ignored and writes nothing (4.9). Ending the run ("Finish and
debrief") moves the clock to `run_until_minute` but is not an advance: it writes `run_end` and
no `clock_advanced`.

Scenario replay (section 6) is the same machinery with the learner's clicks pre-recorded: a
scenario `advance` action is a click; the runner's own move to the next action's `at_minute` is
not (4.7).

---

## 2. State

All run state is derived from the snapshot tables plus the event log. Nothing else is
authoritative. A conforming implementation can rebuild every table below from
`run_events` alone, and must be able to rebuild the snapshot from the read-only tables alone.

### 2.1 Accounts (`run_accounts`)

One row per internal account (6 rows: `SYN-A001` … `SYN-A006`; from `initial_state.csv`).

| Field | Snapshot value | Notes |
| --- | --- | --- |
| `account_id`, `customer_id` | from table | |
| `balance` | `snapshot_balance` (480000 for A001 and A002) | Available balance. Pending orders do **not** reserve funds. |
| `account_status` | `open` | No action in this edition closes an account; kept for the eligibility text in `due_events.csv`. |
| `held` | false | Outbound hold flag. |
| `hold_reason` | empty | Free text supplied by the learner. |
| `hold_since_minute` | empty | Minute the current hold was accepted. Cleared on release. |

External accounts (`SYN-X01` … `SYN-X18`) have no balance and are never debited or credited.

### 2.2 Pending orders (`run_orders`)

One row per pending outgoing order in `transactions.csv` (4 rows; also in `due_events.csv`).

| Field | Snapshot value | Notes |
| --- | --- | --- |
| `transaction_id`, `from_account`, `to_account`, `amount` | from table | |
| `due_minute` | 18 or 23 | |
| `status` | `pending` | One of `pending`, `executed`, `failed_insufficient`. |
| `executed_minute` | empty | Set once, when executed. |
| `overdue` | false | Set true when a due check runs while the order cannot execute because of a hold. Informational; `status` stays `pending`. |

`executed` and `failed_insufficient` are terminal. An order is checked at its due minute and,
if still pending, again whenever a hold on its account is released (section 4.3). There is no
other re-check.

### 2.3 Requests (`run_requests`)

Accepted requests only. Rejected attempts live only in the event log.

| Field | Notes |
| --- | --- |
| `customer_id`, `request_id` | Key. From `request_catalog.csv`. |
| `evidence_id` | The record this request releases (`evidence_catalog.csv`, `release = on_request`). Instructor-side field; never shown to the learner before release. |
| `requested_minute` | Minute the request was accepted. |
| `due_minute` | `requested_minute + service_minutes`. |
| `status` | `requested` → `completed`. |

### 2.4 Evidence availability (`run_evidence`)

One row per evidence record (24 rows; from `evidence_catalog.csv`).

| Field | Snapshot value |
| --- | --- |
| `evidence_id`, `customer_id`, `release` | from table |
| `available_from_minute` | `0` when `release = initial`; empty (not available) when `release = on_request` |

A record is **learner-visible at minute t** iff `available_from_minute` is not empty and
`available_from_minute <= t`. The learner UI must list, open, and allow citing only
learner-visible records. Titles, sources and file paths of unreleased records are not shown.
The request catalog titles (`request_catalog.csv`) are learner-visible at all times.

### 2.5 Decisions (`run_decisions`)

Append-only history. The **current decision for a customer is the latest accepted one**.

| Field | Notes |
| --- | --- |
| `decision_id` | `D1`, `D2`, … numbered across the run in acceptance order. |
| `minute`, `customer_id` | |
| `decision` | `closure`, `continue_review`, or `escalation`. |
| `evidence_ids` | Cited record IDs (pipe-separated in traces), all learner-visible at `minute` (section 4.6). |
| `note` | Free text. May be empty; the debrief flags an empty note. |

A decision never changes payment state. `escalation` is not a hold. `closure` is not a release.

### 2.6 Event log (`run_events`)

Section 5. The log is the trace that FlexSim exports and the harness diffs.

### 2.7 Run header

`scenario_id`, `pack_id` (`analyst-session-001`), `contract_version` (`1.0`), `now`, `next_seq`,
`next_decision_number`, `run_until_minute`.

---

## 3. Ordering at equal timestamps

Within one simulation minute `t` the implementation processes three phases, in this order:

1. **Phase 1, scheduled completions.** Every request with `due_minute == t` and
   `status == requested` completes: status → `completed`, the evidence row gets
   `available_from_minute = t`, event `evidence_released`. Order: by `due_minute` (all equal),
   then `customer_id`, then `evidence_id`, plain code-point string comparison.
2. **Phase 2, learner actions.** Every learner action stamped `at_minute == t`, in submission
   order (array order in a scenario file; click order in guided mode). Each action is applied
   completely, including any release-triggered re-check, before the next action starts.
3. **Phase 3, due-order checks.** Every order with `due_minute == t` and `status == pending`,
   ordered by `due_minute`, then `from_account`, then `transaction_id` (so `TX-2` before
   `TX-L-2`, and `SYN-A001` before `SYN-A002`).

Why this order:

- Phase 2 before phase 3 is the policy's tie rule: "At equal timestamps, an accepted hold is
  applied before an order's due check." The same rule is applied to release, request and
  decision so that there is one rule, not three.
- Phase 1 before phase 2: evidence delivery is a system event with no financial effect, so its
  position relative to phase 3 cannot change a balance. Placing it before learner actions means
  a learner who advances "to next event" and arrives at minute 8 finds EV-006 already available
  and can immediately request `verify_payer` (prerequisite EV-006) at minute 8, giving the
  authored 8 + 20 = 28 minute path that `scripts/validate-evidence.py` asserts
  (`earliest_release("EV-007") == 28`). Had phase 1 come after phase 2, the same click sequence
  would complete at minute 29 or require the learner to advance twice, and a decision at minute
  28 citing EV-007 would be rejected. Phase 1 first is the only order that matches the course's
  stated timings.
- Phase 1 before phase 3 (the "evidence completions before due checks" requirement) follows from
  the two points above and costs nothing because the two phases touch disjoint state.

Every event gets a sequence number `seq` (1, 2, 3, … per run, no gaps). Equal-minute events are
distinguished by `seq`; a trace diff compares the full ordered list.

---

## 4. Processes and rules

Three independent processes share state only through IDs (`customer_id`, `account_id`,
`transaction_id`, `request_id`, `evidence_id`):

- **Investigation** (learner): reads evidence, places/releases holds, records decisions.
- **Evidence requests** (service desk): accepts a request, waits `service_minutes`, releases one
  record.
- **Payment execution** (bank engine): checks each order at its due minute and on hold release.

Waiting for evidence never delays a payment. A payment never waits for a decision. A decision
never changes a hold. The only coupling is the hold flag, read by the payment engine.

Every action names a `customer_id`; the account is the customer's single internal account
(`customers.csv` → `account_id`). Actions on one account never touch another account's state.

**Unknown customer.** `hold`, `release`, `request` and `decide` on a `customer_id` that is not
in `customers.csv`, or whose `account_id` has no `run_accounts` row, are **rejected** before any
other check: event `action_rejected`, `detail = reason=unknown_customer;action=<hold|release|request|decide>;customer_id=<id as given>`,
no state change. The event is run-level (`customer_id`, `account_id`, `ref_id` and
`balance_after` empty) because there is no account to attach it to; the typed id is echoed in
`detail`. A scenario file naming such a customer is refused by the runner before replay
(section 6), so this event normally appears only from a malformed guided call or a model bug.
Background customers (`SYN-003` … `SYN-006`) are known customers: their actions follow the
normal rules (for example `request_rejected reason=unknown_request`, because they have no
catalog rows).

### 4.1 Hold

`hold(customer_id, reason)`

- If `held` is already true → **rejected**, event `hold_rejected`, `detail = reason=already_held`.
  No state change. This is the idempotency rule: a repeated hold is a no-op with a visible event.
- Otherwise: `held = true`, `hold_reason = reason`, `hold_since_minute = now`, event `hold_placed`.
- A hold never undoes an executed transfer (`status == executed` is terminal).
- A hold is "effective at or before the due timestamp" iff it was accepted in phase 2 of a
  minute `<= due_minute`. Because phase 2 precedes phase 3, a hold accepted at exactly
  `due_minute` blocks the order.

### 4.2 Release

`release(customer_id, note)`

- If `held` is false → **rejected**, event `release_rejected`, `detail = reason=not_held`.
- Otherwise: `held = false`, clear `hold_reason` and `hold_since_minute`, event `hold_released`;
  then immediately run the **release re-check** (4.3) for this account only.

### 4.3 Release re-check

For the released account only, take every order with `status == pending` and
`due_minute < now` (strictly overdue), in ascending `(due_minute, transaction_id)` order, and
run the eligibility check of 4.4 with `trigger = release`. Orders with `due_minute == now` are
not touched here; phase 3 of the same minute handles them (so a release at minute 18 still
yields exactly one execution of TX-2, with `trigger = due`). Orders with `due_minute > now`
wait for their own due minute. Each order executes at most once because `executed` is terminal.

### 4.4 Eligibility check and execution

Run for one order at a time. Conditions, evaluated in this order:

1. `status == pending` — otherwise nothing happens and no event is written.
2. `account_status == open` — always true in this edition.
3. `held == false` — otherwise event `order_held` (`detail = hold_since=<minute>`), set
   `overdue = true`, status stays `pending`. Emitted only from phase 3 (a release re-check
   cannot find a hold).
4. `balance >= amount` — otherwise event `order_failed`
   (`detail = reason=insufficient_funds;available=<balance>`), status → `failed_insufficient`
   (terminal; the pack data cannot reach this branch, but implementations must still have it).
5. Execute: `balance -= amount`, `status = executed`, `executed_minute = now`, event
   `order_executed` (`amount`, `balance_after`, `detail = to=<to_account>;trigger=due|release`).

External recipient accounts are not credited (they have no balance). "Available balance" is the
plain `balance`; pending orders do not reserve funds.

### 4.5 Request

`request(customer_id, request_id)`

Rejections, checked in this order, each with event `request_rejected` and the given `detail`:

1. `(customer_id, request_id)` not in `request_catalog.csv` → `reason=unknown_request`.
2. An accepted request with the same key exists (status `requested` or `completed`) →
   `reason=duplicate`. A previously **rejected** attempt does not block a later request.
3. `prerequisite_evidence_id` is set and that record is not learner-visible at `now` →
   `reason=prerequisite_missing:<evidence_id>` (for example `prerequisite_missing:EV-006`).

Otherwise accept: insert a `run_requests` row with `requested_minute = now`,
`due_minute = now + service_minutes`, `status = requested`; event `request_accepted`
(`ref_id = request_id`, `detail = due_minute=<n>`). The event does not name the evidence record.

Completion is phase 1 of `due_minute` (section 3). Requests still `requested` when the run ends
stay that way; nothing is released after `run_until_minute`.

### 4.6 Decide

`decide(customer_id, decision, evidence_ids, note)`

Rejections, each with event `decision_rejected`:

1. `decision` not in {`closure`, `continue_review`, `escalation`} → `reason=unknown_decision`.
2. Any cited `evidence_id` that is unknown, belongs to another customer, or is not learner-visible
   at `now` → `reason=evidence_not_available:<first offending id>;decision=<decision>`.

Otherwise accept: append to `run_decisions` with the next `D<n>`; event `decision_recorded`
(`ref_id = D<n>`, `detail = decision=<decision>;cites=<ids joined by |>;note=<note>`).

**Choice: reject, not flag.** A learner interface that follows section 2.4 cannot offer an
unavailable record for citation, so such a citation can only come from a malformed scenario file
or an implementation bug. Rejecting keeps the debrief invariant "every cited record was
available when cited" true by construction, so the learner and instructor views never need an
"invalid citation" branch, and it removes a place where two implementations could disagree
(when to flag, how to display). Harness scenarios that want to prove the rule use the rejection
event itself (example H in section 7).

Multiple decisions per customer are allowed and kept as history; the latest is current. A
decision never holds, releases, or executes anything.

### 4.7 Advance

`advance(to_minute)` is the only action that moves the clock in guided mode. The two guided
controls of section 1.1 ("to next event", "by work duration") and the scenario-file `advance`
action are the same action and produce the same rows:

- `target = min(to_minute, run_until_minute)`.
- If `target > now`: write **one** event `clock_advanced` at the **current** minute
  (`detail = to_minute=<target>`, the capped value; no `customer_id`), then move the clock to
  `target` per section 1.1. The event is written before the clock moves, so at minute 18 a
  `clock_advanced` row precedes the phase-3 `order_held` / `order_executed` rows of minute 18.
- If `target <= now` (including `d <= 0`, or a run that has ended): ignored. No state change and
  **no event** of any kind. The clock never moves backward.

Two clock moves are **not** advances and write no `clock_advanced`: the scenario runner moving
the clock to the next action's `at_minute` (the `advance` action is therefore optional in a
scenario file), and the end of run (4.8 / `run_end`). A guided run and a scenario file with the
same clicks therefore produce identical traces.

### 4.8 Reset

`reset` ends the current run and starts a new one: every `run_*` table is rebuilt from the
read-only tables (balances, `pending` statuses, `available_from_minute` per section 2),
all holds, requests and decisions are dropped, the event log is emptied, `seq` and the decision
counter restart at 1, clock → 0. The first event of a run is always `run_start` (seq 1, minute 0).
The last is `run_end`. Reset never alters the read-only tables or the source pack.

### 4.9 Summary of idempotency rules

| Repeated action | Result |
| --- | --- |
| hold on a held account | `hold_rejected`, no state change |
| release on an unheld account | `release_rejected`, no state change |
| request already accepted (requested or completed) | `request_rejected reason=duplicate`, no second release |
| request after a rejected attempt | normal evaluation (may now be accepted) |
| due check on an executed/failed order | nothing, no event |
| release re-check | at most one execution per order ever |
| decision after a decision | accepted, appended; latest is current |
| advance with `target <= now` (already passed, `d <= 0`, run ended) | ignored (clock never moves backward); no event, not even a rejection (4.7) |
| any action on an unknown `customer_id` | `action_rejected reason=unknown_customer`, no state change (section 4 intro) |

---

## 5. Event record schema (the trace)

CSV (header row, `\n` line endings, RFC 4180 quoting) or JSON Lines with the same keys. This is
the format FlexSim must export so traces can be compared with the reference harness.

| Column | Type | Rule |
| --- | --- | --- |
| `seq` | integer | 1-based, consecutive within a run. |
| `sim_minute` | number | Formatted per section 1. |
| `customer_id` | string | Empty for run-level events. |
| `account_id` | string | The customer's internal account; empty for run-level events. |
| `event_type` | string | From the table below. |
| `ref_id` | string | Per event type below; empty when not applicable. |
| `amount` | integer | Order amount for order events; empty otherwise. |
| `balance_after` | integer | Balance of `account_id` after the event; empty when `account_id` is empty. |
| `detail` | string | `key=value` pairs joined by `;`, keys in the fixed order shown; grammar below. Free text (reasons, notes, titles) is copied verbatim; CSV quoting handles commas and newlines. |

| `event_type` | `ref_id` | `detail` |
| --- | --- | --- |
| `run_start` | empty | `scenario_id=<id>;pack=analyst-session-001;contract=1.0` |
| `hold_placed` | empty | `reason=<text>` |
| `hold_rejected` | empty | `reason=already_held` |
| `hold_released` | empty | `note=<text>` |
| `release_rejected` | empty | `reason=not_held` |
| `request_accepted` | `request_id` | `due_minute=<n>` |
| `request_rejected` | `request_id` | `reason=unknown_request` or `reason=duplicate` or `reason=prerequisite_missing:<EV-id>` |
| `evidence_released` | `evidence_id` | `request_id=<id>;title=<title>` |
| `decision_recorded` | `D<n>` | `decision=<d>;cites=<EV-a\|EV-b>;note=<text>` |
| `decision_rejected` | empty | `reason=unknown_decision;decision=<d>` or `reason=evidence_not_available:<EV-id>;decision=<d>` |
| `action_rejected` | empty | `reason=unknown_customer;action=<hold\|release\|request\|decide>;customer_id=<id>` (run-level: `customer_id` and `account_id` columns empty) |
| `order_executed` | `transaction_id` | `to=<to_account>;trigger=due` or `trigger=release` |
| `order_held` | `transaction_id` | `hold_since=<minute>` |
| `order_failed` | `transaction_id` | `reason=insufficient_funds;available=<balance>` |
| `clock_advanced` | empty | `to_minute=<n>` |
| `run_end` | empty | `final_minute=<n>` |

**Detail grammar.** `detail` is `key=value;key=value;…` with the keys of the event type in
exactly the order shown above, each written even when its value is empty (`cites=`, `note=`).
Every key except the last holds a token that never contains `;`. The **last key is the free-text
key** when the event has one (`reason`, `note`, `title`) and its value runs **verbatim to the end
of the string**, so it may contain `;` and `=` (a note may even start with `;`). A parser must
consume the known keys in order, cutting each non-final value at the next `;`, and take the
remainder as the final value; it must never split on every `;`. Numeric values (`hold_since`,
`due_minute`, `to_minute`, `final_minute`, `available`) are formatted per section 1.

Trace equality: two traces are equal when they have the same number of rows and every row is
field-by-field identical after trimming surrounding whitespace. A comparer may compare `seq`,
`sim_minute`, `amount`, `balance_after` and the numeric detail values named above as numbers
(`18.0` equals `18`); free text is compared verbatim. A comparer may optionally ignore
`clock_advanced` rows (guided-mode click noise) when told to; by default it does not.

---

## 6. Scenario file format

JSON, UTF-8. Used by the reference harness on the Mac and replayable by the FlexSim model on
Windows (the FlexScript side reads a CSV flattening of it produced by
`flexscript/flatten_scenario.py`; the Windows build steps are in `flexscript/ASSEMBLY.md`, and
`windows/` holds the Windows assembly steps and validation checklist).

```json
{
  "scenario_id": "hold-at-10-syn-001",
  "description": "Hold SYN-A001 before the first due minute; SYN-002 untouched.",
  "pack_id": "analyst-session-001",
  "contract_version": "1.0",
  "run_until_minute": 30,
  "actions": [
    {"at_minute": 10, "customer_id": "SYN-001", "action": "hold",
     "params": {"reason": "Payer and recipients unverified"}},
    {"at_minute": 28, "customer_id": "SYN-001", "action": "decide",
     "params": {"decision": "escalation", "evidence_ids": ["EV-002", "EV-003"], "note": "Contradictions remain"}}
  ]
}
```

| Field | Rule |
| --- | --- |
| `scenario_id` | Required. Also the trace file stem. |
| `description` | Optional, free text. |
| `pack_id`, `contract_version` | Optional; when present must be `analyst-session-001` and `1.0`, else the runner refuses the file. |
| `run_until_minute` | Required, > 0 and >= every `at_minute`. |
| `actions[]` | May be empty. Stable-sorted by `at_minute`; ties keep array order (this is the phase 2 submission order). |
| `at_minute` | Number >= 0. |
| `customer_id` | Required for `hold`, `release`, `request`, `decide`; omitted for `advance`. Must be a customer in `customers.csv` with an internal account, else the runner refuses the file (section 4, unknown customer). |
| `action` | `hold` `{reason}` · `release` `{note}` · `request` `{request_id}` · `decide` `{decision, evidence_ids[], note}` · `advance` `{to_minute}`. Missing text params default to `""`; a missing `evidence_ids` defaults to `[]`. |

Golden traces are stored in `reference/traces/` as `<scenario_id>.events.csv` (event schema of
section 5), with `<scenario_id>.events.jsonl` (same rows as JSON Lines) and
`<scenario_id>.summary.json` (final state plus the learner debrief). The scenario files
themselves live in `reference/scenarios/`.

---

## 7. Worked examples (acceptance checks)

All examples: `run_until_minute = 30`, both main accounts start at 480000. Unless stated, only
`SYN-001` / `SYN-A001` acts; `SYN-002` then shows the "no hold" rows for `SYN-A002` interleaved
by the phase 3 ordering (`TX-2` before `TX-L-2`, `TX-3` before `TX-L-3`). `run_start` is always
seq 1 and omitted from the tables below for brevity; `run_end` at minute 30 is the last row.
These tables were worked by hand from the rules above; the reference harness in `reference/`
is the executable check (Mac-tested there, not here).

**A. No hold, either account.** Both execute, balance 10000.

| seq | min | account | event | ref | amount | balance_after | detail |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 2 | 18 | SYN-A001 | order_executed | TX-2 | 230000 | 250000 | to=SYN-X02;trigger=due |
| 3 | 18 | SYN-A002 | order_executed | TX-L-2 | 230000 | 250000 | to=SYN-X05;trigger=due |
| 4 | 23 | SYN-A001 | order_executed | TX-3 | 240000 | 10000 | to=SYN-X03;trigger=due |
| 5 | 23 | SYN-A002 | order_executed | TX-L-3 | 240000 | 10000 | to=SYN-X06;trigger=due |
| 6 | 30 | | run_end | | | | final_minute=30 |

**B. Hold at minute 10 (SYN-001 only).** Neither A001 order executes; A001 = 480000, A002 = 10000.

| seq | min | account | event | ref | amount | balance_after | detail |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 2 | 10 | SYN-A001 | hold_placed | | | 480000 | reason=… |
| 3 | 18 | SYN-A001 | order_held | TX-2 | 230000 | 480000 | hold_since=10 |
| 4 | 18 | SYN-A002 | order_executed | TX-L-2 | 230000 | 250000 | to=SYN-X05;trigger=due |
| 5 | 23 | SYN-A001 | order_held | TX-3 | 240000 | 480000 | hold_since=10 |
| 6 | 23 | SYN-A002 | order_executed | TX-L-3 | 240000 | 10000 | to=SYN-X06;trigger=due |
| 7 | 30 | | run_end | | | | final_minute=30 |

This is also the **independence** check: A002's rows are identical to example A.

**C. Hold at minute 20.** First executed, second held, A001 = 250000.

| seq | min | account | event | ref | amount | balance_after | detail |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 2 | 18 | SYN-A001 | order_executed | TX-2 | 230000 | 250000 | to=SYN-X02;trigger=due |
| 3 | 18 | SYN-A002 | order_executed | TX-L-2 | 230000 | 250000 | to=SYN-X05;trigger=due |
| 4 | 20 | SYN-A001 | hold_placed | | | 250000 | reason=… |
| 5 | 23 | SYN-A001 | order_held | TX-3 | 240000 | 250000 | hold_since=20 |
| 6 | 23 | SYN-A002 | order_executed | TX-L-3 | 240000 | 10000 | to=SYN-X06;trigger=due |
| 7 | 30 | | run_end | | | | final_minute=30 |

**D. Hold at 10, release at 25 (after both due minutes).** Both overdue orders execute exactly
once at the release, in due order, `trigger=release`; A001 = 10000.

| seq | min | account | event | ref | amount | balance_after | detail |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 2 | 10 | SYN-A001 | hold_placed | | | 480000 | reason=… |
| 3 | 18 | SYN-A001 | order_held | TX-2 | 230000 | 480000 | hold_since=10 |
| 4 | 18 | SYN-A002 | order_executed | TX-L-2 | 230000 | 250000 | to=SYN-X05;trigger=due |
| 5 | 23 | SYN-A001 | order_held | TX-3 | 240000 | 480000 | hold_since=10 |
| 6 | 23 | SYN-A002 | order_executed | TX-L-3 | 240000 | 10000 | to=SYN-X06;trigger=due |
| 7 | 25 | SYN-A001 | hold_released | | | 480000 | note=… |
| 8 | 25 | SYN-A001 | order_executed | TX-2 | 230000 | 250000 | to=SYN-X02;trigger=release |
| 9 | 25 | SYN-A001 | order_executed | TX-3 | 240000 | 10000 | to=SYN-X03;trigger=release |
| 10 | 30 | | run_end | | | | final_minute=30 |

Variant D2, release at 20 (between the due minutes): seq 7 `hold_released` at 20, seq 8
`order_executed TX-2 trigger=release` at 20 (balance 250000); TX-3 is not overdue, so it waits
and executes at 23 with `trigger=due` (balance 10000). Final A001 = 10000.

**E. Repeated actions never duplicate.** Hold at 10, hold again at 12, request
`request_supporting_documents` at 0 and again at 3, release at 25 and again at 26.

| seq | min | account | event | ref | amount | balance_after | detail |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 2 | 0 | SYN-A001 | request_accepted | request_supporting_documents | | 480000 | due_minute=8 |
| 3 | 3 | SYN-A001 | request_rejected | request_supporting_documents | | 480000 | reason=duplicate |
| 4 | 8 | SYN-A001 | evidence_released | EV-006 | | 480000 | request_id=request_supporting_documents;title=Project invoice supplied by customer |
| 5 | 10 | SYN-A001 | hold_placed | | | 480000 | reason=… |
| 6 | 12 | SYN-A001 | hold_rejected | | | 480000 | reason=already_held |
| 7–10 | 18, 23 | | as example D seq 3–6 | | | | |
| 11 | 25 | SYN-A001 | hold_released | | | 480000 | note=… |
| 12 | 25 | SYN-A001 | order_executed | TX-2 | 230000 | 250000 | to=SYN-X02;trigger=release |
| 13 | 25 | SYN-A001 | order_executed | TX-3 | 240000 | 10000 | to=SYN-X03;trigger=release |
| 14 | 26 | SYN-A001 | release_rejected | | | 10000 | reason=not_held |
| 15 | 30 | | run_end | | | | final_minute=30 |

EV-006 is released once; the duplicate request at minute 3 produces no second release.

**F. Hold exactly at the due minute (18).** Phase 2 precedes phase 3, so TX-2 is held.

| seq | min | account | event | ref | amount | balance_after | detail |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 2 | 18 | SYN-A001 | hold_placed | | | 480000 | reason=… |
| 3 | 18 | SYN-A001 | order_held | TX-2 | 230000 | 480000 | hold_since=18 |
| 4 | 18 | SYN-A002 | order_executed | TX-L-2 | 230000 | 250000 | to=SYN-X05;trigger=due |
| 5 | 23 | SYN-A001 | order_held | TX-3 | 240000 | 480000 | hold_since=18 |
| 6 | 23 | SYN-A002 | order_executed | TX-L-3 | 240000 | 10000 | to=SYN-X06;trigger=due |
| 7 | 30 | | run_end | | | | final_minute=30 |

**G. Reset.** After any run, `reset` then replaying example A must produce exactly example A's
trace (seq restarts at 1; balances 480000/480000; all four orders `pending`; 12 records visible,
EV-005 … EV-010 and EV-015 … EV-020 not visible; no holds, requests or decisions).

**H. Request prerequisites and evidence timing (8 then 20).**
Actions: `verify_payer` at 0; `request_supporting_documents` at 0; `verify_payer` at 8;
`decide escalation` citing `EV-007` at 20; `decide escalation` citing `EV-003` and `EV-007`
at 28.

| seq | min | account | event | ref | amount | balance_after | detail |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 2 | 0 | SYN-A001 | request_rejected | verify_payer | | 480000 | reason=prerequisite_missing:EV-006 |
| 3 | 0 | SYN-A001 | request_accepted | request_supporting_documents | | 480000 | due_minute=8 |
| 4 | 8 | SYN-A001 | evidence_released | EV-006 | | 480000 | request_id=request_supporting_documents;title=Project invoice supplied by customer |
| 5 | 8 | SYN-A001 | request_accepted | verify_payer | | 480000 | due_minute=28 |
| 6 | 18 | SYN-A001 | order_executed | TX-2 | 230000 | 250000 | to=SYN-X02;trigger=due |
| 7 | 18 | SYN-A002 | order_executed | TX-L-2 | 230000 | 250000 | to=SYN-X05;trigger=due |
| 8 | 20 | SYN-A001 | decision_rejected | | | 250000 | reason=evidence_not_available:EV-007;decision=escalation |
| 9 | 23 | SYN-A001 | order_executed | TX-3 | 240000 | 10000 | to=SYN-X03;trigger=due |
| 10 | 23 | SYN-A002 | order_executed | TX-L-3 | 240000 | 10000 | to=SYN-X06;trigger=due |
| 11 | 28 | SYN-A001 | evidence_released | EV-007 | | 10000 | request_id=verify_payer;title=Payer and invoice verification response |
| 12 | 28 | SYN-A001 | decision_recorded | D1 | | 10000 | decision=escalation;cites=EV-003\|EV-007;note=… |
| 13 | 30 | | run_end | | | | final_minute=30 |

Seq 4 before seq 5 (phase 1 before phase 2) is what makes the minute-8 `verify_payer` succeed and
the payer check land at 28; seq 11 before seq 12 is what makes the minute-28 citation valid. The
example also shows that waiting for evidence never stops payments (seq 6, 9) and that an
escalation does not hold (no `order_held`).

**I. Learner/instructor separation.** Not a trace check. At every minute, the set of records the
learner UI exposes must equal `{e : available_from_minute(e) ≠ empty and ≤ now}`. The
instructor-only tables (`run_requests.evidence_id`, `evidence_catalog.instructor_path` for
`on_request` rows, `answer-key.json`) are never bound to a learner view.

---

## 8. Debrief

### 8.1 Learner debrief (always available, learner-safe)

Computed **only** from `run_events` plus learner-visible tables (`customers`, `accounts`,
`transactions`, `alerts`, `request_catalog`, and the learner-visible subset of
`evidence_catalog`). No field may be derived from `answer-key.json` or from unreleased records.
Per main customer (and any background customer with events):

| Section | Content (all from events) |
| --- | --- |
| Timeline | Every event for the customer in `seq` order with minute and wall clock. |
| Holds | Each `hold_placed` / `hold_released` pair (or open hold at run end) with duration in minutes, and the hold's position relative to each due minute: `before first due`, `between due minutes`, `after both due`, `at due minute`. |
| Orders | Per order, exactly one of these strings: `executed at <minute> (due)` / `executed at <minute> (release)`; `held at due minute, released and executed at <minute>`; `held, still pending at run end`; `failed insufficient funds`; `pending, never checked before run end` (the run ended before the order's due minute). Final balance (`balance_after` of the customer's last event; the ledger balance from learner-visible `accounts.csv` + `transactions.csv` when there is none). |
| Requests | Accepted requests with request minute, completion minute (or `outstanding at run end`); rejected attempts with reason. |
| Decisions | Each decision with `seq`, minute, type, cited IDs, note; the evidence set **available at that minute** (initial + released by then) and the requests still outstanding at that minute. Flags: `decided with N requests outstanding`, `empty note`, `cited nothing`. |
| Consistency flags | `escalation recorded while orders executed afterwards`: an `escalation` decision and an `order_executed` for the customer's account whose `(sim_minute, seq)` is greater than the decision's `(sim_minute, seq)` (so an execution in phase 3 of the decision's own minute counts; executions before the decision do not); a reminder that escalation is not a hold. `hold still in place at run end after closure`: the latest decision is `closure` and the account is held at run end. `closure while a request is outstanding`: a `closure` decision whose outstanding-request set is non-empty. These are observations, not grades. |

No score is produced here. The learner debrief never says whether the case was laundering.

### 8.2 Instructor debrief (optional, separate)

A separate output (file or view, e.g. `debrief.instructor.*`) may join the learner debrief with
`instructor/answer-key.json`: decisive-evidence coverage, `acceptable_actions` matched, rubric
dimensions, customer-impact minutes for SYN-002 (sum of minutes supplier orders were held or
delayed). It must be a separate artefact that the learner interface never loads or links. It
still grades the learner only on actions and information **available at action time** (the
key's own rule: "Score the action against the information available at the time").

Decisive-evidence coverage is reported per `decisive_evidence` ID of the case as three booleans
and no score: `available` (in the evidence set available at the current, i.e. latest, decision;
with no decision, at run end), `cited` (cited by that decision), `requested` (the request that
releases the record was accepted at some point; `true` for `initial` records). An ID that was
never available cannot count against the learner.

---

## 9. Conformance checklist

An implementation conforms to contract 1.0 when it:

1. rebuilds the snapshot state of section 2 from `data/tables/*.csv` alone;
2. processes minutes in the three phases of section 3 with the stated orderings;
3. implements every rule and rejection in section 4, including the terminal statuses;
4. emits the event schema of section 5 with the exact `detail` formats;
5. replays scenario files of section 6 and reproduces the traces of section 7 byte-for-byte
   after whitespace trimming (with the `…` free-text placeholders replaced by the scenario's
   actual text);
6. keeps the learner/instructor boundary of sections 2.4, 7-I and 8.

Version-dependent assumptions and FlexSim API choices are documented in `flexscript/`, not here.
