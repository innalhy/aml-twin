# Assembly: building the TwinAML FlexSim model on Windows

STATUS: UNVERIFIED in FlexSim (authored on macOS, not compiled). These steps were written without
a FlexSim install; menu paths marked (unconfirmed) must be checked against the installed help
(F1). Where a step fails, the fallback is given with it. Follow the order: later steps call
commands created in earlier ones.

Target: FlexSim 2027 (any of 2025-2027 should do; assumed minimum 22.0, see
`VERSION-ASSUMPTIONS.md`).

## 0. Files on the Windows machine

1. Copy the whole `simulation/flexsim/` folder from the repository.
2. Create a folder for the model, e.g. `C:\TwinAML\model\`, and inside it a `tables\` folder
   holding the eight CSVs from `simulation/flexsim/data/tables/` (`customers.csv`, `accounts.csv`,
   `transactions.csv`, `alerts.csv`, `request_catalog.csv`, `evidence_catalog.csv`,
   `due_events.csv`, `initial_state.csv`). `importTables()` reads `<model folder>\tables\` by
   default; another folder can be typed into `ui_inputs.tables_dir`.
3. Keep `data/evidence/analyst-session-001/instructor/` off the learner machine entirely; nothing
   in this build reads it.

## 1. New model and time units

1. File > New Model. Save it immediately in the model folder as `twinaml.fsm` (so `modeldir()`
   points at the folder with `tables\`).
2. Model Settings (toolbar "Model Settings" button or the Settings menu, unconfirmed exact path):
   Time units = **Minutes**. Leave the start date/time as is: the twin's wall clock is computed by
   `twinWallClock()` from `11:12:00Z`, not from FlexSim's date (CONTRACT 1 says the wall clock is
   display only).
3. Do not add anything from the library yet.

## 2. Global Tables

Toolbox (left panel) > "+" > Global Table, once per table below. Names must match exactly (the
code calls `Table("<name>")`). Create every table with **one row** and the listed columns, and
rename the column headers to the names given (double-click a header, or right-click > rename,
unconfirmed). Row headers are not used.

Snapshot tables (any columns/rows; `importTables()` replaces the content): `customers`,
`accounts`, `transactions`, `alerts`, `request_catalog`, `evidence_catalog`, `due_events`,
`initial_state`.

Run tables (exact columns, one row each):

| Table | Columns |
| --- | --- |
| `run_header` | scenario_id, pack_id, contract_version, now, next_seq, next_decision_number, run_until_minute, due_checks_pending, ended |
| `run_accounts` | account_id, customer_id, balance, account_status, held, hold_reason, hold_since_minute |
| `run_orders` | transaction_id, customer_id, from_account, to_account, amount, due_minute, status, executed_minute, overdue |
| `run_requests` | customer_id, request_id, evidence_id, service_minutes, prerequisite_evidence_id, requested_minute, due_minute, status |
| `run_evidence` | evidence_id, customer_id, release, request_id, title, available_from_minute |
| `run_decisions` | decision_id, minute, customer_id, decision, evidence_ids, note |
| `run_events` | seq, sim_minute, customer_id, account_id, event_type, ref_id, amount, balance_after, detail |

UI tables (exact columns, one row each):

| Table | Columns |
| --- | --- |
| `ui_inputs` | scenario_id, run_until_minute, tables_dir, current_alert_id, hold_reason, release_note, request_id, decision, evidence_ids, note, advance_minutes, export_path, message, visible_evidence, request_status, debrief_text |
| `scenario_actions` | scenario_id, run_until_minute, at_minute, customer_id, action, p1, p2, p3 |

Type the defaults into `ui_inputs` row 1: `scenario_id` = `guided`, `run_until_minute` = 30,
`advance_minutes` = 6, `current_alert_id` = `AL-001`; leave the rest empty. String columns: if a
cell shows `0` and the GUI offers "assign string data" (right-click, unconfirmed), do that for the
text columns so edit fields show text; the code copes with either type through `twinText()`.

## 3. User Commands (paste the `.fs` blocks)

Toolbox > "+" > User Command, one per block. Each `.fs` file has marker lines
`// ===== USER COMMAND: name(type1 p1, type2 p2) -> ret =====`; the command's **Name**, its
**Parameters** (types `str`, `num`, `var`) and its **Return Type** are on that line, and the
block body below it (up to the next marker) is the **Code**. Parameters are read with
`param(1)`, `param(2)`, ... in that order.

