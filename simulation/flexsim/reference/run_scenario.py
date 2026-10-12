#!/usr/bin/env python3
"""Replay a scenario file and write its trace.

    python3 run_scenario.py scenarios/<name>.json --out traces/
    python3 run_scenario.py scenarios/*.json --out traces/ --instructor

Writes <scenario_id>.events.csv, <scenario_id>.events.jsonl and <scenario_id>.summary.json
(final state + learner debrief). ``--instructor`` additionally writes
<scenario_id>.debrief.instructor.json from instructor/answer-key.json; it is never part of the
learner output. Mac-tested, stdlib only.
"""

import argparse
import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from twinaml_ref import (load_tables, load_scenario, run_scenario, write_events_csv,  # noqa: E402
                         write_events_jsonl, learner_debrief, instructor_debrief)


def main(argv=None) -> int:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("scenarios", nargs="+", type=Path)
    ap.add_argument("--out", type=Path, default=Path(__file__).resolve().parent / "traces")
    ap.add_argument("--instructor", action="store_true", help="also write the instructor debrief")
    args = ap.parse_args(argv)
    args.out.mkdir(parents=True, exist_ok=True)
    tables = load_tables()
    for path in args.scenarios:
        sc = load_scenario(path, tables)
        run = run_scenario(sc, tables)
        stem = args.out / sc["scenario_id"]
        write_events_csv(run.events, stem.with_suffix(".events.csv"))
        write_events_jsonl(run.events, stem.with_suffix(".events.jsonl"))
        learner = learner_debrief(run.events, tables, run.run_until)
        summary = {**run.summary(), "description": sc.get("description", ""), "learner_debrief": learner}
        stem.with_suffix(".summary.json").write_text(json.dumps(summary, indent=2, ensure_ascii=False) + "\n",
                                                     encoding="utf-8")
        if args.instructor:
            stem.with_suffix(".debrief.instructor.json").write_text(
                json.dumps(instructor_debrief(learner, tables), indent=2, ensure_ascii=False) + "\n",
                encoding="utf-8")
        bal = {a: v["balance"] for a, v in run.summary()["accounts"].items() if a in ("SYN-A001", "SYN-A002")}
        print(f"{sc['scenario_id']}: {len(run.events)} events, final minute {run.summary()['final_minute']}, {bal}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
