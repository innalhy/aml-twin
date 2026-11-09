import { useState, type ReactNode } from "react";
import type { CaseLibraryView, CaseSessionView } from "../../packages/investigation/types";

type Topic = CaseLibraryView["workflows"][number];
export type LearningRole = { id: string; title: string; short: string; description: string; topics: number[] };
export const LEARNING_ROLES: LearningRole[] = [
  { id: "frontline", title: "Frontline & Onboarding Staff", short: "Frontline & Onboarding", description: "Branch, sales, relationship management and customer service", topics: [1, 6, 3, 11] },
  { id: "kyc", title: "KYC & Due Diligence Analysts", short: "KYC & Due Diligence", description: "Customer verification, risk assessment and enhanced due diligence", topics: [3, 11, 8, 4] },
  { id: "monitoring", title: "Transaction Monitoring & Investigations", short: "Monitoring & Investigations", description: "Alert triage, transaction analysis and evidence-led investigations", topics: [2, 5, 6, 7, 9, 10] },
  { id: "compliance", title: "Compliance, MLRO & Senior Management", short: "Compliance & Management", description: "Governance, control reviews and escalation decisions", topics: [11, 4, 8, 10] },
  { id: "technology", title: "Product, Technology & Change Teams", short: "Product & Technology", description: "Digital identity, emerging risks and monitoring controls", topics: [1, 3, 2, 9] },
];

const TOPIC_DETAILS: Record<number, { level: string; summary: string }> = {
  1: { level: "Foundation", summary: "Spot impersonation and independently verify a high-risk payment." },
  2: { level: "Advanced", summary: "Follow the movement of funds and assess the evidence behind an alert." },
  3: { level: "Foundation", summary: "Understand synthetic identities and the gaps in customer verification." },
  4: { level: "Application", summary: "Review trade documents and investigate unusual payment patterns." },
  5: { level: "Application", summary: "Connect cross-border transfers to the wider customer picture." },
  6: { level: "Foundation", summary: "Recognise account rental indicators and decide when to escalate." },
  7: { level: "Application", summary: "Examine the links between cash activity and crypto transactions." },
  8: { level: "Application", summary: "Look beyond a company’s stated business to its actual activity." },
  9: { level: "Advanced", summary: "Bring multiple warning signs together into a reasoned assessment." },
  10: { level: "Advanced", summary: "Trace connected accounts and build an evidence-based investigation." },
  11: { level: "Application", summary: "Identify weaknesses in due diligence and strengthen control decisions." },
};

export function roleTopics(library: CaseLibraryView, role: LearningRole) {
  return role.topics.flatMap((number) => library.workflows.filter((topic) => topic.number === number));
}
export function primaryTopicCase(topic: Topic) {
  const preferred: Record<number, string> = { 1: "project-meridian-001", 2: "mule-mixer-001", 11: "bank-cdd-001" };
  return topic.cases.find((item) => item.caseId === preferred[topic.number]) || topic.cases[0];
}

export function LearningIcon({ name, size = 20 }: { name: string; size?: number }) {
  const paths: Record<string, ReactNode> = {
    arrow: <path d="M5 12h14m-6-6 6 6-6 6" />,
    chevron: <path d="m9 5 7 7-7 7" />,
    book: <><path d="M12 5v16M3 3l9 2 9-2v16l-9 2-9-2Z" /></>,
    people: <><circle cx="9" cy="7" r="3" /><path d="M3 21v-3a6 6 0 0 1 12 0v3M16 4a3 3 0 0 1 0 6m2 4a5 5 0 0 1 3 4v3" /></>,
    check: <path d="m5 12 4 4L19 6" />,
    shield: <><path d="m12 3 8 3v6c0 5-8 9-8 9s-8-4-8-9V6Z" /><path d="m8 12 3 3 5-6" /></>,
    screen: <><rect x="3" y="4" width="18" height="13" rx="2" /><path d="M8 21h8m-4-4v4m-3-12 5 3-5 3Z" /></>,
    chart: <><path d="M4 3v18h17M8 17v-5m5 5V7m5 10v-8" /></>,
    external: <><path d="M14 3h7v7m0-7L10 14M10 3H3v18h18v-7" /></>,
    clock: <><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>,
    filter: <><path d="M3 5h18M6 12h12m-9 7h6" /></>,
    file: <><path d="M5 3h9l5 5v13H5Zm9 0v5h5M9 12h6m-6 4h6" /></>,
  };
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[name] || paths.book}</svg>;
}

