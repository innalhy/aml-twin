import { useEffect, useRef, useState } from "react";
import {
  fetchCases,
  fetchEvidence,
  fetchSession,
  fetchSessions,
  isAbortError,
  openSession,
  submitChoice,
  type CaseRow,
  type Evidence,
  type ScriptNode,
  type SessionSummary,
  type SessionView,
} from "./api";

function useHash() {
  const [hash, setHash] = useState(() => window.location.hash || "#/");
  useEffect(() => {
    const onChange = () => setHash(window.location.hash || "#/");
    window.addEventListener("hashchange", onChange);
    return () => window.removeEventListener("hashchange", onChange);
  }, []);
  return hash;
}

function go(hash: string) {
  window.location.hash = hash;
}

function catalogIsCurrent() {
  const hash = window.location.hash;
  return hash === "" || hash === "#" || hash === "#/";
}

function hashId(hash: string, prefix: string) {
  const raw = hash.slice(prefix.length);
  try {
    return decodeURIComponent(raw);
  } catch {
    return raw;
  }
}

function ruleFollowLabel(value: boolean | null) {
  if (value === null) return "In progress";
  return value ? "Yes" : "No";
}

function MediaNote({ node }: { node: ScriptNode }) {
  if (!node.media_ref) return null;
  if (node.media_missing) {
    return (
      <p className="media missing">
        Media file is not in this checkout: <code>{node.media_ref}</code>
      </p>
    );
  }
  return (
    <p className="media">
      Media on file: <code>{node.media_ref}</code>
    </p>
  );
}

function App() {
  const hash = useHash();
  if (hash.startsWith("#/play/")) {
    return <Player sessionId={hashId(hash, "#/play/")} />;
  }
  if (hash.startsWith("#/dashboard/")) {
    return <DashboardDetail sessionId={hashId(hash, "#/dashboard/")} />;
  }
  if (hash.startsWith("#/dashboard")) {
    return <Dashboard />;
  }
  return <Catalog />;
}

function Catalog() {
  const [cases, setCases] = useState<CaseRow[] | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState("");
  const starting = useRef(false);
  const alive = useRef(true);

  useEffect(() => {
    alive.current = true;
    const controller = new AbortController();
    fetchCases(controller.signal)
      .then((body) => {
        if (!controller.signal.aborted) setCases(body.cases);
      })
      .catch((err) => {
        if (isAbortError(err) || controller.signal.aborted) return;
        setError("The API is not answering. Start it on port 8000, then refresh.");
      });
    return () => {
      alive.current = false;
      controller.abort();
    };
  }, []);

  async function start(caseId: string) {
    if (starting.current) return;
    starting.current = true;
    setBusy(caseId);
    setError("");
    try {
      const session = await openSession(caseId);
      if (alive.current && catalogIsCurrent()) {
        go(`#/play/${encodeURIComponent(session.session_id)}`);
        return;
      }
    } catch (err) {
      if (alive.current) {
        setError(err instanceof Error ? err.message : "Could not open a session");
      }
    }
    starting.current = false;
    if (alive.current) setBusy("");
  }

  return (
    <main>
      <p className="eyebrow">COMP3424 demo · Chan Level 1</p>
      <h1>TwinAML</h1>
      <p className="lead">
        Pick a synthetic case. The API clones its mirror, applies your choices, and
        keeps the event log. This page only reads that session.
      </p>
      <p className="nav">
        <a href="#/dashboard">Dashboard</a>
      </p>
      {error ? <p className="error">{error}</p> : null}
      {cases === null && !error ? <p className="note">Loading cases…</p> : null}
      <ul className="cases">
        {(cases ?? []).map((item) => (
          <li key={item.case_id}>
            <div>
              <strong>{item.title}</strong>
              <span className="meta">
                <code>{item.case_id}</code>
                {item.case_kind ? ` · ${item.case_kind}` : ""}
              </span>
              <span>{item.summary}</span>
            </div>
            <button type="button" disabled={busy !== ""} onClick={() => start(item.case_id)}>
              {busy === item.case_id ? "Opening…" : "Start"}
            </button>
          </li>
        ))}
      </ul>
    </main>
  );
}

