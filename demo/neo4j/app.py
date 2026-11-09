"""Streamlit face for the TwinAML behavioral sandbox.

Run from this folder:

    streamlit run app.py

The page reads the bundled CSV files. Neo4j is optional and stays off until
someone asks for a ping from the Neo4j tab.
"""

from __future__ import annotations

import pandas as pd
import streamlit as st

from twinaml_sandbox.constants import (
    BASELINE_THRESHOLD_HKD,
    DEFAULT_THRESHOLD_HKD,
    SLIDER_MAX_HKD,
    SLIDER_MIN_HKD,
    SLIDER_STEP_HKD,
)
from twinaml_sandbox.load import (
    Bundle,
    LedgerError,
    assemble,
    empty_relationships,
    empty_wallets,
    load_bundled,
)
from twinaml_sandbox.neo4j_link import Neo4jConfigError, ping, read_typology_counts, settings_from_env
from twinaml_sandbox.report import (
    alerts_frame,
    cases_frame,
    hidden_from_rule,
    isolated_rule_count,
    run_report,
)
from twinaml_sandbox.viz import network_html

_PLANTED_TO_STORY = {
    "smurfing": "smurfing",
    "circular": "circular_flow",
    "mule_in": "mule_to_mixer",
    "mule_hop": "mule_to_mixer",
    "deepfake_in": "mule_to_mixer",
    "deepfake_out": "mule_to_mixer",
}

_FOCUS = {
    "Whole ledger": "all",
    "Smurfing": "smurfing",
    "Circular flow": "circular_flow",
    "Mule to mixer": "mule_to_mixer",
}


def main() -> None:
    st.set_page_config(
        page_title="TwinAML behavioral sandbox",
        page_icon="◎",
        layout="wide",
    )
    st.title("TwinAML behavioral sandbox")
    st.caption(
        "A one-week classroom twin of a synthetic Hong Kong ledger. "
        "Move the amount line, then read the same payments as a network."
    )
    bundle = _sidebar()
    if bundle is None:
        return
    threshold = int(st.session_state["threshold_hkd"])
    try:
        report = run_report(bundle, threshold)
    except LedgerError as exc:
        st.error(str(exc))
        return
    _remember(threshold, report.rule_count, report.graph_count)

    briefing, alerts, network, ledger, bloom = st.tabs(
        ["Briefing", "Alerts", "Network", "Ledger", "Neo4j Bloom"]
    )
    with briefing:
        _briefing(bundle, report)
    with alerts:
        _alerts(bundle, report)
    with network:
        _network(bundle, report)
    with ledger:
        _ledger(bundle)
    with bloom:
        _bloom()


def _sidebar() -> Bundle | None:
    st.sidebar.header("Experiment")
    st.sidebar.write(
        "The amount line is a classroom dial in Hong Kong dollars. "
        "It is not a statutory reporting threshold."
    )
    source = st.sidebar.radio(
        "Ledger",
        ["Bundled synthetic week", "Upload CSV"],
        index=0,
    )
    if "threshold_hkd" not in st.session_state:
        st.session_state["threshold_hkd"] = DEFAULT_THRESHOLD_HKD
    if st.sidebar.button("Reset line to 10,000"):
        st.session_state["threshold_hkd"] = DEFAULT_THRESHOLD_HKD
    st.sidebar.slider(
        "Amount line (HKD)",
        min_value=SLIDER_MIN_HKD,
        max_value=SLIDER_MAX_HKD,
        step=SLIDER_STEP_HKD,
        key="threshold_hkd",
        help="Start at 10,000. Move to 5,000 to see the rule queue grow.",
    )
    st.sidebar.checkbox(
        "Show facilitator answer key",
        key="show_key",
        help="Shows the typology the scenario author planted in the CSV.",
    )
    st.sidebar.divider()
    st.sidebar.markdown(
        f"Baseline used for **Before**: HKD {BASELINE_THRESHOLD_HKD:,}. "
        "The network cases do not move when this slider moves."
    )
    if source == "Bundled synthetic week":
        try:
            return load_bundled()
        except LedgerError as exc:
            st.error(str(exc))
            return None
    return _uploaded_bundle()