1. First create all commands with the right names, parameters and return types and **empty**
   code, in this order of files: `00`, `01`, `02`, `03`, `04`, `05`, `06`, `07`, `08`, `09`,
   `12`. (FlexScript refuses to compile a call to a command that does not exist yet; creating the
   names first avoids ordering problems.)
2. Then paste every body. Commands per file:
   - `00_helpers.fs` (19): twinNum, twinText, twinIntText, twinFmtMinute, twinWallClock,
     twinFindRow, twinFindRow2, twinAccountOf, twinKnownCustomer, twinRejectUnknown, twinNow,
     twinKeepFirstRow, twinAppendRow, twinEmit, twinIsVisible, twinCurrentCustomer,
     twinVisibleEvidenceText, twinRequestStatusText, twinCsvQuote
   - `01_importTables.fs` (1): importTables
   - `02_resetRun.fs` (1): resetRun
   - `03_holds.fs` (3): twinCheckOrder, placeHold, releaseHold
   - `04_requestCheck.fs` (1): requestCheck
   - `05_recordDecision.fs` (1): recordDecision
   - `06_clock.fs` (11): twinPhase1, twinPhase3, twinLeaveMinute, twinNextScheduled, advanceTo,
     advanceToNextEvent, advanceByMinutes, advanceClick, finishRun, onOrderDue, onRequestComplete
   - `07_exportEvents.fs` (1): exportEvents
   - `08_buildDebrief.fs` (4): twinDetailValue, twinHoldPosition, buildDebrief, exportDebrief
   - `09_updateCaseVisuals.fs` (3): twinWorkflowState, twinSetText, updateCaseVisuals
   - `12_replayScenario.fs` (1): replayScenario

   46 User Commands in all (the count in parentheses is the number of
   `// ===== USER COMMAND:` marker lines in that file; `10_ui_buttons.fs` and
   `11_model_triggers.fs` have no User Commands, their blocks are trigger bodies).
3. Press the code editor's check/compile button on each; fix anything the compiler flags against
   `API-REFERENCES.md` (every call marked `[U]` in the sources is a candidate, with its fallback in
   the comment next to it).

### 3a. Smoke tests in the Script Console (do these before building anything else)

Open the Script Console (View menu) and run one line at a time; the expected result is in the
comment. Each line exercises one unconfirmed API.

```
twinIntText(480000)        // "480000"            string.fromNum precision
twinFmtMinute(18)          // "18"
twinFmtMinute(17.5)        // "17.5"              trailing-zero strip, substr, endsWith
twinWallClock(18)          // "11:30:00Z"
twinWallClock(28)          // "11:40:00Z"
twinNum("18")              // 18                  VariantType / toNum
twinText(0)                // ""                  numeric empty cell -> empty text
twinCsvQuote("a,b")        // "\"a,b\""           indexOf / replace
twinCsvQuote("say \"hi\"") // "\"say \"\"hi\"\"\""
```

### 3b. Import the snapshot tables

Run `importTables();` in the Script Console. The echo line must read
`customers=6 accounts=24 transactions=126 alerts=6 request_catalog=12 evidence_catalog=24
due_events=4 initial_state=6`. Open `due_events` and check that the header row is
`event_id, due_minute, ...` (column headers, not data) and that rows are in the order
`DUE-TX-2, DUE-TX-L-2, DUE-TX-3, DUE-TX-L-3` (this order is the phase 3 order the code relies
on).

Fallback if `importtable()` is unavailable or imports headers as data: open each Global Table
window and use its Import option (CSV, first row as headers; unconfirmed menu), or the Excel
Interface tool (Toolbox > Excel) with one import line per CSV, "first row as column headers"
checked. Table names must still equal the CSV stems.

### 3c. First engine test, no 3D, no dashboard

In the Script Console:

```
Table("ui_inputs")[1]["scenario_id"] = "hold_at_18_exact_due_syn_001";
resetRun();                 // run_events has 1 row: run_start at minute 0
advanceTo(18);              // nothing executed yet: phase 3 of 18 is deferred
placeHold("SYN-001", "Payer and recipients unverified");
finishRun();                // order_held TX-2, order_executed TX-L-2, ..., run_end
exportEvents("");           // returns <model folder>\hold_at_18_exact_due_syn_001.events.csv
```

