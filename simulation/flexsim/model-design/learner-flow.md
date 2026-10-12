# Learner flow: guided mode

Status: design document, contract version 1.0. UNVERIFIED in FlexSim (no FlexSim install on the
authoring machine; nothing here has been built or clicked in a FlexSim model). Every rule below
restates or applies `../CONTRACT.md`; where this file and the contract disagree, the contract wins.
Data columns come from `../data/README.md`.

The learner plays an analyst who has two paired investigations (`SYN-001` / account `SYN-A001`,
`SYN-002` / account `SYN-A002`) and four optional background alerts (`SYN-003` … `SYN-006`,
see `background-alerts-extension.md`). The model owns the run state; the learner only clicks
controls that map one-to-one onto the contract's actions.

## 1. Time: real time vs simulation time

| Situation | Simulation clock | Why |
| --- | --- | --- |
| Model open, run reset | Paused at minute 0 (`2026-04-15T11:12:00Z`). | CONTRACT §1.1: "The learner-facing model is paused by default." |
| Reading any record, table, alert or the policy | Does not move. | CONTRACT §1.1: "Reading documents does not consume simulation time." |
| Clicking Hold / Release / Request / Decide | Does not move. The action is stamped with the current minute (phase 2 of that minute). | CONTRACT §3, phase 2. |
| Clicking **Advance to next event** | Jumps to the smallest scheduled minute strictly greater than now among pending request completions and due minutes of still-pending orders; if none, to `run_until_minute`. | CONTRACT §1.1. |
| Clicking **Advance by work duration** | Jumps to `now + d` (capped at `run_until_minute`). | CONTRACT §1.1. |
| Clicking **Finish and debrief** | Jumps to `run_until_minute` (default 30), writes `run_end`, opens the debrief. | CONTRACT §1 "End of run", §4.8. |
| Clicking **Reset** | Back to minute 0, new run, `seq` restarts at 1. | CONTRACT §4.8. |

The FlexSim run button is **not** the way to move time in guided mode. Guided mode works with the
model stopped and drives the clock through the two Advance controls (how FlexScript moves the
clock is the `../flexscript/` agent's concern; the design only requires that an Advance click
processes every scheduled minute in `(now, target]` with the three phases of CONTRACT §3 and then
leaves the clock paused at `target`, with the due checks of `target` itself deferred until the clock
leaves `target` or the run ends there).

### What a "work duration" means

Reading does not cost simulation minutes, so a learner who never clicks Advance by work duration
could read everything, request everything and hold at minute 0. That is allowed; the debrief shows
it. "Advance by work duration" exists so a learner can declare how much analyst time a reading step
represents. The default is `d = 6` minutes per reviewed item, the `review_work_minutes` figure that
`CONTRACT.md` §1.1 quotes from the instructor key's `parameters` block (the parameters block is
classroom timing, not case truth, and the contract itself treats it as a rule source). The learner
may type any `d > 0`. The UI explains it in one sentence: "Reading is free; declare the minutes your
review took so the clock reflects realistic analyst time."

An Advance by work duration that would pass a scheduled event does not skip it: every minute in
`(now, now + d]` is processed in order (requests complete, orders are checked), and the clock then
rests at `now + d`. If an evidence release happens inside that window the learner sees it on arrival.

### Advance to next event, in words

"Nothing more will happen in the model until minute T. Jump there." On arrival at `T`:

- phase 1 of `T` has run (evidence due at `T` is already visible), so a request whose prerequisite
  is that evidence can be made immediately (this is the `request_supporting_documents` at 0,
  `verify_payer` at 8, `EV-007` at 28 path of CONTRACT §3 and example H);
- phase 3 of `T` has **not** run, so a Hold accepted now at `T` blocks an order due at `T`
  (CONTRACT §1.1, §4.1, example F).

