import { useCallback, useEffect, useState, type ReactNode } from "react";
import { AccountSettings, openAccountProgress } from "./AccountShell";
import { TrainingPlayer, TrainingTopics, useCaseLibrary } from "./CaseLibrary";
import { apiFetch, loadResume, sessionKey } from "./account-api";
import { AmlSimulation } from "./AmlSimulation";
import type { AmlView } from "../../packages/aml/types";
import type { CaseLibraryView } from "../../packages/investigation/types";
import { ComplianceTools, LearningDashboard, LearningIcon, GUIDED_SCENES, LEARNING_ROLES, primaryTopicCase, roleTopics, SimulationCatalog, type LearningRole } from "./LearningCenter";
import "./training-portal.css";
import "./learning-center.css";

type Page = "dashboard" | "scenes" | "tools" | "simulation" | "training" | "reports" | "help" | "settings" | "intro";
type SavedRun = { kind: string; id: string; title: string; progress: string; createdAt: string; updatedAt: string; route?: string };
type SimulationSummary = { id: string; ended: boolean; minute: number; endMinute: number; assessments: number; held: boolean };
type Theme = "light" | "dark";
const paths: Record<Page, string> = { dashboard: "/", scenes: "/simulations", tools: "/tools", simulation: "/simulation", training: "/training", reports: "/reports", help: "/help", settings: "/settings", intro: "/intro" };
function currentPage(): Page {
  const path = window.location.pathname.replace(/\/$/, "") || "/";
  return path === "/cases" ? "training" : (Object.keys(paths) as Page[]).find((page) => paths[page] === path) || "dashboard";
}
function wantsScene() {
  return new URLSearchParams(window.location.search).get("view") === "3d";
}
function caseScene(caseId: string) {
  if (caseId === GUIDED_SCENES.onboarding) return "onboarding";
  if (caseId === GUIDED_SCENES.branch) return "branch";
  return undefined;
}

