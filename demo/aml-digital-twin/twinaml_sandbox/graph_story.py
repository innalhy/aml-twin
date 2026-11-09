"""Network reading of the same ledger the amount rule sees.

Three structural tests, and nothing that reads ``planted_typology``, ``role``,
``case_label``, or ``kyc_narrative`` in order to decide:

* smurfing — many payers, each slice inside the fixed band under the starting
  line, landing on one account inside 72 hours
* circular flow — a directed loop of three or four payments, each at least
  HKD 5,000, closed inside 72 hours
* mule to mixer — a path of at most four hops that reaches a wallet on the
  sandbox watchlist, with every account in the middle a pass-through

A pass-through account received at least HKD 15,000 and then sent out at
least 75 percent of that money, with the last outbound payment no later than
36 hours after the first inbound payment. Merchant and employer segments are
left out of the pass-through test and out of the smurf receiver test, because
those segments are expected to take payments in the ordinary book.

``case_label`` and ``kyc_narrative`` are copied onto the finished case so the
screen can show the course crosswalk. They do not decide the case.
"""

from __future__ import annotations

from datetime import timedelta

import networkx as nx
import pandas as pd

from twinaml_sandbox.constants import (
    BASELINE_THRESHOLD_HKD,
    CYCLE_MAX_LEN,
    CYCLE_MIN_AMOUNT_HKD,
    CYCLE_MIN_LEN,
    CYCLE_WINDOW_HOURS,
    MULE_MAX_HOPS,
    PASS_THROUGH_HOURS,
    PASS_THROUGH_MIN_INBOUND_HKD,
    PASS_THROUGH_RATIO,
    SMURF_MIN_PAYERS,
    SMURF_MIN_SUM_HKD,
    SMURF_SLICE_MAX_HKD,
    SMURF_SLICE_MIN_HKD,
    SMURF_WINDOW_HOURS,
)
from twinaml_sandbox.load import Bundle, LedgerError
from twinaml_sandbox.models import GraphCase
from twinaml_sandbox.rules import stamp

_PATH_CAP = 500

_EXCLUDED_SEGMENTS = frozenset({"merchant", "employer"})


def graph_cases(bundle: Bundle) -> tuple[GraphCase, ...]:
    """Return the linked stories in a stable order: smurf, cycle, mule."""
    cases: list[GraphCase] = []
    cases.extend(_smurf_cases(bundle))
    cases.extend(_cycle_cases(bundle))
    cases.extend(_mule_cases(bundle))
    return tuple(cases)


def _smurf_cases(bundle: Bundle) -> list[GraphCase]:
    accounts = bundle.accounts
    eligible = set(
        accounts.loc[
            (accounts["kind"] == "bank_account")
            & ~accounts["segment"].isin(_EXCLUDED_SEGMENTS),
            "account_id",
        ].astype(str)
    )
    band = bundle.transactions.loc[
        (bundle.transactions["amount_hkd"] >= SMURF_SLICE_MIN_HKD)
        & (bundle.transactions["amount_hkd"] < SMURF_SLICE_MAX_HKD)
    ]
    found: list[GraphCase] = []
    for receiver, group in band.groupby("to_account", sort=True):
        if str(receiver) not in eligible:
            continue
        window = _best_smurf_window(group)
        if window is None:
            continue
        window = window.sort_values(["booked_at", "txn_id"], kind="mergesort")
        txn_ids = tuple(str(txn_id) for txn_id in window["txn_id"])
        payers = tuple(dict.fromkeys(str(payer) for payer in window["from_account"]))
        total = int(window["amount_hkd"].sum())
        hub = str(receiver)
        account_ids = tuple(dict.fromkeys((hub, *payers)))
        device_sentence = _shared_device_sentence(bundle, payers)
        start = stamp(window["booked_at"].iloc[0])
        end = stamp(window["booked_at"].iloc[-1])
        why = (
            f"{len(payers)} accounts paid {bundle.name_of(hub)} ({hub}) between {start} and {end}. "
            f"Each payment is at least HKD {SMURF_SLICE_MIN_HKD:,} and under "
            f"HKD {SMURF_SLICE_MAX_HKD:,}, so each one sits below the starting amount line of "
            f"HKD {BASELINE_THRESHOLD_HKD:,}. Together they are HKD {total:,}. "
            f"{device_sentence} "
            "A single-payment rule never adds these rows together. "
            "This case is smurfing: many slices kept under a line. "
            "In this sandbox that line is a classroom dial."
        )
        found.append(
            _finish(
                bundle,
                case_id=f"G-SMURF-{hub}",
                typology="smurfing",
                title=f"Smurfing into {bundle.name_of(hub)} ({hub})",
                why=why,
                account_ids=account_ids,
                txn_ids=txn_ids,
                amount_hkd=total,
                context_ids=_device_context(bundle, payers),
            )
        )
    return found


