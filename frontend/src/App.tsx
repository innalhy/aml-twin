import { useEffect, useState, type ReactNode } from "react";
import { apiFetch, loadResume, saveResume, sessionKey } from "./account-api";
import type { Disposition, InvestigationAction, Row, SessionView } from "../../packages/investigation/types";

const SESSION_KEY = "twinaml-second-ledger-session";
const amounts = new Intl.NumberFormat("en-US");
const dispositions: Record<Disposition, string> = { continue_review: "Continue review", closure: "Close alert", escalation: "Escalate concern" };
type Tab = "evidence" | "transfers" | "requests" | "activity" | "debrief";
type Draft = { reason: string; note: string; disposition: Disposition; evidenceIds: string[] };
const emptyDraft: Draft = { reason: "", note: "", disposition: "continue_review", evidenceIds: [] };

class ApiError extends Error {
  constructor(message: string, public status: number) { super(message); }
}
async function readSession(path: string, body?: object): Promise<SessionView> {
  const response = await apiFetch(path, body ? { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) } : undefined);
  const result = await response.json().catch(() => null);
  if (!response.ok) throw new ApiError(result?.error?.replaceAll("_", " ") || "The investigation desk could not respond. Please try again.", response.status);
  if (!result || !Array.isArray(result.customers)) throw new Error("The investigation desk returned an unreadable response. Please try again.");
  return result;
}
function savedSessionId(key: string) { return loadResume(key); }
function utcTime(snapshot: string, minute: number) { return new Date(new Date(snapshot).getTime() + minute * 60_000).toLocaleTimeString("en-GB", { timeZone: "UTC", hour: "2-digit", minute: "2-digit" }); }
function dateLabel(value: string) {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString("en-GB", { timeZone: "UTC", day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
}
function money(value: number | string) { return amounts.format(Number(value)); }
function inlineText(value: string): ReactNode {
  return value.replace(/\[([^\]]+)\]\([^)]+\)/g, "$1").split(/(\*\*[^*]+\*\*)/g).map((part, i) => part.startsWith("**") ? <strong key={i}>{part.slice(2, -2)}</strong> : part);
}
function DocumentText({ text }: { text: string }) {
  // shortcut: authored text supports headings, paragraphs and lists; use a Markdown renderer if richer documents are added.
  return <div className="document-text">{text.split(/\n\s*\n/).filter(Boolean).map((block, i) => {
    if (/^#{1,6} /.test(block)) return <h3 key={i}>{inlineText(block.replace(/^#{1,6} /, ""))}</h3>;
    const lines = block.split("\n");
    if (lines.every((line) => /^[-*] /.test(line))) return <ul key={i}>{lines.map((line, j) => <li key={j}>{inlineText(line.slice(2))}</li>)}</ul>;
    if (lines.every((line) => /^\d+\. /.test(line))) return <ol key={i}>{lines.map((line, j) => <li key={j}>{inlineText(line.replace(/^\d+\. /, ""))}</li>)}</ol>;
    return <p key={i}>{inlineText(block)}</p>;
  })}</div>;
}
function eventTitle(type: string) { return type.replaceAll("_", " ").replace(/^./, (c) => c.toUpperCase()); }
function customerName(customers: Row[], id: string) { return customers.find((item) => item.customer_id === id)?.display_name || id; }

export function App({ accountId = null }: { accountId?: string | null }) {
  const storageKey = sessionKey(SESSION_KEY, accountId);
  const [session, setSession] = useState<SessionView | null>(null);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(Boolean(savedSessionId(storageKey)));
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [customerId, setCustomerId] = useState("");
  const [evidenceId, setEvidenceId] = useState("");
  const [tab, setTab] = useState<Tab>("evidence");
  const [info, setInfo] = useState<"briefing" | "policy" | null>(null);
  const [drafts, setDrafts] = useState<Record<string, Draft>>({});
  useEffect(() => {
    const id = savedSessionId(storageKey);
    if (!id) return;
    let cancelled = false;
    readSession(`/api/sessions/${encodeURIComponent(id)}`).then((view) => {
      if (!cancelled) { setSession(view); if (view.ended) setTab("debrief"); }
    }).catch((err) => { if (!cancelled) setError(err instanceof Error ? err.message : "Unable to resume this shift."); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);
  async function startSession() {
    setBusy(true); setError("");
    try {
      const view = await readSession("/api/sessions", {});
      setSession(view); setCustomerId(""); setEvidenceId(""); setDrafts({}); setTab("evidence"); setInfo("briefing");
      try { saveResume(storageKey, view.id); setNotice("Your shift is ready. Reading documents does not move simulation time."); }
      catch { setNotice(accountId ? "Your shift is saved to your account. Use My progress to resume it if browser storage is unavailable." : "Your shift is ready. This browser cannot save a resume link; export your history before closing."); }
    } catch (err) { setError(err instanceof Error ? err.message : "Unable to start a shift."); }
    finally { setBusy(false); }
  }
  async function refreshSession() {
    const id = session?.id || savedSessionId(storageKey);
    if (!id) return;
    setBusy(true); setError("");
    try { setSession(await readSession(`/api/sessions/${encodeURIComponent(id)}`)); setNotice("The desk is up to date."); }
    catch (err) { setError(err instanceof Error ? err.message : "Unable to refresh the desk."); }
    finally { setBusy(false); }
  }
  async function act(action: InvestigationAction, success: string) {
    if (!session || busy || session.ended) return;
    setBusy(true); setError(""); setNotice("");
    try {
      const view = await readSession(`/api/sessions/${encodeURIComponent(session.id)}/actions`, { ...action, revision: session.revision });
      setSession(view);
      const rejected = view.events.slice().reverse().find((event) => event.seq > (session.events.at(-1)?.seq || 0) && event.type.endsWith("_rejected"));
      if (rejected) setError("This action was not accepted. Review the latest records, account controls and request prerequisites, then try again.");
      else {
        setNotice(success);
        if (action.type === "hold" || action.type === "release") {
          setDrafts((previous) => ({ ...previous, [action.customerId]: { ...(previous[action.customerId] || emptyDraft), reason: "" } }));
        }
      }
      if (view.ended) { setTab("debrief"); setInfo(null); }
    } catch (err) {
      if (err instanceof ApiError && err.status === 409) {
        try { setSession(await readSession(`/api/sessions/${encodeURIComponent(session.id)}`)); setError("This shift changed in another window. The desk has been refreshed; review it before submitting again."); }
        catch { setError("This shift changed in another window. Refresh the desk before submitting again."); }
      } else setError(err instanceof Error ? err.message : "Your action could not be saved. Please try again.");
    } finally { setBusy(false); }
  }
  function exportHistory() {
    if (!session) return;
    const url = URL.createObjectURL(new Blob([JSON.stringify(session, null, 2)], { type: "application/json" }));
    const link = document.createElement("a"); link.href = url; link.download = `second-ledger-${session.id}.json`; link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  const customer = session?.customers.find((item) => item.customer_id === customerId) || session?.customers[0];
  const selectedId = customer?.customer_id || "";
  const draft = drafts[selectedId] || emptyDraft;
  function updateDraft(patch: Partial<Draft>) { setDrafts((previous) => ({ ...previous, [selectedId]: { ...(previous[selectedId] || emptyDraft), ...patch } })); }
  function toggleCitation(id: string) { updateDraft({ evidenceIds: draft.evidenceIds.includes(id) ? draft.evidenceIds.filter((item) => item !== id) : [...draft.evidenceIds, id] }); }
  const account = session?.runAccounts.find((item) => item.customerId === selectedId);
  const orders = session?.orders.filter((item) => item.customerId === selectedId) || [];
  const evidence = session?.evidence.filter((item) => item.customerId === selectedId) || [];
  const record = evidence.find((item) => item.id === evidenceId) || evidence[0];
  const requests = session?.requests.filter((item) => item.customerId === selectedId) || [];
  const decisions = session?.decisions.filter((item) => item.customerId === selectedId) || [];
  const latestDecision = decisions.at(-1);
  const alert = session?.alerts.find((item) => item.customer_id === selectedId);
  const ledger = session?.transactions.filter((item) => item.from_account === customer?.account_id || item.to_account === customer?.account_id).slice().reverse() || [];
  const locked = busy || Boolean(session?.ended);

  return <>
    <a className="skip-link" href="#investigation">Skip to investigation</a>
    <header className="topbar">
      <a className="brand" href="#investigation" aria-label="TwinAML investigation desk"><span className="brand-mark" aria-hidden="true">II</span><span>TwinAML<small>THE SECOND LEDGER</small></span></a>
      <div className="training-label"><span className="status-dot" />Training simulation <span className="unit-label">SCU</span></div>
      <div className="top-actions"><a className="text-button" href="/cases">Case library</a>{session && <><button className="text-button export-button" onClick={exportHistory}>Export history</button><button className="text-button" disabled={busy} onClick={refreshSession}>Refresh</button></>}<button className="new-shift" disabled={busy || loading} onClick={startSession}>{session ? "New shift" : "Start shift"}</button></div>
    </header>
    {(error || notice) && <div className={`message ${error ? "error-message" : "notice-message"}`} role={error ? "alert" : "status"}>{error || notice}{error && <button className="text-button" disabled={busy} onClick={session || savedSessionId(storageKey) ? refreshSession : startSession}>Try again</button>}</div>}
    {loading ? <main id="investigation" className="welcome"><p className="eyebrow">Opening your desk</p><h1>Resuming your shift…</h1><p>Your case history and available records are being restored.</p></main> : !session ?
      <main id="investigation" className="welcome">
        <div className="welcome-copy"><p className="eyebrow">AN INVESTIGATION IN UNCERTAINTY</p><h1>The Second<br /><em>Ledger.</em></h1><p className="welcome-lead">Six alerts. Two urgent payment trails. One desk to understand what the evidence supports.</p><p>Step into a fictional bank as an AML analyst. Explore customer files, follow the money, request independent checks, and document your decisions while pending payments come due.</p><button className="primary-button welcome-start" disabled={busy} onClick={startSession}>{busy ? "Opening your desk…" : "Begin your first shift →"}</button><p className="welcome-note">All records are synthetic. SCU is a fictional currency unit.<br />Simulation time stays paused while you read.</p></div>
        <div className="welcome-art" aria-hidden="true"><div className="paper paper-back"><span>OPERATIONS / 11:12 UTC</span><div className="paper-rule" /><div className="paper-rule short" /></div><div className="paper paper-front"><span className="eyebrow">PAYMENT REVIEW</span><h2>Follow the evidence.</h2><div className="paper-rule" /><div className="paper-rule" /><div className="paper-rule short" /><div className="paper-stamp">PENDING<br />REVIEW</div><span className="paper-footer">CASE FILE — 001</span></div><div className="welcome-tag">Every decision leaves a trace.</div></div>
      </main> : <div className="desk-shell">
        <aside className="case-sidebar" aria-label="Alert queue">
          <div className="queue-heading"><span className="eyebrow">YOUR WORKLOAD</span><h2>Alert queue <span>{session.alerts.length}</span></h2><p>Choose a file to investigate.</p></div>
          <nav className="case-list" aria-label="Customer cases">{session.alerts.map((item, index) => {
            const last = session.decisions.filter((decision) => decision.customerId === item.customer_id).at(-1);
            const held = session.runAccounts.find((run) => run.customerId === item.customer_id)?.held;
            return <button key={item.alert_id} className={`case-button ${selectedId === item.customer_id ? "selected" : ""}`} aria-current={selectedId === item.customer_id ? "true" : undefined} onClick={() => { setCustomerId(item.customer_id); setEvidenceId(""); setInfo(null); if (tab === "debrief" && !session.ended) setTab("evidence"); }}>
              <span className="case-number">{String(index + 1).padStart(2, "0")}</span><span className="case-copy"><span className="case-name">{customerName(session.customers, item.customer_id)}</span><span className="case-trigger">{item.trigger_code.replaceAll("_", " ").toLowerCase()}</span><span className="case-status">{held ? "Outbound hold" : last ? dispositions[last.disposition] : "Awaiting review"}</span></span><span className={`priority-dot ${item.priority === "high" ? "high" : ""}`} aria-label={`${item.priority} priority`} />
            </button>;
          })}</nav>
          <div className="sidebar-bottom"><span className="eyebrow">REFERENCE DESK</span><button className="reference-button" onClick={() => setInfo(info === "briefing" ? null : "briefing")}>Shift briefing <span>↗</span></button><button className="reference-button" onClick={() => setInfo(info === "policy" ? null : "policy")}>Course policy <span>↗</span></button><p>Fictional training bank<br />All dates and times shown in UTC.</p></div>
        </aside>
        <main id="investigation" className="investigation-main">
          <section className="clock-strip" aria-label="Simulation clock"><div><span className="eyebrow">{session.ended ? "SHIFT COMPLETE" : "SIMULATION CLOCK · PAUSED WHILE READING"}</span><div className="clock-value">{utcTime(session.snapshotAt, session.minute)} <small>UTC <span>·</span> minute {session.minute}</small></div></div><div className="clock-actions"><button className="secondary-button" disabled={locked} onClick={() => act({ type: "advance", mode: "work", minutes: 6 }, "Six minutes of review work have elapsed. Check for new evidence and payment updates.")}>Work 6 minutes</button><button className="primary-button" disabled={locked} onClick={() => act({ type: "advance", mode: "next" }, "Advanced to the next checkpoint. Review new responses and payment status before moving on.")}>Next event →</button><button className="text-button finish-button" disabled={locked} onClick={() => act({ type: "finish" }, "Shift finished. Your decisions and payment outcomes are preserved.")}>Finish & debrief</button></div></section>
          <p className="clock-help">Advancing processes checks and payments along the way. At a payment checkpoint you may act before continuing. Finish processes all remaining events through minute {session.endMinute}.</p>
          {info && <section className="reference-panel"><div className="panel-title"><span className="eyebrow">REFERENCE DESK / {info}</span><button className="text-button" onClick={() => setInfo(null)}>Close reference ×</button></div><DocumentText text={info === "briefing" ? session.briefing : session.policy} /></section>}
          {customer && <>
            <section className="dossier-heading"><div><p className="eyebrow">FINANCIAL CRIME INVESTIGATIONS / {alert?.alert_id}</p><h1>{customer.display_name}</h1><p>{customer.occupation} <span>·</span> {customer.account_id}</p></div><span className={`dossier-status ${account?.held ? "held" : ""}`}>{account?.held ? "Outbound hold active" : latestDecision ? dispositions[latestDecision.disposition] : "Open investigation"}</span></section>
            <div className="desk-columns"><div className="case-workspace">
              <section className="account-overview" aria-label="Customer and account overview"><div className="balance-card"><span className="eyebrow">ACCOUNT BALANCE</span><strong>{money(account?.balance || 0)} <small>SCU</small></strong><span>{orders.filter((item) => item.status === "pending").length} pending outgoing orders</span></div><div className="profile-card"><dl><div><dt>Expected monthly credits</dt><dd>{money(customer.expected_monthly_credits)} SCU</dd></div><div><dt>Largest expected credit</dt><dd>{money(customer.expected_largest_credit)} SCU</dd></div><div><dt>Declared monthly income</dt><dd>{money(customer.declared_monthly_income)} SCU</dd></div></dl></div></section>
              <section className="purpose-note"><span className="eyebrow">DECLARED ACTIVITY</span><p>{customer.expected_payment_purpose}</p><small>{customer.employment_basis} · Account opened {dateLabel(customer.onboarded_at)} UTC</small></section>
              {orders.length > 0 && <section className="order-strip" aria-label="Scheduled outgoing orders">{orders.map((order) => <div key={order.id} className={`order-card ${order.status}`}><span>{order.id} <span className="order-state">{order.overdue && order.status === "pending" ? "Overdue · held" : order.status}</span></span><strong>{money(order.amount)} <small>SCU</small></strong><span>{order.status === "executed" ? `Executed ${utcTime(session.snapshotAt, order.executedMinute || 0)}` : `Due ${utcTime(session.snapshotAt, order.dueMinute)}`} UTC <span>·</span> {session.accounts.find((row) => row.account_id === order.toAccount)?.holder_name || order.toAccount}</span></div>)}</section>}
              <section className="records-panel"><nav className="tabs" aria-label="Investigation views">{([
                ["evidence", "Evidence", evidence.length], ["transfers", "Transfers", ledger.length], ["requests", "Request desk", requests.filter((item) => item.status === "waiting").length], ["activity", "Activity", null], ...(session.ended ? [["debrief", "Debrief", null]] : []),
              ] as [Tab, string, number | null][]).map(([key, title, count]) => <button key={key} className={tab === key ? "active" : ""} aria-current={tab === key ? "page" : undefined} onClick={() => setTab(key)}>{title}{count !== null && <span>{count}</span>}</button>)}</nav>
                {tab === "evidence" && <div className="evidence-layout"><div className="evidence-list" aria-label="Available evidence"><p className="list-caption">AVAILABLE RECORDS</p>{evidence.map((item) => <button key={item.id} className={`evidence-button ${record?.id === item.id ? "selected" : ""}`} onClick={() => setEvidenceId(item.id)} aria-current={record?.id === item.id ? "true" : undefined}><span className="evidence-id">{item.id}{draft.evidenceIds.includes(item.id) && <span aria-label="Cited"> ✓</span>}</span><strong>{item.title}</strong><span>{item.source}</span>{item.availableMinute > 0 && <small>Received minute {item.availableMinute}</small>}</button>)}</div>{record ? <article className="evidence-reader"><div className="reader-toolbar"><span>FILE {record.id} <span>·</span> {record.availableMinute === 0 ? "Initial record" : `Received minute ${record.availableMinute}`}</span><button className={`citation-button ${draft.evidenceIds.includes(record.id) ? "cited" : ""}`} disabled={locked} onClick={() => toggleCitation(record.id)}>{draft.evidenceIds.includes(record.id) ? "✓ Cited" : "+ Cite record"}</button></div><DocumentText text={record.body} /><footer className="reader-footer">Source: {record.source}<br />Read the source and distinguish claims from independently checked facts.</footer></article> : <p className="empty-state">No records are available for this customer.</p>}</div>}
                {tab === "transfers" && <div className="tab-content"><div className="tab-heading"><h2>Account transfers</h2><p>One row per transfer. Pending orders have not reduced the balance.</p></div><div className="table-scroll"><table><caption className="sr-only">Transfers for {customer.display_name}; amounts in SCU and times in UTC.</caption><thead><tr><th>Time / reference</th><th>Counterparty</th><th className="numeric">Amount · SCU</th><th>Status</th></tr></thead><tbody>{ledger.map((transaction) => { const incoming = transaction.to_account === customer.account_id; const other = incoming ? transaction.from_account : transaction.to_account; const runOrder = session.orders.find((item) => item.id === transaction.transaction_id); const status = runOrder?.status || transaction.status; return <tr key={transaction.transaction_id}><td><strong>{runOrder?.executedMinute !== null && runOrder?.executedMinute !== undefined ? `${utcTime(session.snapshotAt, runOrder.executedMinute)} UTC` : `${dateLabel(transaction.executed_at || transaction.scheduled_at || transaction.submitted_at)} UTC`}</strong><small>{transaction.memo}<br />{transaction.transaction_id}</small></td><td>{session.accounts.find((item) => item.account_id === other)?.holder_name || other}<small>{other}</small></td><td className={`numeric ${incoming ? "incoming" : ""}`}><span className="direction">{incoming ? "IN" : "OUT"}</span>{money(transaction.amount)}</td><td><span className={`table-status ${status}`}>{runOrder?.overdue && status === "pending" ? "Held overdue" : status}</span></td></tr>; })}</tbody></table></div></div>}
                {tab === "requests" && <div className="tab-content"><div className="tab-heading"><h2>Independent checks</h2><p>Service time begins when a request is accepted. Payments continue when you advance the clock.</p></div>{requests.length ? <div className="request-list">{requests.map((request) => <article key={request.requestId} className="request-card"><div><span className="eyebrow">{request.serviceMinutes} MINUTE SERVICE TIME</span><h3>{request.title}</h3><p>{request.status === "waiting" ? `Requested minute ${request.requestedMinute}. Response due ${utcTime(session.snapshotAt, request.dueMinute || 0)} UTC (minute ${request.dueMinute}).` : request.status === "completed" ? "Response received. Open the Evidence tab to read and cite it." : request.status === "locked" ? request.prerequisiteEvidenceId ? `First obtain prerequisite record ${request.prerequisiteEvidenceId}.` : "Obtain the supporting documents before requesting this check." : request.prerequisiteEvidenceId ? `Prerequisite ${request.prerequisiteEvidenceId} received. Ready to request.` : "Ready to request from the service desk."}</p></div><button className={request.status === "available" ? "secondary-button" : "request-status"} disabled={locked || request.status !== "available"} onClick={() => act({ type: "request", customerId: selectedId, requestId: request.requestId }, "Check requested. Advance the clock when ready to wait for a response.")}>{request.status === "available" ? "Request check →" : request.status === "locked" ? "Prerequisite needed" : request.status === "waiting" ? "In progress" : "✓ Received"}</button></article>)}</div> : <p className="empty-state">No further checks are listed for this alert. Review the available records and explain your conclusion.</p>}</div>}
                {tab === "activity" && <div className="tab-content"><div className="tab-heading"><h2>Investigation activity</h2><p>Saved actions and events for this customer. Decisions can be revisited when evidence changes.</p></div>{session.events.filter((event) => event.customerId === selectedId || !event.customerId).slice().reverse().map((event) => <div className="activity-row" key={event.seq}><span className="activity-time">{utcTime(session.snapshotAt, event.minute)}<small>minute {event.minute}</small></span><div><strong>{eventTitle(event.type)} {event.refId && <span className="event-ref">{event.refId}</span>}</strong><p>{event.detail}</p></div></div>)}</div>}
                {tab === "debrief" && <div className="tab-content"><div className="tab-heading"><span className="eyebrow">SHIFT REPLAY</span><h2>Your decisions, in context</h2><p>This replay shows what was available and what happened. It does not reveal hidden scenario answers or assign a grade.</p></div>{session.debrief?.warnings.length ? <div className="debrief-warnings">{session.debrief.warnings.map((warning, i) => <p key={i}>{warning}</p>)}</div> : <p className="debrief-neutral">Review the evidence cited, timing of controls, and remaining uncertainty with your tutor.</p>}<div className="debrief-summary"><div><span className="eyebrow">FINAL BALANCE</span><strong>{money(account?.balance || 0)} SCU</strong></div><div><span className="eyebrow">ACCOUNT CONTROL</span><strong>{account?.held ? `Hold active since minute ${account.holdSince}` : "No outbound hold"}</strong></div></div>{orders.map((order) => <p className="outcome-row" key={order.id}><strong>{order.id} · {money(order.amount)} SCU</strong><span>{order.status === "executed" ? `Executed at minute ${order.executedMinute}` : order.status === "failed" ? "Failed eligibility check" : order.overdue ? "Held; still pending at shift end" : "Pending at shift end"}</span></p>)}<h3 className="debrief-subtitle">Recorded decisions</h3>{decisions.length ? decisions.map((decision) => { const available = evidence.filter((item) => item.availableMinute <= decision.minute); return <article className="decision-replay" key={decision.id}><span className="eyebrow">{decision.id} · MINUTE {decision.minute}</span><h3>{dispositions[decision.disposition]}</h3><p>{decision.note}</p><small>Cited: {decision.evidenceIds.join(", ") || "No records cited"}<br />Available at the time: {available.map((item) => item.id).join(", ") || "None"}</small></article>; }) : <p className="empty-state">No decision was recorded for this customer.</p>}<button className="secondary-button" onClick={exportHistory}>Export shift history</button></div>}
              </section>
            </div>
            <aside className="action-panel" aria-label="Account controls and decision notes"><div className="action-panel-header"><span className="eyebrow">ANALYST DESK</span><h2>Record your reasoning</h2><p>Use the evidence available now.<br />You may revise decisions later.</p></div><form className="control-form" onSubmit={(event) => { event.preventDefault(); act({ type: account?.held ? "release" : "hold", customerId: selectedId, reason: draft.reason.trim() }, account?.held ? "Outbound hold released. Overdue orders have been checked for execution." : "Provisional outbound hold placed. Record and revisit the next check."); }}><div className="action-section-title"><span className="section-number">01</span><h3>Account control</h3></div>{account?.held && <div className="hold-note"><strong>Hold active · minute {account.holdSince}</strong><p>{account.holdReason}</p></div>}<label htmlFor="control-reason">{account?.held ? "Reason to release the hold" : "Concern and next check"}</label><textarea id="control-reason" value={draft.reason} onChange={(event) => updateDraft({ reason: event.target.value })} placeholder={account?.held ? "What evidence resolves the concern?" : "Why is a temporary control justified? When will you revisit it?"} rows={3} maxLength={4000} disabled={locked} required /><button className={account?.held ? "secondary-button full-width" : "hold-button full-width"} disabled={locked || !draft.reason.trim()}>{account?.held ? "Release outbound hold" : "Place provisional hold"}</button><p className="form-help">A hold affects pending payments. It cannot reverse a completed transfer.</p></form><form className="decision-form" onSubmit={(event) => { event.preventDefault(); act({ type: "decision", customerId: selectedId, disposition: draft.disposition, evidenceIds: draft.evidenceIds, note: draft.note.trim() }, "Decision and evidence citations saved to the shift history."); }}><div className="action-section-title"><span className="section-number">02</span><h3>Case decision</h3></div><label htmlFor="disposition">Recommended action</label><select id="disposition" value={draft.disposition} onChange={(event) => updateDraft({ disposition: event.target.value as Disposition })} disabled={locked}>{Object.entries(dispositions).map(([value, label]) => <option value={value} key={value}>{label}</option>)}</select><label htmlFor="decision-note">Rationale and remaining gaps</label><textarea id="decision-note" value={draft.note} onChange={(event) => updateDraft({ note: event.target.value })} placeholder="What supports this action? What remains unverified, and what could change your decision?" rows={5} maxLength={4000} disabled={locked} required /><div className="citation-label">Cited records <span>{draft.evidenceIds.length}</span></div><div className="citation-chips">{draft.evidenceIds.length ? draft.evidenceIds.map((id) => <button key={id} type="button" disabled={locked} onClick={() => toggleCitation(id)} aria-label={`Remove citation ${id}`}>{id} <span>×</span></button>) : <p>Open a record and choose “Cite record”.</p>}</div><button className="primary-button full-width" disabled={locked || !draft.note.trim()}>Save case decision</button><p className="form-help">An escalation does not place a hold. A closure does not release one.</p></form>{latestDecision && <div className="last-decision"><span className="eyebrow">LATEST SAVED DECISION</span><strong>{dispositions[latestDecision.disposition]}</strong><small>Minute {latestDecision.minute} · {latestDecision.id}</small></div>}{session.ended && <p className="shift-ended">This shift is finished. Explore the replay or start a new shift; this history remains saved.</p>}</aside>
            </div>
          </>}
          <footer className="desk-footer"><span>The Second Ledger / TwinAML</span><span>Synthetic classroom exercise · fictional course policy</span></footer>
        </main>
      </div>}
  </>;
}