function SectionHeading({ title, icon, action }: { title: string; icon?: string; action?: ReactNode }) {
  return <div className="learning-section-heading"><h2>{icon && <LearningIcon name={icon} size={19} />}{title}</h2>{action}</div>;
}

export function LearningDashboard({ library, role, onRole, completed, active, busy, onTopic, onRolePath, onCourses, onSimulations, onProgress }: {
  library: CaseLibraryView; role: LearningRole; onRole: (role: LearningRole) => void;
  completed: ReadonlySet<number>; active: ReadonlySet<number>; busy: boolean;
  onTopic: (topic: Topic) => void; onRolePath: () => void; onCourses: () => void; onSimulations: () => void; onProgress: () => void;
}) {
  const topics = roleTopics(library, role);
  // Read-only overviews have no completion event, so they are not counted as completable modules.
  const playable = topics.filter((topic) => topic.cases.length > 0);
  const done = playable.filter((topic) => completed.has(topic.number)).length;
  const percentage = playable.length ? Math.round(done / playable.length * 100) : 0;
  const next = playable.find((topic) => active.has(topic.number)) || playable.find((topic) => !completed.has(topic.number)) || playable[0];
  return <>
    <section className="learning-hero">
      <div className="learning-container">
        <p className="learning-eyebrow"><span />LEARNING CENTER <span className="learning-divider">/</span> YOUR PERSONAL LEARNING PATH</p>
        <h1>My Learning <span className="learning-title-dash">—</span> <span>{role.short}</span></h1>
        <p className="learning-hero-description">Build your knowledge. Practise your judgement. Make a difference.</p>
        <div className="learning-path-progress">
          <div className="learning-path-name"><span className="learning-path-icon"><LearningIcon name="book" size={25} /></span><div><small>MY CURRENT PATH</small><strong>Role-based AML · {role.short}</strong><span>Foundation <i>→</i> Application <i>→</i> Advanced practice</span></div></div>
          <div className="learning-progress"><div><span><strong>{done}</strong> of {playable.length} modules completed</span><strong>{percentage}%</strong></div><progress value={percentage} max={100} aria-label="Role path completion" /></div>
        </div>
      </div>
    </section>
    <div className="learning-breadcrumb"><div className="learning-container"><span>My Learning <LearningIcon name="chevron" size={13} /> <strong>{role.title}</strong></span><span className="learning-breadcrumb-note"><LearningIcon name="clock" size={14} /> Learn at your own pace</span></div></div>
    <div className="learning-container learning-dashboard-grid">
      <aside className="portal-card learning-role-panel">
        <SectionHeading title="Your professional role" icon="people" />
        <p className="learning-role-intro">A learning path built around your work.</p>
        <label className="learning-mobile-role"><span className="sr-only">Professional role</span><select value={role.id} onChange={(event) => onRole(LEARNING_ROLES.find((item) => item.id === event.target.value) || LEARNING_ROLES[0])}>{LEARNING_ROLES.map((item) => <option key={item.id} value={item.id}>{item.title}</option>)}</select></label>
        <div className="learning-role-options" role="group" aria-label="Professional role">
          {LEARNING_ROLES.map((item) => <button key={item.id} className={`learning-role-option ${role.id === item.id ? "is-selected" : ""}`} aria-pressed={role.id === item.id} onClick={() => onRole(item)}><span><strong>{item.title}</strong><small>{item.description}</small></span><span className="learning-role-check">{role.id === item.id && <LearningIcon name="check" size={12} />}</span></button>)}
        </div>
        <button className="portal-button portal-button-blue learning-full" onClick={onRolePath}>Open this role path <LearningIcon name="arrow" size={16} /></button>
        <p className="learning-role-footnote">You can switch roles at any time. Your saved learning progress stays with you.</p>
        <div className="learning-role-assurance"><LearningIcon name="shield" size={25} /><div><strong>Practice with confidence</strong><span>Realistic scenarios. Synthetic data.<br />A safe space to learn.</span></div></div>
      </aside>
      <div className="learning-dashboard-content">
        <section className="portal-card learning-path-card">
          <SectionHeading title="Your learning path" icon="book" action={<span className="learning-caption">{topics.length} topics · {role.short}</span>} />
          <div className="learning-path-list">{topics.map((topic, index) => {
            const isDone = completed.has(topic.number); const isActive = active.has(topic.number);
            const status = isDone ? "Completed" : isActive ? "In progress" : !topic.cases.length ? "Overview" : "Not started";
            return <button className="learning-path-row" key={topic.number} onClick={() => onTopic(topic)} disabled={busy} aria-label={`${topic.title} — ${status}`}><span className={`learning-step ${isDone ? "is-complete" : isActive ? "is-active" : ""}`}>{isDone ? <LearningIcon name="check" size={14} /> : String(index + 1).padStart(2, "0")}</span><span className="learning-path-topic">{topic.title}<small>{TOPIC_DETAILS[topic.number]?.level} · {topic.cases.length ? "Guided practice" : "Reading"}</small></span><span className={`learning-status ${isDone ? "is-complete" : isActive ? "is-active" : ""}`}>{status}</span><LearningIcon name="chevron" size={15} /></button>;
          })}</div>
        </section>
        <div className="learning-action-grid">
          <section className="portal-card learning-action-card"><span className="learning-action-icon"><LearningIcon name="arrow" /></span><h2>Recommended next step</h2><p>{next?.title || "Explore your learning topics"}</p><button className="portal-button portal-button-blue" disabled={busy} onClick={() => next ? onTopic(next) : onCourses()}>{next && active.has(next.number) ? "Continue learning" : done === playable.length ? "Practise again" : "Start learning"}<LearningIcon name="arrow" size={15} /></button></section>
          <section className="portal-card learning-action-card"><span className="learning-action-icon is-green"><LearningIcon name="screen" /></span><h2>Learn by doing</h2><p>Step into a realistic scenario and put your AML skills into practice.</p><button className="portal-button portal-button-subtle" onClick={onSimulations}>Explore simulations <LearningIcon name="arrow" size={15} /></button></section>
          <section className="portal-card learning-action-card"><span className="learning-action-icon is-violet"><LearningIcon name="chart" /></span><h2>See how far you’ve come</h2><p>Review your saved decisions, session outcomes and learning progress.</p><button className="portal-button portal-button-subtle" onClick={onProgress}>View my progress <LearningIcon name="arrow" size={15} /></button></section>
        </div>
        <section className="portal-card learning-featured">
          <SectionHeading title="Featured courses" action={<button className="portal-text-button" onClick={onCourses}>View all courses <LearningIcon name="arrow" size={14} /></button>} />
          <div className="learning-featured-grid">{[...playable, ...topics.filter((topic) => !topic.cases.length)].slice(0, 3).map((topic, index) => <article className="learning-course" key={topic.number}><span className="learning-course-kicker"><LearningIcon name="book" size={14} /> TOPIC {String(topic.number).padStart(2, "0")}</span><h3>{topic.title}</h3><p>{TOPIC_DETAILS[topic.number]?.summary}</p><small>{TOPIC_DETAILS[topic.number]?.level} <span>·</span> Self-paced</small><button className={`portal-button ${index === 0 ? "portal-button-blue" : "portal-button-subtle"}`} disabled={busy} onClick={() => onTopic(topic)}>{active.has(topic.number) ? "Continue" : completed.has(topic.number) ? "Practise again" : !topic.cases.length ? "Read overview" : "Start module"}<LearningIcon name="arrow" size={14} /></button></article>)}</div>
        </section>
        <LearningResources onCase={() => { const topic = library.workflows.find((item) => item.number === 2); if (topic) onTopic(topic); }} />
      </div>
    </div>
  </>;
}