def _best_smurf_window(group: pd.DataFrame) -> pd.DataFrame | None:
    rows = list(group.sort_values(["booked_at", "txn_id"], kind="mergesort").itertuples(index=False))
    best: list[object] | None = None
    best_total = -1
    window_limit = timedelta(hours=SMURF_WINDOW_HOURS)
    for start in range(len(rows)):
        window: list[object] = []
        for row in rows[start:]:
            if row.booked_at - rows[start].booked_at <= window_limit:
                window.append(row)
            else:
                break
        payers = {row.from_account for row in window}
        total = sum(int(row.amount_hkd) for row in window)
        if len(payers) >= SMURF_MIN_PAYERS and total >= SMURF_MIN_SUM_HKD and total > best_total:
            best = window
            best_total = total
    if best is None:
        return None
    return pd.DataFrame([row._asdict() for row in best])


def _cycle_cases(bundle: Bundle) -> list[GraphCase]:
    graph = nx.DiGraph()
    eligible = bundle.transactions.loc[
        bundle.transactions["amount_hkd"] >= CYCLE_MIN_AMOUNT_HKD
    ]
    for row in eligible.itertuples(index=False):
        source = str(row.from_account)
        target = str(row.to_account)
        payload = {
            "txn_id": str(row.txn_id),
            "amount_hkd": int(row.amount_hkd),
            "booked_at": row.booked_at,
            "memo": str(row.memo),
        }
        if graph.has_edge(source, target):
            graph[source][target]["txns"].append(payload)
        else:
            graph.add_edge(source, target, txns=[payload])

    seen: set[tuple[str, ...]] = set()
    pending: list[dict[str, object]] = []
    window_limit = timedelta(hours=CYCLE_WINDOW_HOURS)
    for cycle in nx.simple_cycles(graph):
        if not (CYCLE_MIN_LEN <= len(cycle) <= CYCLE_MAX_LEN):
            continue
        key = _cycle_key(tuple(cycle))
        if key in seen:
            continue
        ordered = list(key)
        hops = []
        times = []
        for source, target in zip(ordered, ordered[1:] + ordered[:1], strict=True):
            txns = graph[source][target]["txns"]
            hop = min(txns, key=lambda item: (item["booked_at"], item["txn_id"]))
            hops.append(hop)
            times.append(hop["booked_at"])
        if max(times) - min(times) > window_limit:
            continue
        seen.add(key)
        pending.append({"key": key, "ordered": ordered, "hops": hops, "times": times})
    pending.sort(key=lambda item: item["key"])
    found: list[GraphCase] = []
    for index, item in enumerate(pending, start=1):
        ordered = item["ordered"]
        hops = item["hops"]
        times = item["times"]
        txn_ids = tuple(hop["txn_id"] for hop in hops)
        total = sum(int(hop["amount_hkd"]) for hop in hops)
        amounts = ", ".join(f"HKD {int(hop['amount_hkd']):,}" for hop in hops)
        memos = ", ".join(sorted({hop["memo"] for hop in hops if hop["memo"]})) or "blank"
        chain = " → ".join(ordered + [ordered[0]])
        names = " → ".join(f"{bundle.name_of(node)} ({node})" for node in ordered)
        why = (
            f"These accounts pay in a loop: {names}. The hops are {chain}. "
            f"The payments fall between {stamp(min(times))} and {stamp(max(times))}. "
            f"The hop amounts are {amounts}. The memos are {memos}. "
            f"The amount rule lists {len(hops)} separate payments. "
            "This case keeps the loop as one circular flow. "
            "Narrative labels stored on the accounts are shown with the case. "
            "The loop test does not read those labels."
        )
        found.append(
            _finish(
                bundle,
                case_id=f"G-CYCLE-{index}",
                typology="circular_flow",
                title=f"Circular flow {chain}",
                why=why,
                account_ids=tuple(ordered),
                txn_ids=txn_ids,
                amount_hkd=total,
                context_ids=(),
            )
        )
    return found


