# TwinAML FlexSim edition

Status at 2026-10-07: authored and Mac-tested on macOS; **nothing in this folder has been run
inside FlexSim**. No `.fsm` or `.fsx` model file exists. The FlexScript sources are uncompiled
text. The first real compile is the Windows session described in `windows/`.

## What this is

A standalone edition of TwinAML, the COMP3424 AML investigation training demo, built for
FlexSim instead of the web stack. The learner plays an analyst with two paired investigations
(`SYN-001` / `SYN-A001` and `SYN-002` / `SYN-A002`) and four background alerts, places and
releases outbound holds, requests checks that release evidence after a service time, and records
decisions while four pending payment orders fall due on a simulation clock.

How it relates to the rest of the repository:

- **FlexSim owns run-time state in this edition.** Global Tables hold the snapshot and the run
  state; FlexScript User Commands are the engine. There is no FlexSim adapter to the Worker and
  no shared state with it.
- **The web twin and the Worker are untouched.** `workers/api`, `frontend/` and `backend/` are
  not read, called or changed by anything here. For the web demo the Worker remains the single
  state owner (AGENTS.md rule 7); this folder is a separate runtime for a separate edition, not a
  second copy of the web twin's state.
- **It reuses the evidence pack.** All data derives from the read-only pack
  `data/evidence/analyst-session-001/`; the pack itself is never modified.
- **Authorised by the owner** as a course deliverable alongside the web demo; it is not a
  replacement for it.

The single source of truth for behaviour is `CONTRACT.md` (contract version 1.0). The Python
harness in `reference/` and the FlexScript in `flexscript/` both implement it; where either
disagrees with the contract, the contract wins.

## Intended FlexSim version

**FlexSim 2027.** Autodesk Help lists 2027 as the current release. The assumed minimum is
FlexSim 22.0, and that minimum is an **assumption**, not a tested fact (see
`flexscript/VERSION-ASSUMPTIONS.md`). The Windows user should install whichever of 2025 to 2027
the course licence covers and record the exact build in `windows/VALIDATION-CHECKLIST.md`.

The official manual could not be consulted from macOS: `docs.flexsim.com` is offline (DNS
error) and Autodesk Help (`help.autodesk.com/view/FLEXSIMIN/2027/ENU/`) returned "Page Not Found"
for every FlexSim content page at the time of writing. Every FlexSim API used therefore rests on
secondary sources or is unconfirmed; `flexscript/API-REFERENCES.md` lists each call with its
evidence level. The Windows user must confirm them against the manual installed with FlexSim
(Help menu, F1) and the Script Console smoke tests in `flexscript/ASSEMBLY.md`.

## Package contents

| Path | Purpose |
| --- | --- |
| `CONTRACT.md` | Normative run-time semantics: clock, state tables, three-phase minute ordering, every action and rejection, the nine-column event trace, the scenario file format, worked acceptance examples, the debrief. |
| `data/README.md` | The eight flat CSV tables, their columns, how they derive from the pack, and the reset procedure in data terms. |
| `data/export_tables.py` | Regenerates `data/tables/*.csv` and `data/manifest.json` from the pack; `--check` detects drift. |
| `data/manifest.json` | Table names, row counts, columns and source files. No timestamp, so the check is deterministic. |
| `data/tables/*.csv` | `customers`, `accounts`, `transactions`, `alerts`, `request_catalog`, `evidence_catalog`, `due_events`, `initial_state`. The only input a FlexSim model needs. |
| `reference/README.md` | The Python reference harness: how to run tests, replay scenarios and compare traces. |
| `reference/twinaml_ref/` | Deterministic implementation of the contract (engine, scenario loader, trace writer, debrief). Verification tool only; not a backend. |
| `reference/run_scenario.py` | Replays scenario files and writes golden traces; `--instructor` adds the separate instructor debrief. |
| `reference/compare_trace.py` | Diffs a FlexSim-exported events CSV against a golden trace; `--self-test`. |
| `reference/scenarios/*.json` | 28 scenario files, one per acceptance check (per account where applicable). |
| `reference/traces/` | Golden outputs of every scenario: `.events.csv`, `.events.jsonl`, `.summary.json`. |
| `reference/tests/test_contract.py` | unittest suite covering every acceptance check, separation and guided mode. |
| `model-design/learner-flow.md` | Guided mode: real time vs simulation time, the learner journey, controls, and the learner-visible vs instructor-only data split. |
| `model-design/3d-layout.md` | The four status queues, case tokens, workflow states, colours and click-to-select. |
| `model-design/debrief-spec.md` | Learner debrief (always available) and instructor debrief (separate), with two worked examples. |
| `model-design/background-alerts-extension.md` | Optional extension enabling `SYN-003` to `SYN-006`. |
| `flexscript/README.md` | What each `.fs` file contains and where it attaches in FlexSim. |
| `flexscript/00_helpers.fs` to `12_replayScenario.fs` | FlexScript sources: helpers, table import, reset, holds, requests, decisions, clock, export, debrief, 3D visuals, dashboard buttons, model triggers, scenario replay. |
| `flexscript/flatten_scenario.py` | Scenario JSON to `scenario_actions` CSV for replay in FlexSim (Mac-tested). |
| `flexscript/ASSEMBLY.md` | Ordered build steps for the Windows user. |
| `flexscript/VERSION-ASSUMPTIONS.md` | Version choice, assumed minimum, and what depends on it. |
| `flexscript/API-REFERENCES.md` | Every FlexSim API used, with evidence level and fallback. |
| `windows/ASSEMBLY-STEPS.md` | Windows handoff: prerequisites and the ordered steps, ending with export and compare. |
| `windows/VALIDATION-CHECKLIST.md` | Checkbox list of every acceptance check with the exact compare command, plus a results table to fill in. |