export function LearningResources({ onCase }: { onCase: () => void }) {
  return <section className="portal-card learning-resources"><SectionHeading title="Keep exploring" action={<span className="learning-caption">Resources for curious minds</span>} /><div className="learning-resource-grid">
    <a className="learning-resource" href="https://www.hkma.gov.hk/eng/key-functions/banking/anti-money-laundering-and-counter-financing-of-terrorism/" target="_blank" rel="noreferrer"><span className="learning-resource-icon"><LearningIcon name="shield" /></span><div><small>HKMA · PUBLIC RESOURCES</small><h3>AML & counter-financing of terrorism</h3><p>Explore guidance and educational materials.</p></div><LearningIcon name="external" size={15} /></a>
    <a className="learning-resource" href="https://www.jfiu.gov.hk/en/str.html" target="_blank" rel="noreferrer"><span className="learning-resource-icon"><LearningIcon name="file" /></span><div><small>JFIU · REFERENCE GUIDE</small><h3>Identifying suspicious activity</h3><p>Read the official reporting guidance.</p></div><LearningIcon name="external" size={15} /></a>
    <button className="learning-resource" onClick={onCase}><span className="learning-resource-icon"><LearningIcon name="screen" /></span><div><small>TWINAML · INTERACTIVE CASE</small><h3>Follow the money</h3><p>Explore crypto mixers and mule accounts.</p></div><LearningIcon name="arrow" size={15} /></button>
  </div></section>;
}

