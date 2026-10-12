# Windows validation checklist

Status: written on macOS on 2026-10-07. Every box below is **unchecked because nothing has run in
FlexSim**. Expected values come from `../CONTRACT.md` section 7 and the golden traces in
`../reference/traces/`, which are Mac-tested in the Python harness. Tick a box only after the
compare command exits 0 (or the stated manual check passes) on the Windows build.

Conventions:

- Scenario files are in `simulation/flexsim/reference/scenarios/`; golden traces in
  `simulation/flexsim/reference/traces/`.
- "Replay" means: flatten the scenario (`python3 simulation/flexsim/flexscript/flatten_scenario.py
  simulation/flexsim/reference/scenarios/<id>.json <out_dir>`), import `<id>.actions.csv` into the
  Global Table `scenario_actions`, run `replayScenario();` in the Script Console
  (`../flexscript/ASSEMBLY.md` section 7). The export lands at `<model folder>\<id>.events.csv`.
- "Buttons" means a guided run: set `ui_inputs.scenario_id` to the scenario id, press Reset run,
  then the dashboard buttons at the minutes given (Advance by work duration with the minutes typed
  into the Advance field, or `advanceTo(<minute>)` in the Script Console), then Finish and debrief
  and Export run history (section 6). Compare with `--ignore-clock-advanced`.
- Compare command, run from the repository root on a machine with Python 3; `<exported.csv>` is
  the file FlexSim wrote:

  ```bash
  python3 simulation/flexsim/reference/compare_trace.py <exported.csv> simulation/flexsim/reference/traces/<id>.events.csv
  ```

  Exit 0 = identical after whitespace trimming. Hold reason and release note text must match the
  scenario file exactly (`Payer and recipients unverified`, `Concerns resolved`), because free text
  is compared verbatim.

## Acceptance checks (trace compare)

