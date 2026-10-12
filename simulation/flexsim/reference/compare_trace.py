#!/usr/bin/env python3
"""Diff a FlexSim-exported events CSV against a golden trace (CONTRACT section 5).

    python3 compare_trace.py <actual.csv> <golden.csv> [--ignore-clock-advanced]
                             [--ignore-columns detail,ref_id] [--max-diffs 20]
    python3 compare_trace.py --self-test [golden.csv]

Tolerances (all deliberate, none hide a contract difference):
  * header names are matched case-insensitively after trimming; spaces and dashes become
    underscores; common aliases are accepted (time/minute -> sim_minute, event -> event_type,
    ref -> ref_id, balance -> balance_after, sequence -> seq, customer -> customer_id,
    account -> account_id);
  * every cell is trimmed; numeric columns (seq, sim_minute, amount, balance_after) are
    compared as numbers so FlexSim's "18.0" equals the contract's "18";
  * inside `detail`, the numeric values of the known keys hold_since, due_minute, to_minute,
    final_minute and available are normalised the same way (hold_since=18.0 == hold_since=18).
    The detail is split by the fixed key order of CONTRACT 5 (free text last, verbatim), so a
    number inside a reason or note is never touched; a detail that does not parse is compared
    as a plain string;
  * --ignore-clock-advanced drops those rows from BOTH traces and renumbers seq (the
    contract allows this; default off);
  * --ignore-columns skips the named columns; the contract requires all nine, so this is only
    for an export known to be incomplete and the report says which columns were skipped.
Exit code 0 = identical, 1 = differences, 2 = cannot compare (missing file/column).
Mac-tested; stdlib only.
"""

import argparse
import csv
import sys
from pathlib import Path
from typing import Dict, List, Optional, Tuple

sys.path.insert(0, str(Path(__file__).resolve().parent))
from twinaml_ref.trace import parse_detail, DETAIL_KEYS, NUMERIC_DETAIL_KEYS  # noqa: E402

COLUMNS = ["seq", "sim_minute", "customer_id", "account_id", "event_type", "ref_id",
           "amount", "balance_after", "detail"]
NUMERIC = {"seq", "sim_minute", "amount", "balance_after"}
ALIASES = {"time": "sim_minute", "minute": "sim_minute", "sim_time": "sim_minute", "minutes": "sim_minute",
           "event": "event_type", "type": "event_type", "ref": "ref_id", "reference": "ref_id",
           "balance": "balance_after", "sequence": "seq", "customer": "customer_id",
           "account": "account_id", "details": "detail"}


def canon_header(name: str) -> str:
    n = name.strip().lower().replace(" ", "_").replace("-", "_")
    return ALIASES.get(n, n)


def norm_number(v: str) -> str:
    try:
        f = float(v)
        return str(int(f)) if f.is_integer() else repr(f)
    except ValueError:
        return v


def norm_cell(col: str, value: Optional[str]) -> str:
    v = (value or "").strip()
    if col in NUMERIC and v != "":
        return norm_number(v)
    return v


def norm_detail(event_type: str, detail: str) -> str:
    """Normalise the numeric detail values of known keys (CONTRACT 5 grammar); otherwise verbatim."""
    try:
        kv = parse_detail(event_type, detail)
    except ValueError:
        return detail
    return ";".join(f"{k}={norm_number(v) if k in NUMERIC_DETAIL_KEYS else v}"
                    for k, v in kv.items())


def load(path: Path, ignore_clock: bool, ignore_cols: set) -> Tuple[List[Dict[str, str]], List[str]]:
    with open(path, newline="", encoding="utf-8-sig") as fh:
        reader = csv.reader(fh)
        header = next(reader, None)
        if header is None:
            raise SystemExit(f"cannot compare: {path} is empty")
        mapping = {i: canon_header(h) for i, h in enumerate(header)}
        present = set(mapping.values())
        missing = [c for c in COLUMNS if c not in present and c not in ignore_cols]
        rows = []
        for raw in reader:
            if not any(cell.strip() for cell in raw):
                continue
            row = {mapping[i]: raw[i] for i in range(min(len(raw), len(header)))}
            out = {c: norm_cell(c, row.get(c)) for c in COLUMNS if c not in ignore_cols}
            if "detail" in out:
                out["detail"] = norm_detail(out.get("event_type", row.get("event_type", "")), out["detail"])
            rows.append(out)
    if ignore_clock:
        rows = [r for r in rows if r.get("event_type") != "clock_advanced"]
        if "seq" not in ignore_cols:
            for i, r in enumerate(rows, 1):
                r["seq"] = str(i)
    return rows, missing