Copy the file to the Mac and run
`python3 simulation/flexsim/reference/compare_trace.py <file> simulation/flexsim/reference/traces/hold_at_18_exact_due_syn_001.events.csv`.
Exit code 0 means the engine reproduces CONTRACT example F byte-for-byte (after trimming). Repeat
with `no_hold` (`resetRun(); finishRun(); exportEvents("");` with `scenario_id` = `no_hold`).

## 4. Minimal 3D board (built-in assets only; coordinates from `../model-design/3d-layout.md`)

Drag from the Library and rename (Properties > name). Locations are (x, y, z), sizes (sx, sy, sz).

| Object | Library item | Location | Size | Settings |
| --- | --- | --- | --- | --- |
| `Q_Incoming` | Fixed Resources > Queue | (0, 0, 0) | (4, 3, 0.1) | Maximum Content 100, Item Placement "Horizontal Line", no ports connected |
| `Q_Review` | Queue | (6, 0, 0) | (4, 3, 0.1) | same |
| `Q_AwaitingEvidence` | Queue | (12, 0, 0) | (4, 3, 0.1) | same |
| `Q_Completion` | Queue | (18, 0, 0) | (4, 3, 0.1) | same |
| `Token_AL-001`, `Token_AL-002` (and `..-003` to `..-006` for the background extension) | Visual > Shape (Box), or any small 3D object | anywhere (the code places them) | (0.8, 0.8, 0.8) | |
| `Label_Q_Incoming` ... `Label_Q_Completion` | Visual > Text | (queue x, -1, 0) | text height 0.4 | texts: "Incoming", "Analyst review", "Awaiting evidence", "Escalation / completion" |
| `Label_Clock` | Visual > Text | (0, 5.5, 0) | text height 0.6 | set by code |
| `Label_Hold_AL-001`, `Label_Hold_AL-002` | Visual > Text | anywhere (code places them above the token) | text height 0.3 | set by code |

The queues never receive flow items: tokens are separate objects whose location the code sets,
so no travel, processing or queue time exists anywhere in the model. Nothing is connected with
A-connections. Default camera: top-down, centred on (11, 2).

Then Toolbox > Model Triggers > OnModelReset: paste block 1 of `11_model_triggers.fs`
(`resetRun();`). Press FlexSim's Reset: both tokens must appear grey in `Q_Incoming` and
`Label_Clock` must read `minute 0 | 11:12:00Z | paused`. If `twinSetText` does nothing, apply the
fallback in `09_updateCaseVisuals.fs`.

Click-to-select (3d-layout.md "preferred") is not built here: the OnClick hook on 3D objects is
unconfirmed. Selection is the dashboard field `current_alert_id` (fallback variant of the design).

## 5. Learner controls (Dashboard)

Dashboards > New Dashboard. Every control is a built-in Model Input widget; where a built-in widget
cannot do what the design asks, the fallback is stated.

| Control (learner-flow.md) | Widget | Link / code |
| --- | --- | --- |
| Current case | Edit field | link to `ui_inputs[1].current_alert_id` (type `AL-001` or `AL-002`); or a Combo Box with numeric values 1..6 plus the OnSelect block at the end of `10_ui_buttons.fs` |
| Hold reason / Release note / Request id / Note / Evidence IDs | Edit fields | link to the matching `ui_inputs` cell |
| Decision | three Radio Buttons linked to `ui_inputs[1].decision` (values 1 = closure, 2 = continue_review, 3 = escalation) or an Edit field with the text | mapping in the "Record decision" block |
| Evidence IDs multi-select | **not available as a built-in widget**; fallback: Edit field, pipe-separated IDs copied from the "Visible evidence" text; the engine rejects anything not visible (CONTRACT 4.6), so the fallback cannot leak | |
| Advance by (minutes) | Edit field (number) | `ui_inputs[1].advance_minutes` |
| Run until / Scenario id | Edit fields | `ui_inputs[1].run_until_minute`, `scenario_id` (editable before Reset only, by convention) |
| Buttons: Reset run, Place outbound hold, Release hold, Request check, Record decision, Advance to next event, Advance by work duration, Finish and debrief, Export run history | Button, Properties > Triggers > OnPress | paste the matching block of `10_ui_buttons.fs` |
| Message line | Text widget / Edit field linked to `ui_inputs[1].message` | |
| Visible evidence (filtered) | Text widget linked to `ui_inputs[1].visible_evidence` | written by `updateCaseVisuals`; shows only records visible now |
| Request panel | Text widget linked to `ui_inputs[1].request_status` | titles/service/prerequisite from the learner-visible catalog + run status |
| Debrief | Text widget linked to `ui_inputs[1].debrief_text` | filled by "Finish and debrief" |
| History (events) | Dashboard Table widget bound to `run_events` if the installed version offers one (unconfirmed); fallback: keep the `run_events` Global Table window open next to the dashboard | the trace is the learner's own history (learner-visible) |