def _uploaded_bundle() -> Bundle | None:
    st.sidebar.caption("Use the same columns as the files in `data/`.")
    accounts_file = st.sidebar.file_uploader("accounts.csv", type="csv")
    transactions_file = st.sidebar.file_uploader("transactions.csv", type="csv")
    relationships_file = st.sidebar.file_uploader("relationships.csv (optional)", type="csv")
    wallets_file = st.sidebar.file_uploader("reference_wallets.csv (optional)", type="csv")
    if accounts_file is None or transactions_file is None:
        st.info("Upload accounts.csv and transactions.csv, or switch back to the bundled week.")
        return None
    try:
        accounts = _read_upload(accounts_file)
        transactions = _read_upload(transactions_file)
        relationships = (
            _read_upload(relationships_file) if relationships_file is not None else empty_relationships()
        )
        wallets = _read_upload(wallets_file) if wallets_file is not None else empty_wallets()
        return assemble(
            accounts=accounts,
            transactions=transactions,
            relationships=relationships,
            wallets=wallets,
            source_name="uploaded CSV",
        )
    except LedgerError as exc:
        st.error(str(exc))
        return None


def _read_upload(upload: object) -> pd.DataFrame:
    return pd.read_csv(upload, dtype=str, keep_default_na=False)


def _remember(threshold: int, rule_count: int, graph_count: int) -> None:
    thread = st.session_state.setdefault("thread", [])
    if thread and thread[-1]["amount_line_hkd"] == threshold:
        thread[-1]["rule_alerts"] = rule_count
        thread[-1]["graph_cases"] = graph_count
        return
    thread.append(
        {
            "step": len(thread) + 1,
            "amount_line_hkd": threshold,
            "rule_alerts": rule_count,
            "graph_cases": graph_count,
        }
    )
    st.session_state["thread"] = thread[-12:]


def _briefing(bundle: Bundle, report: object) -> None:
    st.info(
        "Synthetic virtual bank for COMP3424. Every customer, account, and payment "
        "was written for this demo. This page does not connect to a live bank, and "
        "it does not file a report. The digital twin here is this controlled ledger, "
        "used to test detection logic."
    )
    hidden_smurf = hidden_from_rule(report, "smurfing")
    isolated = isolated_rule_count(report)
    first, second, third, fourth = st.columns(4)
    first.metric("Before: rule alerts", report.baseline_count, help=f"Amount line HKD {report.baseline_hkd:,}")
    second.metric(
        "After: rule alerts",
        report.rule_count,
        delta=report.rule_count - report.baseline_count,
        help=f"Amount line HKD {report.threshold_hkd:,}",
    )
    third.metric("Graph-linked cases", report.graph_count, delta=0)
    fourth.metric("Rule alerts outside every case", isolated)
    st.write(
        f"Source: **{bundle.source_name}**. "
        f"Payments in the smurfing case that the current amount line does not list: **{hidden_smurf}**."
    )
    chart = pd.DataFrame(
        {
            "Rule-only alerts": [report.baseline_count, report.rule_count],
            "Graph-linked cases": [report.graph_count, report.graph_count],
        },
        index=[
            f"Before HKD {report.baseline_hkd:,}",
            f"After HKD {report.threshold_hkd:,}",
        ],
    )
    st.bar_chart(chart)
    st.subheader("How to read the two columns")
    st.markdown(
        """
**Before** is the amount rule at HKD 10,000. One payment becomes one alert when
the amount is at or above the line. Payroll, office rent, a jewellery-export
memo, each hop of a loop, and each hop toward the mixer can sit in that same
queue. The rule does not know they are different stories.

**After** is the same rule at the line you set in the sidebar. Lowering the
line adds rows. It does not link them.

**Graph-linked cases** read the ledger as a network. On the bundled week there
are three cases, and that count stays put while you move the line:

1. **Smurfing** — many payments under the starting line, into one account, in a short window. Smurfing means the slices stay under a line on purpose. The line here is the classroom dial.
2. **Circular flow** — the money comes back. A circular flow is a loop with no merchant on it. The amount rule already lists each hop; the case keeps the loop together. The narrative label `triad-cashflow-001` points at the course script about flows with no commercial purpose.
3. **Mule to mixer** — funds arrive and most of them leave the same day, ending at a wallet on the sandbox watchlist. A mule account moves someone else's funds. A mixer, here, is that pooling wallet. The video-KYC note on Kai Mensah is the deepfake theme from `deepfake-hk-001`. The note is stored on the account. The path test does not read it.

AML, in this demo, means the firm's controls when money may be the proceeds of crime. This sandbox stops at the alert picture. The playable scripts under `data/cases/` are where a trainee chooses a disposition.
        """
    )
    with st.expander("Words on the ledger"):
        st.markdown(
            """
- **FPS** — Faster Payment System, the Hong Kong retail payment rail used as a channel label.
- **CHATS** — Clearing House Automated Transfer System, used here as the label on larger synthetic transfers.
- **Pass-through** — the account received at least HKD 15,000 and sent on at least 75 percent of it, with the last outbound payment no later than 36 hours after the first inbound payment.
- **Watchlist** — `reference_wallets.csv`. The mule case may walk toward a wallet on that list. The list is a rule input.
- **Narrative label** — a `case_id` from the course library, stored so a presenter can point at the matching script. It is not an input to the rule.
            """
        )
    st.subheader("Moves in this browser session")
    st.caption(
        "Each slider change is a local step. This list is the thread of the experiment "
        "on this page. It is not the API event log in `backend/`."
    )
    st.dataframe(pd.DataFrame(st.session_state.get("thread", [])), hide_index=True, width="stretch")