function savedTheme(): Theme { try { return localStorage.getItem("twinaml-theme") === "dark" ? "dark" : "light"; } catch { return "light"; } }
function exportFile(value: string, name: string, type: string) {
  const url = URL.createObjectURL(new Blob([value], { type }));
  const anchor = document.createElement("a"); anchor.href = url; anchor.download = name; anchor.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
function quoted(value: string) { return `"${value.replaceAll('"', '""')}"`; }
function outcome(run: SavedRun) { if (run.route === "/simulation") return run.progress.startsWith("Completed") ? "Practice completed" : "In progress"; return run.progress.startsWith("Completed") ? run.progress.split("·").at(-1)?.trim() || "completed" : "in progress"; }

function readRole(accountId: string | null) {
  try { return LEARNING_ROLES.find((role) => role.id === localStorage.getItem(sessionKey("twinaml-learning-role", accountId))) || LEARNING_ROLES[0]; }
  catch { return LEARNING_ROLES[0]; }
}

export function TrainingPortal({ accountId }: { accountId: string | null }) {
  const [page, setPage] = useState<Page>(currentPage);
  const training = useCaseLibrary(accountId, page !== "simulation");
  const { library, run, busy, error } = training;
  const [simulationSummary, setSimulationSummary] = useState<SimulationSummary | null>(null);
  const [simulationSelection, setSimulationSelection] = useState(() => currentPage() === "simulation" ? new URLSearchParams(window.location.search).get("run") : null);
  const [theme, setTheme] = useState<Theme>(savedTheme);
  const [accountRuns, setAccountRuns] = useState<SavedRun[]>([]);
  const [accountName, setAccountName] = useState("Trainee");
  const [historyError, setHistoryError] = useState("");
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyRetry, setHistoryRetry] = useState(0);
  const [role, setRole] = useState(() => readRole(accountId));
  const [courseScope, setCourseScope] = useState(() => new URLSearchParams(window.location.search).get("role") || "");
  const [courseOverview, setCourseOverview] = useState<number | null>(() => Number(new URLSearchParams(window.location.search).get("topic")) || null);
  useEffect(() => { setRole(readRole(accountId)); }, [accountId]);
  function selectRole(next: LearningRole) {
    setRole(next);
    try { localStorage.setItem(sessionKey("twinaml-learning-role", accountId), next.id); } catch { /* Role selection still works for this visit. */ }
  }
  const [immersiveCase, setImmersiveCase] = useState(wantsScene);
  const [showPlayer, setShowPlayer] = useState(() => Boolean(new URLSearchParams(window.location.search).get("run")));
  const simulationProgress = useCallback((view: AmlView) => {
    const simulation = view.simulation;
    if (!simulation) return;
    setSimulationSummary({ id: view.id, ended: simulation.ended, minute: simulation.elapsedMinutes, endMinute: simulation.endMinute, assessments: simulation.decisions.length, held: simulation.held });
    setHistoryRetry((value) => value + 1);
  }, []);
  useEffect(() => {
    const id = loadResume(sessionKey("twinaml-aml-simulation-session", accountId), false);
    if (!id) return;
    let active = true;
    apiFetch(`/api/aml-sessions/${encodeURIComponent(id)}`).then(async (response) => {
      if (response.ok && active) simulationProgress(await response.json());
    }).catch(() => { /* The simulation screen offers retry without discarding the saved run. */ });
    return () => { active = false; };
  }, [accountId, simulationProgress]);
  useEffect(() => {
    const pop = () => {
      const selected = new URLSearchParams(window.location.search).get("run");
      if (selected && selected !== run?.id) { window.location.reload(); return; }
      setPage(currentPage()); setShowPlayer(Boolean(selected));
      setImmersiveCase(wantsScene());
      setCourseScope(new URLSearchParams(window.location.search).get("role") || "");
      setCourseOverview(Number(new URLSearchParams(window.location.search).get("topic")) || null);
    };
    window.addEventListener("popstate", pop); return () => window.removeEventListener("popstate", pop);
  }, [run?.id]);
  useEffect(() => { document.title = `${page === "dashboard" ? "My Learning" : page === "scenes" ? "Simulations" : page === "tools" ? "Compliance Tools" : page === "reports" ? "Progress" : page === "training" ? "Courses" : page[0].toUpperCase() + page.slice(1)} · TwinAML`; }, [page]);
  useEffect(() => { try { localStorage.setItem("twinaml-theme", theme); } catch { /* The selected theme still works for this visit. */ } }, [theme]);
  useEffect(() => {
    if (!accountId) return;
    let active = true;
    setHistoryLoading(true);
    Promise.all([apiFetch("/api/account/runs"), apiFetch("/api/account")]).then(async ([runsResponse, accountResponse]) => {
      if (!runsResponse.ok || !accountResponse.ok) throw new Error("Saved progress could not be loaded. Try again to see all your runs.");
      const [saved, account] = await Promise.all([runsResponse.json(), accountResponse.json()]);
      if (active) { setAccountRuns(saved.runs); setAccountName(account.user?.email?.split("@")[0] || "Trainee"); setHistoryError(""); }
    }).catch((err) => { if (active) setHistoryError(err instanceof Error ? err.message : "Unable to load saved progress."); })
      .finally(() => { if (active) setHistoryLoading(false); });
    return () => { active = false; };
  }, [accountId, run?.id, run?.revision, historyRetry]);
  function navigate(next: Page) {
    if (next === "simulation") { openSimulation(simulationSummary?.id); return; }
    setPage(next);
    setShowPlayer(false);
    setImmersiveCase(false);
    setCourseScope("");
    setCourseOverview(null);
    window.history.pushState({}, "", paths[next]);
    window.scrollTo(0, 0);
  }
  function openSimulation(id?: string) {
    setSimulationSelection(id || null); setPage("simulation");
    window.history.pushState({}, "", `/simulation${id ? `?run=${encodeURIComponent(id)}` : ""}`); window.scrollTo(0, 0);
  }
  function openCasePlayer(id: string, immersive: boolean) {
    setPage("training");
    setShowPlayer(true);
    setImmersiveCase(immersive);
    const query = new URLSearchParams({ run: id });
    if (immersive) query.set("view", "3d");
    window.history.pushState({}, "", `/training?${query}`);
    window.scrollTo(0, 0);
  }
  async function start(caseId: string, immersive = false) {
    if (busy) return;
    const next = run?.caseId === caseId && !run.debrief ? run : await training.start(caseId);
    if (next) openCasePlayer(next.id, immersive);
  }
  async function resume(id: string, immersive = false) {
    if (busy) return;
    if (run?.id !== id && !await training.resume(id)) return;
    openCasePlayer(id, immersive);
  }
  const runs = accountRuns.filter((saved) => saved.kind === "case");
  if (run) {
    const existing = runs.findIndex((saved) => saved.id === run.id);
    const visible: SavedRun = { kind: "case", id: run.id, title: run.title, progress: run.debrief ? `Completed · ${run.debrief.rating}` : `${run.revision} decisions saved`, createdAt: existing >= 0 ? runs[existing].createdAt : "", updatedAt: existing >= 0 ? runs[existing].updatedAt : "" };
    if (existing >= 0) runs[existing] = visible; else runs.unshift(visible);
  }
  const completed = new Set(library?.workflows.filter((topic) => topic.cases.some((item) => runs.some((saved) => saved.title === item.title && saved.progress.startsWith("Completed")))).map((topic) => topic.number));
  if (simulationSummary?.ended || accountRuns.some((saved) => saved.route === "/simulation" && saved.progress.startsWith("Completed"))) completed.add(2);
  const activeTopics = new Set(library?.workflows.filter((topic) => !completed.has(topic.number) && topic.cases.some((item) => runs.some((saved) => saved.title === item.title && !saved.progress.startsWith("Completed")))).map((topic) => topic.number));
  if (!completed.has(2) && (simulationSummary || accountRuns.some((saved) => saved.route === "/simulation"))) activeTopics.add(2);
  const completedRuns = runs.filter((saved) => saved.progress.startsWith("Completed"));
  const acceptable = completedRuns.filter((saved) => outcome(saved) === "acceptable").length;
  const simulationRuns = accountRuns.filter((saved) => saved.kind === "aml" && saved.route === "/simulation");
  if (simulationSummary && !simulationRuns.some((saved) => saved.id === simulationSummary.id)) simulationRuns.unshift({ kind: "aml", id: simulationSummary.id, title: "AML investigation simulation", progress: `${simulationSummary.ended ? "Completed" : `Minute ${simulationSummary.minute} of ${simulationSummary.endMinute}`} · ${simulationSummary.assessments} assessments recorded`, route: "/simulation", createdAt: "", updatedAt: "" });

  const reportRuns = [...simulationRuns, ...runs];

  function openRolePath(selectedRole = role, overview: number | null = null) {
    navigate("training"); setCourseScope(selectedRole.id); setCourseOverview(overview);
    window.history.replaceState({}, "", `/training?role=${selectedRole.id}${overview ? `&topic=${overview}` : ""}`);
  }
  function openTopic(topic: CaseLibraryView["workflows"][number]) {
    if (topic.number === 2) { openSimulation(simulationSummary?.id); return; }
    const entry = primaryTopicCase(topic);
    if (!entry) { openRolePath(role, topic.number); return; }
    const saved = runs.find((item) => !item.progress.startsWith("Completed") && topic.cases.some((candidate) => candidate.title === item.title));
    if (saved) void resume(saved.id); else void start(entry.caseId);
  }
  const scopedRole = LEARNING_ROLES.find((item) => item.id === courseScope);
  const guidedScene = immersiveCase && run ? caseScene(run.caseId) : undefined;
  const activeNavigation = page === "simulation" || (page === "training" && showPlayer && guidedScene)
    ? "scenes"
    : page;

  return <div className={`portal portal-${theme}`}>
    <a className="portal-skip" href="#portal-content">Skip to content</a>
    <header className="portal-header">
      <a className="portal-brand" href="/" onClick={(event) => { event.preventDefault(); navigate("dashboard"); }}><span className="portal-brand-mark">T</span><span>TwinAML</span></a>
      <nav className="portal-nav" aria-label="Training portal">
        {([["dashboard", "My Learning"], ["training", "Courses"], ["scenes", "Simulations"], ["tools", "Compliance Tools"], ["reports", "Progress"]] as [Page, string][]).map(([id, label]) => <button key={id} className={activeNavigation === id ? "is-active" : ""} aria-current={activeNavigation === id ? "page" : undefined} onClick={() => navigate(id)}>{label}</button>)}
      </nav>
      <div className="portal-header-tools">
        <button className="portal-icon-button" aria-label="Help and guidance" title="Help and guidance" onClick={() => navigate("help")}><Icon name="help" /></button>
        <button className="portal-icon-button" aria-label={`Use ${theme === "light" ? "dark" : "light"} theme`} title="Switch theme" onClick={() => setTheme(theme === "light" ? "dark" : "light")}><Icon name={theme === "light" ? "moon" : "sun"} /></button>
        <button className="portal-icon-button" aria-label="Settings" title="Settings" onClick={() => navigate("settings")}><Icon name="settings" /></button>
        <button className="portal-profile" onClick={() => accountId ? openAccountProgress() : navigate("settings")} aria-label={accountId ? "Open my saved progress" : "Open trainee settings"}><span className="portal-profile-name">{accountName}</span><span className="portal-avatar">{accountName.slice(0, 1).toUpperCase()}</span></button>
      </div>
    </header>
    <main id="portal-content" className={`portal-main ${page === "dashboard" || page === "scenes" ? "portal-main-wide" : ""}`} aria-busy={busy}>
      {error && page !== "simulation" && <div className="portal-message portal-error" role="alert">{error}<button disabled={busy} onClick={training.retry}>Try again</button></div>}
      {historyError && <div className="portal-message portal-error" role="alert">{historyError}<button onClick={() => setHistoryRetry((value) => value + 1)}>Reload progress</button></div>}
      {page === "simulation" && <AmlSimulation immersive key={simulationSelection || "current-simulation"} accountId={accountId} onProgress={simulationProgress} />}
      {page !== "simulation" && (!library ? <div className="portal-loading" role="status"><span className="portal-loading-mark">T</span><h1>{busy ? "Opening your training workspace…" : "Your workspace is unavailable"}</h1><p>{busy ? "Loading your topics and saved progress." : "Use Try again above to reconnect."}</p></div> : <>
        {page === "dashboard" && <LearningDashboard library={library} role={role} onRole={selectRole} completed={completed} active={activeTopics} busy={busy} onTopic={openTopic} onRolePath={() => openRolePath()} onCourses={() => navigate("training")} onSimulations={() => navigate("scenes")} onProgress={() => navigate("reports")} />}
        {page === "scenes" && <SimulationCatalog library={library} runs={runs} run={run} simulation={simulationSummary} busy={busy} onStart={(id) => { void start(id, true); }} onResume={(id) => { void resume(id, true); }} onSimulation={() => openSimulation(simulationSummary?.id)} onHelp={() => navigate("help")} onIntro={() => navigate("intro")} />}
        {page === "tools" && <ComplianceTools onSimulation={() => openSimulation(simulationSummary?.id)} />}
        {page === "training" && (run && showPlayer ? <TrainingPlayer
          key={run.id}
          run={run}
          busy={busy}
          scene={guidedScene}
          onChoose={training.choose}
          onReplay={() => { void start(run.caseId, immersiveCase); }}
          onLeave={() => navigate(guidedScene ? "scenes" : "training")}
        /> : <><div className="learning-course-filter"><span><LearningIcon name="book" size={18} /> Course library</span><label>Learning path<select aria-label="Course learning path" value={courseScope} onChange={(event) => { const selected = LEARNING_ROLES.find((item) => item.id === event.target.value); if (selected) openRolePath(selected); else navigate("training"); }}><option value="">All courses</option>{LEARNING_ROLES.map((item) => <option key={item.id} value={item.id}>{item.short}</option>)}</select></label></div><TrainingTopics key={`${courseScope}-${courseOverview}`} initialOverview={courseOverview} library={scopedRole ? { ...library, workflows: roleTopics(library, scopedRole) } : library} run={run} busy={busy} completedTopics={completed} onStart={(id) => { if (id === "mule-mixer-001") openSimulation(simulationSummary?.id); else void start(id); }} /></>)}
        {page === "reports" && <><PageHeading title="Training reports" subtitle="Investigation simulations, saved assessments and guided scenario outcomes." /><div className="portal-report-metrics"><Metric label="Topics completed" value={`${completed.size} / ${library.workflows.length}`} note="Distinct topics with a completed session" /><Metric label="Guided scenario outcomes" value={completedRuns.length ? `${Math.round(acceptable / completedRuns.length * 100)}%` : "—"} note={completedRuns.length ? `${acceptable} of ${completedRuns.length} completed sessions` : "Complete a session to see your result"} /><Metric label="Sessions logged" value={String(reportRuns.length)} note={accountId ? "Saved to your training account" : "Current sessions in this browser"} /></div><SimulationReports runs={simulationRuns} onResume={openSimulation} /><Card title="Guided scenario outcomes">{historyLoading && <p role="status" className="portal-muted">Refreshing saved sessions…</p>}{runs.length ? <div className="portal-table-wrap"><table className="portal-table"><thead><tr><th>Training module</th><th>Progress</th><th>Outcome</th><th>Last saved</th><th><span className="sr-only">Action</span></th></tr></thead><tbody>{runs.map((saved) => <tr key={saved.id}><td><strong>{saved.title}</strong><small>Run {saved.id.slice(0, 8)}</small></td><td>{saved.progress.split("·")[0]}</td><td><span className={`portal-status ${outcome(saved) === "acceptable" ? "is-complete" : outcome(saved) === "poor" ? "is-poor" : ""}`}>{outcome(saved)}</span></td><td>{saved.updatedAt ? new Date(saved.updatedAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) : "Current session"}</td><td><button className="portal-text-button" disabled={busy} onClick={() => void resume(saved.id)}>View session →</button></td></tr>)}</tbody></table></div> : <EmptyTraining onStart={() => navigate("training")} />}</Card><div className="portal-two-columns"><Card title="Export your training summary"><p>Download the simulation progress and guided scenario outcomes shown above as a CSV file.</p><button className="portal-button portal-button-blue" disabled={!reportRuns.length} onClick={() => exportFile(["Module,Run ID,Progress,Outcome,Last saved", ...reportRuns.map((saved) => [saved.title, saved.id, saved.progress, outcome(saved), saved.updatedAt].map(quoted).join(","))].join("\r\n"), "twinaml-training-summary.csv", "text/csv;charset=utf-8")}>Export summary <Icon name="download" /></button></Card><Card title="About these reports"><p>Reports describe your training performance with synthetic scenarios. Reaction time and certification scores are not tracked. {accountId ? "All your account’s case sessions are included." : "Sign in on an account-enabled environment to collect sessions across devices."}</p>{run && <button className="portal-text-button" onClick={() => exportFile(JSON.stringify(run, null, 2), `twinaml-session-${run.id}.json`, "application/json")}>Download current session & event history →</button>}</Card></div></>}
        {page === "help" && <Help onTopics={() => navigate("training")} onIntro={() => navigate("intro")} />}
        {page === "intro" && <Intro onStart={() => navigate("training")} />}
        {page === "settings" && <><PageHeading title="Settings" subtitle="Make this training workspace work for you." /><div className="portal-settings"><Card title="Appearance"><div className="portal-setting-row"><div><h3>Colour theme</h3><p>Choose the appearance of your training portal.</p></div><div className="portal-theme-control" role="group" aria-label="Colour theme">{(["light", "dark"] as const).map((value) => <button key={value} aria-pressed={theme === value} onClick={() => setTheme(value)}><Icon name={value === "light" ? "sun" : "moon"} />{value === "light" ? "Light" : "Dark"}</button>)}</div></div><div className="portal-setting-row"><div><h3>Language</h3><p>Course content and training reports are available in English.</p></div><span className="portal-status">English</span></div></Card><Card title="Your account"><AccountSettings accountId={accountId} />{accountId && <button className="portal-button portal-button-subtle" onClick={openAccountProgress}>Open my saved progress</button>}</Card><Card title="About TwinAML"><p>TwinAML is a COMP3424 digital twin training demo. Decisions are evaluated by authored rules and recorded on the server. This workspace uses synthetic practice data and has no live bank connection.</p><div className="portal-inline-links"><a href="/operations">AML operations workbench ↗</a><a href="/investigation">The Second Ledger ↗</a></div></Card></div></>}
      </>)}
    </main>
    <footer className="portal-footer"><span><strong>TwinAML</strong> <span>Learning today. Protecting tomorrow.</span></span><span>Synthetic training environment <i>·</i> <button onClick={() => navigate("help")}>Help & guidance</button></span></footer>
  </div>;
}