def compare(actual: Path, golden: Path, ignore_clock=False, ignore_cols=frozenset(),
            max_diffs=20) -> Tuple[bool, List[str]]:
    """Align the two traces on their content (seq excluded) so one dropped or extra row is
    reported once instead of shifting every later row; then diff aligned rows column by column."""
    import difflib
    ignore_cols = set(ignore_cols)
    a_rows, a_missing = load(actual, ignore_clock, ignore_cols)
    g_rows, g_missing = load(golden, ignore_clock, ignore_cols)
    if g_missing:
        raise SystemExit(f"cannot compare: golden {golden} lacks columns {g_missing}")
    if a_missing:
        raise SystemExit(f"cannot compare: {actual} lacks columns {a_missing}; "
                         f"use --ignore-columns {','.join(a_missing)} only if that export is known to be incomplete")
    lines = []
    if ignore_cols:
        lines.append(f"note: ignoring columns {sorted(ignore_cols)}")
    if ignore_clock:
        lines.append("note: clock_advanced rows dropped from both traces, seq renumbered")
    cols = [c for c in COLUMNS if c not in ignore_cols]
    content = [c for c in cols if c != "seq"]
    key = lambda r: tuple(r.get(c, "") for c in content)
    describe = lambda r: f"seq {r.get('seq')} minute {r.get('sim_minute')} {r.get('event_type')} {r.get('ref_id')} {r.get('detail')}"
    diffs = 0
    def note(line):
        nonlocal diffs
        diffs += 1
        if diffs <= max_diffs:
            lines.append(line)
    sm = difflib.SequenceMatcher(None, [key(r) for r in g_rows], [key(r) for r in a_rows], autojunk=False)
    for op, g1, g2, a1, a2 in sm.get_opcodes():
        if op == "equal":
            for g, a in zip(g_rows[g1:g2], a_rows[a1:a2]):
                if "seq" in cols and g["seq"] != a["seq"]:
                    note(f"SEQ: golden seq {g['seq']} is actual seq {a['seq']} ({g.get('event_type')} at minute {g.get('sim_minute')})")
        elif op == "replace":
            for g, a in zip(g_rows[g1:g2], a_rows[a1:a2]):
                bad = [c for c in cols if g.get(c, "") != a.get(c, "")]
                note(f"MISMATCH golden seq {g.get('seq')} (minute {g.get('sim_minute')}, {g.get('event_type')} {g.get('ref_id')}): "
                     + "; ".join(f"{c}: golden={g.get(c, '')!r} actual={a.get(c, '')!r}" for c in bad))
            for g in g_rows[g1 + (a2 - a1):g2]:
                note("ONLY IN GOLDEN: " + describe(g))
            for a in a_rows[a1 + (g2 - g1):a2]:
                note("ONLY IN ACTUAL: " + describe(a))
        elif op == "delete":
            for g in g_rows[g1:g2]:
                note("ONLY IN GOLDEN: " + describe(g))
        elif op == "insert":
            for a in a_rows[a1:a2]:
                note("ONLY IN ACTUAL: " + describe(a))
    if len(a_rows) != len(g_rows):
        lines.append(f"ROW COUNT: golden has {len(g_rows)} rows, actual has {len(a_rows)}")
    if diffs > max_diffs:
        lines.append(f"... {diffs - max_diffs} more differences not shown")
    ok = diffs == 0
    lines.append(f"OK: {len(g_rows)} rows identical" if ok else f"FAIL: {diffs} difference(s)")
    return ok, lines