def _mule_cases(bundle: Bundle) -> list[GraphCase]:
    if bundle.wallets.empty:
        return []
    pass_through = _pass_through_ids(bundle)
    graph = _payment_graph(bundle.transactions)
    found: list[GraphCase] = []
    for mixer in sorted(bundle.wallets["account_id"].astype(str)):
        if mixer not in graph:
            continue
        nodes: set[str] = set()
        txn_ids: list[str] = []
        reverse = graph.reverse(copy=False)
        reachable = nx.single_source_shortest_path_length(reverse, mixer, cutoff=MULE_MAX_HOPS)
        examined = 0
        for source in sorted(node for node in reachable if node != mixer):
            for path in nx.all_simple_paths(graph, source, mixer, cutoff=MULE_MAX_HOPS):
                examined += 1
                if examined > _PATH_CAP:
                    raise LedgerError(
                        "The mule-path search stopped after "
                        f"{_PATH_CAP} paths. Use a smaller ledger."
                    )
                internals = path[1:-1]
                if not all(node in pass_through for node in internals):
                    continue
                nodes.update(path)
                for origin, dest in zip(path, path[1:]):
                    for payload in graph[origin][dest]["txns"]:
                        txn_ids.append(payload["txn_id"])
        if not nodes:
            continue
        unique_txns = tuple(dict.fromkeys(txn_ids))
        amount_lookup = bundle.transactions.set_index("txn_id")["amount_hkd"]
        total = int(sum(int(amount_lookup.loc[txn_id]) for txn_id in unique_txns))
        ordered_accounts = tuple(sorted(nodes))
        wallet_row = bundle.wallets.loc[bundle.wallets["account_id"] == mixer].iloc[0]
        list_name = str(wallet_row["list_name"])
        names = ", ".join(f"{bundle.name_of(node)} ({node})" for node in ordered_accounts)
        context = _control_context(bundle, nodes)
        control_sentence = _control_sentence(bundle, context)
        why = (
            f"Payments reach {bundle.name_of(mixer)} ({mixer}), which is on the sandbox "
            f"watchlist {list_name}. A path is kept when it is at most {MULE_MAX_HOPS} hops "
            f"and every account in the middle is a pass-through. A pass-through received at "
            f"least HKD {PASS_THROUGH_MIN_INBOUND_HKD:,} and sent on at least "
            f"{PASS_THROUGH_RATIO:.0%} of that money, with the last outbound payment no later "
            f"than {PASS_THROUGH_HOURS} hours after the first inbound payment. "
            f"Accounts on the path: {names}. {control_sentence}"
            "KYC notes stored on those accounts are shown with the case. "
            "The path test does not read the notes, and it does not read the role column."
        )
        found.append(
            _finish(
                bundle,
                case_id=f"G-MULE-{mixer}",
                typology="mule_to_mixer",
                title=f"Pass-through path into {bundle.name_of(mixer)} ({mixer})",
                why=why,
                account_ids=ordered_accounts,
                txn_ids=unique_txns,
                amount_hkd=total,
                context_ids=context,
            )
        )
    return found