| Done | Check | Scenario file | Golden trace | How to drive it in FlexSim | Expected | Compare command |
| --- | --- | --- | --- | --- | --- | --- |
| [ ] | A. No hold | `no_hold.json` | `traces/no_hold.events.csv` | Replay; or Buttons: Reset run, Finish and debrief, Export | Four `order_executed trigger=due` (18: TX-2, TX-L-2; 23: TX-3, TX-L-3); both accounts 10000 | `python3 simulation/flexsim/reference/compare_trace.py <exported.csv> simulation/flexsim/reference/traces/no_hold.events.csv` |
| [ ] | B. Hold at 10 | `hold_at_10_syn_001.json` | `traces/hold_at_10_syn_001.events.csv` | Replay; or Buttons: advance to 10, Place outbound hold (SYN-001), Finish | `order_held hold_since=10` at 18 and 23 for SYN-A001; A001 480000, A002 10000 | `python3 simulation/flexsim/reference/compare_trace.py <exported.csv> simulation/flexsim/reference/traces/hold_at_10_syn_001.events.csv` |
| [ ] | B (mirror) | `hold_at_10_syn_002.json` | `traces/hold_at_10_syn_002.events.csv` | Same, case AL-002 / SYN-002 | A002 480000, A001 10000 | `python3 simulation/flexsim/reference/compare_trace.py <exported.csv> simulation/flexsim/reference/traces/hold_at_10_syn_002.events.csv` |
| [ ] | C. Hold at 20 | `hold_at_20_syn_001.json` | `traces/hold_at_20_syn_001.events.csv` | Replay; or Buttons: advance to 20, Place outbound hold, Finish | TX-2 executed at 18; TX-3 `order_held hold_since=20`; A001 250000 | `python3 simulation/flexsim/reference/compare_trace.py <exported.csv> simulation/flexsim/reference/traces/hold_at_20_syn_001.events.csv` |
| [ ] | F. Hold exactly at 18 | `hold_at_18_exact_due_syn_001.json` | `traces/hold_at_18_exact_due_syn_001.events.csv` | Replay; or the Script Console sequence of `ASSEMBLY.md` section 3c; or Buttons: Advance to next event (lands on 18), Place outbound hold, Finish | `hold_placed` at 18 precedes `order_held TX-2 hold_since=18`; TX-L-2 executes; A001 480000 | `python3 simulation/flexsim/reference/compare_trace.py <exported.csv> simulation/flexsim/reference/traces/hold_at_18_exact_due_syn_001.events.csv` |
| [ ] | D. Hold at 10, release at 25 | `release_after_due_syn_001.json` | `traces/release_after_due_syn_001.events.csv` | Replay; or Buttons: advance to 10, hold, advance to 25, Release hold (note `Concerns resolved`), Finish | `hold_released` at 25, then TX-2 and TX-3 `order_executed trigger=release` at 25 in that order; A001 10000 | `python3 simulation/flexsim/reference/compare_trace.py <exported.csv> simulation/flexsim/reference/traces/release_after_due_syn_001.events.csv` |
| [ ] | D2. Hold at 10, release at 20 | `release_between_due_syn_001.json` | `traces/release_between_due_syn_001.events.csv` | Replay; or Buttons: advance to 10, hold, advance to 20, release, Finish | TX-2 executes at 20 `trigger=release`; TX-3 waits and executes at 23 `trigger=due`; A001 10000 | `python3 simulation/flexsim/reference/compare_trace.py <exported.csv> simulation/flexsim/reference/traces/release_between_due_syn_001.events.csv` |
| [ ] | Release at the due minute | `release_at_due_syn_001.json` | `traces/release_at_due_syn_001.events.csv` | Replay; or Buttons: advance to 10, hold, Advance to next event (18), Release hold, Finish | `hold_released` at 18 followed by one execution of TX-2 at 18 with `trigger=due` (phase 3), never two; A001 10000 | `python3 simulation/flexsim/reference/compare_trace.py <exported.csv> simulation/flexsim/reference/traces/release_at_due_syn_001.events.csv` |
| [ ] | E. Duplicates rejected | `duplicate_actions_syn_001.json` | `traces/duplicate_actions_syn_001.events.csv` | Replay (the dashboard disables repeat buttons, so the buttons path needs the Script Console: `requestCheck`, `placeHold`, `releaseHold` twice each at minutes 0/3, 10/12, 25/26) | `request_rejected reason=duplicate` at 3, `hold_rejected reason=already_held` at 12, `release_rejected reason=not_held` at 26; EV-006 released once; A001 10000 | `python3 simulation/flexsim/reference/compare_trace.py <exported.csv> simulation/flexsim/reference/traces/duplicate_actions_syn_001.events.csv` |
| [ ] | G. Reset restores snapshot | `reset.json` | `traces/reset.events.csv` | After any used run: Reset run, then Finish and debrief, Export. Before Finish, inspect `run_accounts` (480000 / 480000, no holds), `run_orders` (four `pending`), `run_events` (one `run_start` row, seq 1) | Trace equals `no_hold` apart from the scenario id; 10000 / 10000 | `python3 simulation/flexsim/reference/compare_trace.py <exported.csv> simulation/flexsim/reference/traces/reset.events.csv` |
| [ ] | Cross-account isolation | `cross_account_isolation.json` | `traces/cross_account_isolation.events.csv` | Replay | Every `SYN-A002` row equals the `no_hold` trace; SYN-001 request, hold, decide, release, decide interleave; 10000 / 10000 | `python3 simulation/flexsim/reference/compare_trace.py <exported.csv> simulation/flexsim/reference/traces/cross_account_isolation.events.csv` |
| [ ] | H. Request prerequisites and evidence timing | `request_prerequisites_syn_001.json` | `traces/request_prerequisites_syn_001.events.csv` | Replay; or Buttons at 0: Request `verify_payer` (rejected), Request `request_supporting_documents`; Advance to next event (8); Request `verify_payer`; advance to 20, Record decision citing `EV-007` (rejected); Advance to next event (28), Record decision citing `EV-003\|EV-007`; Finish | `prerequisite_missing:EV-006` at 0; `request_accepted due_minute=28` at 8 after `evidence_released EV-006`; `decision_rejected evidence_not_available:EV-007` at 20; `evidence_released EV-007` then `decision_recorded D1` at 28; A001 10000 | `python3 simulation/flexsim/reference/compare_trace.py <exported.csv> simulation/flexsim/reference/traces/request_prerequisites_syn_001.events.csv` |
| [ ] | All six service times | `evidence_timing_syn_001.json` | `traces/evidence_timing_syn_001.events.csv` | Replay | Releases at 7 (EV-008), 8 (EV-006), 13 (EV-010), 15 (EV-005 then EV-009, `evidence_id` order), 28 (EV-007); orders execute on time; 10000 | `python3 simulation/flexsim/reference/compare_trace.py <exported.csv> simulation/flexsim/reference/traces/evidence_timing_syn_001.events.csv` |
| [ ] | Decision is not a hold or release | `decision_does_not_hold_syn_001.json` | `traces/decision_does_not_hold_syn_001.events.csv` | Replay | Escalation produces no `order_held`; closure produces no `hold_released`; A001 250000 | `python3 simulation/flexsim/reference/compare_trace.py <exported.csv> simulation/flexsim/reference/traces/decision_does_not_hold_syn_001.events.csv` |
| [ ] | Decimal minute | `decimal_minute_hold_syn_001.json` | `traces/decimal_minute_hold_syn_001.events.csv` | Replay; or Script Console `advanceTo(17.5); placeHold(...)` | `sim_minute` written `17.5`, `hold_since=17.5`, integers without `.0`; A001 480000 | `python3 simulation/flexsim/reference/compare_trace.py <exported.csv> simulation/flexsim/reference/traces/decimal_minute_hold_syn_001.events.csv` |
| [ ] | Advance is log-only | `advance_log_only.json` | `traces/advance_log_only.events.csv` | Replay (exact match, `clock_advanced` rows included); or Buttons: Advance to next event / by minutes to reach 8, 10, hold, 18, 23, 30 | `clock_advanced to_minute=<n>` rows at 0, 8, 10, 18, 23; otherwise identical to `hold_at_10_syn_001`; A001 480000 | `python3 simulation/flexsim/reference/compare_trace.py <exported.csv> simulation/flexsim/reference/traces/advance_log_only.events.csv` |
| [ ] | Run ends before second due | `run_until_20.json` | `traces/run_until_20.events.csv` | Set `ui_inputs.run_until_minute = 20` before Reset run; Finish; Export | `request_accepted review_kyc_log` at 10 stays outstanding; minute-18 executions; `run_end final_minute=20`; nothing at 23 or 25; 250000 / 250000 | `python3 simulation/flexsim/reference/compare_trace.py <exported.csv> simulation/flexsim/reference/traces/run_until_20.events.csv` |
| [ ] | Rejections | `rejections.json` | `traces/rejections.events.csv` | Replay | `request_rejected unknown_request` (background customer and misspelt id), four `decision_rejected`, `release_rejected not_held`, hold and decision on SYN-003 accepted; 10000 / 10000 | `python3 simulation/flexsim/reference/compare_trace.py <exported.csv> simulation/flexsim/reference/traces/rejections.events.csv` |
| [ ] | `_syn_002` mirrors | the remaining `*_syn_002.json` files | matching `traces/*_syn_002.events.csv` | Replay each | Same shapes on SYN-A002 / TX-L-* | same command with the `_syn_002` id |

