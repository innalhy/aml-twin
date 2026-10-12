# Reference harness (Python, Mac-tested)

A small deterministic implementation of `../CONTRACT.md` (contract 1.0) used to **verify** the
FlexSim model. It is a verification tool only:

- It is **not** a second production backend. The web twin (`workers/api`) is untouched and
  unrelated; in the FlexSim edition, FlexSim owns run-time state. This folder exists so a trace
  exported from FlexSim can be diffed against a known-correct trace.
- Python 3 standard library only (tested with Python 3.13 on macOS). No FlexSim is involved;
  nothing here has been run inside FlexSim.
- Where this code and `CONTRACT.md` disagree, the contract wins and this code is wrong.

## Layout

| Path | Role |
| --- | --- |
| `twinaml_ref/tables.py` | Loads `../data/tables/*.csv` by path relative to this folder (works from any cwd). |
| `twinaml_ref/engine.py` | `Run`: state (CONTRACT 2), three-phase minute processing (3), actions and rejections (4, including `action_rejected` for an unknown customer), event log (5), guided-mode clock (1.1 / 4.7: `advance_to`, `advance_by`, `advance_to_next_event` each write one `clock_advanced`; `proceed_to` is the runner's silent move; `end()` writes `run_end` only). |
| `twinaml_ref/scenario.py` | Scenario file loader/validator and replay (CONTRACT 6). |
| `twinaml_ref/trace.py` | Event trace writers: CSV and JSON Lines with the nine contract columns; `DETAIL_KEYS` / `parse_detail` implement the CONTRACT 5 detail grammar (fixed key order, free-text key last and verbatim). |
| `twinaml_ref/debrief.py` | Learner debrief from events + learner tables only (8.1); instructor debrief as a separate function that reads `answer-key.json` only when called (8.2). |
| `run_scenario.py` | CLI: replay scenarios, write traces and summaries. |
| `compare_trace.py` | Diff a FlexSim-exported trace against a golden trace; `--self-test`. |
| `scenarios/*.json` | One scenario per acceptance check, per account where applicable. |
| `traces/` | Golden outputs of every scenario (`.events.csv`, `.events.jsonl`, `.summary.json`). |
| `tests/test_contract.py` | unittest suite covering every acceptance check in CONTRACT 7 plus separation and guided mode. |

## Run

From the repository root (or anywhere; paths are resolved from the files themselves):

```bash
# all tests
python3 -m unittest discover -s simulation/flexsim/reference/tests

# replay one or all scenarios and (re)write the golden traces
cd simulation/flexsim/reference
python3 run_scenario.py scenarios/hold_at_10_syn_001.json --out traces/
python3 run_scenario.py scenarios/*.json --out traces/

# optional instructor layer (separate file, never part of the learner output)
python3 run_scenario.py scenarios/request_prerequisites_syn_001.json --out traces/ --instructor
```

`run_scenario.py` writes `<scenario_id>.events.csv`, `<scenario_id>.events.jsonl` and
`<scenario_id>.summary.json` (final balances, order statuses, visible evidence, requests,
decisions, and the learner debrief). `--instructor` adds `<scenario_id>.debrief.instructor.json`.

### Guided mode from Python

```python
from twinaml_ref import Run
run = Run()                                   # minute 0, paused
run.request("SYN-001", "request_supporting_documents")
run.advance_to_next_event()                   # -> 8, EV-006 now visible (writes clock_advanced to_minute=8)
run.request("SYN-001", "verify_payer")        # accepted, due 28
run.advance_by(6)                             # -> 14 ("review work"); clock_advanced to_minute=14
run.advance_to_next_event()                   # -> 18; due checks at 18 wait until the clock leaves 18
run.hold("SYN-001", "Payer unverified")       # beats TX-2
run.advance_by(0)                             # target <= now: ignored, no event
run.hold("SYN-999", "x")                      # unknown customer: action_rejected, no state change
run.end()                                     # runs to 30, writes run_end (no clock_advanced)
run.visible_evidence(); run.summary(); run.events
```

Every guided advance writes the same `clock_advanced` row a scenario `advance` action writes, so
a guided run and its scenario replay produce identical traces (CONTRACT 4.7). The scenario runner's
own move to an action's `at_minute` uses `proceed_to`, which writes nothing.

## Compare a FlexSim trace with a golden trace

```bash
cd simulation/flexsim/reference
python3 compare_trace.py path/to/flexsim_export.csv traces/hold_at_10_syn_001.events.csv
python3 compare_trace.py export.csv traces/no_hold.events.csv --ignore-clock-advanced
python3 compare_trace.py --self-test        # golden vs itself, vs a corrupted copy, vs an alias/"18.0" variant
```

Exit code 0 means identical, 1 means differences (listed as `MISMATCH`, `ONLY IN GOLDEN`,
`ONLY IN ACTUAL`, `SEQ`), 2 means the files cannot be compared (missing file or column).
Tolerances: header aliases and case (`Time` -> `sim_minute`, `Event` -> `event_type`, ...),
trimmed cells, numbers compared as numbers (`18.0` == `18`) in the numeric columns **and** for the
numeric detail keys `hold_since`, `due_minute`, `to_minute`, `final_minute`, `available`
(`hold_since=18.0` == `hold_since=18`; the detail is split by the CONTRACT 5 key order, so a
number inside a reason or note is never touched and an unparseable detail is compared verbatim),
optional removal of `clock_advanced` rows from both sides with `seq` renumbered (the contract
allows this).
`--ignore-columns` exists for an export known to be incomplete; the contract requires all nine
columns, so the report says when columns were skipped. Rows are aligned on content so one
dropped or extra row is reported once instead of cascading.

The FlexSim replay must use the same `scenario_id` as the golden trace, otherwise the
`run_start` row differs (by design: it names the scenario).

## Scenarios

| Scenario | Checks (CONTRACT section) | A001 / A002 final |
| --- | --- | --- |
| `no_hold` | 7-A: both orders execute on both accounts | 10000 / 10000 |
| `hold_at_10_syn_00{1,2}` | 7-B: hold before first due blocks both; other account untouched | 480000 / 10000 (mirrored) |
| `hold_at_20_syn_00{1,2}` | 7-C: first executed, second held | 250000 / 10000 (mirrored) |
| `hold_at_18_exact_due_syn_00{1,2}` | 7-F: hold at the due minute wins (phase 2 before 3) | 480000 / 10000 (mirrored) |
| `release_after_due_syn_00{1,2}` | 7-D: release at 25, both overdue orders execute once, `trigger=release` | 10000 / 10000 |
| `release_between_due_syn_00{1,2}` | 7-D2: release at 20; TX-*3 waits for its due minute | 10000 / 10000 |
| `release_at_due_syn_00{1,2}` | 4.3: release at 18 leaves the order due at 18 to phase 3 | 10000 / 10000 |
| `duplicate_actions_syn_00{1,2}` | 7-E: repeated hold/request/release produce rejections only | 10000 / 10000 |
| `request_prerequisites_syn_00{1,2}` | 7-H: verify_payer gated on EV-006/EV-016; docs 8 then payer 20 (28); citation of unreleased record rejected | 10000 / 10000 |
| `evidence_timing_syn_00{1,2}` | all six service times; phase 1 ordering by evidence_id at minute 15 | 10000 / 10000 |
| `decision_does_not_hold_syn_00{1,2}` | 2.5: escalation is not a hold, closure is not a release | 250000 / 10000 (mirrored) |
| `decimal_minute_hold_syn_00{1,2}` | 1: decimal clock (`17.5`) formatting | 480000 / 10000 (mirrored) |
| `cross_account_isolation` | 4: SYN-001 actions leave every SYN-A002 row equal to `no_hold` | 10000 / 10000 |
| `reset` | 7-G: same as `no_hold`; the test replays it on a used `Run` after `reset()` | 10000 / 10000 |
| `rejections` | 4.5/4.6: unknown request/decision, foreign/unknown/unreleased citation, release when not held, background customer hold (an unknown `customer_id` cannot appear in a scenario: `load_scenario` refuses it; the `action_rejected` path is covered by a unit test) | 10000 / 10000 |
| `advance_log_only` | 4.7: `advance` emits `clock_advanced` and changes nothing else; the unit test replays the same clicks through the guided API and expects the identical trace | 480000 / 10000 |
| `run_until_20` | 1: run end before the second due minute; nothing released after run end | 250000 / 250000 |

The insufficient-funds branch (4.4 step 4) cannot be reached with pack data, so it is covered
by a unit test that lowers a balance directly, not by a scenario.

## Regenerating golden traces

Only regenerate after a deliberate contract change, then review the diff of `traces/` by eye
and bump the contract version in `CONTRACT.md`. The test
`GoldenTraces.test_every_scenario_reproduces_its_golden_trace` fails until the traces and the
code agree again.