def _pass_through_ids(bundle: Bundle) -> set[str]:
    accounts = bundle.accounts.set_index("account_id", drop=False)
    found: set[str] = set()
    limit = timedelta(hours=PASS_THROUGH_HOURS)
    for account_id, account in accounts.iterrows():
        if account["kind"] != "bank_account":
            continue
        if account["segment"] in _EXCLUDED_SEGMENTS:
            continue
        inbound = bundle.transactions.loc[bundle.transactions["to_account"] == account_id]
        outbound = bundle.transactions.loc[bundle.transactions["from_account"] == account_id]
        if inbound.empty or outbound.empty:
            continue
        inbound_sum = int(inbound["amount_hkd"].sum())
        outbound_sum = int(outbound["amount_hkd"].sum())
        if inbound_sum < PASS_THROUGH_MIN_INBOUND_HKD:
            continue
        if outbound_sum < PASS_THROUGH_RATIO * inbound_sum:
            continue
        first_in = inbound["booked_at"].min()
        last_out = outbound["booked_at"].max()
        if last_out < first_in or last_out - first_in > limit:
            continue
        found.add(str(account_id))
    return found


def _payment_graph(transactions: pd.DataFrame) -> nx.DiGraph:
    graph = nx.DiGraph()
    for row in transactions.itertuples(index=False):
        source = str(row.from_account)
        target = str(row.to_account)
        payload = {"txn_id": str(row.txn_id), "amount_hkd": int(row.amount_hkd)}
        if graph.has_edge(source, target):
            graph[source][target]["txns"].append(payload)
        else:
            graph.add_edge(source, target, txns=[payload])
    return graph


def _finish(
    bundle: Bundle,
    *,
    case_id: str,
    typology: str,
    title: str,
    why: str,
    account_ids: tuple[str, ...],
    txn_ids: tuple[str, ...],
    amount_hkd: int,
    context_ids: tuple[str, ...],
) -> GraphCase:
    labels: list[str] = []
    notes: list[str] = []
    for account_id in account_ids:
        row = bundle.row_of(account_id)
        label = str(row["case_label"]).strip()
        note = str(row["kyc_narrative"]).strip()
        if label and label not in labels:
            labels.append(label)
        if note and note not in notes:
            notes.append(f"{bundle.name_of(account_id)}: {note}")
    return GraphCase(
        case_id=case_id,
        typology=typology,
        title=title,
        why=why,
        account_ids=account_ids,
        txn_ids=txn_ids,
        amount_hkd=amount_hkd,
        narrative_labels=tuple(labels),
        kyc_notes=tuple(notes),
        context_ids=context_ids,
    )


def _shared_device_sentence(bundle: Bundle, payers: tuple[str, ...]) -> str:
    devices = []
    for payer in payers:
        device = str(bundle.row_of(payer)["device_id"]).strip()
        if device:
            devices.append(device)
    if len(devices) < 2:
        return "The payment pattern is enough for this case."
    unique = set(devices)
    if len(unique) == 1 and len(devices) == len(payers):
        device_id = next(iter(unique))
        return f"The senders share device {device_id}."
    return "The payment pattern is enough for this case."


def _device_context(bundle: Bundle, payers: tuple[str, ...]) -> tuple[str, ...]:
    devices = {
        str(bundle.row_of(payer)["device_id"]).strip()
        for payer in payers
        if str(bundle.row_of(payer)["device_id"]).strip()
    }
    known = set(bundle.accounts["account_id"].astype(str))
    shared = [
        device
        for device in sorted(devices)
        if device in known and sum(
            str(bundle.row_of(payer)["device_id"]).strip() == device for payer in payers
        )
        >= 2
    ]
    return tuple(shared)


def _control_context(bundle: Bundle, nodes: set[str]) -> tuple[str, ...]:
    if bundle.relationships.empty:
        return ()
    controls = bundle.relationships.loc[bundle.relationships["rel_type"] == "CONTROLS"]
    controllers = sorted(
        {
            str(row.from_id)
            for row in controls.itertuples(index=False)
            if str(row.to_id) in nodes
        }
    )
    return tuple(controllers)


def _control_sentence(bundle: Bundle, controllers: tuple[str, ...]) -> str:
    if not controllers:
        return ""
    names = ", ".join(f"{bundle.name_of(item)} ({item})" for item in controllers)
    return (
        f"A CONTROLS link in the relationship file points from {names} to accounts on this path. "
        "That link is not a payment. "
    )


def _cycle_key(nodes: tuple[str, ...]) -> tuple[str, ...]:
    rotations = [nodes[index:] + nodes[:index] for index in range(len(nodes))]
    return min(rotations)
