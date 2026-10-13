import { useEffect, useState } from "react";
import type { CaseLibraryView, CaseRating, CaseSessionView, CaseStep } from "../../packages/investigation/types";

const RUN_KEY = "twinaml-case-session";
const API_BASE = (import.meta.env.VITE_API_URL || "").replace(/\/$/, "");
const ratings: Record<CaseRating, [string, string]> = {
  acceptable: ["Acceptable handling", "Your path ended in an outcome the rules accept."],
  incomplete: ["Incomplete handling", "Your path stopped short of what the rules require."],
  poor: ["Poor handling", "Your path ended in an outcome the rules do not accept."],
  unrated: ["Outcome recorded", "This outcome is not rated by the script."],
};

class ApiError extends Error {
  constructor(message: string, public status: number) { super(message); }
}
async function call<T>(path: string, body?: object): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, body ? { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) } : undefined);
  const result = await response.json().catch(() => null);
  if (!response.ok) throw new ApiError(result?.error?.replaceAll("_", " ") || "The case library could not respond. Please try again.", response.status);
  return result;
}
function savedRun() { try { return localStorage.getItem(RUN_KEY); } catch { return null; } }
function saveRun(id: string | null) { try { if (id) localStorage.setItem(RUN_KEY, id); else localStorage.removeItem(RUN_KEY); } catch { /* resume is a convenience */ } }
function words(value: string) { return value.replaceAll("_", " "); }

// The twin is rendered as the server sends it: one row per leaf, one row per array item.
function twinRows(value: unknown, path = ""): [string, string][] {
  if (Array.isArray(value)) {
    if (value.every((item) => item === null || typeof item !== "object")) return [[path, value.length ? value.map(String).join(", ") : "—"]];
    return value.map((item, index) => [`${path} ${index + 1}`, Object.values(item as object).map(String).join(" · ")]);
  }
  if (value && typeof value === "object") return Object.entries(value).flatMap(([key, item]) => twinRows(item, path ? `${path}.${key}` : key));
  return [[path, value === null || value === "" ? "—" : String(value)]];
}

function Steps({ steps }: { steps: CaseStep[] }) {
  return <ol className="lib-steps">{steps.map((step, index) => <li key={index} className={step.decision ? "lib-step-decision" : ""}>{step.label}</li>)}</ol>;
}

export function CaseLibrary() {
  const [library, setLibrary] = useState<CaseLibraryView | null>(null);
  const [run, setRun] = useState<CaseSessionView | null>(null);
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    document.title = "Case library · TwinAML";
    let cancelled = false;
    const id = savedRun();
    Promise.all([
      call<CaseLibraryView>("/api/cases"),
      id ? call<CaseSessionView>(`/api/case-sessions/${encodeURIComponent(id)}`).catch(() => { saveRun(null); return null; }) : null,
    ]).then(([view, resumed]) => { if (!cancelled) { setLibrary(view); setRun(resumed); } })
      .catch((err) => { if (!cancelled) setError(err instanceof Error ? err.message : "Unable to open the case library."); })
      .finally(() => { if (!cancelled) setBusy(false); });
    return () => { cancelled = true; };
  }, []);

  async function start(caseId: string) {
    setBusy(true); setError("");
    try {
      const view = await call<CaseSessionView>("/api/case-sessions", { caseId });
      setRun(view); saveRun(view.id); window.scrollTo(0, 0);
    } catch (err) { setError(err instanceof Error ? err.message : "Unable to start this case."); }
    finally { setBusy(false); }
  }
  async function choose(choiceId: string) {
    if (!run) return;
    setBusy(true); setError("");
    try { setRun(await call<CaseSessionView>(`/api/case-sessions/${encodeURIComponent(run.id)}/decisions`, { revision: run.revision, choiceId })); }
    catch (err) {
      if (err instanceof ApiError && err.status === 409) {
        try { setRun(await call<CaseSessionView>(`/api/case-sessions/${encodeURIComponent(run.id)}`)); setError("This case changed in another window. It has been refreshed; review it before choosing again."); }
        catch { setError("This case changed in another window. Reload the page before choosing again."); }
      } else setError(err instanceof Error ? err.message : "Your decision could not be saved. Please try again.");
    } finally { setBusy(false); }
  }
  function leave() { setRun(null); saveRun(null); setError(""); window.scrollTo(0, 0); }

  return <>
    <a className="skip-link" href="#cases">Skip to case library</a>
    <header className="topbar">
      <a className="brand" href="/cases" aria-label="TwinAML case library"><span className="brand-mark" aria-hidden="true">II</span><span>TwinAML<small>CASE LIBRARY</small></span></a>
      <div className="training-label"><span className="status-dot" />Training simulation · synthetic cases</div>
      <div className="top-actions">{run && <button className="text-button" onClick={leave}>All workflows</button>}<a className="new-shift" href="/">The Second Ledger</a></div>
    </header>
    {error && <div className="message error-message" role="alert">{error}</div>}
    <main id="cases" className="lib-main">
      {!library ? <p className="empty-state">{busy ? "Opening the case library…" : "The case library is unavailable."}</p>
        : run ? <CaseRun run={run} busy={busy} onChoose={choose} onReplay={() => start(run.caseId)} onLeave={leave} />
        : <Library library={library} busy={busy} onStart={start} />}
    </main>
  </>;
}