## Behaviour checks (manual or Script Console)

| Done | Check | How | Expected |
| --- | --- | --- | --- |
| [ ] | Request prerequisites | At minute 0, Request `verify_payer` for SYN-001 and for SYN-002 | Both rejected: message names `EV-006` / `EV-016` by ID only; `request_rejected reason=prerequisite_missing:EV-006` (or `EV-016`) in `run_events` |
| [ ] | Evidence timing | Request `request_supporting_documents` at 0, Advance to next event | Clock stops at 8; EV-006 (or EV-016) now listed; `verify_payer` accepted at 8 with `due_minute=28`; after another Advance to next event past 23, the next stop is 28 and EV-007 (or EV-017) appears |
| [ ] | Learner/instructor separation | Open the learner dashboard at minute 0 | Visible evidence panel lists exactly `EV-001` to `EV-004`, `EV-011` to `EV-014`, `EV-021` to `EV-024`; no title, source or path of any `on_request` record anywhere; the request panel shows catalog titles only |
| [ ] | Learner/instructor separation (widgets) | Inspect every dashboard widget's data link | None bound to `evidence_catalog`, `run_evidence`, `run_requests`, `due_events`, `initial_state`, `scenario_actions`; the model folder contains nothing from `instructor/` |
| [ ] | Reset | After a run with holds, requests and decisions: Reset run | `run_accounts` 480000 / 480000, `held` false; `run_orders` all `pending`; `run_requests`, `run_decisions` empty; `run_events` one `run_start` row; clock label `minute 0 \| 11:12:00Z \| paused` |
| [ ] | 3D state colours | Reset; select AL-001; request a check; let it complete; record `closure` or `escalation` | Token grey in `Q_Incoming` at reset; blue in `Q_Review` when selected; yellow in `Q_AwaitingEvidence` while a request is `requested`; green in `Q_Completion` after closure or escalation; `continue_review` does not move it to completion; hold shown by `Label_Hold_*` text, never by colour |
| [ ] | 3D hold label and clock | Place a hold at 6; Advance to next event | `HOLD since 6` above the token; clock label updates to `minute 8 \| 11:20:00Z \| paused` (or the next scheduled minute) |
| [ ] | Guided clock never uses FlexSim Run | Press FlexSim Run with the model reset | Nothing changes in any `run_*` table (no FlexSim events exist unless the optional free-run block was added) |
| [ ] | API smoke tests | `ASSEMBLY.md` section 3a one-liners in the Script Console | `twinIntText(480000)` = `480000`; `twinFmtMinute(18)` = `18`; `twinFmtMinute(17.5)` = `17.5`; `twinWallClock(18)` = `11:30:00Z`; `twinWallClock(28)` = `11:40:00Z`; `twinNum("18")` = 18; `twinText(0)` = empty; `twinCsvQuote("a,b")` = `"a,b"`; `twinCsvQuote("say \"hi\"")` = `"say ""hi"""` |
| [ ] | Table import | `importTables();` echo | `customers=6 accounts=24 transactions=126 alerts=6 request_catalog=12 evidence_catalog=24 due_events=4 initial_state=6`; `due_events` rows in order `DUE-TX-2, DUE-TX-L-2, DUE-TX-3, DUE-TX-L-3` |
| [ ] | Export format | Open an exported `.events.csv` in a text editor | Header `seq,sim_minute,customer_id,account_id,event_type,ref_id,amount,balance_after,detail`; `\n` line endings; free text quoted per RFC 4180; integers without `.0` |

## Fallbacks used

List every `[U]` call from `../flexscript/API-REFERENCES.md` that failed to compile or behaved
differently, and the fallback applied.

| File | Call | What happened | Fallback applied |
| --- | --- | --- | --- |
| | | | |

## Results

| Date | FlexSim version and build | Checks passed / total | Pass or fail | Notes |
| --- | --- | --- | --- | --- |
| | | | | |