function Player({ sessionId }: { sessionId: string }) {
  const [session, setSession] = useState<SessionView | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [seenId, setSeenId] = useState(sessionId);
  const choosing = useRef(false);
  const alive = useRef(true);
  const sessionIdRef = useRef(sessionId);
  sessionIdRef.current = sessionId;

  if (seenId !== sessionId) {
    setSeenId(sessionId);
    setSession(null);
    setError("");
    setBusy(false);
    choosing.current = false;
  }

  useEffect(() => {
    alive.current = true;
    const controller = new AbortController();
    fetchSession(sessionId, controller.signal)
      .then((next) => {
        if (!controller.signal.aborted) setSession(next);
      })
      .catch((err) => {
        if (isAbortError(err) || controller.signal.aborted) return;
        setError("That session is not on this API process.");
      });
    return () => {
      alive.current = false;
      controller.abort();
    };
  }, [sessionId]);

  async function choose(choiceId: string) {
    if (choosing.current) return;
    choosing.current = true;
    const requested = sessionIdRef.current;
    setBusy(true);
    setError("");
    try {
      const next = await submitChoice(requested, choiceId);
      if (alive.current && sessionIdRef.current === requested) setSession(next);
    } catch (err) {
      if (alive.current && sessionIdRef.current === requested) {
        setError(err instanceof Error ? err.message : "Decision failed");
      }
    } finally {
      if (sessionIdRef.current === requested) {
        choosing.current = false;
        if (alive.current) setBusy(false);
      }
    }
  }

  if (!session) {
    return (
      <main>
        <p className="eyebrow">Scenario player</p>
        {error ? <p className="error">{error}</p> : <p className="note">Loading session…</p>}
        <p className="nav">
          <a href="#/">Cases</a>
        </p>
      </main>
    );
  }

  const closed = session.status === "closed";

  return (
    <main className="split">
      <section>
        <p className="eyebrow">Scenario player</p>
        <h1>{session.title}</h1>
        <p className="meta">
          <code>{session.case_id}</code> · session <code>{session.session_id}</code>
        </p>
        <p className="nav">
          <a href="#/">Cases</a>
          <a href={`#/dashboard/${encodeURIComponent(session.session_id)}`}>Dashboard</a>
        </p>
        {error ? <p className="error">{error}</p> : null}
        {session.passed_scenes.map((scene) => (
          <article key={scene.id} className="card scene">
            <p className="kicker">Scene</p>
            <h2>{scene.title}</h2>
            <p>{scene.prompt}</p>
            <MediaNote node={scene} />
          </article>
        ))}
        <article className="card">
          <p className="kicker">{session.node.type}</p>
          <h2>{session.node.title}</h2>
          <p>{session.node.prompt}</p>
          <MediaNote node={session.node} />
          {session.node.type === "decision" ? (
            <div className="choices">
              {(session.node.choices ?? []).map((choice) => (
                <button key={choice.id} type="button" disabled={busy} onClick={() => choose(choice.id)}>
                  <strong>{choice.label}</strong>
                  {choice.rationale ? <span>{choice.rationale}</span> : null}
                </button>
              ))}
            </div>
          ) : null}
          {closed ? (
            <div className="outcome">
              <p>
                Disposition <code>{session.teaching.disposition}</code>
              </p>
              <p>
                Rule follow: <strong>{ruleFollowLabel(session.teaching.rule_follow)}</strong>
                {session.teaching.poor_path ? " · teaching poor path" : ""}
                {session.teaching.incomplete ? " · incomplete path" : ""}
              </p>
            </div>
          ) : null}
        </article>
      </section>
      <aside>
        <h2>Twin</h2>
        <dl>
          <div>
            <dt>Phase</dt>
            <dd>{session.twin.phase ?? "—"}</dd>
          </div>
          <div>
            <dt>KYC</dt>
            <dd>{session.twin.kyc?.status ?? "—"}</dd>
          </div>
          <div>
            <dt>Score</dt>
            <dd>{session.risk.score ?? "—"}</dd>
          </div>
          <div>
            <dt>Customer</dt>
            <dd>{session.twin.customer?.id ?? "—"}</dd>
          </div>
        </dl>
        <h3>Flags</h3>
        {session.risk.flags.length === 0 ? (
          <p className="note">None yet.</p>
        ) : (
          <ul className="flags">
            {session.risk.flags.map((flag) => (
              <li key={flag}>{flag}</li>
            ))}
          </ul>
        )}
        <h3>Rules</h3>
        <ul className="rules">
          {session.rules.map((rule) => (
            <li key={rule.id}>
              <code>{rule.id}</code>
              <span>{rule.when}</span>
              {rule.flags && rule.flags.length > 0 ? (
                <span className="note">{rule.flags.join(", ")}</span>
              ) : null}
            </li>
          ))}
        </ul>
      </aside>
    </main>
  );
}

