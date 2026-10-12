# FlexScript sources for the TwinAML FlexSim edition

**STATUS: UNVERIFIED in FlexSim (authored on macOS, not compiled).** No FlexSim install, no
Windows machine and no model file exist on the authoring side. Nothing in this folder has been
compiled, pasted or run in FlexSim. Every `.fs` file is plain text carrying the same status line.
The only things that were executed are `flatten_scenario.py` (Python 3.13, macOS) and the row-order
check described in `00_helpers.fs`.

Intended version: **FlexSim 2027** (the current release on Autodesk Help, product code
`FLEXSIMIN`). Assumed minimum: FlexSim 22.0 (`VERSION-ASSUMPTIONS.md`). The official manual could
not be opened from here (every Autodesk Help page returned "Page Not Found" and the legacy
`docs.flexsim.com` is dead), so **no API in this folder is confirmed against the official
documentation**; `API-REFERENCES.md` lists each call with its evidence level.

What this folder implements: `../CONTRACT.md` 1.0 exactly as `../reference/twinaml_ref/engine.py`
does, with FlexSim Global Tables as the state store and FlexScript User Commands as the engine.
FlexSim's own event list is not used in guided mode; see `06_clock.fs` for how equal-timestamp
ordering and exactly-once are guaranteed.

| File | Content | Attachment point |
| --- | --- | --- |
| `00_helpers.fs` | number/text formatting, row lookup, `twinEmit`, the unknown-customer guard (`twinKnownCustomer`, `twinRejectUnknown`), visibility, learner-safe text panels | Toolbox > User Commands |
| `01_importTables.fs` | `importTables()`: the eight CSVs into read-only Global Tables | User Command |
| `02_resetRun.fs` | `resetRun()`: rebuild the six run tables, write `run_start` | User Command (also called by OnModelReset) |
| `03_holds.fs` | `twinCheckOrder`, `placeHold`, `releaseHold` (+ release re-check) | User Commands |
| `04_requestCheck.fs` | `requestCheck` | User Command |
| `05_recordDecision.fs` | `recordDecision` | User Command |
| `06_clock.fs` | phases 1 and 3, silent `advanceTo`, the one logging advance `advanceClick` (which `advanceToNextEvent` and `advanceByMinutes` route through), `finishRun`, `onOrderDue`, `onRequestComplete` | User Commands |
| `07_exportEvents.fs` | `exportEvents(path)`: the CONTRACT 5 CSV for `compare_trace.py` | User Command |
| `08_buildDebrief.fs` | grammar-aware `twinDetailValue`, `buildDebrief(customerId)` learner layer (CONTRACT 8.1 fixed strings), `exportDebrief(path)` | User Commands |
| `09_updateCaseVisuals.fs` | workflow state, token placement and colour, hold/clock labels | User Commands |
| `10_ui_buttons.fs` | OnPress bodies for the dashboard buttons | Dashboard > Button > OnPress |
| `11_model_triggers.fs` | OnModelReset; optional free-run mode (commented) | Toolbox > Model Triggers / User Events |
| `12_replayScenario.fs` | `replayScenario()` from the Global Table `scenario_actions`; refuses unknown customers and actions behind the clock | User Command |
| `flatten_scenario.py` | scenario JSON -> `scenario_actions` CSV in the current directory, same refusals (Mac-tested, 28 scenarios) | run on the Mac |
| `ASSEMBLY.md` | ordered build steps for the Windows user | |
| `VERSION-ASSUMPTIONS.md` | version choice, minimum, and what depends on it | |
| `API-REFERENCES.md` | every FlexSim API used, with evidence level | |

Not in this folder, on purpose: the instructor debrief (CONTRACT 8.2). It would read
`instructor/answer-key.json`; `../reference/run_scenario.py --instructor` produces it on the Mac
from an exported events CSV, which keeps it out of the learner build.