const ENVIRONMENTS = [
  { id: "onboarding", title: "Client onboarding & due diligence", category: "Client onboarding", level: "Application", skills: ["CDD", "Customer risk"], caseId: "bank-cdd-001", description: "Review a customer relationship, identify due diligence gaps and decide how to respond.", format: "Guided case", imageAlt: "A private banking meeting room with a walnut desk and cream chairs" },
  { id: "branch", title: "Branch suspicious activity review", category: "Branch operations", level: "Foundation", skills: ["Red flags", "Mule accounts"], caseId: "mule-rent-001", description: "Examine unusual account activity and recognise the signs of an account rental scheme.", format: "Guided case", imageAlt: "A bright bank branch with service counters and consultation desks" },
  { id: "monitoring", title: "Transaction monitoring & investigation", category: "Transaction monitoring", level: "Advanced", skills: ["Investigation", "Transaction monitoring"], caseId: null, description: "Investigate an evolving account, request evidence and manage time-sensitive payments.", format: "Timed simulation", imageAlt: "An analyst workstation displaying financial charts and transaction networks" },
];
export type LearningSavedRun = { id: string; title: string; progress: string };

export function SimulationCatalog({ library, runs, run, simulation, busy, onStart, onResume, onSimulation, onHelp, onIntro }: {
  library: CaseLibraryView; runs: LearningSavedRun[]; run: CaseSessionView | null;
  simulation: { ended: boolean; minute: number; endMinute: number } | null;
  busy: boolean; onStart: (caseId: string) => void; onResume: (id: string) => void; onSimulation: () => void; onHelp: () => void; onIntro: () => void;
}) {
  const [environment, setEnvironment] = useState("all");
  const [level, setLevel] = useState("all");
  const [skill, setSkill] = useState("all");
  const scenes = ENVIRONMENTS.map((scene) => {
    const entry = library.workflows.flatMap((topic) => topic.cases).find((item) => item.caseId === scene.caseId);
    const saved = entry ? runs.find((item) => item.title === entry.title && !item.progress.startsWith("Completed")) || runs.find((item) => item.title === entry.title) : undefined;
    const selected = run?.caseId === scene.caseId ? run : null;
    const complete = scene.caseId ? Boolean(selected?.debrief || saved?.progress.startsWith("Completed")) : Boolean(simulation?.ended);
    const started = scene.caseId ? Boolean(selected || saved) : Boolean(simulation);
    return { ...scene, complete, started, savedId: selected?.id || saved?.id, available: !scene.caseId || Boolean(entry) };
  });
  const filtered = scenes.filter((scene) => (environment === "all" || scene.category === environment) && (level === "all" || scene.level === level) && (skill === "all" || scene.skills.includes(skill)));
  const reset = () => { setEnvironment("all"); setLevel("all"); setSkill("all"); };
  return <>
    <section className="learning-hero simulation-catalog-hero"><div className="learning-container">
      <p className="learning-eyebrow"><span />SIMULATION CENTER <span className="learning-divider">/</span> LEARN THROUGH EXPERIENCE</p>
      <h1>Step into your next scenario.</h1><p className="learning-hero-description">Choose a guided case or timed investigation. Build confidence through practice.</p>
      <div className="simulation-filters"><span><LearningIcon name="filter" size={19} /> Find your simulation</span><label><span className="sr-only">Environment</span><select value={environment} onChange={(event) => setEnvironment(event.target.value)}><option value="all">All environments</option>{ENVIRONMENTS.map((scene) => <option key={scene.id}>{scene.category}</option>)}</select></label><label><span className="sr-only">Difficulty</span><select value={level} onChange={(event) => setLevel(event.target.value)}><option value="all">All difficulty levels</option>{["Foundation", "Application", "Advanced"].map((item) => <option key={item}>{item}</option>)}</select></label><label><span className="sr-only">Core skill</span><select value={skill} onChange={(event) => setSkill(event.target.value)}><option value="all">All core skills</option>{ENVIRONMENTS.flatMap((scene) => scene.skills).map((item) => <option key={item}>{item}</option>)}</select></label></div>
    </div></section>
    <div className="learning-container simulation-catalog-body"><div className="simulation-catalog-heading"><div><h2>Choose your learning environment</h2><p role="status">{filtered.length} of {scenes.length} simulations <span>·</span> All available in your browser</p></div>{(environment !== "all" || level !== "all" || skill !== "all") && <button className="portal-text-button" onClick={reset}>Clear filters</button>}</div>
      <div className="simulation-catalog-layout"><div className="simulation-scene-grid">
        {filtered.map((scene) => <article className="portal-card simulation-scene" key={scene.id}><div className="simulation-scene-image"><img src={`/images/${scene.id}.webp`} alt={scene.imageAlt} /><span>{scene.level}</span></div><div className="simulation-scene-content"><p className="learning-course-kicker"><LearningIcon name={scene.caseId ? "book" : "clock"} size={14} />{scene.format}</p><h3>{scene.title}</h3><p className="simulation-scene-description">{scene.description}</p><div className="simulation-skill-tags">{scene.skills.map((item) => <span key={item}>{item}</span>)}</div><div className="simulation-scene-progress"><span className={`learning-status ${scene.complete ? "is-complete" : scene.started ? "is-active" : ""}`}>{scene.complete ? "Completed · replay available" : scene.started ? "In progress" : "Not started"}</span>{!scene.caseId && simulation && !simulation.ended && <small>Minute {simulation.minute} of {simulation.endMinute}</small>}</div><div className="simulation-device"><LearningIcon name="screen" size={16} />Browser-based · No headset required</div><button className="portal-button simulation-start" disabled={busy || !scene.available} onClick={() => { if (!scene.caseId) onSimulation(); else if (scene.savedId && !scene.complete) onResume(scene.savedId); else onStart(scene.caseId); }}>{!scene.available ? "Unavailable" : scene.complete ? "Review / replay" : scene.started ? "Continue simulation" : "Start simulation"}<LearningIcon name="arrow" size={16} /></button></div></article>)}
        {!filtered.length && <div className="portal-card simulation-no-results"><LearningIcon name="filter" size={32} /><h3>No simulations match these filters</h3><p>Try another environment, difficulty level or skill.</p><button className="portal-button portal-button-blue" onClick={reset}>Reset filters</button></div>}
      </div><aside className="simulation-catalog-aside"><section className="portal-card"><span className="learning-action-icon"><LearningIcon name="chart" /></span><h2>Your practice overview</h2><p className="learning-aside-description">Every scenario is a step forward.</p><dl className="simulation-overview-stats"><div><dt>Completed environments</dt><dd>{scenes.filter((scene) => scene.complete).length}<small> / {scenes.length}</small></dd></div><div><dt>In progress</dt><dd>{scenes.filter((scene) => scene.started && !scene.complete).length}</dd></div></dl><p className="learning-caption">SKILLS TO PRACTISE</p><div className="simulation-skill-tags"><span>CDD</span><span>Red flags</span><span>Investigation</span></div></section>
        <section className="portal-card simulation-guide"><SectionHeading title="Simulation guide" icon="book" /><button onClick={onIntro}>How the training works <LearningIcon name="arrow" size={14} /></button><button onClick={onHelp}>Controls, saving & replay <LearningIcon name="arrow" size={14} /></button><button onClick={onHelp}>Help & troubleshooting <LearningIcon name="arrow" size={14} /></button></section>
        <div className="simulation-assurance"><LearningIcon name="shield" size={27} /><h3>Real decisions. Safe practice.</h3><p>Explore different approaches with synthetic customers and transactions.</p></div>
      </aside></div>
    </div>
  </>;
}

