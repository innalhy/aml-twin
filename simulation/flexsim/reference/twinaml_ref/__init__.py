"""TwinAML FlexSim-edition reference harness (contract 1.0).

A small, deterministic, stdlib-only executable form of ``../CONTRACT.md``. It is a
verification tool for diffing FlexSim traces, not a second production backend.
"""

from .engine import Run, SNAPSHOT_AT, PACK_ID, CONTRACT_VERSION, fmt_minute
from .tables import Tables, load_tables
from .scenario import load_scenario, run_scenario
from .trace import write_events_csv, write_events_jsonl, EVENT_COLUMNS
from .debrief import learner_debrief, instructor_debrief

__all__ = [
    "Run", "Tables", "load_tables", "load_scenario", "run_scenario",
    "write_events_csv", "write_events_jsonl", "EVENT_COLUMNS",
    "learner_debrief", "instructor_debrief",
    "SNAPSHOT_AT", "PACK_ID", "CONTRACT_VERSION", "fmt_minute",
]