## Regenerate data

From the repository root. Python 3 standard library only.

```bash
python3 simulation/flexsim/data/export_tables.py          # rewrite tables/*.csv and manifest.json
python3 simulation/flexsim/data/export_tables.py --check  # re-derive in memory and compare; exit 1 on drift
```

Run `--check` after any change to the pack, together with the pack's own validators:

```bash
python3 scripts/validate-evidence.py
node scripts/validate-cases.mjs
```

## Run the Mac reference harness

From the repository root:

```bash
# all tests (40)
python3 -m unittest discover -s simulation/flexsim/reference/tests

# replay one or all scenarios and (re)write the golden traces
cd simulation/flexsim/reference
python3 run_scenario.py scenarios/hold_at_10_syn_001.json --out traces/
python3 run_scenario.py scenarios/*.json --out traces/

# optional instructor layer (separate file, never part of the learner output)
python3 run_scenario.py scenarios/request_prerequisites_syn_001.json --out traces/ --instructor

# comparer self-test
python3 compare_trace.py --self-test
```

Only regenerate golden traces after a deliberate contract change; see `reference/README.md`.

## Assemble, reset, and run in FlexSim

The build steps are in `flexscript/ASSEMBLY.md` (sections 0 to 8). The Windows handoff that
walks through them in order, and the checklist to fill in while doing so, are in
`windows/ASSEMBLY-STEPS.md` and `windows/VALIDATION-CHECKLIST.md`.

In outline: copy this folder to Windows; create a new model with time units in minutes; create
the Global Tables by name; create the User Commands from the `.fs` files; run the Script Console
smoke tests; `importTables()`; run the first engine test; build the 3D board and the dashboard;
then replay golden scenarios with `replayScenario()` and compare the exported CSV on the Mac.

Reset (`resetRun()`, also wired to OnModelReset) rebuilds every `run_*` table from the read-only
tables: balances 480000 / 480000 on the main accounts, four `pending` orders, twelve visible
records and twelve hidden ones, no holds, requests or decisions; `seq` restarts at 1 and the
first event is `run_start` at minute 0.

## Guided mode and real time vs simulation time

The learner-facing model is **paused by default**. Reading records, tables, alerts or the policy
does not move the clock. Clicking Hold, Release, Request or Decide does not move the clock
either; the action is stamped with the current minute.

The clock moves only through two controls:

- **Advance to next event**: jump to the smallest scheduled minute strictly greater than now
  among pending request completions and due minutes of still-pending orders; if none, to
  `run_until_minute`.
- **Advance by work duration**: jump to `now + d` (default `d = 6`, the classroom
  `review_work_minutes`), capped at `run_until_minute`.

Minute 0 is the pack snapshot `2026-04-15T11:12:00Z`. The pending orders fall due at **minute 18**
(`11:30:00Z`: `TX-2`, `TX-L-2`) and **minute 23** (`11:35:00Z`: `TX-3`, `TX-L-3`). Within one
minute the engine runs phase 1 (request completions), then phase 2 (learner actions), then
phase 3 (due-order checks); the due checks of the minute the clock stops at are deferred until
the clock leaves it, so a hold placed at minute 18 beats the order due at 18. The run ends at
`run_until_minute` (default 30) through "Finish and debrief".

The FlexSim Run button is not used in guided mode: the twin clock is `run_header.now`, FlexSim's
own clock stays at 0 and is never read. Details: `model-design/learner-flow.md` section 1 and
`CONTRACT.md` sections 1 and 3.

## Learner controls and debrief

