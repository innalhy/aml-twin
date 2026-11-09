import { lazy, Suspense, useEffect, useId, useRef, useState, type FormEvent, type ReactNode } from "react";
import type { AmlView } from "../../packages/aml/types";
import { SIMULATION_RUBRIC_GUIDE, SIMULATION_RUBRIC_LABELS, type SimulationAction, type SimulationControl, type SimulationDecision, type SimulationDisposition, type SimulationEvidence, type SimulationRubric, type SimulationView } from "../../packages/aml/simulation-types";
import { apiFetch, loadResume, saveResume, sessionKey } from "./account-api";
import "./aml-simulation.css";

const RUN_KEY = "twinaml-aml-simulation-session";
const currency = new Intl.NumberFormat("en-HK", { style: "currency", currency: "HKD", maximumFractionDigits: 0 });
type Run = AmlView & { simulation?: SimulationView };
type Action = SimulationAction | { type: "switch_role"; role: "analyst" | "reviewer" };
type Act = (action: Action, notice: string) => Promise<Run | null>;
type Tab = "desk" | "evidence" | "decision" | "review" | "activity" | "debrief";
type Station = { id: string; label: string; onActivate: () => void };
const SceneViewport = lazy(async () => ({ default: (await import("./SceneViewport")).SceneViewport }));
const MONITORING_STATIONS = [
  { id: "desk", label: "Alert terminal" },
  { id: "evidence", label: "Evidence monitor" },
  { id: "decision", label: "Assessment desk" },
  { id: "review", label: "Reviewer station" },
] as const;
const words = (value: string) => value.replaceAll("_", " ");
const formatTime = (value: string) => new Date(value).toLocaleString("en-GB", { timeZone: "Asia/Hong_Kong", day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit", hour12: false });
function saveFile(value: string, filename: string, type: string) {
  const url = URL.createObjectURL(new Blob([value], { type }));
  const anchor = document.createElement("a"); anchor.href = url; anchor.download = filename; anchor.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
function csvCell(value: string) {
  const safe = /^[=+\-@\t\r]/.test(value) ? `'${value}` : value;
  return `"${safe.replaceAll('"', '""')}"`;
}
class SimulationApiError extends Error { constructor(message: string, readonly status: number, readonly code: string) { super(message); } }
async function request(path: string, body?: object): Promise<Run> {
  const response = await apiFetch(path, body === undefined ? undefined : { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  const result = await response.json().catch(() => null);
  if (!response.ok) {
    const code = typeof result?.error === "string" ? result.error : "";
    throw new SimulationApiError(code ? words(code) : "The simulation service could not complete this request.", response.status, code);
  }
  if (!result?.id || !result.simulation || !Array.isArray(result.simulation.evidence) || !Array.isArray(result.events)) throw new Error("This run is not an AML simulation. Open it from its original training area.");
  return result as Run;
}
function preserveRun(storageKey: string, id: string) {
  try { saveResume(storageKey, id); } catch { /* The selected run is also retained in the URL. */ }
  const url = new URL(window.location.href); url.searchParams.set("run", id);
  window.history.replaceState(null, "", `${url.pathname}${url.search}${url.hash}`);
}

export function buildBlindReviewPacket(view: Run) {
  const sim = view.simulation;
  if (!sim) throw new Error("A simulation run is required.");
  const start = Date.parse(view.asOf) - sim.elapsedMinutes * 60_000;
  return {
    formatVersion: "twinaml-blind-review-1",
    runId: view.id,
    datasetVersion: sim.datasetVersion,
    policyVersion: sim.policyVersion,
    rubricVersion: sim.rubricVersion,
    validationStatus: sim.validationStatus,
    instructions: "Review each submission using only the records available at its decision minute. Rate each dimension from 1 (limited) to 4 (strong), explain your judgment and record disagreements. This packet excludes the scenario answer and previous practice reviews.",
    rubric: { dimensions: SIMULATION_RUBRIC_LABELS, anchors: SIMULATION_RUBRIC_GUIDE, scale: { 1: "Limited", 2: "Partial", 3: "Sound", 4: "Strong" } },
    customerProfiles: view.entities,
    accounts: view.accounts,
    monitoringRule: view.rule,
    submissions: sim.decisions.map((decision) => {
      const cutoff = start + decision.minute * 60_000;
      return {
        ...decision,
        at: new Date(cutoff).toISOString(),
        evidence: sim.evidence.filter((record) => decision.availableEvidenceIds.includes(record.id) && record.availableMinute <= decision.minute),
        transactions: view.transactions.filter((transaction) => Date.parse(transaction.at) <= cutoff).map((transaction) => {
          const payment = sim.payments.find((item) => item.id === transaction.id);
          // Later release of a held instruction must not rewrite the reviewer's earlier view.
          return { ...transaction, status: payment ? payment.executedMinute !== null && payment.executedMinute <= decision.minute ? "executed" : "not_executed_as_of_decision" : transaction.status };
        }),
      };
    }),
  };
}

function focusWorkspace(target: HTMLElement | null) {
  target?.focus({ preventScroll: true });
  target?.scrollIntoView({ block: "start" });
}

function MonitoringRoom({ stations, sim, role }: { stations: readonly Station[]; sim?: SimulationView; role?: string }) {
  return <div className="sim-monitoring-room">
    <div className="sim-monitoring-room-bar">
      <div><strong>Transaction monitoring room</strong><p>Explore the room and select a station to open its workspace.</p></div>
      <div className="sim-monitoring-room-state">
        {sim ? <><span>Minute {sim.elapsedMinutes} / {sim.endMinute}</span><span>{sim.ended ? "Completed" : role === "reviewer" ? "Reviewer" : "Analyst"}</span></> : <span>Assignment briefing</span>}
      </div>
    </div>
    <Suspense fallback={<p className="sim-scene-loading" role="status">Loading the 3D monitoring room…</p>}>
      <SceneViewport kind="monitoring" hotspots={stations} />
    </Suspense>
  </div>;
}

export function AmlSimulation({ accountId, onProgress, immersive = false }: { accountId: string | null; onProgress?: (view: AmlView) => void; immersive?: boolean }) {
  const storageKey = sessionKey(RUN_KEY, accountId);
  const [view, setView] = useState<Run | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [retry, setRetry] = useState(0);
  const briefingId = useId();
  const pending = useRef(false);
  const progressCallback = useRef(onProgress);
  progressCallback.current = onProgress;
  useEffect(() => {
    let active = true;
    const id = loadResume(storageKey);
    setLoading(Boolean(id)); setError("");
    if (!id) { setView(null); return; }
    request(`/api/aml-sessions/${encodeURIComponent(id)}`).then((next) => {
      if (active) { setView(next); preserveRun(storageKey, next.id); progressCallback.current?.(next); }
    }).catch((err) => {
      if (!active) return;
      if (err instanceof SimulationApiError && [400, 404].includes(err.status)) { try { saveResume(storageKey, null); } catch { /* The request can be retried without storage. */ } }
      setError(err instanceof Error ? err.message : "Unable to resume the simulation.");
    }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [storageKey, retry]);
  async function start() {
    if (pending.current) return;
    pending.current = true; setBusy(true); setError(""); setNotice("");
    try {
      const next = await request("/api/aml-simulations", {});
      setView(next); preserveRun(storageKey, next.id); progressCallback.current?.(next);
      window.scrollTo(0, 0);
      setNotice("New assignment started. Earlier runs remain saved on the server.");
    } catch (err) { setError(err instanceof Error ? err.message : "Unable to start the simulation."); }
    finally { pending.current = false; setBusy(false); }
  }
  const act: Act = async (action, message) => {
    if (!view || pending.current) return null;
    pending.current = true; setBusy(true); setError(""); setNotice("");
    try {
      const next = await request(`/api/aml-sessions/${encodeURIComponent(view.id)}/actions`, { ...action, revision: view.revision });
      setView(next); preserveRun(storageKey, next.id); progressCallback.current?.(next); setNotice(message); return next;
    } catch (err) {
      if (err instanceof SimulationApiError && err.status === 409 && err.code === "stale_revision") {
        try {
          const latest = await request(`/api/aml-sessions/${encodeURIComponent(view.id)}`);
          setView(latest); progressCallback.current?.(latest);
          setError("Another window changed this run. The latest records are shown. Review your draft and submit again; your action was not repeated.");
        } catch { setError("Another window changed this run. Refresh the records before submitting again."); }
      } else setError(err instanceof Error ? err.message : "Your action could not be saved.");
      return null;
    } finally { pending.current = false; setBusy(false); }
  };
  async function refresh() {
    if (!view || pending.current) return;
    pending.current = true; setBusy(true); setError("");
    try {
      const latest = await request(`/api/aml-sessions/${encodeURIComponent(view.id)}`);
      setView(latest); progressCallback.current?.(latest); setNotice("Server records refreshed. Unsaved form drafts remain in this tab.");
    } catch (err) { setError(err instanceof Error ? err.message : "Unable to refresh the records."); }
    finally { pending.current = false; setBusy(false); }
  }
  return <div className="aml-sim" aria-busy={loading || busy}>
    {error && <div className="portal-message portal-error" role="alert"><span>{error}</span><button disabled={busy} onClick={() => { if (view) void refresh(); else setRetry((value) => value + 1); }}>Try again</button></div>}
    {notice && <div className="sim-notice" role="status"><span>{notice}</span><button onClick={() => setNotice("")} aria-label="Dismiss simulation notification">×</button></div>}
    {loading ? <div className="sim-loading" role="status"><h1>Restoring your simulation…</h1><p>The server is loading the clock, evidence and saved decisions.</p></div> : view?.simulation ? <SimulationConsole key={view.id} view={view} simulation={view.simulation} busy={busy} act={act} onStart={start} onRefresh={refresh} immersive={immersive} /> : <section className={`sim-welcome${immersive ? " sim-welcome-immersive" : ""}`}>
      <span className="portal-tag">DISCRETE-EVENT AML SIMULATION</span><h1>Investigate the activity.<br />Make a defensible decision.</h1><p>Take a retail-account alert from first review to a documented assessment. Request evidence, wait for independent responses, recommend controls and practise the reviewer handoff while scheduled payments continue.</p>
      {immersive && <MonitoringRoom stations={[
        { id: "desk", label: "Briefing", onActivate: () => focusWorkspace(document.getElementById(`${briefingId}-desk`)) },
        { id: "evidence", label: "Evidence guide", onActivate: () => focusWorkspace(document.getElementById(`${briefingId}-evidence`)) },
        { id: "decision", label: "Assessment guide", onActivate: () => focusWorkspace(document.getElementById(`${briefingId}-decision`)) },
        { id: "review", label: "Start assignment", onActivate: () => { void start(); } },
      ]} />}
      <div className="sim-welcome-grid">
        <Panel title="Your assignment" id={immersive ? `${briefingId}-desk` : undefined}><ul><li>A customer profile and transaction history</li><li>A monitoring alert with the contributing records</li><li>Pending payments with real simulation deadlines</li></ul></Panel>
        <Panel title="How it works" id={immersive ? `${briefingId}-evidence` : undefined}><ul><li>Reading pauses the simulation clock</li><li>Checks take time and may be inconclusive</li><li>Recommendations need review and operational execution</li></ul></Panel>
        <Panel title="Your assessment" id={immersive ? `${briefingId}-decision` : undefined}><ul><li>Cite the evidence available when you decide</li><li>Consider an alternative explanation and missing information</li><li>Review the consequences and your decision process</li></ul></Panel>
      </div>
      <button className="portal-button portal-button-gold" disabled={busy} onClick={() => { void start(); }}>{busy ? "Starting assignment…" : immersive ? "Start 3D simulation →" : "Start AML simulation →"}</button><p className="sim-muted sim-small">Synthetic bank data · 60 simulated minutes · Guided practice roles · Practitioner validation pending</p>
    </section>}
  </div>;
}

function SimulationConsole({ view, simulation: sim, busy, act, onStart, onRefresh, immersive }: { view: Run; simulation: SimulationView; busy: boolean; act: Act; onStart: () => void; onRefresh: () => void; immersive: boolean }) {
  const [tab, setTab] = useState<Tab>(sim.ended ? "debrief" : "desk");
  const [citations, setCitations] = useState<string[]>([]);
  const [endConfirm, setEndConfirm] = useState(false);
  const [newConfirm, setNewConfirm] = useState(false);
  const roomRef = useRef<HTMLElement>(null);
  const workspaceRef = useRef<HTMLElement>(null);
  const latestDecision = sim.decisions.at(-1);
  const roleLocked = busy || sim.ended;
  useEffect(() => { if (sim.ended) { setTab("debrief"); setEndConfirm(false); } }, [sim.ended]);
  function toggleCitation(id: string) { setCitations((selected) => selected.includes(id) ? selected.filter((item) => item !== id) : [...selected, id]); }
  const reviewCount = sim.controls.filter((control) => control.status === "requested").length + (latestDecision && !sim.reviews.some((review) => review.decisionId === latestDecision.id) ? 1 : 0);
  async function finish() { if (await act({ type: "simulation_finish" }, "Simulation ended. The debrief shows the recorded consequences and decision process.")) setTab("debrief"); }
  return <>
    <div className="sim-heading"><div><span className="portal-tag">AML INVESTIGATION SIMULATION</span><h1>Retail account investigation</h1><p>Build your assessment from the available records. The clock moves when you advance it.</p></div><div className="sim-heading-actions"><button className="portal-text-button" disabled={busy} onClick={onRefresh}>Refresh records</button><button className="portal-button portal-button-subtle" disabled={busy} onClick={() => sim.ended ? onStart() : setNewConfirm(true)}>New assignment</button></div></div>
    {newConfirm && <div className="sim-confirm" role="group" aria-label="Start another assignment"><div><strong>Start a separate assignment?</strong><p>This run stays saved on the server. The new assignment will become this browser’s current simulation.</p></div><button className="portal-button portal-button-blue" disabled={busy} onClick={onStart}>Start new assignment</button><button className="portal-text-button" disabled={busy} onClick={() => setNewConfirm(false)}>Keep this assignment</button></div>}
    {immersive && <section ref={roomRef} className="sim-room-region" tabIndex={-1} aria-label="3D monitoring room">
      <MonitoringRoom sim={sim} role={view.role} stations={MONITORING_STATIONS.map((station) => ({
        ...station,
        onActivate: () => {
          setTab(station.id);
          focusWorkspace(workspaceRef.current);
        },
      }))} />
    </section>}
    <div className="sim-briefing"><p>{sim.briefing}</p><span className="sim-status">{sim.ended ? "Completed" : "In progress"}</span></div>
    <SimulationRunSummary view={view} />
    <div className="sim-clock-bar"><div><strong>{sim.ended ? "Simulation complete" : "Clock paused while reading"}</strong><span>Advance to deliver checks, apply approved controls and process due payments.</span></div><div className="sim-clock-actions"><button className="portal-button portal-button-subtle" disabled={busy || sim.ended || sim.elapsedMinutes >= sim.endMinute} onClick={() => act({ type: "simulation_advance", mode: "work", minutes: 1 }, "Simulation advanced by one minute.")}>+1 min</button><button className="portal-button portal-button-subtle" disabled={busy || sim.ended || sim.elapsedMinutes >= sim.endMinute} onClick={() => act({ type: "simulation_advance", mode: "work", minutes: 5 }, "Simulation advanced by five minutes.")}>+5 min</button><button className="portal-button portal-button-blue" disabled={busy || sim.ended || sim.elapsedMinutes >= sim.endMinute} onClick={() => act({ type: "simulation_advance", mode: "next" }, "Simulation advanced to the next scheduled event.")}>Next event →</button></div></div>
    <div className="sim-role-bar"><div><span className="sim-muted">Practice identity</span><strong>{view.role === "reviewer" ? "Simulated reviewer" : "Simulated analyst"}</strong></div><div className="sim-role-buttons" role="group" aria-label="Simulation practice role"><button aria-pressed={view.role === "analyst"} disabled={roleLocked} onClick={() => act({ type: "switch_role", role: "analyst" }, "Switched to the simulated analyst role.")}>Analyst</button><button aria-pressed={view.role === "reviewer"} disabled={roleLocked} onClick={() => act({ type: "switch_role", role: "reviewer" }, "Switched to the simulated reviewer role. This is a practice handoff.")}>Reviewer</button></div><p>Role switching is guided practice. A self-reviewed run is not independent practitioner validation.</p></div>
    <nav ref={workspaceRef} tabIndex={immersive ? -1 : undefined} className="sim-tabs" aria-label="Simulation workspace">{([["desk", "Investigation desk"], ["evidence", "Evidence"], ["decision", "Assessment"], ["review", `Review${reviewCount ? ` (${reviewCount})` : ""}`], ["activity", "Activity"], ["debrief", "Debrief"]] as [Tab, string][]).map(([id, label]) => <button key={id} aria-current={tab === id ? "page" : undefined} disabled={busy || id === "debrief" && !sim.ended} className={tab === id ? "is-active" : ""} onClick={() => setTab(id)}>{label}</button>)}{immersive && <button className="sim-return-to-room" onClick={() => focusWorkspace(roomRef.current)}>↑ Back to 3D room</button>}</nav>
    <div className="sim-tab-panel" hidden={tab !== "desk"}><div className="sim-columns"><div><CustomerRecords view={view} /><Panel title="Transaction history"><TransactionTable view={view} simulation={sim} /></Panel></div><div><PaymentQueue simulation={sim} /><ControlForm simulation={sim} role={view.role} busy={busy} act={act} citations={citations} onEvidence={() => setTab("evidence")} /><Panel title="Next investigative steps"><p>Request the records that could change your assessment. The available responses and pending payments follow the server’s simulation clock.</p><button className="portal-button portal-button-blue" onClick={() => setTab("evidence")}>Open evidence requests →</button></Panel></div></div></div>
    <div className="sim-tab-panel" hidden={tab !== "evidence"}><div className="sim-columns"><div><Panel title="Available evidence"><p className="sim-muted">Select records to cite in your assessment or control recommendation. Only released evidence is available.</p><SimulationEvidenceList evidence={sim.evidence} citations={citations} onToggle={toggleCitation} disabled={busy || sim.ended} /></Panel><div className="sim-citation-bar"><span>{citations.length} record{citations.length === 1 ? "" : "s"} selected</span><button className="portal-button portal-button-blue" disabled={busy || sim.ended} onClick={() => setTab("decision")}>Write assessment →</button></div></div><div><Panel title="Request further checks"><div className="sim-checks">{sim.requests.map((check) => <article className="sim-check" key={check.id}><div className="sim-check-heading"><h3>{check.title}</h3><span className={`sim-status sim-status-${check.status}`}>{words(check.status)}</span></div><p>{check.description}</p><dl className="sim-compact-definition"><div><dt>Source</dt><dd>{check.source}</dd></div><div><dt>Turnaround</dt><dd>{check.delayMinutes} simulated minutes</dd></div>{check.dueMinute !== null && <div><dt>{check.status === "complete" ? "Available from" : "Due at"}</dt><dd>Minute {check.dueMinute}</dd></div>}</dl><button className="portal-button portal-button-subtle" disabled={busy || sim.ended || view.role !== "analyst" || check.status !== "available"} onClick={() => act({ type: "simulation_request", requestId: check.id }, "Check requested. Advance the clock to receive its response.")}>{check.status === "pending" ? "Awaiting response" : check.status === "complete" ? "Response received" : check.status === "locked" ? "Earlier check required" : "Request check"}</button></article>)}</div>{view.role !== "analyst" && !sim.ended && <p className="sim-form-help">Switch to the analyst practice role to request checks.</p>}</Panel></div></div></div>
    <div className="sim-tab-panel" hidden={tab !== "decision"}><div className="sim-columns"><div><DecisionForm simulation={sim} role={view.role} busy={busy} citations={citations} act={act} onEvidence={() => setTab("evidence")} /><Panel title="Saved assessments">{!sim.decisions.length ? <p className="sim-empty">No assessment has been submitted. Draft your reasoning above.</p> : sim.decisions.slice().reverse().map((decision) => <DecisionRecord key={decision.id} decision={decision} evidence={sim.evidence} />)}</Panel></div><div><Panel title="Account control recommendations"><p>Recommend a hold or release from the investigation desk. The reviewer assesses it separately from this written assessment.</p><button className="portal-button portal-button-subtle" onClick={() => setTab("desk")}>Open account controls →</button></Panel><Panel title="Assess the evidence available now"><p>State what the records support, which alternative explanation you considered and what remains unknown. Escalating an alert does not establish a crime.</p><p>Your saved assessment retains the records available at that minute. Later evidence is not added to that decision’s evidence snapshot.</p></Panel></div></div></div>
    <div className="sim-tab-panel" hidden={tab !== "review"}><div className="sim-review-intro"><div><h2>Reviewer handoff</h2><p>Review the submitted reasoning and separately approve or reject control recommendations.</p></div>{view.role !== "reviewer" && !sim.ended && <button className="portal-button portal-button-blue" disabled={busy} onClick={() => act({ type: "switch_role", role: "reviewer" }, "Switched to the simulated reviewer role.")}>Practise reviewer role →</button>}</div><div className="sim-columns"><div><Panel title="Control recommendations">{!sim.controls.length ? <p className="sim-empty">No control recommendation has been submitted.</p> : sim.controls.slice().reverse().map((control) => <ControlReview key={control.id} control={control} simulation={sim} reviewer={view.role === "reviewer"} busy={busy} act={act} />)}</Panel></div><div><Panel title="Assessment review">{latestDecision ? <DecisionReview key={latestDecision.id} decision={latestDecision} simulation={sim} reviewer={view.role === "reviewer"} busy={busy} act={act} /> : <p className="sim-empty">The analyst has not submitted an assessment yet.</p>}</Panel>{sim.reviews.length > 0 && <Panel title="Recorded practice reviews">{sim.reviews.slice().reverse().map((review, index) => <article className="sim-review-record" key={`${review.decisionId}-${index}`}><div><strong>{review.decisionId} · {words(review.decision)}</strong><small>Minute {review.minute} · {review.reviewer}</small></div><p>{review.reason}</p><dl className="sim-rubric-summary">{Object.entries(review.rubric).map(([key, value]) => <div key={key}><dt>{SIMULATION_RUBRIC_LABELS[key as keyof SimulationRubric]}</dt><dd>{value}/4</dd></div>)}</dl></article>)}</Panel>}</div></div></div>
    <div className="sim-tab-panel" hidden={tab !== "activity"}><Panel title="Recorded activity"><p className="sim-muted">Ordered server events show which action occurred, who performed it and when.</p><div className="sim-table-wrap"><table className="sim-table"><thead><tr><th>Time · HKT</th><th>Practice identity</th><th>Action</th><th>Record</th><th>Detail</th></tr></thead><tbody>{view.events.map((event) => <tr key={event.seq}><td className="sim-nowrap">{formatTime(event.at)}</td><td>{event.actor}<small>{event.role}</small></td><td>{words(event.type)}</td><td>{event.refId || "—"}</td><td className="sim-event-detail">{event.detail}</td></tr>)}</tbody></table></div></Panel></div>
    {tab === "debrief" && <SimulationDebrief view={view} />}
    <div className="sim-bottom-bar"><div className="sim-export-actions"><button className="portal-text-button" onClick={() => saveFile(JSON.stringify(view, null, 2), `twinaml-simulation-${view.id}.json`, "application/json")}>Export visible run</button><button className="portal-text-button" onClick={() => saveFile(["Sequence,Time,Actor,Role,Action,Record,Detail", ...view.events.map((event) => [String(event.seq), event.at, event.actor, event.role, event.type, event.refId, event.detail].map(csvCell).join(","))].join("\r\n"), `twinaml-simulation-events-${view.id}.csv`, "text/csv;charset=utf-8")}>Export activity CSV</button><button className="portal-text-button" disabled={!sim.decisions.length} onClick={() => saveFile(JSON.stringify(buildBlindReviewPacket(view), null, 2), `twinaml-blind-review-${view.id}.json`, "application/json")}>Export blind review packet</button></div>{!sim.ended && <button className="sim-end-button" disabled={busy} onClick={() => setEndConfirm(true)}>End simulation & debrief</button>}</div>
    {endConfirm && !sim.ended && <div className="sim-confirm" role="group" aria-label="End simulation"><div><strong>Finish this investigation session?</strong><p>The clock will advance to minute {sim.endMinute}, processing remaining scheduled events. This run becomes read-only and the debrief is revealed.</p></div><button className="portal-button portal-button-gold" disabled={busy} onClick={() => { void finish(); }}>Confirm end simulation</button><button className="portal-text-button" disabled={busy} onClick={() => setEndConfirm(false)}>Keep investigating</button></div>}
    <p className="sim-run-meta">Run <code>{view.id}</code> · Dataset {sim.datasetVersion} · Policy {sim.policyVersion} · Rubric {sim.rubricVersion}</p>
  </>;
}

function Panel({ title, children, id }: { title: string; children: ReactNode; id?: string }) { return <section className="portal-card sim-panel" id={id} tabIndex={id ? -1 : undefined}><h2>{title}</h2>{children}</section>; }
export function SimulationRunSummary({ view }: { view: Run }) {
  const sim = view.simulation;
  if (!sim) return null;
  const upcoming = sim.payments.filter((payment) => payment.status === "pending").sort((a, b) => a.dueMinute - b.dueMinute)[0];
  return <div className="sim-summary"><div className="portal-card"><span>Simulation clock</span><strong>{String(sim.elapsedMinutes).padStart(2, "0")}<small> / {sim.endMinute} min</small></strong><progress value={sim.elapsedMinutes} max={sim.endMinute} aria-label="Elapsed simulation time" /></div><div className="portal-card"><span>Available account balance</span><strong>{currency.format(sim.balanceHkd)}</strong><small>{sim.held ? "Outbound restriction applied" : "Account remains unrestricted"}</small></div><div className="portal-card"><span>Next scheduled payment</span><strong>{upcoming ? currency.format(upcoming.amountHkd) : "—"}</strong><small>{upcoming ? `Due at minute ${upcoming.dueMinute} · ${Math.max(0, upcoming.dueMinute - sim.elapsedMinutes)} min remaining` : "No pending unrestricted payment"}</small></div></div>;
}
function CustomerRecords({ view }: { view: Run }) {
  const account = view.accounts.find((item) => item.internal);
  const customer = view.entities.find((item) => item.id === account?.entityId) || view.entities[0];
  return <Panel title="Customer & monitoring alert">{customer ? <><div className="sim-customer-title"><span className="sim-customer-avatar">{customer.name[0]}</span><div><h3>{customer.name}</h3><span>{account?.id || "Customer profile"}</span></div></div><dl className="sim-definition"><div><dt>Declared activity</dt><dd>{customer.business}</dd></div><div><dt>Source of funds</dt><dd>{customer.sourceOfFunds}</dd></div><div><dt>Expected monthly activity</dt><dd>{currency.format(customer.expectedMonthlyHkd)}</dd></div><div><dt>Jurisdiction</dt><dd>{customer.jurisdiction}</dd></div>{account && <div><dt>Account opened</dt><dd>{formatTime(account.openedAt)} HKT</dd></div>}</dl></> : <p>No customer profile is available.</p>}{view.alerts.map((alert) => <div className="sim-alert" key={alert.id}><strong>{alert.scenario}</strong><p>{currency.format(alert.creditHkd)} incoming · {currency.format(alert.debitHkd)} outgoing · {alert.fanOutPercent.toFixed(1)}% outflow</p><small>{alert.id} · Rule v{alert.rule.version} · {alert.transactionIds.length} contributing records</small></div>)}<p className="sim-small sim-muted">A monitoring match identifies activity to examine. It is not a finding of criminality.</p></Panel>;
}
function TransactionTable({ view, simulation }: { view: Run; simulation: SimulationView }) {
  return <div className="sim-table-wrap"><table className="sim-table"><thead><tr><th>Time · HKT</th><th>Transfer</th><th>Amount</th><th>Channel</th><th>Status</th></tr></thead><tbody>{view.transactions.map((transaction) => <tr key={transaction.id}><td className="sim-nowrap">{formatTime(transaction.at)}</td><td><strong>{transaction.id}</strong><small>{transaction.fromAccount} → {transaction.toAccount}</small><small>{transaction.reference}</small></td><td className="sim-nowrap">{currency.format(transaction.hkdAmount)}</td><td>{transaction.channel}</td><td><span className="sim-status">{words(simulation.payments.find((payment) => payment.id === transaction.id)?.status || transaction.status)}</span></td></tr>)}</tbody></table></div>;
}
function PaymentQueue({ simulation: sim }: { simulation: SimulationView }) {
  return <Panel title="Scheduled outbound instructions"><div className="sim-payments">{sim.payments.map((payment) => <article key={payment.id}><div><strong>{currency.format(payment.amountHkd)}</strong><span className={`sim-status sim-status-${payment.status}`}>{words(payment.status)}</span></div><p>{payment.id} · {payment.fromAccount} → {payment.toAccount}</p><small>{payment.executedMinute !== null ? `Executed at minute ${payment.executedMinute}` : `Due at minute ${payment.dueMinute}`}</small></article>)}</div><p className="sim-small sim-muted">A requested control does not restrict the account. Review and operational application must finish before a payment executes.</p></Panel>;
}
export function SimulationEvidenceList({ evidence, citations, onToggle, disabled }: { evidence: SimulationEvidence[]; citations: string[]; onToggle: (id: string) => void; disabled: boolean }) {
  return <div className="sim-evidence-list">{!evidence.length ? <p className="sim-empty">No records have been released yet.</p> : evidence.map((record) => <article className="sim-evidence" key={record.id}><div className="sim-evidence-heading"><h3>{record.title}</h3><label className="sim-citation-check"><input type="checkbox" aria-label={`Cite ${record.title}`} checked={citations.includes(record.id)} disabled={disabled} onChange={() => onToggle(record.id)} />Cite</label></div><div className="sim-evidence-meta"><code>{record.id}</code><span>Available from minute {record.availableMinute}</span></div><dl className="sim-compact-definition"><div><dt>Source</dt><dd>{record.source}</dd></div><div><dt>Reliability / limits</dt><dd>{record.reliability}</dd></div></dl><details><summary>Read source record</summary><div className="sim-document">{record.body}</div></details></article>)}</div>;
}
function CitationSummary({ simulation, citations, onEvidence }: { simulation: SimulationView; citations: string[]; onEvidence: () => void }) {
  return <div className="sim-citation-summary"><strong>Selected evidence ({citations.length})</strong>{citations.length ? <ul>{citations.map((id) => <li key={id}>{simulation.evidence.find((record) => record.id === id)?.title || id}<code>{id}</code></li>)}</ul> : <p>Select at least one available source record to support this action.</p>}<button type="button" className="portal-text-button" onClick={onEvidence}>{citations.length ? "Change evidence selection →" : "Select evidence →"}</button></div>;
}
function ControlForm({ simulation: sim, role, busy, act, citations, onEvidence }: { simulation: SimulationView; role: string; busy: boolean; act: Act; citations: string[]; onEvidence: () => void }) {
  const [control, setControl] = useState<"hold" | "release">("hold");
  const [reason, setReason] = useState("");
  const pendingControl = sim.controls.find((item) => item.status === "requested" || item.status === "approved");
  const disabled = busy || sim.ended || role !== "analyst" || Boolean(pendingControl);
  const changesAccount = control === "hold" ? !sim.held : sim.held;
  async function submit(event: FormEvent) {
    event.preventDefault();
    await act({ type: "simulation_recommend_control", control, reason, evidenceIds: citations }, "Control recommendation saved. The reviewer must assess it before operational application.");
  }
  return <Panel title="Recommend an account control"><p>Record a proportionate recommendation with supporting evidence. A recommendation does not itself hold or release funds.</p><form className="sim-form" onSubmit={(event) => { void submit(event); }}><fieldset disabled={disabled}><label>Recommendation<select value={control} onChange={(event) => setControl(event.target.value as "hold" | "release")}><option value="hold" disabled={sim.held}>Request outbound hold</option><option value="release" disabled={!sim.held}>Request release of outbound hold</option></select></label><label>Reason for this control<textarea value={reason} onChange={(event) => setReason(event.target.value)} required minLength={20} maxLength={4000} rows={3} placeholder="Explain why this control is proportionate to the available evidence." /></label><CitationSummary simulation={sim} citations={citations} onEvidence={onEvidence} /><button className="portal-button portal-button-subtle" disabled={!citations.length || reason.trim().length < 20 || !changesAccount}>Submit recommendation</button></fieldset></form>{pendingControl && !sim.ended && <p className="sim-form-help">{pendingControl.status === "requested" ? "A recommendation is awaiting reviewer assessment." : `An approved control awaits operational application at minute ${pendingControl.dueMinute}.`} Only one control request can be in progress at a time.</p>}{!changesAccount && !pendingControl && !sim.ended && <p className="sim-form-help">{sim.held ? "The outbound hold is already applied. Select release to recommend removing it." : "The account has no outbound hold to release."}</p>}{role !== "analyst" && !sim.ended && <p className="sim-form-help">Use the analyst practice role to make a recommendation.</p>}</Panel>;
}
function DecisionForm({ simulation: sim, role, busy, citations, act, onEvidence }: { simulation: SimulationView; role: string; busy: boolean; citations: string[]; act: Act; onEvidence: () => void }) {
  const [disposition, setDisposition] = useState<SimulationDisposition>("continue_review");
  const [reason, setReason] = useState("");
  const [alternative, setAlternative] = useState("");
  const [missing, setMissing] = useState("");
  const valid = citations.length > 0 && reason.trim().length >= 20 && alternative.trim().length >= 10 && missing.trim().length >= 10;
  const disabled = busy || sim.ended || role !== "analyst";
  async function submit(event: FormEvent) { event.preventDefault(); await act({ type: "simulation_submit_decision", disposition, reason, alternativeExplanation: alternative, missingInformation: missing, evidenceIds: citations }, "Assessment submitted for review. The clock and account continue independently of this recommendation."); }
  return <Panel title="Document your assessment"><p>Support your conclusion with the records available now. You can submit a revised assessment when further evidence arrives; earlier submissions remain in the history.</p><form className="sim-form" onSubmit={(event) => { void submit(event); }}><fieldset disabled={disabled}><label>Recommended disposition<select value={disposition} onChange={(event) => setDisposition(event.target.value as SimulationDisposition)}><option value="continue_review">Continue investigation — information unresolved</option><option value="escalate">Escalate for reporting / compliance review</option><option value="close">Recommend closure — explanation supported</option></select></label><label>Evidence-based reasoning<textarea value={reason} onChange={(event) => setReason(event.target.value)} required minLength={20} maxLength={4000} rows={5} placeholder="Explain which records support your assessment and which observations remain unresolved." /></label><label>Alternative explanation considered<textarea value={alternative} onChange={(event) => setAlternative(event.target.value)} required minLength={10} maxLength={2000} rows={3} placeholder="Describe a plausible alternative and how the evidence supports or weakens it." /></label><label>Missing information / next steps<textarea value={missing} onChange={(event) => setMissing(event.target.value)} required minLength={10} maxLength={2000} rows={3} placeholder="Record what remains unknown, or explain why the available information is sufficient." /></label><CitationSummary simulation={sim} citations={citations} onEvidence={onEvidence} /><button className="portal-button portal-button-blue" disabled={!valid}>Submit assessment for review</button></fieldset></form>{role !== "analyst" && !sim.ended && <p className="sim-form-help">Use the analyst practice role to submit an assessment.</p>}<p className="sim-small sim-muted">Text length checks confirm form completeness. They do not assess the quality of your reasoning.</p></Panel>;
}
function DecisionRecord({ decision, evidence }: { decision: SimulationDecision; evidence: SimulationEvidence[] }) {
  return <article className="sim-decision-record"><div className="sim-record-heading"><strong>{decision.id} · {words(decision.disposition)}</strong><span>Minute {decision.minute}</span></div><p>{decision.reason}</p><dl className="sim-definition"><div><dt>Alternative explanation</dt><dd>{decision.alternativeExplanation}</dd></div><div><dt>Missing information</dt><dd>{decision.missingInformation}</dd></div><div><dt>Cited sources</dt><dd>{decision.evidenceIds.join(", ")}</dd></div></dl><details><summary>Records available at minute {decision.minute} ({decision.availableEvidenceIds.length})</summary><ul className="sim-snapshot-list">{decision.availableEvidenceIds.map((id) => <li key={id}><strong>{id}</strong> {evidence.find((item) => item.id === id)?.title || "Saved source record"}</li>)}</ul></details></article>;
}
function ControlReview({ control, simulation: sim, reviewer, busy, act }: { control: SimulationControl; simulation: SimulationView; reviewer: boolean; busy: boolean; act: Act }) {
  const [reason, setReason] = useState("");
  const disabled = busy || sim.ended || !reviewer;
  return <article className="sim-control-review"><div className="sim-record-heading"><strong>{control.id} · {control.control === "hold" ? "Outbound hold" : "Release outbound hold"}</strong><span className={`sim-status sim-status-${control.status}`}>{words(control.status)}</span></div><p>{control.reason}</p><small>Requested at minute {control.requestedMinute} · Cited: {control.evidenceIds.join(", ")}</small>{control.reviewReason && <p className="sim-review-reason"><strong>Reviewer:</strong> {control.reviewReason}</p>}{control.status === "approved" && <p className="sim-operation-note">Approved for operational application at minute {control.dueMinute}. The account status changes only when the clock reaches that event.</p>}{control.status === "applied" && <p className="sim-operation-note">Applied at minute {control.appliedMinute}.</p>}{control.status === "requested" && <form className="sim-form" onSubmit={(event) => event.preventDefault()}><fieldset disabled={disabled}><label>Reviewer reason<textarea required minLength={20} maxLength={4000} rows={3} value={reason} onChange={(event) => setReason(event.target.value)} placeholder="Assess the evidence and proportionality of the requested control." /></label><div className="sim-inline-actions"><button className="portal-button portal-button-blue" disabled={reason.trim().length < 20} onClick={() => act({ type: "simulation_review_control", controlId: control.id, decision: "approve", reason }, "Control approved. Advance the clock to its operational application time.")}>Approve recommendation</button><button className="portal-button portal-button-subtle" disabled={reason.trim().length < 20} onClick={() => act({ type: "simulation_review_control", controlId: control.id, decision: "reject", reason }, "Control recommendation rejected; the account status is unchanged.")}>Reject recommendation</button></div></fieldset>{!reviewer && !sim.ended && <p className="sim-form-help">Switch to the reviewer practice role to review this recommendation.</p>}</form>}</article>;
}
function DecisionReview({ decision, simulation: sim, reviewer, busy, act }: { decision: SimulationDecision; simulation: SimulationView; reviewer: boolean; busy: boolean; act: Act }) {
  const [reason, setReason] = useState("");
  const [rubric, setRubric] = useState<SimulationRubric>({ evidence: 0, alternatives: 0, proportionality: 0, documentation: 0 });
  const reviewed = sim.reviews.some((review) => review.decisionId === decision.id);
  const ratingsComplete = Object.values(rubric).every((rating) => rating >= 1 && rating <= 4);
  return <><DecisionRecord decision={decision} evidence={sim.evidence} />{!reviewed && !sim.ended && <form className="sim-form sim-decision-review-form" onSubmit={(event) => event.preventDefault()}><p>Rate each dimension using the evidence available at minute {decision.minute}. These are practice reviewer ratings.</p><details className="sim-rubric-guide"><summary>Reviewer rubric guide</summary>{Object.entries(SIMULATION_RUBRIC_GUIDE).map(([key, anchors]) => <div key={key}><h3>{SIMULATION_RUBRIC_LABELS[key as keyof SimulationRubric]}</h3><ul>{anchors.map((anchor) => <li key={anchor}>{anchor}</li>)}</ul></div>)}</details><fieldset disabled={busy || !reviewer}><div className="sim-rubric-grid">{Object.entries(SIMULATION_RUBRIC_LABELS).map(([key, label]) => <label key={key}>{label}<select value={rubric[key as keyof SimulationRubric]} onChange={(event) => setRubric((current) => ({ ...current, [key]: Number(event.target.value) }))}><option value={0} disabled>Select rating</option><option value={1}>1 — Limited</option><option value={2}>2 — Partial</option><option value={3}>3 — Sound</option><option value={4}>4 — Strong</option></select></label>)}</div><label>Reviewer feedback<textarea required minLength={20} maxLength={4000} rows={4} value={reason} onChange={(event) => setReason(event.target.value)} placeholder="Explain the ratings and any further work required. Consider the information available when this decision was submitted." /></label><div className="sim-inline-actions"><button className="portal-button portal-button-blue" disabled={reason.trim().length < 20 || !ratingsComplete} onClick={() => act({ type: "simulation_review_decision", decisionId: decision.id, decision: "approve", reason, rubric }, "Assessment review recorded. This does not apply account controls or file an external report.")}>Approve assessment</button><button className="portal-button portal-button-subtle" disabled={reason.trim().length < 20 || !ratingsComplete} onClick={() => act({ type: "simulation_review_decision", decisionId: decision.id, decision: "return", reason, rubric }, "Assessment returned with feedback. The analyst can submit a revised assessment.")}>Return for further work</button></div></fieldset>{!reviewer && <p className="sim-form-help">Switch to the reviewer practice role to record this review.</p>}</form>}{reviewed && <p className="sim-operation-note">A practice review has been recorded for this assessment.</p>}</>;
}
export function SimulationDebrief({ view }: { view: Run }) {
  const sim = view.simulation;
  if (!sim?.ended || !sim.debrief) return <Panel title="Debrief"><p>The scenario context is available after you end the simulation.</p></Panel>;
  const debrief = sim.debrief;
  const executed = sim.payments.filter((payment) => payment.status === "executed");
  const held = sim.payments.filter((payment) => payment.status === "held");
  return <><div className="sim-debrief-heading"><span className="portal-tag">COMPLETED SIMULATION</span><h2>Review the investigation, not just the ending.</h2><p>{debrief.outcome}</p></div><div className="sim-columns"><div><Panel title="Scenario context"><p>{debrief.scenarioContext}</p><ul className="sim-observations">{debrief.observations.map((observation, index) => <li key={index}>{observation}</li>)}</ul></Panel><Panel title="Decision process"><ul className="sim-procedure">{debrief.procedure.map((item, index) => <li key={index}><span className={item.complete ? "is-complete" : "is-incomplete"} aria-hidden="true">{item.complete ? "✓" : "○"}</span><span>{item.label}<small>{item.complete ? "Recorded" : "Not recorded"}</small></span></li>)}</ul><p className="sim-small sim-muted">This checklist records observable procedure. Reasoning quality requires human review.</p></Panel></div><div><Panel title="Recorded payment consequences"><div className="sim-consequence"><span>Executed outbound payments</span><strong>{currency.format(executed.reduce((sum, payment) => sum + payment.amountHkd, 0))}</strong><small>{executed.length} instruction{executed.length === 1 ? "" : "s"}</small></div><div className="sim-consequence"><span>Instructions held</span><strong>{currency.format(held.reduce((sum, payment) => sum + payment.amountHkd, 0))}</strong><small>{held.length} instruction{held.length === 1 ? "" : "s"}</small></div><p className="sim-small sim-muted">Holding a payment is an operational consequence. The quality of that decision depends on the evidence and proportionality.</p></Panel><Panel title="Validation & limitations"><span className="sim-status">Practitioner validation pending</span><ul className="sim-limitations">{debrief.limitations.map((limitation, index) => <li key={index}>{limitation}</li>)}</ul><p className="sim-small sim-muted">Dataset {sim.datasetVersion} · Policy {sim.policyVersion} · Rubric {sim.rubricVersion}</p></Panel></div></div></>;
}