The control's label shows the target: `Advance to next event (minute 18, 11:30Z: order TX-2 due)`
or `(minute 8, 11:20Z: a requested check completes)`. The label for a request completion never
names the evidence record or its title (CONTRACT §4.5: the acceptance event "does not name the
evidence record"); it names the request title from `request_catalog.csv`, which is always
learner-visible.

## 2. The journey

```
Reset ──► Select case ──► Read records ──► Request checks ──┐
                ▲                                           │
                │            ┌───────── Advance ◄───────────┤
                │            ▼                              │
                └── Hold / Release (with reason) ◄──────────┤
                             │                              │
                             ▼                              │
                   Decide (closure / continue / escalation,
                   cited evidence IDs, note) ───────────────┘
                             │
                             ▼
                 Finish and debrief ──► Export history
```

Steps may repeat in any order inside a run. The two investigations are independent: every control
acts on the **current case** only (CONTRACT §4: "Actions on one account never touch another
account's state").

### Step 0: Reset

Control: `Reset run` button. Input: none. Effect: CONTRACT §4.8. Events: `run_start` (seq 1,
minute 0, `detail = scenario_id=guided;pack=analyst-session-001;contract=1.0`). The `scenario_id`
for a guided run is `guided` unless the instructor types another id into the run header field
before reset.

After reset the learner sees: balances 480000 / 480000, four pending orders with due minutes 18 and
23, twelve visible records (`EV-001` … `EV-004`, `EV-011` … `EV-014`, `EV-021` … `EV-024`), no
holds, no requests, no decisions. The learner is told the run ends at minute 30 by default and can
change `run_until_minute` before the first Advance (never afterwards).

### Step 1: Select case

Control: `Current case` combo box listing alerts from `alerts.csv` (`AL-001` … `AL-006`, with
`customer_id`, `priority`, `trigger_code`, `summary`), or clicking a case token in the 3D view
(see `3d-layout.md`, where supported). Input: an `alert_id`. Effect: sets the UI's current
`customer_id` and its `account_id` (via `customers.csv → account_id`). **No event.** Selection is a
UI convenience, not run state; the debrief does not know which case was selected when.

The selection panel also shows the start briefing from `learner/START.md` (tasks 1–6) and a link
to `learner/course-policy.md`. Both are static text, learner-visible at all times.

### Step 2: Read records

Panels (all read-only, all paused):

| Panel | Source | Visible rows |
| --- | --- | --- |
| Profile | `customers.csv` row for current customer | always |
| Account | `accounts.csv` row(s): the internal account and the external counterparties that appear in the customer's transfers | always |
| Transfers | `transactions.csv` where `from_account` or `to_account` is the customer's account; run-time `run_orders` fields (`status`, `executed_minute`, `overdue`) are joined onto the four pending orders | always |
| Alert | `alerts.csv` row | always |
| Evidence list | `evidence_catalog.csv` filtered to `customer_id` **and learner-visible at now** (`run_evidence.available_from_minute` set and `<= now`) | changes over the run |
| Record viewer | document text loaded from `learner_path` (initial) or `instructor_path` (released) at open time | only for visible rows |
| Request catalog | `request_catalog.csv` rows for the customer with `title`, `service_minutes`, `prerequisite_evidence_id`, plus the request's run status (`not requested` / `requested, completes at minute n` / `completed at minute n`) | always |
| Policy | `learner/course-policy.md` | always |

Rule applied literally from CONTRACT §2.4: for an `on_request` record that has not been released,
the evidence list shows **no row at all**. Not a greyed title, not a count, not a padlock. The
learner can infer that a request will produce "a response" only from the request catalog title.
When the `evidence_released` event fires the row appears with `evidence_id`, `title`, `source`
and the minute it arrived.

Reading produces no event. Optionally the learner then clicks `Advance by work duration` (Step 5).

### Step 3: Request checks

Control: `Request check` panel: a list of the six catalog rows for the current customer, each with
a `Request` button. Input: `(customer_id, request_id)`; nothing else. Effect and events, exactly
CONTRACT §4.5:

| Situation at click time | Event | `detail` | UI feedback |
| --- | --- | --- | --- |
| pair not in catalog (cannot happen from the panel, only from a scenario file; background customers have no catalog rows so their panel is empty) | `request_rejected` | `reason=unknown_request` | "No such check for this customer." |
| already requested or completed | `request_rejected` | `reason=duplicate` | "Already requested at minute n." The button is disabled after acceptance so this normally needs a scenario file to trigger. |
| prerequisite not visible | `request_rejected` | `reason=prerequisite_missing:EV-006` (or `EV-016`) | "Needs the supporting documents first (request `request_supporting_documents`)." The UI may name the prerequisite **ID** because it is already printed in the learner-visible `request_catalog.csv`; it must not name the title. |
| accepted | `request_accepted` (`ref_id = request_id`) | `due_minute=<now + service_minutes>` | Row shows "completes at minute n (hh:mmZ)". |

Completion is automatic at phase 1 of `due_minute`: event `evidence_released`
(`ref_id = evidence_id`, `detail = request_id=<id>;title=<title>`), the record appears in the
evidence list. Nothing the learner does can speed it up or cancel it. A request still `requested`
at run end stays outstanding (CONTRACT §4.5) and the debrief lists it.

Design note for the 8-then-20 path: `verify_payer` cannot be accepted before the supporting
documents arrive, and takes 20 minutes after that, so the earliest payer verification is minute 28,
after both due minutes. The UI does not say this in advance; the request catalog's
`service_minutes` and `prerequisite_evidence_id` columns are visible and the learner is expected to
work it out. That is the lesson the pack's instructor guide is built around; the design must not
short-circuit it with a hint.

### Step 4: Hold and release

Controls: `Place outbound hold` and `Release hold`, each with a one-line text box.

| Control | Input | State check | Event | `detail` |
| --- | --- | --- | --- | --- |
| Place outbound hold | `reason` (free text; may be empty, the UI shows a warning but does not block, per CONTRACT §4.1 and the course policy's "Record the concern, the time, and the next check") | `held == false` | `hold_placed` | `reason=<text>` |
| Place outbound hold | | `held == true` | `hold_rejected` | `reason=already_held` |
| Release hold | `note` (free text) | `held == true` | `hold_released` then the release re-check of CONTRACT §4.3 for this account only: for every order with `status == pending` and `due_minute < now`, in `(due_minute, transaction_id)` order, the eligibility check of §4.4 with `trigger = release`, producing `order_executed` (or `order_failed`) rows | `note=<text>`; then `to=<to_account>;trigger=release` per executed order |
| Release hold | | `held == false` | `release_rejected` | `reason=not_held` |

UI copy next to the hold button, quoting the policy the learner already has: "An effective hold
prevents a pending order from executing at its due time. It does not undo a completed transfer."
Next to the release button: "Releasing re-checks overdue orders immediately; eligible ones execute
now." The hold panel shows `held`, `hold_since_minute`, `hold_reason` and, for each pending order,
`due_minute`, `status`, `overdue`.

The UI shows the consequence of timing without predicting it: after the learner advances past a
due minute while a hold is in place, the order row reads `pending, overdue (held at minute 18)`
from the `order_held` event; without a hold it reads `executed at minute 18`. A hold placed at a
minute `> 18` cannot change TX-2 (`executed` is terminal, CONTRACT §4.1).

### Step 5: Advance

Controls: `Advance to next event`, `Advance by work duration` (numeric `d`, default 6), both
described in §1 above. Each click whose target is `> now` writes one `clock_advanced` event at the
**current** minute with `detail = to_minute=<target>` (the target after capping at
`run_until_minute`) and then processes `(now, target]`, so at minute 18 the `clock_advanced` row
precedes the phase-3 order rows of minute 18. `clock_advanced` has no `customer_id` or
`account_id` (CONTRACT §4.7). A target `<= now` (for example `d = 0`, or a click after the run
ended) is ignored with no event of any kind (CONTRACT §4.7, §4.9). A scenario-file `advance`
action is the same click and produces the same row; the runner's own move to an action's
`at_minute` and "Finish and debrief" write no `clock_advanced`. The trace comparer may drop these
rows when told to (CONTRACT §5).

### Step 6: Record a decision

Control: `Record decision` panel. Inputs:

- `decision`: radio buttons `closure`, `continue_review`, `escalation`;
- `evidence_ids`: a multi-select built **only** from the current customer's learner-visible
  records at `now` (so an unavailable ID cannot be chosen; CONTRACT §4.6 "reject, not flag"
  rationale);
- `note`: multi-line free text, pre-filled with the headings of the START.md case note template
  (`Payment status at decision time`, `Evidence IDs examined`, `Unverified claims and remaining
  gaps`, `Recommended action and reason`, `Next review or escalation`).

Events, CONTRACT §4.6:

| Situation | Event | `ref_id` | `detail` |
| --- | --- | --- | --- |
| accepted | `decision_recorded` | `D<n>` | `decision=<d>;cites=<EV-a\|EV-b>;note=<text>` |
| decision not one of the three (scenario file only) | `decision_rejected` | empty | `reason=unknown_decision;decision=<d>` |
| cited record unknown / other customer / not visible (scenario file only) | `decision_rejected` | empty | `reason=evidence_not_available:<first id>;decision=<d>` |

Copy shown above the buttons, from the policy: "A drafted report or an escalation does not
automatically place a hold." and "Close a resolved alert with a reasoned note identifying the
evidence that answers the concern." The panel never places or releases a hold; if the learner
chooses `closure` while `held == true` the UI shows a reminder "The outbound hold is still in place
(Release hold is a separate action)" and the debrief records the consistency flag. If the learner
chooses `escalation` while `held == false` the UI shows "Escalation does not hold the orders".
Neither reminder blocks the decision.

Multiple decisions per customer are allowed; the panel lists the history and marks the latest as
current (CONTRACT §2.5).

### Step 7: Finish and debrief

Control: `Finish and debrief`. Effect: advance to `run_until_minute` (processing every scheduled
minute on the way, including phase 3 at `run_until_minute` itself because the run ends there,
CONTRACT §1.1), write `run_end` (`detail = final_minute=<n>`), then open the learner debrief
(`debrief-spec.md`). The debrief is computed from `run_events` plus learner-visible tables only.

### Step 8: Export history

Control: `Export run history`. Output: the `run_events` table in the CONTRACT §5 CSV schema
(`seq, sim_minute, customer_id, account_id, event_type, ref_id, amount, balance_after, detail`),
file name `<scenario_id>.events.csv`, plus the learner debrief as text. The export contains only
what the learner saw happen: titles of released records appear (they were shown on release),
titles of unreleased records do not appear anywhere (no event names them). Decision notes and hold
reasons are included verbatim. Nothing from `answer-key.json` is in the file. The export file is
what a learner hands to the instructor; the instructor debrief (`debrief-spec.md` §4) joins it with
the key on the instructor's side.

## 3. Controls summary

| Control | Inputs | Moves clock | Events produced |
| --- | --- | --- | --- |
| Reset run | (optional `scenario_id`, `run_until_minute`) | to 0 | `run_start` |
| Current case | `alert_id` | no | none |
| Open record | `evidence_id` (visible only) | no | none |
| Request check | `request_id` | no | `request_accepted` or `request_rejected` |
| Place outbound hold | `reason` | no | `hold_placed` or `hold_rejected` |
| Release hold | `note` | no | `hold_released` (+ `order_executed`/`order_failed` with `trigger=release`) or `release_rejected` |
| Advance to next event | none | yes | `clock_advanced`, then any `evidence_released`, `order_executed`, `order_held`, `order_failed` in `(now, target]` |
| Advance by work duration | `d` | yes | same |
| Record decision | `decision`, `evidence_ids[]`, `note` | no | `decision_recorded` or `decision_rejected` |
| Finish and debrief | none | to `run_until_minute` | scheduled events, `run_end` (ending is not an advance: no `clock_advanced`, CONTRACT §4.7) |
| Export run history | none | no | none (writes a file) |

## 4. Learner-visible vs instructor-only data

By file and column, following `../data/README.md`.

### Learner-visible at all times

| Table | Columns |
| --- | --- |
| `customers.csv` | all |
| `accounts.csv` | all |
| `transactions.csv` | all (pending rows show `executed_at` empty and `scheduled_at` set) |
| `alerts.csv` | all |
| `request_catalog.csv` | all (`customer_id`, `request_id`, `title`, `service_minutes`, `prerequisite_evidence_id`) |
| `evidence_catalog.csv` | rows with `release = initial` only: `evidence_id`, `customer_id`, `title`, `source`, `learner_path` |
| `run_accounts` | `account_id`, `customer_id`, `balance`, `account_status`, `held`, `hold_reason`, `hold_since_minute` (own actions) |
| `run_orders` | all fields for the customer's orders |
| `run_requests` | `customer_id`, `request_id`, `requested_minute`, `due_minute`, `status`; **not** `evidence_id` until the request completes |
| `run_decisions` | all (own history) |
| `run_events` | all rows (the trace is the learner's own history) |
| `learner/START.md`, `learner/course-policy.md` | whole text |

### Learner-visible only after release (per row, from `evidence_released` onward)

| Table | Columns |
| --- | --- |
| `evidence_catalog.csv` rows with `release = on_request` | `evidence_id`, `title`, `source`, and the document text read from `instructor_path` |
| `run_evidence` | `available_from_minute` for that row |

### Never shown in the learner interface

| Table / file | Columns | Why |
| --- | --- | --- |
| `evidence_catalog.csv` | `request_id`, `service_minutes`, `prerequisite_evidence_id`, `instructor_path` for **unreleased** rows; the full list of `on_request` titles | a full title list discloses the response set before it is earned (`data/README.md`) |
| `run_requests` | `evidence_id` before completion | CONTRACT §2.3 "Instructor-side field; never shown to the learner before release" |
| `due_events.csv` | `action_if_eligible`, `eligibility` prose, `event_id` | engine data; the learner has the equivalent policy text and `scheduled_at` in `transactions.csv`. `due_minute` may be shown as the derived "due at minute 18" label because it is a pure function of learner-visible `scheduled_at` |
| `initial_state.csv` | `executed_transfer_count`, `pending_outgoing_total` | engine seed; derivable but not needed in the UI |
| `instructor/answer-key.json`, `instructor/answer-key.md` | everything | case truth, decisive evidence, rubric (CONTRACT §7-I, §8) |
| `instructor/evidence-index.csv`, `instructor/events.csv` | everything | source of the engine tables above |
| `data/evidence/analyst-session-001/README.md` | whole text | the pack says to keep it out of the learner bundle because it describes the pairing |

Nothing in the learner UI, the export or the learner debrief says which of the two cases is the
laundering case or uses the words "deepfake", "legitimate", "lookalike" or "truth".

## 5. Independence and idempotency, as the learner sees them

- Every control reads `Current case`; switching case and repeating a hold affects only the new
  case's account. The transfers panel of the other case does not change (CONTRACT example B).
- A disabled button is the normal guard against duplicates, but the model does not rely on the UI:
  a second hold, release or request is answered with the rejection event and a visible message
  (CONTRACT §4.9). Repeating actions never duplicates a payment or a release.
- The learner cannot rewind. "Undo" is `Reset run`, which starts a new run and new trace.

## 6. Documentation note on FlexSim mechanics

This file names controls and panels, not FlexSim widget types. The mapping to dashboard widgets
and 3D triggers is in `3d-layout.md` (3D), in `../flexscript/` and in `../windows/` (assembly steps and validation checklist; the detailed FlexSim steps are in `../flexscript/ASSEMBLY.md`).
The official FlexSim manual could not be retrieved from the authoring machine during this design
pass (legacy `docs.flexsim.com` pages redirect to `help.autodesk.com`, which returned "Page Not
Found" for the redirected addresses), so this folder cites only the search-indexed page titles
and treats every FlexSim capability as "where supported" until the Windows session confirms it.