Controls map one-to-one onto the contract's actions: Reset run, Current case, Request check,
Place outbound hold, Release hold, Advance to next event, Advance by work duration, Record
decision, Finish and debrief, Export run history. Each produces the events listed in
`model-design/learner-flow.md` section 3.

"Finish and debrief" writes `run_end` and builds the learner debrief from `run_events` plus
learner-visible tables only: timeline, holds (with position relative to the due minutes), per-order
outcome strings, requests, decisions with the evidence available at that minute, and consistency
flags such as `escalation recorded while orders executed afterwards`. It produces no score and
never says whether a case was laundering. Specification and two worked examples:
`model-design/debrief-spec.md`.

## Learner vs instructor separation

- A record is learner-visible at minute `t` only when its `available_from_minute` is set and
  `<= t`. Unreleased `on_request` records show no row at all: no title, no source, no path.
- `run_requests.evidence_id`, `evidence_catalog.instructor_path` for unreleased rows,
  `due_events`, `initial_state` and `scenario_actions` are never bound to a learner widget
  (`flexscript/ASSEMBLY.md` section 5).
- The instructor layer (`instructor/answer-key.json`) exists **only in the Python harness**
  (`run_scenario.py --instructor`), not in FlexScript. The learner build never reads the
  instructor folder, and the learner UI never shows `on_request` records before release.
- The exported run history contains only what the learner saw happen.

## Acceptance checks

Expected values are for `run_until_minute = 30`, both main accounts starting at 480000 SCU. The
`_syn_002` twins of each scenario mirror the check onto `SYN-002` / `SYN-A002`. Every row is
Mac-tested in the Python harness and **unverified in FlexSim**.

| Check | Scenario file (`reference/scenarios/`) | Expected balance or outcome | Status |
| --- | --- | --- | --- |
| A. No hold, either account | `no_hold.json` | Both accounts 10000; four `order_executed`, `trigger=due` | Mac-tested / FlexSim unverified |
| B. Hold at 10 | `hold_at_10_syn_001.json`, `hold_at_10_syn_002.json` | Held account 480000, two `order_held hold_since=10`; other account 10000 | Mac-tested / FlexSim unverified |
| C. Hold at 20 | `hold_at_20_syn_001.json`, `hold_at_20_syn_002.json` | Held account 250000 (first executed, second held) | Mac-tested / FlexSim unverified |
| F. Hold exactly at 18 | `hold_at_18_exact_due_syn_001.json`, `hold_at_18_exact_due_syn_002.json` | TX-2 (or TX-L-2) blocked: `order_held hold_since=18`; held account 480000 | Mac-tested / FlexSim unverified |
| D. Hold at 10, release at 25 | `release_after_due_syn_001.json`, `release_after_due_syn_002.json` | Both overdue orders execute once at 25 with `trigger=release`; 10000 | Mac-tested / FlexSim unverified |
| D2. Hold at 10, release at 20 | `release_between_due_syn_001.json`, `release_between_due_syn_002.json` | First order executes at 20 (`trigger=release`), second at 23 (`trigger=due`); 10000 | Mac-tested / FlexSim unverified |
| Release at the due minute | `release_at_due_syn_001.json`, `release_at_due_syn_002.json` | Release at 18 leaves the minute-18 order to phase 3; exactly one execution, `trigger=due`; 10000 | Mac-tested / FlexSim unverified |
| E. Duplicates rejected | `duplicate_actions_syn_001.json`, `duplicate_actions_syn_002.json` | `request_rejected reason=duplicate`, `hold_rejected`, `release_rejected`; one evidence release; 10000 | Mac-tested / FlexSim unverified |
| G. Reset restores snapshot | `reset.json` | After reset, replay equals `no_hold`; `seq` restarts at 1; 480000 / 480000 before the run | Mac-tested / FlexSim unverified |
| Cross-account isolation | `cross_account_isolation.json` | Every `SYN-A002` row equals the `no_hold` trace; 10000 / 10000 | Mac-tested / FlexSim unverified |
| H. Request prerequisites and evidence timing | `request_prerequisites_syn_001.json`, `request_prerequisites_syn_002.json` | `verify_payer` rejected at 0 (`prerequisite_missing:EV-006` / `EV-016`), accepted at 8 after docs release, completes at 28; decision citing EV-007 at 20 rejected, at 28 recorded; 10000 | Mac-tested / FlexSim unverified |
| All six service times | `evidence_timing_syn_001.json`, `evidence_timing_syn_002.json` | Releases at 7, 8, 13, 15 (two, in `evidence_id` order), 28; payments never wait; 10000 | Mac-tested / FlexSim unverified |
| Decision is not a hold or release | `decision_does_not_hold_syn_001.json`, `decision_does_not_hold_syn_002.json` | Escalation does not block; closure does not release; 250000 | Mac-tested / FlexSim unverified |
| Decimal minute formatting | `decimal_minute_hold_syn_001.json`, `decimal_minute_hold_syn_002.json` | Hold at `17.5` written as `17.5`; 480000 | Mac-tested / FlexSim unverified |
| Advance is log-only | `advance_log_only.json` | `clock_advanced` rows only; balances and ordering equal `hold_at_10_syn_001`; 480000 | Mac-tested / FlexSim unverified |
| Run ends before second due | `run_until_20.json` | Nothing after minute 20; 250000 / 250000 | Mac-tested / FlexSim unverified |
| Rejections | `rejections.json` | Unknown request / decision, foreign or unreleased citation, release when not held, background-customer hold; 10000 | Mac-tested / FlexSim unverified |
| I. Learner/instructor separation | not a trace; `reference/tests/test_contract.py` | Visible set equals `{available_from_minute set and <= now}`; instructor tables never bound to a learner view | Mac-tested / FlexSim unverified |

