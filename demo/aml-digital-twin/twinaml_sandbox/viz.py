"""Draw the ledger with pyvis so the browser can hover the same twin the rules used.

vis.js is embedded in the HTML. Pyvis also injects a Bootstrap tag from a CDN;
that tag is removed so the page can run on a VPS with no external fetch.
"""

from __future__ import annotations

import re

from pyvis.network import Network

from twinaml_sandbox.load import Bundle
from twinaml_sandbox.models import GraphCase

_STORY_COLOR = {
    "smurfing": "#C2410C",
    "circular_flow": "#0F766E",
    "mule_to_mixer": "#6D28D9",
}
_CONTEXT_COLOR = "#9F1239"
_MERCHANT_COLOR = "#94A3B8"
_ORDINARY_COLOR = "#64748B"
_DEVICE_COLOR = "#57534E"


def network_html(
    bundle: Bundle,
    cases: tuple[GraphCase, ...],
    focus: str | None = None,
) -> str:
    """Return a full HTML document for one network picture."""
    net = Network(
        height="640px",
        width="100%",
        directed=True,
        bgcolor="#F8FAFC",
        font_color="#0F172A",
        cdn_resources="in_line",
        notebook=False,
        heading="",
    )
    story_of = _story_index(cases)
    visible = _visible_ids(bundle, cases, story_of, focus)
    for account_id in sorted(visible):
        row = bundle.row_of(account_id)
        kind = str(row["kind"])
        story = story_of.get(account_id)
        color = _node_color(kind, str(row["segment"]), story, account_id, cases, focus)
        label = f"{row['name']}\n{account_id}"
        title = "<br>".join(
            [
                f"<b>{row['name']}</b>",
                f"id: {account_id}",
                f"kind: {kind}",
                f"segment: {row['segment']}",
                f"role: {row['role']}",
                f"opened: {row['opened_on'] or '—'}",
                f"city: {row['city'] or '—'}",
                f"device: {row['device_id'] or '—'}",
                f"narrative label: {row['case_label'] or '—'}",
                f"kyc note: {row['kyc_narrative'] or '—'}",
                f"network story: {story or '—'}",
            ]
        )
        size = 28 if story or kind in {"wallet", "person", "device"} else 16
        net.add_node(account_id, label=label, title=title, color=color, size=size)
    focus_txns = _focus_txns(cases, focus)
    for record in bundle.transactions.itertuples(index=False):
        source = str(record.from_account)
        target = str(record.to_account)
        if source not in visible or target not in visible:
            continue
        txn_id = str(record.txn_id)
        emphasized = focus in (None, "all") or txn_id in focus_txns
        net.add_edge(
            source,
            target,
            title=(
                f"{txn_id}<br>HKD {int(record.amount_hkd):,}<br>"
                f"{record.booked_at}<br>{record.channel}<br>{record.memo}"
            ),
            label=f"{int(record.amount_hkd):,}",
            color="#0F172A" if emphasized else "#CBD5E1",
            width=2.4 if txn_id in focus_txns else 1,
        )
    if not bundle.relationships.empty:
        for record in bundle.relationships.itertuples(index=False):
            source = str(record.from_id)
            target = str(record.to_id)
            if source not in visible or target not in visible:
                continue
            net.add_edge(
                source,
                target,
                title=f"{record.rel_type}<br>{record.note}",
                label=str(record.rel_type),
                color="#9F1239",
                dashes=True,
                width=1.4,
            )
    net.set_options(
        """
        {
          "physics": {
            "barnesHut": {"gravitationalConstant": -9000, "springLength": 160, "springConstant": 0.02},
            "stabilization": {"iterations": 180}
          },
          "edges": {
            "arrows": {"to": {"enabled": true, "scaleFactor": 0.55}},
            "font": {"size": 11, "align": "middle"},
            "smooth": {"type": "dynamic"}
          },
          "interaction": {"hover": true, "tooltipDelay": 60}
        }
        """
    )
    return _strip_remote_assets(net.generate_html(notebook=False))


def _strip_remote_assets(html: str) -> str:
    """Drop the Bootstrap CDN tags pyvis leaves in an otherwise inline page."""
    html = re.sub(
        r"<script\b[^>]*cdn\.jsdelivr\.net[^>]*>\s*</script>",
        "",
        html,
        flags=re.IGNORECASE | re.DOTALL,
    )
    html = re.sub(
        r"<link\b[^>]*cdn\.jsdelivr\.net[^>]*>",
        "",
        html,
        flags=re.IGNORECASE | re.DOTALL,
    )
    return html


def _story_index(cases: tuple[GraphCase, ...]) -> dict[str, str]:
    """Map an account to one typology. Mule wins, then circular flow, then smurfing."""
    rank = {"mule_to_mixer": 3, "circular_flow": 2, "smurfing": 1}
    chosen: dict[str, str] = {}
    for case in cases:
        for account_id in case.account_ids:
            current = chosen.get(account_id)
            if current is None or rank[case.typology] > rank[current]:
                chosen[account_id] = case.typology
    return chosen


def _visible_ids(
    bundle: Bundle,
    cases: tuple[GraphCase, ...],
    story_of: dict[str, str],
    focus: str | None,
) -> set[str]:
    if focus in (None, "all"):
        return set(bundle.accounts["account_id"].astype(str))
    visible: set[str] = set()
    for case in cases:
        if case.typology != focus:
            continue
        visible.update(case.account_ids)
        visible.update(case.context_ids)
    # Shared devices and controllers are context ids. Also pull relationship
    # endpoints already stored on those accounts so the hover picture matches.
    if not bundle.relationships.empty:
        extra: set[str] = set()
        for record in bundle.relationships.itertuples(index=False):
            source = str(record.from_id)
            target = str(record.to_id)
            if source in visible or target in visible:
                if story_of.get(source) in (None, focus) or source in visible:
                    extra.add(source)
                if story_of.get(target) in (None, focus) or target in visible:
                    extra.add(target)
        visible.update(extra)
    return visible


def _focus_txns(cases: tuple[GraphCase, ...], focus: str | None) -> set[str]:
    if focus in (None, "all"):
        return {txn_id for case in cases for txn_id in case.txn_ids}
    return {txn_id for case in cases if case.typology == focus for txn_id in case.txn_ids}


def _node_color(
    kind: str,
    segment: str,
    story: str | None,
    account_id: str,
    cases: tuple[GraphCase, ...],
    focus: str | None,
) -> str:
    in_focus = focus in (None, "all") or story == focus
    context = any(account_id in case.context_ids and (focus in (None, "all") or case.typology == focus) for case in cases)
    if story and in_focus:
        return _STORY_COLOR[story]
    if context:
        return _CONTEXT_COLOR
    if kind == "device":
        return _DEVICE_COLOR
    if segment in {"merchant", "employer"} or kind == "wallet":
        return _MERCHANT_COLOR if kind != "wallet" else _STORY_COLOR["mule_to_mixer"]
    return _ORDINARY_COLOR
