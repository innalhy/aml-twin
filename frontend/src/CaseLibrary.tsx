import { lazy, Suspense, useEffect, useId, useRef, useState, type ReactNode } from "react";
import { apiFetch, loadResume, saveResume, sessionKey } from "./account-api";
import type { CaseLibraryView, CaseNodeView, CaseRating, CaseSessionView, CaseStep } from "../../packages/investigation/types";
import "./training-cases.css";
import "./guided-scene.css";

const SceneViewport = lazy(() => import("./SceneViewport").then((module) => ({ default: module.SceneViewport })));

const RUN_KEY = "twinaml-case-session";
const preferredCases: Record<number, string> = { 1: "project-meridian-001", 2: "mule-mixer-001" };
const ratings: Record<CaseRating, [string, string]> = {
  acceptable: ["Scenario completed successfully", "You followed a path accepted by this scenario’s rules."],
  incomplete: ["There is more to investigate", "Your path stopped short of the scenario’s requirements. Review the teaching notes and try again."],
  poor: ["A decision to learn from", "Your decision led to an unsuccessful outcome. Review what happened, then try another approach."],
  unrated: ["Scenario completed", "Your decisions and the resulting outcome have been saved."],
};
class ApiError extends Error {
  constructor(message: string, public status: number) { super(message); }
}
async function call<T>(path: string, body?: object): Promise<T> {
  const response = await apiFetch(path, body === undefined ? undefined : { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  const result = await response.json().catch(() => null);
  if (!response.ok) {
    const message = typeof result?.error === "string" ? result.error.replaceAll("_", " ") : result?.error?.message;
    throw new ApiError(message || "The case library could not respond. Please try again.", response.status);
  }
  if (!result) throw new Error("The case library returned an unreadable response. Please try again.");
  return result as T;
}
function saveRun(key: string, id: string | null) { try { saveResume(key, id); } catch { /* Submitted progress stays on the server; the URL provides a resume shortcut. */ } }
function words(value: string) { return value.replaceAll("_", " "); }

export function useCaseLibrary(accountId: string | null = null, resumeFromUrl = true) {
  const storageKey = sessionKey(RUN_KEY, accountId);
  const [library, setLibrary] = useState<CaseLibraryView | null>(null);
  const [run, setRun] = useState<CaseSessionView | null>(null);
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState("");
  const [reload, setReload] = useState(0);
  useEffect(() => {
    setBusy(true); setError("");
    let cancelled = false;
    const id = loadResume(storageKey, resumeFromUrl);
    Promise.all([
      call<CaseLibraryView>("/api/cases"),
      id ? call<CaseSessionView>(`/api/case-sessions/${encodeURIComponent(id)}`).catch((err) => {
        if (!cancelled) {
          if (err instanceof ApiError && [400, 404].includes(err.status)) {
            if (resumeFromUrl) saveRun(storageKey, null);
            else try { localStorage.removeItem(storageKey); } catch { /* Other training areas retain their URL selection. */ }
          }
          setError(err instanceof Error ? `Unable to resume your saved case: ${err.message}` : "Unable to resume your saved case. Please try again.");
        }
        return null;
      }) : null,
    ]).then(([view, resumed]) => { if (!cancelled) { setLibrary(view); setRun(resumed); } })
      .catch((err) => { if (!cancelled) setError(err instanceof Error ? err.message : "Unable to open the case library."); })
      .finally(() => { if (!cancelled) setBusy(false); });
    return () => { cancelled = true; };
  }, [storageKey, reload, resumeFromUrl]);
  async function start(caseId: string) {
    if (busy) return null;
    setBusy(true); setError("");
    try {
      const next = await call<CaseSessionView>("/api/case-sessions", { caseId });
      setRun(next); saveRun(storageKey, next.id); window.scrollTo(0, 0); return next;
    } catch (err) { setError(err instanceof Error ? err.message : "Unable to start this case."); return null; }
    finally { setBusy(false); }
  }
  async function resume(id: string) {
    if (busy) return null;
    setBusy(true); setError("");
    try {
      const next = await call<CaseSessionView>(`/api/case-sessions/${encodeURIComponent(id)}`);
      setRun(next); saveRun(storageKey, next.id); window.scrollTo(0, 0); return next;
    } catch (err) { setError(err instanceof Error ? err.message : "Unable to resume this case."); return null; }
    finally { setBusy(false); }
  }
  async function choose(choiceId: string, options?: { keepPosition?: boolean }) {
    if (!run || busy) return null;
    setBusy(true); setError("");
    try {
      const next = await call<CaseSessionView>(`/api/case-sessions/${encodeURIComponent(run.id)}/decisions`, { revision: run.revision, choiceId });
      setRun(next);
      if (!options?.keepPosition) window.scrollTo(0, 0);
      return next;
    } catch (err) {
      if (err instanceof ApiError && err.status === 409) {
        try { setRun(await call<CaseSessionView>(`/api/case-sessions/${encodeURIComponent(run.id)}`)); setError("This case changed in another window. It has been refreshed; review it before choosing again."); }
        catch { setError("This case changed in another window. Reload the page before choosing again."); }
      } else setError(err instanceof Error ? err.message : "Your decision could not be saved. Please try again.");
      return null;
    } finally { setBusy(false); }
  }
  function leave() { if (busy) return; setRun(null); saveRun(storageKey, null); setError(""); window.scrollTo(0, 0); }
  return { library, run, busy, error, retry: () => setReload((value) => value + 1), start, choose, leave, resume };
}

function Steps({ steps }: { steps: CaseStep[] }) {
  return <ol className="course-steps">{steps.map((step, index) => <li key={index} className={step.decision ? "course-step-decision" : ""}>{step.label}</li>)}</ol>;
}
function Copy({ text }: { text: string }) {
  return <div className="course-copy">{text.split(/\n\s*\n/).filter(Boolean).map((paragraph, index) => <p key={index}>{paragraph}</p>)}</div>;
}
function Panel({ title, children, className = "" }: { title: string; children: ReactNode; className?: string }) {
  return <section className={`course-panel ${className}`}><h2 className="course-panel-title">{title}</h2>{children}</section>;
}

export function TrainingTopics({ library, run, busy, onStart, completedTopics, initialOverview = null }: { initialOverview?: number | null; library: CaseLibraryView; run: CaseSessionView | null; busy: boolean; onStart: (id: string) => void; completedTopics?: ReadonlySet<number> }) {
  const [overview, setOverview] = useState<number | null>(initialOverview);
  const selected = library.workflows.find((workflow) => workflow.number === overview);
  return <div className="training-topics">
    <div className="training-page-heading"><p className="training-eyebrow">Your learning journey</p><h1>Choose a learning topic</h1><p>Explore real-world financial crime scenarios and put your judgement into practice.</p></div>
    {selected && <section className="course-panel course-topic-overview" aria-labelledby="topic-overview-heading"><div className="course-overview-heading"><div><p className="training-eyebrow">Topic {String(selected.number).padStart(2, "0")} · Overview</p><h2 id="topic-overview-heading">{selected.title}</h2></div><button className="course-text-button" onClick={() => setOverview(null)} aria-label="Close topic overview">Close ×</button></div><p>{selected.goal}</p><Copy text={selected.method} /><h3>How the scheme works</h3><Steps steps={selected.realWorld} />{selected.walkthrough && <><h3>Teaching flow</h3><Steps steps={selected.walkthrough.teaching} />{selected.walkthrough.teachingNotes.map((note, index) => <p key={index}>{note}</p>)}</>}<p className="course-note">This topic is a read-only learning overview. A playable scenario is not available yet.</p></section>}
    <ol className="course-topic-grid">{library.workflows.map((workflow) => {
      const primary = workflow.cases.find((item) => item.caseId === preferredCases[workflow.number]) ?? workflow.cases[0];
      const current = workflow.cases.some((item) => item.caseId === run?.caseId);
      const completed = Boolean(completedTopics?.has(workflow.number)) || current && Boolean(run?.debrief);
      const active = current && !run?.debrief;
      const alternates = workflow.cases.filter((item) => item.caseId !== primary?.caseId);
      return <li key={workflow.number} className="course-topic-card"><div className="course-topic-top"><span className="course-topic-number">Topic {String(workflow.number).padStart(2, "0")}</span><span className={`course-status ${completed ? "course-status-completed" : !primary ? "course-status-overview" : ""}`}>{active ? "In progress" : completed ? "Completed" : primary ? "Ready" : "Overview"}</span></div><h2>{workflow.title}</h2><p className="course-topic-summary">{workflow.goal}</p><div className="course-topic-meta"><span>{primary ? "Interactive scenario" : "Learning overview"}</span><span>{primary ? "Learn by doing" : "Read at your pace"}</span></div><button className="course-gold-button course-topic-start" disabled={busy} onClick={() => { if (primary) onStart(active && run ? run.caseId : primary.caseId); else { setOverview(workflow.number); window.scrollTo(0, 0); } }}>{active ? "Continue topic" : completed ? "Practise again" : primary ? "Start topic" : "View overview"}<span aria-hidden="true">→</span></button>{alternates.length > 0 && <details className="course-alternates"><summary>More scenarios ({alternates.length})</summary>{alternates.map((item) => <div key={item.caseId}><h3>{item.title}</h3><p>{item.summary}</p><button className="course-text-button" disabled={busy} onClick={() => onStart(item.caseId)}>Start scenario →</button></div>)}</details>}</li>;
    })}</ol>
    <p className="course-library-note">All scenarios use synthetic people, organisations and transactions. Your choices are saved as you progress.</p>
  </div>;
}

type Stage = { id: string; label: string };
const meridianStages: Stage[] = [{ id: "brief", label: "Brief" }, { id: "email", label: "Email" }, { id: "video", label: "Video" }, { id: "pay", label: "Pay" }, { id: "outcome", label: "Outcome" }, { id: "teach", label: "Teach" }];
const mixerStages: Stage[] = [{ id: "brief", label: "Brief" }, { id: "bank", label: "Bank" }, { id: "onchain", label: "On-chain" }, { id: "decision", label: "Decision" }, { id: "outcome", label: "Outcome" }, { id: "teach", label: "Teach" }];
const genericStages: Stage[] = [{ id: "brief", label: "Brief" }, { id: "investigate", label: "Investigate" }, { id: "decision", label: "Decision" }, { id: "outcome", label: "Outcome" }, { id: "teach", label: "Teach" }];
function stageIndex(run: CaseSessionView, stages: Stage[]) {
  if (run.debrief) return stages.findIndex((stage) => stage.id === "outcome");
  const node = run.story.at(-1);
  const text = `${node?.id ?? ""} ${node?.title ?? ""}`.toLowerCase();
  for (let index = stages.length - 3; index >= 0; index--) {
    const stage = stages[index];
    if (text.includes(stage.id) || stage.id === "pay" && /payment|transfer/.test(text) || stage.id === "onchain" && /on.chain|wallet|blockchain/.test(text)) return index;
  }
  return genericStages === stages ? (run.revision ? 2 : 1) : Math.min(run.revision, stages.length - 3);
}
function twinRows(value: unknown, path = ""): [string, string][] {
  if (Array.isArray(value)) {
    if (value.every((item) => item === null || typeof item !== "object")) return [[path, value.length ? value.map(String).join(", ") : "—"]];
    return value.flatMap((item, index) => twinRows(item, `${path} ${index + 1}`));
  }
  if (value && typeof value === "object") return Object.entries(value).flatMap(([key, item]) => twinRows(item, path ? `${path}.${key}` : key));
  return [[path, value === null || value === "" ? "—" : String(value)]];
}
function Evidence({ node }: { node: CaseNodeView }) {
  return <article className="course-evidence"><h3>{node.title}</h3><Copy text={node.prompt} />{node.mediaRef && <p className="course-note">Transcript and source text are provided for this exercise. The original media file is not included.</p>}{node.chosen && <p className="course-recorded-choice"><strong>Your decision:</strong> {node.chosen}</p>}</article>;
}

const scenePanels = [
  { id: "briefing", label: "Briefing", title: "Case briefing" },
  { id: "evidence", label: "Evidence", title: "Evidence records" },
  { id: "decision", label: "Decision", title: "Decision desk" },
  { id: "activity", label: "Activity", title: "Case activity" },
] as const;
type ScenePanel = typeof scenePanels[number]["id"];
type GuidedScene = "onboarding" | "branch";
const guidedSceneTitles: Record<GuidedScene, string> = {
  onboarding: "Client onboarding & due diligence",
  branch: "Branch suspicious activity review",
};

function GuidedCaseScene({ kind, run, contents }: {
  kind: GuidedScene;
  run: CaseSessionView;
  contents: Record<ScenePanel, ReactNode>;
}) {
  const [selection, setSelection] = useState<{ revision: number; panel: ScenePanel }>();
  const heading = useRef<HTMLHeadingElement>(null);
  const headingId = useId();
  const panelId = useId();
  const focusRequested = useRef(false);
  const lastRevision = useRef(run.revision);
  const defaultPanel = run.debrief ? "decision" : run.revision === 0 ? "briefing" : "evidence";
  const panel = selection?.revision === run.revision ? selection.panel : defaultPanel;
  const title = panel === "decision" && run.debrief
    ? "Scenario outcome"
    : scenePanels.find((item) => item.id === panel)?.title;

  function openPanel(next: ScenePanel) {
    focusRequested.current = true;
    setSelection({ revision: run.revision, panel: next });
  }

  useEffect(() => {
    const changed = lastRevision.current !== run.revision;
    lastRevision.current = run.revision;
    if (!focusRequested.current && !changed) return;
    focusRequested.current = false;
    heading.current?.focus({ preventScroll: true });
    heading.current?.scrollIntoView({ block: "nearest" });
  }, [run.revision, selection]);

  return <div className="course-immersive">
    <div className="course-immersive-scene">
      <Suspense fallback={<div className="course-immersive-loading" role="status">Opening the 3D environment…</div>}>
        <SceneViewport kind={kind} hotspots={scenePanels.map(({ id, title }) => ({
          id,
          label: id === "decision" && run.debrief ? "Scenario outcome" : title,
          onActivate: () => openPanel(id),
        }))} />
      </Suspense>
    </div>
    <div className="course-immersive-workspace">
      <div className="course-immersive-controls" role="group" aria-label="Case workspace">
        {scenePanels.map(({ id, label }) => <button key={id} type="button" aria-controls={panelId} aria-pressed={panel === id} onClick={() => openPanel(id)}>
          {id === "decision" && run.debrief ? "Outcome" : label}
        </button>)}
      </div>
      <section className="course-immersive-panel" id={panelId} aria-labelledby={headingId} key={panel}>
        <h2 id={headingId} ref={heading} tabIndex={-1}>{title}</h2>
        {contents[panel]}
        {panel === "briefing" && <button className="course-outline-button course-immersive-next" onClick={() => openPanel("evidence")}>Inspect evidence <span aria-hidden="true">→</span></button>}
        {panel === "evidence" && <button className="course-outline-button course-immersive-next" onClick={() => openPanel("decision")}>
          {run.debrief ? "Review outcome" : "Open decision desk"} <span aria-hidden="true">→</span>
        </button>}
      </section>
    </div>
  </div>;
}

function CaseActivity({ run }: { run: CaseSessionView }) {
  return <>
    <p className="course-note">The current state and events come from your saved training run.</p>
    <h3>Current twin state</h3>
    <dl className="course-twin-state">{twinRows(run.twin).map(([key, value]) => <div key={key}>
      <dt>{words(key)}</dt><dd>{words(value)}</dd>
    </div>)}</dl>
    <h3>Rules in force</h3>
    <ul className="course-rules">{run.rules.map((rule) => <li key={rule.id}>
      <strong>{words(rule.id)}</strong><p>{rule.when}</p>
    </li>)}</ul>
    <h3>Activity history</h3>
    <ol className="course-events">{run.events.map((event) => <li key={event.seq}>
      <strong>{words(event.type)}</strong>{event.detail && <span>{words(event.detail)}</span>}
    </li>)}</ol>
  </>;
}

export function TrainingPlayer({ run, busy, scene, onChoose, onReplay, onLeave }: {
  run: CaseSessionView;
  busy: boolean;
  scene?: GuidedScene;
  onChoose: (id: string, options?: { keepPosition?: boolean }) => void;
  onReplay: () => void;
  onLeave: () => void;
}) {
  const [teaching, setTeaching] = useState(false);
  useEffect(() => { setTeaching(false); }, [run.id]);
  const stages = run.caseId === "project-meridian-001" ? meridianStages : run.caseId === "mule-mixer-001" ? mixerStages : genericStages;
  const activeIndex = teaching && run.debrief ? stages.length - 1 : stageIndex(run, stages);
  const current = run.story.at(-1);
  const previous = run.story.slice(0, -1);
  let lastDecision = -1;
  previous.forEach((node, index) => { if (node.type === "decision") lastDecision = index; });
  const currentEvidence = previous.filter((node, index) => node.type === "scene" && index > lastDecision);
  const evidenceIds = new Set(currentEvidence.map((node) => node.id));
  const earlier = previous.filter((node) => !evidenceIds.has(node.id));
  const debrief = run.debrief;
  const leaveLabel = scene ? "Simulation gallery" : "All learning topics";
  const scenarioTitle = scene ? guidedSceneTitles[scene] : current?.title ?? run.title;
  const scenarioSummary = scene ? "Select objects in the room to read evidence, make decisions and see the consequences." : run.summary;
  const assignment = <>
    <p className="course-context-label">The assignment</p>
    <p>{run.workflow.goal}</p>
    <p className="course-context-label">Your role</p>
    <p>{run.workflow.role}</p>
  </>;
  const evidence = currentEvidence.length ? currentEvidence.map((node, index) => (
    <Evidence key={`${node.id}-${index}`} node={node} />
  )) : <>
    {assignment}
    <p className="course-note">Read the available information before choosing. The next part of the scenario follows your saved decision.</p>
  </>;
  const previousEvidence = earlier.length > 0 && <details className={scene ? "course-immersive-history" : "course-panel course-earlier"}>
    <summary>Previous evidence and decisions <span>{earlier.length}</span></summary>
    {earlier.map((node, index) => <Evidence key={`${node.id}-${index}`} node={node} />)}
  </details>;
  const outcome = debrief && <section className={`course-outcome course-outcome-${debrief.rating}`} aria-label="Scenario outcome">
    <span className="course-outcome-symbol" aria-hidden="true">{debrief.rating === "acceptable" ? "✓" : "!"}</span>
    <div>
      <h2>{ratings[debrief.rating][0]}</h2>
      <p>{ratings[debrief.rating][1]}</p>
      <p className="course-outcome-disposition">Recorded outcome: {words(debrief.disposition)}</p>
    </div>
  </section>;
  const desk = <>
    {scene && current && <h3 className="course-immersive-record-title">{current.title}</h3>}
    {current && <Copy text={current.prompt} />}
    {current?.mediaRef && <p className="course-note">Use the transcript and source text in this exercise. No original media file is included.</p>}
    {run.choices.length > 0 && <div className="course-choice-section">
      <h3>{run.choices.length === 1 ? "Continue the scenario" : "What will you do?"}</h3>
      <p className="course-note">Choose an action to continue. Your decision will be saved.</p>
      <div className="course-action-stack">{run.choices.map((choice, index) => <button
        key={choice.id}
        className={run.choices.length === 1 || index === 0 ? "course-gold-button" : "course-outline-button"}
        disabled={busy}
        onClick={() => scene ? onChoose(choice.id, { keepPosition: true }) : onChoose(choice.id)}
      >{choice.label}<span aria-hidden="true">→</span></button>)}</div>
    </div>}
    {debrief && <div className="course-action-stack course-end-actions">
      <button className="course-gold-button" disabled={busy} onClick={() => { setTeaching(true); window.scrollTo(0, 0); }}>View teaching notes →</button>
      <button className="course-outline-button" disabled={busy} onClick={onReplay}>Try again</button>
    </div>}
  </>;

  return <div className={`training-player${scene ? " training-player-immersive" : ""}`} aria-busy={busy}>
    <div className="course-player-top">
      <button className="course-text-button" disabled={busy} onClick={onLeave}>← {leaveLabel}</button>
      <span className="course-save-status" role="status"><span aria-hidden="true" />{busy ? "Saving progress…" : "Progress saved"}</span>
    </div>
    <nav className="course-stage-nav" aria-label="Scenario progress"><ol>{stages.map((stage, index) => <li key={stage.id} className={index === activeIndex ? "is-current" : index < activeIndex ? "is-complete" : ""} aria-current={index === activeIndex ? "step" : undefined}><span className="course-stage-index" aria-hidden="true">{index < activeIndex ? "✓" : index + 1}</span>{stage.label}</li>)}</ol></nav>
    <div className="course-player-heading">
      <div className="course-stage-chips">
        {scene && <span className="course-immersive-badge">3D guided simulation</span>}
        <span className="course-stage-chip">{teaching ? "Teaching notes" : stages[activeIndex]?.label ?? "Scenario"}</span>
        <span className="course-role-chip">Your role: {run.workflow.role}</span>
      </div>
      <p className="training-eyebrow">Topic {String(run.workflow.number).padStart(2, "0")} · {run.workflow.title}</p>
      <h1>{teaching ? "Reflect. Learn. Apply." : scenarioTitle}</h1>
      <p>{teaching ? "Understand the signals, review your decisions and take the learning into your next case." : scenarioSummary}</p>
    </div>
    {(!scene || teaching) && outcome}
    {teaching && debrief ? <div className="course-player-columns">
      <div>
        <Panel title="Your decisions"><ol className="course-decision-review">{debrief.decisions.map((item, index) => <li key={index}><span className="course-review-number">{index + 1}</span><div><h3>{item.title}</h3><p className="course-recorded-choice">{item.choice}</p><p>{item.rationale || "This decision is recorded in your training history."}</p></div></li>)}</ol></Panel>
        <Panel title="The model workflow"><Steps steps={debrief.teaching} />{debrief.teachingNotes.map((note, index) => <p key={index}>{note}</p>)}</Panel>
      </div>
      <div>
        <Panel title="Key rules"><ul className="course-rules">{debrief.rules.map((rule) => <li key={rule.id}><strong>{words(rule.id)}</strong><p>{rule.when}</p>{rule.note && <p>{rule.note}</p>}</li>)}</ul></Panel>
        <Panel title="Take the next step">
          <p>Try a different approach to see how your decisions change the outcome.</p>
          <div className="course-action-stack">
            <button className="course-gold-button" disabled={busy} onClick={onReplay}>Try this scenario again →</button>
            {scene && <button className="course-outline-button" disabled={busy} onClick={() => { setTeaching(false); window.scrollTo(0, 0); }}>Return to the scene</button>}
            <button className="course-outline-button" disabled={busy} onClick={onLeave}>Back to {scene ? "simulation gallery" : "learning topics"}</button>
          </div>
        </Panel>
      </div>
    </div> : scene ? <GuidedCaseScene key={run.id} kind={scene} run={run} contents={{
      briefing: <><p>{run.summary}</p>{assignment}</>,
      evidence: <>{evidence}{previousEvidence}</>,
      decision: <>{outcome}{desk}</>,
      activity: <CaseActivity run={run} />,
    }} /> : <div className="course-player-columns">
      <div>
        <Panel title={current?.type === "outcome" ? "What happened" : "Your desk"} className="course-desk-panel">{desk}</Panel>
        {previousEvidence}
      </div>
      <div>
        <Panel title={currentEvidence.length ? "Evidence & context" : "Scenario context"}>{evidence}</Panel>
        <details className="course-panel course-state-details">
          <summary>Digital twin & activity<span aria-hidden="true">+</span></summary>
          <CaseActivity run={run} />
        </details>
      </div>
    </div>}
    <p className="course-library-note">Synthetic training scenario · Decisions are recorded for learning · No live funds or reports</p>
  </div>;
}

export function CaseLibrary({ accountId = null }: { accountId?: string | null }) {
  const { library, run, busy, error, retry, start, choose, leave } = useCaseLibrary(accountId);
  useEffect(() => { document.title = "Learning topics · TwinAML"; }, []);
  return <div className="training-standalone"><a className="skip-link" href="#training-case-content">Skip to learning topics</a><header className="course-standalone-header"><a href="/">TwinAML</a><nav aria-label="Training areas"><a href="/">Dashboard</a><a href="/investigation">The Second Ledger</a></nav></header><main id="training-case-content">{error && <div className="course-error" role="alert"><span>{error}</span><button disabled={busy} onClick={retry}>Try again</button></div>}{!library ? <p role="status">{busy ? "Opening learning topics…" : "Learning topics are unavailable."}</p> : run ? <TrainingPlayer run={run} busy={busy} onChoose={choose} onReplay={() => { void start(run.caseId); }} onLeave={leave} /> : <TrainingTopics library={library} run={run} busy={busy} onStart={(id) => { void start(id); }} />}</main></div>;
}