function SimulationReports({ runs, onResume }: { runs: SavedRun[]; onResume: (id: string) => void }) {
  return <section className="portal-card portal-simulation-reports"><h2>AML investigation simulations</h2>{runs.length ? <div className="portal-table-wrap"><table className="portal-table"><thead><tr><th>Assignment</th><th>Progress</th><th>Review</th><th><span className="sr-only">Action</span></th></tr></thead><tbody>{runs.map((run) => <tr key={run.id}><td><strong>{run.title}</strong><small>Run {run.id.slice(0, 8)}</small></td><td>{run.progress}</td><td>Practice review · independent validation pending</td><td><button className="portal-text-button" onClick={() => onResume(run.id)}>Open simulation →</button></td></tr>)}</tbody></table></div> : <p>No investigation simulation has been saved yet. Open Simulation to begin an assignment.</p>}</section>;
}

function PageHeading({ title, subtitle }: { title: string; subtitle: string }) { return <div className="portal-page-heading"><h1>{title}</h1><p>{subtitle}</p></div>; }
function Card({ title, children }: { title: string; children: ReactNode }) { return <section className="portal-card"><h2>{title}</h2>{children}</section>; }
function Metric({ label, value, note }: { label: string; value: string; note: string }) { return <div className="portal-card portal-report-metric"><span>{label}</span><strong>{value}</strong><small>{note}</small></div>; }
function EmptyTraining({ onStart }: { onStart: () => void }) { return <div className="portal-empty"><Icon name="document" /><h3>Your learning story starts here.</h3><p>Choose a topic and make your first decision. Your session outcome will appear here.</p><button className="portal-button portal-button-blue" onClick={onStart}>Explore training topics →</button></div>; }
function Help({ onTopics, onIntro }: { onTopics: () => void; onIntro: () => void }) { return <><PageHeading title="Help & guidance" subtitle="Everything you need to get started with your training." /><div className="portal-help-grid"><Card title="Getting started"><p>Choose a topic, review the records and decide how to handle the situation. The digital twin records your decisions and shows their consequences.</p><button className="portal-button portal-button-blue" onClick={onIntro}>How training works →</button></Card><Card title="Explore a training topic"><p>You can revisit the evidence, try another approach and read the teaching notes after reaching an outcome.</p><button className="portal-button portal-button-gold" onClick={onTopics}>Choose a learning topic →</button></Card></div><Card title="Frequently asked questions"><div className="portal-faq">{[["How do I explore a 3D simulation?", "Drag inside the scene to look around. Select a marker on a file or workstation to open the related exercise panel. You can also use the keyboard and the scene’s action list."], ["Is this connected to a real bank?", "No. All people, accounts, documents and payments in TwinAML are fictional. Actions affect only the synthetic training run."], ["How is my progress saved?", "Submitted decisions are saved by the server. In anonymous practice, this browser keeps a shortcut to your current run. Signed-in accounts can use My progress to resume earlier runs across devices."], ["Can I try a different decision?", "Yes. Finish a case and choose Try again. This creates a new session so your earlier decisions remain recorded. An earlier choice cannot be changed inside the same run."], ["What happens if I make the wrong decision?", "The case shows the simulated consequence and explains the authored rules in its teaching notes. These outcomes are learning feedback, not professional compliance advice."], ["Where are the investigation tools?", "Open the AML operations workbench for monitoring, entity exploration and STR practice, or The Second Ledger for timed evidence checks and investigation decisions."], ["Why is a topic an overview?", "An overview contains the teaching flow but has no playable script yet. Playable topics show a Start topic or Continue topic button."]].map(([question, answer]) => <details key={question}><summary>{question}</summary><p>{answer}</p></details>)}</div></Card></>; }
function Intro({ onStart }: { onStart: () => void }) { return <div className="portal-intro"><span className="portal-tag">WELCOME TO TWINAML</span><h1>Practise the decision.<br />Understand the consequence.</h1><p>Step into a realistic situation, follow the evidence, and see how your choices change the digital twin.</p><div className="portal-intro-steps">{[["01", "Review the situation", "Read the briefing and examine the available records."], ["02", "Make your call", "Verify, escalate or approve within the synthetic scenario."], ["03", "Learn from the outcome", "Review your path, the rules and the teaching notes."]].map(([number, title, text]) => <div className="portal-card" key={number}><span>{number}</span><h2>{title}</h2><p>{text}</p></div>)}</div><button className="portal-button portal-button-gold" onClick={onStart}>Choose a learning topic →</button><p className="portal-muted portal-small">Synthetic practice data · No live payments · Rules before AI</p></div>; }