def _alerts(bundle: Bundle, report: object) -> None:
    st.subheader("Before and after")
    st.write(
        f"Before uses HKD {report.baseline_hkd:,}. After uses HKD {report.threshold_hkd:,}. "
        "Yellow rows are payments that one line lists and the other does not. "
        "Indigo rows are inside a network case."
    )
    renamed = _rename_comparison(report)
    st.dataframe(_paint(renamed), hide_index=True, width="stretch", height=420)
    st.download_button(
        "Download this comparison (CSV)",
        data=renamed.to_csv(index=False).encode("utf-8"),
        file_name="twinaml-before-after.csv",
        mime="text/csv",
    )
    before, after = st.columns(2)
    with before:
        st.markdown(f"**Before — rule only at HKD {report.baseline_hkd:,}**")
        st.dataframe(alerts_frame(report.baseline_alerts), hide_index=True, width="stretch", height=360)
    with after:
        st.markdown(f"**After — rule only at HKD {report.threshold_hkd:,}**")
        st.dataframe(alerts_frame(report.rule_alerts), hide_index=True, width="stretch", height=360)
    st.subheader("Graph-linked cases")
    st.caption(
        "amount_hkd on a case is the sum of its payments. "
        "In the circular flow and on the mule path, the same funds are counted once per hop."
    )
    st.dataframe(cases_frame(report.graph_cases), hide_index=True, width="stretch")
    for case in report.graph_cases:
        with st.expander(f"{case.case_id} — {case.title}"):
            st.write(case.why)
            if case.narrative_labels:
                st.write("Narrative labels: " + ", ".join(case.narrative_labels))
            if case.kyc_notes:
                st.markdown("**KYC notes stored on the accounts**")
                for note in case.kyc_notes:
                    st.write(note)
            st.caption("Payments: " + ", ".join(case.txn_ids))
    if st.session_state.get("show_key"):
        _facilitator(bundle, report)


def _rename_comparison(report: object) -> pd.DataFrame:
    frame = report.comparison.copy()
    return frame.rename(
        columns={
            "before_rule": f"Before: rule at HKD {report.baseline_hkd:,}",
            "after_rule": f"After: rule at HKD {report.threshold_hkd:,}",
            "graph_story": "Graph story",
        }
    )


def _paint(frame: pd.DataFrame) -> pd.io.formats.style.Styler:
    before_col = frame.columns[-3]
    after_col = frame.columns[-2]
    story_col = frame.columns[-1]

    def row_style(row: pd.Series) -> list[str]:
        if row[before_col] != row[after_col]:
            color = "background-color: #FEF3C7"
        elif row[story_col] != "—":
            color = "background-color: #E0E7FF"
        else:
            color = ""
        return [color] * len(row)

    return frame.style.apply(row_style, axis=1)


def _facilitator(bundle: Bundle, report: object) -> None:
    st.subheader("Facilitator answer key")
    st.write(
        "The planted typology is a column on the CSV. The detectors do not read it. "
        "This table checks that column against what the network cases returned."
    )
    story_by_txn = {
        txn_id: case.typology for case in report.graph_cases for txn_id in case.txn_ids
    }
    rows = []
    for record in bundle.transactions.itertuples(index=False):
        planted = str(record.planted_typology)
        expected = _PLANTED_TO_STORY.get(planted, "—")
        actual = story_by_txn.get(str(record.txn_id), "—")
        rows.append(
            {
                "txn_id": record.txn_id,
                "planted_typology": planted,
                "expected_story": expected,
                "detected_story": actual,
                "match": "yes" if expected == actual else "no",
            }
        )
    key = pd.DataFrame(rows)
    mismatches = int((key["match"] == "no").sum()) if not key.empty else 0
    st.write(f"Rows where the planted story and the detector disagree: {mismatches}.")
    st.dataframe(key, hide_index=True, width="stretch", height=360)