## Verification status

### Mac-tested (macOS, Python 3.13, 2026-10-07)

| Check | Command | Result |
| --- | --- | --- |
| Unit tests | `python3 -m unittest discover -s simulation/flexsim/reference/tests` | 40 tests OK |
| Tables match the pack | `python3 simulation/flexsim/data/export_tables.py --check` | customers 6, accounts 24, transactions 126, alerts 6, request_catalog 12, evidence_catalog 24, due_events 4, initial_state 6 |
| Golden traces | `cd simulation/flexsim/reference && python3 run_scenario.py scenarios/*.json --out traces/` | All 28 scenarios reproduce `traces/` byte for byte; repeated runs are bit-identical |
| Comparer | `python3 simulation/flexsim/reference/compare_trace.py --self-test` | Passes; detects corrupted traces |
| Scenario flattening | `python3 simulation/flexsim/flexscript/flatten_scenario.py simulation/flexsim/reference/scenarios/<scenario>.json <out_dir>` | Produces `<scenario>.actions.csv` for all 28 scenarios |
| Pack validators | `python3 scripts/validate-evidence.py` and `node scripts/validate-cases.mjs` | Pass |
| Review | Three independent verifier passes (contract and harness; data and repo rules; FlexScript fidelity) | Findings fixed. The fidelity matrix found every contract rule implemented in FlexScript with the same semantics, no blockers and no certain syntax errors. This is a reading check, not a compile. |

### Unverified: FlexSim integration

None of the following has happened. Each is a Windows task.

- Compiling any `.fs` file. The sources are plain text; the Windows session is the first compile.
- Any FlexSim API call listed in `flexscript/API-REFERENCES.md`. None is confirmed against the
  official manual.
- `importTables()` and the Global Table import behaviour (headers, numeric typing).
- `resetRun()`, the three-phase clock, `exportEvents()`, `replayScenario()`.
- The 3D board (queues, tokens, colours, text labels) and `updateCaseVisuals()`.
- Dashboard widgets, OnPress bodies and table-cell links.
- Trace equality between a FlexSim export and any golden trace.
- The exact FlexSim version and build.

## Remaining limitations and Windows work

- No model file exists. The Windows user builds `twinaml.fsm` from `flexscript/ASSEMBLY.md`.
- The intended version is FlexSim 2027; the 22.0 minimum is an assumption.
- API usage rests on secondary sources or is unconfirmed; every call marked `[U]` in the sources
  has a fallback in its comment and must be checked against the installed help.
- Click-to-select on 3D tokens is not built; selection is the dashboard `current_alert_id` field
  (the fallback variant of `model-design/3d-layout.md`).
- The evidence multi-select is a pipe-separated edit field; the engine rejects anything not
  visible, so the fallback cannot leak unreleased records.
- The instructor debrief is Python-only (`run_scenario.py --instructor`); the FlexSim build has no
  instructor layer by design.
- The STATUS lines in `flexscript/` change only after a real compile; record the build, the
  fallbacks used and the results in `windows/VALIDATION-CHECKLIST.md`.
- Trace comparison needs the exported CSV copied to a machine with Python 3 (the Mac, or Python
  on Windows).

## Optional extension: background alerts

`SYN-003` to `SYN-006` (`AL-003` to `AL-006`) are ordinary review items with one initial record
each, a 30-transfer history, no pending orders and no request catalog rows. Nothing in the
contract changes to enable them: hold, release and decide work on any known customer, a request
is rejected with `reason=unknown_request`, and the debrief renders a background customer only when
it has events. Enabling them adds four tokens to the 3D board and four entries to the case
selector; reviewing all four at six minutes each costs 24 simulation minutes, more than the 18
minutes until the first due order, which is the intended prioritisation tension. Details:
`model-design/background-alerts-extension.md`.