function Icon({ name }: { name: string }) {
  const shapes: Record<string, ReactNode> = {
    settings: <><path d="m9 3 1-2h4l1 2 2 1 2 1v4l-2 1-1 2 1 2-3 3-2-1h-2l-2 1-3-3 1-2-1-2-2-1V5l2-1Z" transform="translate(1 2) scale(.9)" /><circle cx="12" cy="12" r="3" /></>,
    moon: <path d="M20 14a8 8 0 0 1-10-10A8.5 8.5 0 1 0 20 14Z" />,
    sun: <><circle cx="12" cy="12" r="4" /><path d="M12 2v2m0 16v2M2 12h2m16 0h2M5 5l1.5 1.5m11 11L19 19M5 19l1.5-1.5m11-11L19 5" /></>,
    bell: <><path d="M5 16h14l-2-3V9a5 5 0 0 0-10 0v4Zm5 3h4" /></>,
    shield: <><path d="m12 3 8 3v6c0 5-8 9-8 9s-8-4-8-9V6Z" /><path d="m8 12 3 3 5-6" /></>,
    document: <><path d="M6 3h8l4 4v14H6Zm8 0v5h4M9 12h6m-6 4h6" /></>,
    mail: <><rect x="3" y="5" width="18" height="14" rx="2" /><path d="m3 6 9 7 9-7" /></>,
    network: <><circle cx="5" cy="5" r="3" /><circle cx="19" cy="5" r="3" /><circle cx="12" cy="19" r="3" /><path d="M8 5h8M6 8l5 8m7-8-5 8" /></>,
    search: <><circle cx="10" cy="10" r="6" /><path d="m15 15 6 6" /></>,
    chart: <><path d="M4 3v18h17M8 17v-5m5 5V7m5 10v-8" /></>,
    help: <><circle cx="12" cy="12" r="9" /><path d="M9 9a3 3 0 0 1 6 0c0 2-3 2-3 5m0 3v.1" /></>,
    download: <><path d="M12 3v12m-5-5 5 5 5-5M4 16v5h16v-5" /></>,
  };
  return <svg className="portal-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{shapes[name] || shapes.document}</svg>;
}