function Library({ library, busy, onStart }: { library: CaseLibraryView; busy: boolean; onStart: (caseId: string) => void }) {
  return <>
    <section className="lib-intro">
      <p className="eyebrow">ELEVEN AML WORKFLOWS</p>
      <h1>Learn how each scheme works, then <em>handle it.</em></h1>
      <p>Each workflow starts with how the money moves in the real world. Open a case to make the decisions yourself. The rules in the script decide the outcome, and the debrief explains every choice you made. All customers, accounts and amounts are synthetic.</p>
    </section>
    <ol className="lib-grid">{library.workflows.map((workflow) => <li key={workflow.number} className="lib-card">
      <span className="case-number">{String(workflow.number).padStart(2, "0")}</span>
      <h2>{workflow.title}</h2>
      <p className="lib-meta"><strong>Your role:</strong> {workflow.role}</p>
      <p className="lib-meta"><strong>Training goal:</strong> {workflow.goal}</p>
      <details><summary>How it works in the real world</summary><p>{workflow.method}</p><Steps steps={workflow.realWorld} /></details>
      {workflow.walkthrough && <details><summary>Teaching flow (read-only)</summary><Steps steps={workflow.walkthrough.teaching} />{workflow.walkthrough.teachingNotes.map((note, i) => <p key={i}>{note}</p>)}</details>}
      <div className="lib-cases">{workflow.cases.length ? workflow.cases.map((item) => <div key={item.caseId} className="lib-case">
        <h3>{item.title}</h3><p>{item.summary}</p>
        <button className="primary-button" disabled={busy} onClick={() => onStart(item.caseId)}>Start case</button>
      </div>) : <p className="lib-note">No playable case yet. Read the teaching flow above.</p>}</div>
    </li>)}</ol>
  </>;
}

function CaseRun({ run, busy, onChoose, onReplay, onLeave }: { run: CaseSessionView; busy: boolean; onChoose: (id: string) => void; onReplay: () => void; onLeave: () => void }) {
  const { workflow, debrief } = run;
  return <div className="lib-run">
    <div className="lib-story">
      <section className="lib-brief">
        <p className="eyebrow">WORKFLOW {String(workflow.number).padStart(2, "0")} / {workflow.title.toUpperCase()}</p>
        <h1>{run.title}</h1>
        <p><strong>Your role:</strong> {workflow.role}</p>
        <p><strong>Training goal:</strong> {workflow.goal}</p>
        <details><summary>How it works in the real world</summary><p>{workflow.method}</p><Steps steps={workflow.realWorld} /></details>
      </section>
      <ol className="lib-feed" aria-label="Case so far">{run.story.map((node, index) => <li key={`${node.id}-${index}`} className={`lib-node lib-node-${node.type}`}>
        <p className="eyebrow">{node.type === "decision" ? "DECISION" : node.type === "outcome" ? "OUTCOME" : "CASE FILE"}</p>
        <h2>{node.title}</h2>
        <p>{node.prompt}</p>
        {node.mediaRef && <p className="lib-note">Media not included in this demo: {node.mediaRef.split("/").pop()}</p>}
        {node.chosen && <p className="lib-chosen">You chose: {node.chosen}</p>}
      </li>)}</ol>
      {run.choices.length > 0 && <section className="lib-choices" aria-label="Your decision">
        <p className="eyebrow">WHAT DO YOU DO?</p>
        {run.choices.map((choice) => <button key={choice.id} className="secondary-button" disabled={busy} onClick={() => onChoose(choice.id)}>{choice.label}</button>)}
      </section>}
      {debrief && <section className={`lib-debrief lib-rating-${debrief.rating}`} aria-label="Debrief">
        <p className="eyebrow">DEBRIEF</p>
        <h2>{ratings[debrief.rating][0]}</h2>
        <p>{ratings[debrief.rating][1]} Final disposition: <strong>{words(debrief.disposition)}</strong>.</p>
        <h3>Your decisions</h3>
        <ol>{debrief.decisions.map((item, i) => <li key={i}><strong>{item.title}:</strong> {item.choice}<br /><span>{item.rationale}</span></li>)}</ol>
        <h3>The rules in this case</h3>
        <ul>{debrief.rules.map((rule) => <li key={rule.id}><strong>{rule.id}:</strong> {rule.when}{rule.note && <><br /><span>{rule.note}</span></>}</li>)}</ul>
        <h3>The model workflow</h3>
        <Steps steps={debrief.teaching} />
        {debrief.teachingNotes.map((note, i) => <p key={i}>{note}</p>)}
        <div className="lib-actions"><button className="primary-button" disabled={busy} onClick={onReplay}>Try this case again</button><button className="secondary-button" onClick={onLeave}>All workflows</button></div>
      </section>}
    </div>
    <aside className="lib-twin" aria-label="Twin state">
      <p className="eyebrow">DIGITAL TWIN · LIVE STATE</p>
      <dl>{twinRows(run.twin).map(([key, value]) => <div key={key}><dt>{words(key)}</dt><dd>{words(value)}</dd></div>)}</dl>
      <p className="eyebrow">RULES IN FORCE</p>
      <ul>{run.rules.map((rule) => <li key={rule.id}><strong>{rule.id}</strong> {rule.when}</li>)}</ul>
      <p className="eyebrow">EVENT LOG</p>
      <ol className="lib-events">{run.events.map((event) => <li key={event.seq}>{event.seq}. {words(event.type)}{event.detail && `: ${words(event.detail)}`}</li>)}</ol>
    </aside>
  </div>;
}