export function ComplianceTools({ onSimulation }: { onSimulation: () => void }) {
  return <><div className="portal-page-heading"><p className="learning-course-kicker">YOUR PRACTICE TOOLKIT</p><h1>Compliance tools</h1><p>Move from learning the principles to applying them in a working investigation.</p></div><div className="learning-tools-grid">{[
    { title: "AML operations workbench", icon: "chart", text: "Triage alerts, explore entities, investigate cases and practise an STR review.", href: "/operations" },
    { title: "The Second Ledger", icon: "file", text: "Review source records, follow transfers and record a decision supported by evidence.", href: "/investigation" },
  ].map((item) => <section className="portal-card learning-tool" key={item.href}><span className="learning-action-icon"><LearningIcon name={item.icon} /></span><h2>{item.title}</h2><p>{item.text}</p><a className="portal-button portal-button-blue" href={item.href}>Open workspace <LearningIcon name="arrow" size={16} /></a></section>)}<section className="portal-card learning-tool"><span className="learning-action-icon is-green"><LearningIcon name="screen" /></span><h2>Timed AML investigation</h2><p>Request checks, assess pending payments and submit an assessment for practice review.</p><button className="portal-button portal-button-blue" onClick={onSimulation}>Open simulation <LearningIcon name="arrow" size={16} /></button></section></div><LearningResources onCase={onSimulation} /></>;
}