def _network(bundle: Bundle, report: object) -> None:
    st.subheader("Same twin, as a network")
    st.write(
        "Orange is smurfing, teal is the circular flow, purple is the mule-to-mixer path. "
        "Slate accounts are the ordinary book. Dashed rose edges are `CONTROLS` or `USES_DEVICE`, "
        "not payments. Hover a node for the KYC note and the narrative label."
    )
    focus_label = st.selectbox("Show", list(_FOCUS), index=0)
    focus = _FOCUS[focus_label]
    html = network_html(bundle, report.graph_cases, focus=focus)
    st.iframe(
        html,
        height=680,
        width="stretch",
        alt="Payment network for the selected story",
    )


def _ledger(bundle: Bundle) -> None:
    st.subheader(bundle.source_name)
    accounts, payments, links = st.columns(3)
    accounts.metric("Accounts and other nodes", len(bundle.accounts))
    payments.metric("Payments", len(bundle.transactions))
    links.metric("Non-payment links", len(bundle.relationships))
    st.markdown("**Accounts**")
    st.dataframe(bundle.accounts, hide_index=True, width="stretch", height=280)
    st.markdown("**Payments**")
    visible = bundle.transactions.copy()
    visible["booked_at"] = visible["booked_at"].dt.strftime("%Y-%m-%dT%H:%M:%S")
    st.dataframe(visible, hide_index=True, width="stretch", height=320)
    st.markdown("**Relationships**")
    st.dataframe(bundle.relationships, hide_index=True, width="stretch")
    st.markdown("**Watchlist wallets**")
    if bundle.wallets.empty:
        st.write("No watchlist file is loaded, so the mule-to-mixer case has no wallet to walk toward.")
    else:
        st.dataframe(bundle.wallets, hide_index=True, width="stretch")


def _bloom() -> None:
    st.subheader("Neo4j Bloom is optional")
    st.write(
        "This tab does not load a database by itself. The network you already saw "
        "is drawn from the CSV with NetworkX. Bloom is a second way to hover the "
        "same tagged graph after you load it."
    )
    st.markdown(
        """
1. Copy `data/*.csv` into the Neo4j `import/twinaml/` folder and run `cypher/load_twin.cypher` in Browser, **or** point `.env` at Aura or Sandbox and run `python -m twinaml_sandbox.neo4j_link --write`.
2. Open Bloom with the perspective notes in `cypher/bloom_perspective.md`.
3. Save the three searches in `cypher/stories.cypher`: smurfing fan-in, circular flow, paths into the mixer.
4. Color by `kind` first. Turn on the facilitator colors only after the class has run the searches.

The write command deletes nodes tagged `twinaml-aml-week` and leaves every other node alone. It refuses to run until `NEO4J_SANDBOX_CONFIRM=twinaml-aml-week`.
        """
    )
    if st.button("Ping Neo4j"):
        try:
            settings = settings_from_env()
            if settings is None:
                st.session_state["neo4j_status"] = (
                    "Offline. Leave the URI blank and keep using the Network tab."
                )
            else:
                st.session_state["neo4j_status"] = ping(settings)
        except Neo4jConfigError as exc:
            st.session_state["neo4j_status"] = str(exc)
        except Exception as exc:  # noqa: BLE001 — show the driver error, never the password
            st.session_state["neo4j_status"] = f"Neo4j did not answer: {exc.__class__.__name__}: {exc}"
    if st.button("Count paths in Neo4j"):
        try:
            settings = settings_from_env()
            if settings is None:
                st.session_state["neo4j_counts"] = None
                st.session_state["neo4j_status"] = "Offline. There is no URI to count against."
            else:
                st.session_state["neo4j_counts"] = read_typology_counts(settings)
                st.session_state["neo4j_status"] = "Counts returned. They are path counts, not the Streamlit case count."
        except Neo4jConfigError as exc:
            st.session_state["neo4j_counts"] = None
            st.session_state["neo4j_status"] = str(exc)
        except Exception as exc:  # noqa: BLE001
            st.session_state["neo4j_counts"] = None
            st.session_state["neo4j_status"] = f"Neo4j did not answer: {exc.__class__.__name__}: {exc}"
    status = st.session_state.get("neo4j_status")
    if status:
        st.write(status)
    counts = st.session_state.get("neo4j_counts")
    if counts:
        st.dataframe(pd.DataFrame([counts]), hide_index=True, width="stretch")
        st.caption(
            "smurf_hubs should be 1 on the bundled load. cycle_paths and mixer_paths "
            "count walks, so they are larger than the three Streamlit cases. "
            "A cycle is listed once per starting account."
        )


if __name__ == "__main__":
    main()