Learner-visible tables that may be shown directly: `customers`, `accounts`, `transactions`,
`alerts`, `request_catalog`, `run_accounts`, `run_orders`, `run_decisions`, `run_events`.
**Never bind to a learner widget**: `evidence_catalog`, `run_evidence` (title column of unreleased
rows), `run_requests` (evidence_id column), `due_events`, `initial_state`, `scenario_actions`
(CONTRACT 2.4, 7-I; `../model-design/learner-flow.md` section 4). If the installed version offers
no way to hide a column, show the filtered text panels instead of these tables.

## 6. Run in guided mode

1. Press Reset (FlexSim toolbar or the "Reset run" button). Do **not** press Run or Step: the
   twin clock is `run_header.now`; FlexSim's clock stays at 0 and is never read. If someone
   presses Run, nothing happens to the twin (no FlexSim events exist) unless the optional
   free-run User Event of `11_model_triggers.fs` was added.
2. Learner loop: type the case id, read (reading is free), Request check, Place outbound hold /
   Release hold, Advance to next event or Advance by work duration, Record decision. Each click
   is phase 2 of the current minute; the due checks of the current minute run when the clock
   leaves it (`06_clock.fs`), so a hold placed at minute 18 beats the order due at 18.
3. "Finish and debrief" runs to `run_until_minute` (default 30), writes `run_end`, writes
   `<scenario_id>.debrief.txt` and fills the debrief widget.
4. "Export run history" writes `<scenario_id>.events.csv` in the contract's nine-column order.

## 7. Compare a guided run or replay a golden scenario

Guided run (clicks produce `clock_advanced` rows, which the comparer may ignore):

```
python3 simulation/flexsim/reference/compare_trace.py export.csv \
    simulation/flexsim/reference/traces/<scenario>.events.csv --ignore-clock-advanced
```

Replay of a golden scenario (exact match expected, `clock_advanced` rows included because a
scenario `advance` action writes one `clock_advanced` in both implementations, CONTRACT 4.7):

1. On the Mac: `python3 simulation/flexsim/flexscript/flatten_scenario.py simulation/flexsim/reference/scenarios/<scenario>.json <out_dir>`
   writes `<out_dir>/<scenario>.actions.csv`; `<out_dir>` defaults to the current working
   directory, never to `reference/scenarios/` (Mac-tested for all 28 scenarios). The script
   refuses a file that names an unknown `customer_id` or whose action is stamped before the
   minute an earlier `advance` reached, with the offending row number; `replayScenario()`
   repeats both checks and returns a string starting with `refused:` instead of a path.
2. In FlexSim: import that CSV into the Global Table `scenario_actions` (first row as headers;
   `importtable(Table("scenario_actions"), "<path>", 1);` in the Script Console).
3. Script Console: `replayScenario();` -> returns the path of `<scenario>.events.csv`.
4. Mac: `python3 simulation/flexsim/reference/compare_trace.py <that file> simulation/flexsim/reference/traces/<scenario>.events.csv`.
   Exit 0 = identical. Work through the list in `../reference/README.md`; `hold_at_18_exact_due_*`
   proves the tie rule, `duplicate_actions_*` proves exactly-once, `decimal_minute_hold_*` proves
   `twinFmtMinute`.

## 8. Definition of done for the Windows session

- All smoke tests in 3a pass; `importTables()` echoes the manifest row counts.
- `no_hold`, `hold_at_18_exact_due_syn_001`, `release_after_due_syn_001`,
  `duplicate_actions_syn_001`, `request_prerequisites_syn_001` and `advance_log_only` replay with
  exit code 0 from `compare_trace.py`.
- No learner widget is bound to a table in the "never bind" list.
- Record the exact FlexSim build and every `[U]` call that needed its fallback in
  `simulation/flexsim/windows/` (the Windows handoff checklist, kept beside this folder), and
  change the STATUS lines in this folder only after a real compile.
