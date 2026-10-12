# Debrief specification

Status: design document, contract version 1.0. UNVERIFIED in FlexSim. The two worked debriefs
below were derived by hand from the rules in `../CONTRACT.md` §3–§5 and the tables in
`../data/tables/`; they have not been produced by any running implementation. The `reference/`
harness is the place to turn them into expected traces.

Two layers:

| Layer | Inputs | Who sees it | Produced by |
| --- | --- | --- | --- |
| Learner debrief (§1–§3) | `run_events` + learner-visible tables (`customers`, `accounts`, `transactions`, `alerts`, `request_catalog`, learner-visible subset of `evidence_catalog`) | learner and instructor | the model, at `run_end`, and the exporter |
| Instructor debrief (§4) | the learner debrief's inputs **plus** `instructor/answer-key.json` | instructor only | a separate script or view, never loaded or linked by the learner interface |

The learner debrief produces no score and never states whether a case was laundering (CONTRACT
§8.1). The instructor debrief may score, but only against what was available to the learner at
the moment of each action (CONTRACT §8.2; answer-key.md: "Score the action against the information
available at the time").

## 1. Inputs and derived facts (learner layer)

All computation is over the ordered event list `E` (by `seq`) for one run, filtered per customer
by `customer_id`. `clock_advanced`, `run_start` and `run_end` have no `customer_id` and are used
only for the run header. Wall clock is `11:12:00Z + sim_minute` (CONTRACT §1).

Derived per customer `c` with account `a`:

| Fact | Computation |
| --- | --- |
| `due_minutes(a)` | from `transactions.csv`: pending rows with `from_account = a`, `due_minute = (scheduled_at − 2026-04-15T11:12:00Z)` in minutes → `{TX-2: 18, TX-3: 23}` or `{TX-L-2: 18, TX-L-3: 23}` |
| `available_at(c, t)` | `{e : release = initial, customer_id = c}` ∪ `{ref_id of evidence_released events for c with sim_minute ≤ t}` (initial rows come from the learner-visible subset of `evidence_catalog.csv`) |
| `outstanding_at(c, t)` | `request_id`s with a `request_accepted` at minute ≤ t and no `evidence_released` whose `detail.request_id` equals it at minute ≤ t |
| `held_at(c, t)` | the last of `hold_placed` / `hold_released` for c at minute ≤ t is `hold_placed` (phase order within a minute is given by `seq`) |
| `balance_final(a)` | `balance_after` of the last event with `account_id = a`; if none, the ledger balance from learner-visible `accounts.csv` + `transactions.csv` (equals `snapshot_balance` in `initial_state.csv`: 480000 for the main accounts) |

## 2. Learner debrief sections (CONTRACT §8.1)

Rendered once per main customer, and for any background customer that has at least one event.

### 2.1 Run header

`scenario_id` and `pack` from `run_start.detail`; `final_minute` from `run_end.detail`; number of
`clock_advanced` clicks; total events.

### 2.2 Timeline

Every event with `customer_id = c`, in `seq` order: `seq`, `sim_minute`, wall clock, `event_type`,
`ref_id`, `amount`, `balance_after`, `detail` rendered as key/value lines (notes and reasons
verbatim).

### 2.3 Holds

For each `hold_placed` and its matching later `hold_released` (or "open at run end"):

- `placed at <minute>`, `released at <minute>` or `still in place at run end`;
- duration = `released_minute − placed_minute`, or `final_minute − placed_minute` when open;
- position of the **placement** relative to the account's due minutes (18 and 23):
  `before first due` (`< 18`), `at due minute` (`= 18` or `= 23`), `between due minutes`
  (`18 < m < 23`), `after both due` (`> 23`);
- the same position label for the **release** when there is one (design addition; CONTRACT §8.1
  lists the labels without saying whether they apply to the release, see "Contract gaps" at the end);
- `reason` and `note` texts; observation `empty hold reason` when `reason=` is blank.

Rejected attempts (`hold_rejected`, `release_rejected`) are listed under the pair they follow with
their reason.

### 2.4 Orders

Per pending order of the account, in `(due_minute, transaction_id)` order, exactly one of the
outcome strings of CONTRACT §8.1 (identical to `reference/twinaml_ref/debrief.py`):

| Pattern in events | `outcome` |
| --- | --- |
| `order_executed` with `trigger=due`, no earlier `order_held` | `executed at <minute> (due)` |
| `order_executed` with `trigger=release`, no earlier `order_held` (cannot happen with pack data: a release re-check only reaches orders that were held at their due minute) | `executed at <minute> (release)` |
| `order_held` … then `order_executed` (any trigger) | `held at due minute, released and executed at <minute>` |
| `order_held` and no later execution | `held, still pending at run end` |
| `order_failed` | `failed insufficient funds` |
| no order event at all (the run ended before the due minute) | `pending, never checked before run end` |

The debrief also carries `held_at_due` (true iff an `order_held` was seen). A renderer may add
derived figures next to the string (`<m − d> minutes after due`, `<final − d> minutes overdue`),
but the `outcome` string itself is fixed so that the harness and the FlexSim debrief compare
equal. Then: `final balance <balance_final(a)> SCU` and `outflow executed <sum of executed
amounts> of 470000 SCU`.

### 2.5 Requests

Accepted: `request_id`, title (from `request_catalog.csv`), requested minute, `completes at
<due_minute>` from `request_accepted.detail`, completion minute from the matching
`evidence_released` or `outstanding at run end`, and the released `evidence_id` + title (both
printed in the `evidence_released` event, so they are learner-visible by construction).
Rejected: minute, `request_id`, reason (`unknown_request`, `duplicate`,
`prerequisite_missing:<EV-id>`), with a one-line gloss for the prerequisite case: "the supporting
documents had not been released yet".

### 2.6 Decisions

Per `decision_recorded`: `D<n>`, minute, `decision`, cited IDs, note. Then:

- `evidence available at that minute`: `available_at(c, minute)` (IDs and titles; titles of
  released records are known from their `evidence_released` events);
- `cited IDs all available`: always "yes" because the engine rejects unavailable citations
  (CONTRACT §4.6); any `decision_rejected` with `evidence_not_available` is listed separately as
  a rejected attempt with its reason, so the learner sees that it did not count;
- `requests outstanding at that minute`: `outstanding_at(c, minute)`;
- flags: `decided with N requests outstanding` (N > 0), `empty note`, `cited nothing`.

### 2.7 Consistency flags (observations, not grades)

| Flag | Rule |
| --- | --- |
| `escalation recorded while orders executed afterwards` | an `escalation` decision with stamp `(m, seq_d)` and an `order_executed` for the account with `(sim_minute, seq) > (m, seq_d)` as a tuple: a later minute, or the same minute with a higher `seq` (phase 3 of the decision's own minute). Executions before the decision never flag it (CONTRACT §8.1) |
| `hold still in place at run end after closure` | latest decision is `closure` and `held_at(c, final_minute)` is true |
| `closure while a request is outstanding` | a `closure` decision at minute m with `outstanding_at(c, m)` non-empty |
| `empty hold reason` | see §2.3 (design addition) |

The debrief closes with the policy sentence the learner already has: "You are assessed on the
information available when you decided." No other evaluative text.

## 3. Worked learner debriefs

Both use `run_until_minute = 30`; `clock_advanced` rows are omitted (they carry no customer and the
comparer may ignore them). Free-text values are shown as written in the scenario.

### 3.1 Scenario `guided-escalation-syn-001`

Actions (phase 2 order within a minute = array order):

| at_minute | customer | action | params |
| --- | --- | --- | --- |
| 0 | SYN-001 | request | `verify_payer` |
| 0 | SYN-001 | request | `request_supporting_documents` |
| 0 | SYN-001 | request | `review_kyc_log` |
| 0 | SYN-001 | request | `verify_recipients` |
| 6 | SYN-001 | hold | reason `Onboarding exception and unverified payer; checks outstanding` |
| 8 | SYN-001 | request | `verify_payer` |
| 28 | SYN-001 | decide | `escalation`, cites `EV-002`, `EV-005`, `EV-007`, `EV-009`, note `Verification log, payer check and recipient checks contradict the stated purpose; hold maintained pending escalation review` |

Expected trace (hand-derived):

| seq | min | account | event | ref | amount | balance_after | detail |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | 0 | | run_start | | | | scenario_id=guided-escalation-syn-001;pack=analyst-session-001;contract=1.0 |
| 2 | 0 | SYN-A001 | request_rejected | verify_payer | | 480000 | reason=prerequisite_missing:EV-006 |
| 3 | 0 | SYN-A001 | request_accepted | request_supporting_documents | | 480000 | due_minute=8 |
| 4 | 0 | SYN-A001 | request_accepted | review_kyc_log | | 480000 | due_minute=15 |
| 5 | 0 | SYN-A001 | request_accepted | verify_recipients | | 480000 | due_minute=10 |
| 6 | 6 | SYN-A001 | hold_placed | | | 480000 | reason=Onboarding exception and unverified payer; checks outstanding |
| 7 | 8 | SYN-A001 | evidence_released | EV-006 | | 480000 | request_id=request_supporting_documents;title=Project invoice supplied by customer |
| 8 | 8 | SYN-A001 | request_accepted | verify_payer | | 480000 | due_minute=28 |
| 9 | 10 | SYN-A001 | evidence_released | EV-009 | | 480000 | request_id=verify_recipients;title=Recipient business checks |
| 10 | 15 | SYN-A001 | evidence_released | EV-005 | | 480000 | request_id=review_kyc_log;title=Verification team response |
| 11 | 18 | SYN-A001 | order_held | TX-2 | 230000 | 480000 | hold_since=6 |
| 12 | 18 | SYN-A002 | order_executed | TX-L-2 | 230000 | 250000 | to=SYN-X05;trigger=due |
| 13 | 23 | SYN-A001 | order_held | TX-3 | 240000 | 480000 | hold_since=6 |
| 14 | 23 | SYN-A002 | order_executed | TX-L-3 | 240000 | 10000 | to=SYN-X06;trigger=due |
| 15 | 28 | SYN-A001 | evidence_released | EV-007 | | 480000 | request_id=verify_payer;title=Payer and invoice verification response |
| 16 | 28 | SYN-A001 | decision_recorded | D1 | | 480000 | decision=escalation;cites=EV-002\|EV-005\|EV-007\|EV-009;note=Verification log, payer check and recipient checks contradict the stated purpose; hold maintained pending escalation review |
| 17 | 30 | | run_end | | | | final_minute=30 |

Note on the reason text: it contains a `;`, which is legal (CONTRACT §5 detail grammar: keys are
in fixed order, the free-text key is always last and runs verbatim to the end of the string, so a
parser consumes the known keys in order and never splits on every `;`).

Learner debrief for SYN-001 (SYN-002 has no learner actions, so its section only shows the two
`trigger=due` executions and final balance 10000):

```
Run guided-escalation-syn-001 · pack analyst-session-001 · ended at minute 30 (11:42Z)

SYN-001 · Mira Solen · account SYN-A001 · alert AL-001

Holds
  Hold placed at minute 6 (11:18Z), still in place at run end: 24 minutes.
  Placement: before first due (due minutes 18 and 23).
  Reason: "Onboarding exception and unverified payer; checks outstanding"

Orders
  TX-2  230000 SCU to SYN-X02, due minute 18: held, still pending at run end  [12 minutes overdue]
  TX-3  240000 SCU to SYN-X03, due minute 23: held, still pending at run end  [7 minutes overdue]
  Final balance 480000 SCU. Outflow executed 0 of 470000 SCU.

Requests
  Accepted
    request_supporting_documents  "Request project supporting documents"  requested 0, completed 8  → EV-006 Project invoice supplied by customer
    review_kyc_log                "Review full KYC verification log"       requested 0, completed 15 → EV-005 Verification team response
    verify_recipients             "Verify recipient account holders and business activity"  requested 0, completed 10 → EV-009 Recipient business checks
    verify_payer                  "Verify payer and project authority independently"  requested 8, completed 28 → EV-007 Payer and invoice verification response
  Rejected
    minute 0  verify_payer  prerequisite_missing:EV-006  (the supporting documents had not been released yet)

Decisions
  D1 at minute 28 (11:40Z): escalation
    Cited: EV-002, EV-005, EV-007, EV-009 (all available at minute 28: yes)
    Available at minute 28: EV-001, EV-002, EV-003, EV-004, EV-005, EV-006, EV-007, EV-009
    Requests outstanding at minute 28: none
    Note: "Verification log, payer check and recipient checks contradict the stated purpose; hold maintained pending escalation review"
    Flags: none

Consistency flags
  none
  (Escalation did not execute any order afterwards; the hold, not the escalation, kept TX-2 and TX-3 pending.)

You are assessed on the information available when you decided.
```

The last parenthetical is allowed because it restates policy ("an escalation does not
automatically place a hold") against the learner's own events; it does not evaluate the choice.

### 3.2 Scenario `guided-closure-syn-002`

Actions:

| at_minute | customer | action | params |
| --- | --- | --- | --- |
| 0 | SYN-002 | request | `request_supporting_documents` |
| 0 | SYN-002 | request | `review_kyc_log` |
| 0 | SYN-002 | request | `verify_recipients` |
| 0 | SYN-002 | request | `resolve_screening` |
| 6 | SYN-002 | hold | reason `Provisional hold while payer and recipient checks are outstanding` |
| 8 | SYN-002 | request | `verify_payer` |
| 28 | SYN-002 | decide | `closure`, cites `EV-015`, `EV-016`, `EV-017`, `EV-019`, note `Repeat verification passed; payer, authority, suppliers and amounts reconcile` |
| 28 | SYN-002 | release | note `Concerns resolved by independent checks` |

Expected trace (hand-derived). SYN-001 is untouched, so its orders execute on time, which doubles
as the independence check (CONTRACT example B, mirrored):

| seq | min | account | event | ref | amount | balance_after | detail |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | 0 | | run_start | | | | scenario_id=guided-closure-syn-002;pack=analyst-session-001;contract=1.0 |
| 2 | 0 | SYN-A002 | request_accepted | request_supporting_documents | | 480000 | due_minute=8 |
| 3 | 0 | SYN-A002 | request_accepted | review_kyc_log | | 480000 | due_minute=15 |
| 4 | 0 | SYN-A002 | request_accepted | verify_recipients | | 480000 | due_minute=10 |
| 5 | 0 | SYN-A002 | request_accepted | resolve_screening | | 480000 | due_minute=5 |
| 6 | 5 | SYN-A002 | evidence_released | EV-018 | | 480000 | request_id=resolve_screening;title=Name screening review |
| 7 | 6 | SYN-A002 | hold_placed | | | 480000 | reason=Provisional hold while payer and recipient checks are outstanding |
| 8 | 8 | SYN-A002 | evidence_released | EV-016 | | 480000 | request_id=request_supporting_documents;title=Project contract and supplier invoices |
| 9 | 8 | SYN-A002 | request_accepted | verify_payer | | 480000 | due_minute=28 |
| 10 | 10 | SYN-A002 | evidence_released | EV-019 | | 480000 | request_id=verify_recipients;title=Recipient business checks |
| 11 | 15 | SYN-A002 | evidence_released | EV-015 | | 480000 | request_id=review_kyc_log;title=Verification team response |
| 12 | 18 | SYN-A001 | order_executed | TX-2 | 230000 | 250000 | to=SYN-X02;trigger=due |
| 13 | 18 | SYN-A002 | order_held | TX-L-2 | 230000 | 480000 | hold_since=6 |
| 14 | 23 | SYN-A001 | order_executed | TX-3 | 240000 | 10000 | to=SYN-X03;trigger=due |
| 15 | 23 | SYN-A002 | order_held | TX-L-3 | 240000 | 480000 | hold_since=6 |
| 16 | 28 | SYN-A002 | evidence_released | EV-017 | | 480000 | request_id=verify_payer;title=Payer and contract verification response |
| 17 | 28 | SYN-A002 | decision_recorded | D1 | | 480000 | decision=closure;cites=EV-015\|EV-016\|EV-017\|EV-019;note=Repeat verification passed; payer, authority, suppliers and amounts reconcile |
| 18 | 28 | SYN-A002 | hold_released | | | 480000 | note=Concerns resolved by independent checks |
| 19 | 28 | SYN-A002 | order_executed | TX-L-2 | 230000 | 250000 | to=SYN-X05;trigger=release |
| 20 | 28 | SYN-A002 | order_executed | TX-L-3 | 240000 | 10000 | to=SYN-X06;trigger=release |
| 21 | 30 | | run_end | | | | final_minute=30 |

Seq 17 before 18 is the array order of the two minute-28 actions (CONTRACT §6). Seq 19–20 are the
release re-check (CONTRACT §4.3): both orders have `due_minute < 28`, so both execute, in
`(due_minute, transaction_id)` order, each exactly once.

Learner debrief for SYN-002:

```
Run guided-closure-syn-002 · pack analyst-session-001 · ended at minute 30 (11:42Z)

SYN-002 · Nika Vale · account SYN-A002 · alert AL-002

Holds
  Hold placed at minute 6 (11:18Z), released at minute 28 (11:40Z): 22 minutes.
  Placement: before first due (due minutes 18 and 23). Release: after both due.
  Reason: "Provisional hold while payer and recipient checks are outstanding"
  Release note: "Concerns resolved by independent checks"

Orders
  TX-L-2  230000 SCU to SYN-X05, due minute 18: held at due minute, released and executed at 28  [10 minutes after due]
  TX-L-3  240000 SCU to SYN-X06, due minute 23: held at due minute, released and executed at 28  [5 minutes after due]
  Final balance 10000 SCU. Outflow executed 470000 of 470000 SCU.

Requests
  Accepted
    request_supporting_documents  requested 0, completed 8  → EV-016 Project contract and supplier invoices
    review_kyc_log                requested 0, completed 15 → EV-015 Verification team response
    verify_recipients             requested 0, completed 10 → EV-019 Recipient business checks
    resolve_screening             requested 0, completed 5  → EV-018 Name screening review
    verify_payer                  requested 8, completed 28 → EV-017 Payer and contract verification response
  Rejected
    none

Decisions
  D1 at minute 28 (11:40Z): closure
    Cited: EV-015, EV-016, EV-017, EV-019 (all available at minute 28: yes)
    Available at minute 28: EV-011, EV-012, EV-013, EV-014, EV-015, EV-016, EV-017, EV-018, EV-019
    Requests outstanding at minute 28: none
    Note: "Repeat verification passed; payer, authority, suppliers and amounts reconcile"
    Flags: none

Consistency flags
  none
  (Closure at minute 28 was followed by a release in the same minute; the hold is not in place at run end.)

You are assessed on the information available when you decided.
```

SYN-001's section in this run shows `TX-2 executed at 18 (due)`, `TX-3 executed at 23 (due)`,
final balance 10000, no holds, requests or decisions. (In the worked text above, the bracketed
figures after an outcome string are renderer additions; the outcome string is the fixed one.)

## 4. Instructor debrief (optional, separate)

File or view named `debrief.instructor.*`, produced by a separate script or a separate FlexSim
dashboard that the learner build does not contain. Inputs: the learner debrief's inputs plus
`data/evidence/analyst-session-001/instructor/answer-key.json`. Rules:

1. **Never shown in the learner interface.** No learner panel, token label, export or 3D caption
   reads `answer-key.json`. The learner export file (`learner-flow.md` Step 8) does not contain
   any field from it. If the FlexSim build is shared with learners, the instructor dashboard must
   be a separate model file or a separate dashboard that is removed from the learner build.
2. **Never grades hidden facts.** It scores actions and citations against the information the
   learner had at the time (`available_at(c, minute)`), using the key's rule "Score the action
   against the information available at the time rather than punishing a reasonable provisional
   decision with hindsight." It never deducts for failing to state `authored_truth` or
   `case_kind`.
3. **Additive only.** It appends to the learner debrief; it never alters the learner sections.

Sections per main case, each citing the key field used:

| Section | Computation | Key field |
| --- | --- | --- |
| Decisive evidence coverage | per `decisive_evidence` ID, three booleans and no score (CONTRACT §8.2): `available` (in `available_at(c, minute)` of the latest decision; at run end when there is no decision), `cited` (by that decision), `requested` (the request that releases it was accepted at some point; `true` for `initial` records). Only `available = true` IDs may count against the learner | `cases[].decisive_evidence`, `screening_evidence` |
| Acceptable / poor action match | map the latest decision + hold history onto the key's lists: e.g. SYN-001 `escalation` or `continue_review` with a hold ≈ an acceptable action; `closure` citing only `EV-008` ≈ "Close solely because the possible name match was resolved" | `acceptable_actions`, `poor_actions` |
| Expected reasoning | instructor checklist of the `expected_reasoning` lines with the IDs that support each, for the instructor to tick against the learner's note text (no automatic text matching) | `expected_reasoning` |
| Rubric | the four dimensions and points, with the learner facts that bear on each (evidence use: cited IDs vs available; reconciliation: instructor judgement; reasoned action: decision + flags; timing and customer impact: holds, orders, impact minutes) | `rubric[]` |
| Customer impact (SYN-002) | per order: `executed_minute − due_minute` when executed after a hold, or `final_minute − due_minute` when still pending at run end; sum over the account's orders. For 3.2: TX-L-2 10 + TX-L-3 5 = **15 impact minutes**. For a run where SYN-002 is never held: 0 | `rubric[3]` ("Timing and customer impact"), CONTRACT §8.2 |

Worked instructor layer for 3.1 (SYN-001): decisive `EV-005`, `EV-007`, `EV-009` all
`{available: true, cited: true, requested: true}`; `EV-008` (screening) never requested, so the "resolved match does not resolve
other concerns" line cannot be ticked from citations alone; action matches the first
`acceptable_actions` entry (enhanced review with a documented provisional hold) and the second
(escalation); no `poor_actions` pattern detected (no closure on screening alone, no claim that a
hold reversed anything, since nothing executed).

Worked instructor layer for 3.2 (SYN-002): decisive `EV-015`, `EV-017`, `EV-019` available and
cited; corroborating `EV-016` cited, `EV-020` never requested; `EV-018` available but not cited;
action matches the first `acceptable_actions` entry (independent evidence then closure and release)
and the second (proportionate provisional hold, duration accounted: 22 minutes, 15 impact minutes
on supplier orders); no `poor_actions` pattern (checks were done before clearing; restriction was
not retained after the concerns were resolved).

The instructor layer prints `authored_truth` and `case_kind` only in a clearly separated
"Instructor-only facts" block at the end, after the scored sections, so an instructor projecting the
debrief can stop before it.

## Contract gaps found while writing this file

Quoted from `../CONTRACT.md`:

1. §8.1 Holds: "the hold's position relative to each due minute: `before first due`, `between due
   minutes`, `after both due`, `at due minute`." It does not say whether the position is computed
   for the placement only or also for the release. This design computes both and labels the
   release one as a design addition.
2. §8.2: "customer-impact minutes for SYN-002 (sum of minutes supplier orders were held or
   delayed)." The formula is not given. This design uses `executed_minute − due_minute` per
   order executed after a hold, `final_minute − due_minute` for an order still pending at run
   end, summed; an order executed on time contributes 0.
3. Resolved in §5 ("Detail grammar"): keys in fixed order, the free-text key last and verbatim
   to the end of the string; a reader consumes known keys in order and never splits on every
   `;`. `reference/twinaml_ref/trace.py::parse_detail` is the executable form; the comparer
   normalises numeric detail values with the same parser.
4. §4.1 / §2.5: a hold may have an empty reason and "the debrief flags an empty note", but §8.1
   lists `empty note` only under Decisions. This design adds an `empty hold reason` observation.
5. Resolved in §1.1 / §4.7: every advance with `target > now`, guided click or scenario action,
   writes exactly one `clock_advanced` (`to_minute=` the capped target) at the current minute
   before the clock moves; `target <= now` writes nothing; the runner's move to an action's
   `at_minute` and the end of run write none. Guided and scenario traces are therefore identical.
6. §1 "End of run: `run_until_minute` from the scenario, or the learner's choice in guided mode."
   Whether a learner may end before `run_until_minute` (and what `final_minute` is then) is not
   stated. This design ends the run only by advancing to `run_until_minute`, so `final_minute`
   always equals it; `run_until_minute` is editable only before the first Advance.
