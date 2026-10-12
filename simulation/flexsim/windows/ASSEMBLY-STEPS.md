# Windows handoff: assembly steps

Status: written on macOS on 2026-10-07 without a FlexSim install. **Nothing below has been run in
FlexSim.** This file orders the Windows session and points at the detailed instructions in
`../flexscript/ASSEMBLY.md`; it does not repeat them. Where the two disagree, `ASSEMBLY.md` is the
build reference and this file is wrong. Record what actually happened in
`VALIDATION-CHECKLIST.md`.

## Prerequisites

| Item | Requirement |
| --- | --- |
| Operating system | Windows (FlexSim has no macOS build). |
| FlexSim | FlexSim 2027 is the intended version. Any of 2025 to 2027 covered by the course licence should do; the assumed minimum is 22.0 (an assumption, see `../flexscript/VERSION-ASSUMPTIONS.md`). Note the exact build in the results table of `VALIDATION-CHECKLIST.md`. |
| Repository | `git clone` of this repository, or a copy of the whole `simulation/flexsim/` folder. The learner machine must not receive `data/evidence/analyst-session-001/instructor/`. |
| Python 3 | Optional on Windows. Needed only to run `compare_trace.py` and `flatten_scenario.py` locally; otherwise copy files to the Mac for those two steps. Standard library only. |
| FlexSim help | The installed manual (Help menu, F1). The online manual was unreachable from the authoring machine, so every API in `../flexscript/API-REFERENCES.md` must be checked here. |

## Steps

Follow the numbering of `../flexscript/ASSEMBLY.md`. Do not skip ahead: later steps call User
Commands created in earlier ones.

1. **Files on the Windows machine** (`ASSEMBLY.md` section 0). Copy `simulation/flexsim/`;
   create the model folder with a `tables\` subfolder holding the eight CSVs from
   `../data/tables/`. Keep the instructor folder off the learner machine.
2. **New model and time units** (section 1). File > New Model, save as `twinaml.fsm` in the model
   folder so `modeldir()` resolves to it. Set time units to Minutes. Add nothing from the
   library yet.
3. **Global Tables** (section 2). Create the eight snapshot tables, the seven run tables and the
   two UI tables by the exact names and columns listed there. Type the `ui_inputs` defaults
   (`scenario_id = guided`, `run_until_minute = 30`, `advance_minutes = 6`,
   `current_alert_id = AL-001`).
4. **User Commands** (section 3). First create every command with the right name, parameters
   and return type and an empty body, in file order `00`, `01`, `02`, `03`, `04`, `05`, `06`,
   `07`, `08`, `09`, `12`; then paste each body from the `.fs` file. Compile each one; for every
   compiler complaint look up the call in `../flexscript/API-REFERENCES.md` and apply the
   fallback written in the comment beside it. Note each fallback used in the checklist.
5. **Smoke tests in the Script Console** (section 3a). Run the listed one-liners
   (`twinIntText`, `twinFmtMinute`, `twinWallClock`, `twinNum`, `twinText`, `twinCsvQuote`) and
   compare with the expected results in the comments. Stop and fix before continuing if any
   differ: they exercise the unconfirmed string and Variant APIs that everything else relies on.
6. **Import the snapshot tables** (section 3b). Run `importTables();`. The echo must read
   `customers=6 accounts=24 transactions=126 alerts=6 request_catalog=12 evidence_catalog=24
   due_events=4 initial_state=6`. Check that `due_events` has a header row and the row order
   `DUE-TX-2, DUE-TX-L-2, DUE-TX-3, DUE-TX-L-3`. If `importtable()` is unavailable or imports
   headers as data, use the fallback described there.
7. **First engine test, no 3D, no dashboard** (section 3c). Run the Script Console sequence for
   `hold_at_18_exact_due_syn_001` (`resetRun(); advanceTo(18); placeHold(...); finishRun();
   exportEvents("");`), then compare the exported file against the golden trace (step 12 below).
   Repeat with `no_hold`. Do not build anything else until both compare clean.
8. **Minimal 3D board** (section 4). Four Queues, the tokens, the caption, clock and hold text
   objects at the coordinates given; no ports connected. Paste block 1 of
   `11_model_triggers.fs` into Model Triggers > OnModelReset. Press FlexSim's Reset: tokens grey
   in `Q_Incoming`, `Label_Clock` reading `minute 0 | 11:12:00Z | paused`. If `twinSetText`
   does nothing, apply the fallback in `09_updateCaseVisuals.fs`.
9. **Learner controls** (section 5). New Dashboard; edit fields linked to the `ui_inputs`
   cells; one Button per block of `10_ui_buttons.fs` with the block pasted into OnPress; text
   widgets for message, visible evidence, request status and debrief. Never bind a learner
   widget to `evidence_catalog`, `run_evidence`, `run_requests`, `due_events`, `initial_state`
   or `scenario_actions`.
10. **Run in guided mode** (section 6). Reset, then drive the clock only with the two Advance
    buttons; never press FlexSim's Run or Step. Each click is phase 2 of the current minute.
    "Finish and debrief" writes `run_end` and the debrief; "Export run history" writes
    `<scenario_id>.events.csv` in the model folder.
11. **Replay the golden scenarios** (section 7). On a machine with Python:
    `python3 simulation/flexsim/flexscript/flatten_scenario.py simulation/flexsim/reference/scenarios/<scenario>.json <out_dir>`
    writes `<scenario>.actions.csv`. In FlexSim, import it into `scenario_actions` (first row
    as headers), then run `replayScenario();` in the Script Console; it resets, replays, finishes
    and exports `<scenario>.events.csv`, returning the path.
12. **Export and compare.** Copy the exported CSV to the Mac (or run Python on Windows) and run,
    from the repository root:

    ```bash
    python3 simulation/flexsim/reference/compare_trace.py <exported.csv> simulation/flexsim/reference/traces/<scenario>.events.csv
    ```

    Exit code 0 means identical after whitespace trimming; 1 lists the differences; 2 means the
    files could not be compared (missing file or column). For a guided run driven by the buttons,
    add `--ignore-clock-advanced`, because a click writes `clock_advanced` rows that a scenario
    file without `advance` actions does not. The `scenario_id` typed into `ui_inputs` must equal
    the golden scenario's id, or the `run_start` row differs by design.

13. **Definition of done** (section 8). All smoke tests pass; `importTables()` echoes the manifest
    counts; `no_hold`, `hold_at_18_exact_due_syn_001`, `release_after_due_syn_001`,
    `duplicate_actions_syn_001`, `request_prerequisites_syn_001` and `advance_log_only` compare
    with exit code 0; no learner widget is bound to a forbidden table. Then fill in
    `VALIDATION-CHECKLIST.md`, including the exact FlexSim build and every fallback used, and only
    then change the STATUS lines in `../flexscript/`.