def self_test(golden: Optional[Path]) -> int:
    import tempfile
    golden = golden or (Path(__file__).resolve().parent / "traces" / "release_after_due_syn_001.events.csv")
    if not golden.exists():
        print(f"self-test needs a golden trace; {golden} not found (run run_scenario.py first)")
        return 2
    ok_same, lines = compare(golden, golden)
    print(f"[1] golden vs itself: {lines[-1]}")
    with open(golden, newline="", encoding="utf-8") as fh:
        rows = list(csv.DictReader(fh))
    corrupt = [dict(r) for r in rows]
    executed = [r for r in corrupt if r["event_type"] == "order_executed"]
    executed[0]["balance_after"] = str(int(executed[0]["balance_after"]) - 1)        # wrong balance
    executed[-1]["detail"] = executed[-1]["detail"].replace("trigger=release", "trigger=due")  # wrong trigger
    corrupt.pop(-1)                                                                      # dropped run_end row
    with tempfile.TemporaryDirectory() as td:
        bad = Path(td) / "corrupt.csv"
        with open(bad, "w", newline="", encoding="utf-8") as fh:
            w = csv.DictWriter(fh, fieldnames=["Seq", "Time", "Customer", "Account", "Event", "Ref", "Amount", "Balance", "Detail"], lineterminator="\n")
            w.writeheader()
            for r in corrupt:
                w.writerow({"Seq": r["seq"], "Time": r["sim_minute"] + ".0", "Customer": r["customer_id"], "Account": r["account_id"],
                            "Event": r["event_type"], "Ref": r["ref_id"], "Amount": r["amount"], "Balance": r["balance_after"], "Detail": r["detail"]})
        ok_bad, lines_bad = compare(bad, golden)
        # also prove alias/number tolerance alone does not create false mismatches
        tol = Path(td) / "tolerant.csv"
        with open(tol, "w", newline="", encoding="utf-8") as fh:
            w = csv.DictWriter(fh, fieldnames=["Seq", "Time", "Customer", "Account", "Event", "Ref", "Amount", "Balance", "Detail"], lineterminator="\n")
            w.writeheader()
            for r in rows:
                detail = r["detail"]
                if DETAIL_KEYS.get(r["event_type"], ("",))[-1] in NUMERIC_DETAIL_KEYS and detail[-1:].isdigit():
                    detail += ".0"          # hold_since=10.0, final_minute=30.0, ...
                w.writerow({"Seq": r["seq"], "Time": r["sim_minute"] + ".0", "Customer": r["customer_id"], "Account": " " + r["account_id"],
                            "Event": r["event_type"], "Ref": r["ref_id"], "Amount": (r["amount"] + ".0") if r["amount"] else "", "Balance": r["balance_after"], "Detail": detail})
        ok_tol, lines_tol = compare(tol, golden)
    print("[2] golden vs corrupted copy (expect mismatches):")
    for ln in lines_bad:
        print("    " + ln)
    print(f"[3] golden vs alias/'18.0'/whitespace/'hold_since=10.0' variant: {lines_tol[-1]}")
    # free text is never normalised: a number-like tail inside a reason stays as written
    free = norm_detail("hold_placed", "reason=review step 2; due_minute=18.0")
    ok_free = free == "reason=review step 2; due_minute=18.0"
    print(f"[4] free text with ';' and '=' left verbatim: {'OK' if ok_free else 'FAIL: ' + free}")
    passed = ok_same and (not ok_bad) and ok_tol and ok_free
    print("SELF-TEST PASS" if passed else "SELF-TEST FAIL")
    return 0 if passed else 1


def main(argv=None) -> int:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("actual", nargs="?", type=Path)
    ap.add_argument("golden", nargs="?", type=Path)
    ap.add_argument("--ignore-clock-advanced", action="store_true")
    ap.add_argument("--ignore-columns", default="", help="comma-separated column names to skip")
    ap.add_argument("--max-diffs", type=int, default=20)
    ap.add_argument("--self-test", action="store_true")
    args = ap.parse_args(argv)
    if args.self_test:
        return self_test(args.actual)
    if not (args.actual and args.golden):
        ap.print_usage()
        return 2
    for p in (args.actual, args.golden):
        if not p.exists():
            print(f"cannot compare: {p} not found")
            return 2
    ignore = {canon_header(c) for c in args.ignore_columns.split(",") if c.strip()}
    ok, lines = compare(args.actual, args.golden, args.ignore_clock_advanced, ignore, args.max_diffs)
    print("\n".join(lines))
    return 0 if ok else 1


if __name__ == "__main__":
    sys.exit(main())