function Dashboard() {
  const [rows, setRows] = useState<SessionSummary[] | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    const controller = new AbortController();
    fetchSessions(controller.signal)
      .then((body) => {
        if (!controller.signal.aborted) setRows(body.sessions);
      })
      .catch((err) => {
        if (isAbortError(err) || controller.signal.aborted) return;
        setError("The API is not answering. Start it on port 8000, then refresh.");
      });
    return () => controller.abort();
  }, []);

  return (
    <main>
      <p className="eyebrow">Dashboard</p>
      <h1>Recent sessions</h1>
      <p className="lead">Each row is a session on the API. The player does not keep a second copy.</p>
      <p className="nav">
        <a href="#/">Cases</a>
      </p>
      {error ? <p className="error">{error}</p> : null}
      {rows === null && !error ? <p className="note">Loading sessions…</p> : null}
      {rows && rows.length === 0 ? <p className="note">No sessions yet. Start a case first.</p> : null}
      <ul className="cases">
        {(rows ?? []).map((row) => (
          <li key={row.session_id}>
            <div>
              <strong>{row.title}</strong>
              <span className="meta">
                <code>{row.case_id}</code> · {row.status}
                {row.disposition ? ` · ${row.disposition}` : ""}
              </span>
              <span>
                Rule follow: {ruleFollowLabel(row.rule_follow)}
                {row.poor_path ? " · poor path" : ""}
                {row.flags.length ? ` · ${row.flags.join(", ")}` : ""}
              </span>
            </div>
            <a className="button" href={`#/dashboard/${encodeURIComponent(row.session_id)}`}>
              Open
            </a>
          </li>
        ))}
      </ul>
    </main>
  );
}

function DashboardDetail({ sessionId }: { sessionId: string }) {
  const [session, setSession] = useState<SessionView | null>(null);
  const [card, setCard] = useState<Evidence | null>(null);
  const [error, setError] = useState("");
  const [cardError, setCardError] = useState("");
  const [seenId, setSeenId] = useState(sessionId);

  if (seenId !== sessionId) {
    setSeenId(sessionId);
    setSession(null);
    setCard(null);
    setError("");
    setCardError("");
  }

  useEffect(() => {
    const controller = new AbortController();
    fetchSession(sessionId, controller.signal)
      .then((next) => {
        if (!controller.signal.aborted) setSession(next);
      })
      .catch((err) => {
        if (isAbortError(err) || controller.signal.aborted) return;
        setError("That session is not on this API process.");
      });
    fetchEvidence(sessionId, controller.signal)
      .then((evidence) => {
        if (!controller.signal.aborted) setCard(evidence);
      })
      .catch((err) => {
        if (isAbortError(err) || controller.signal.aborted) return;
        setCardError("The audit card is not on this API process.");
      });
    return () => controller.abort();
  }, [sessionId]);

  if (!session) {
    return (
      <main>
        <p className="eyebrow">Dashboard</p>
        {error ? <p className="error">{error}</p> : <p className="note">Loading session…</p>}
        <p className="nav">
          <a href="#/dashboard">All sessions</a>
        </p>
      </main>
    );
  }

  return (
    <main>
      <p className="eyebrow">Dashboard</p>
      <h1>{session.title}</h1>
      <p className="meta">
        <code>{session.case_id}</code> · <code>{session.session_id}</code>
      </p>
      <p className="nav">
        <a href="#/dashboard">All sessions</a>
        <a href={`#/play/${encodeURIComponent(session.session_id)}`}>Player</a>
      </p>
      {error ? <p className="error">{error}</p> : null}
      <dl className="facts">
        <div>
          <dt>Disposition</dt>
          <dd>{session.teaching.disposition ?? "—"}</dd>
        </div>
        <div>
          <dt>Rule follow</dt>
          <dd>{ruleFollowLabel(session.teaching.rule_follow)}</dd>
        </div>
        <div>
          <dt>Poor path</dt>
          <dd>{session.teaching.poor_path ? "Yes" : "No"}</dd>
        </div>
        <div>
          <dt>Phase</dt>
          <dd>{session.twin.phase ?? "—"}</dd>
        </div>
        <div>
          <dt>Flags</dt>
          <dd>{session.risk.flags.length ? session.risk.flags.join(", ") : "None"}</dd>
        </div>
      </dl>
      <article className="card">
        <h2>Audit card</h2>
        {card ? (
          <>
            <p>{card.mirrored}</p>
            <p className="note">
              {card.event_count} events · {card.override_count === 1 ? "1 override" : `${card.override_count} overrides`}
              {card.customer_id ? ` · customer ${card.customer_id}` : ""}
            </p>
          </>
        ) : cardError ? (
          <p className="error">{cardError}</p>
        ) : (
          <p className="note">Loading audit card…</p>
        )}
      </article>
      <h2>Events</h2>
      <ol className="events">
        {session.events.map((event) => (
          <li key={event.seq}>
            <code>{event.type}</code>
            <span>
              {event.node_id ? event.node_id : ""}
              {event.choice_id ? ` · ${event.choice_id}` : ""}
            </span>
          </li>
        ))}
      </ol>
    </main>
  );
}

export { App };
