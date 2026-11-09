import { Fragment, useCallback, useEffect, useState, type ReactNode } from "react";
import { ClerkProvider, SignIn, useAuth, useClerk, useUser } from "@clerk/react";
import { ACCOUNT_EXPIRED, apiFetch, sessionKey, setTokenGetter } from "./account-api";
import "./account.css";

type User = { id: string; email: string | null; createdAt: string };
type Account = { enabled: boolean; configured?: boolean; user: User | null };
type RunKind = "aml" | "investigation" | "case";
type Run = { kind: RunKind; id: string; title: string; createdAt: string; updatedAt: string; progress: string; route?: string };
const AREAS: Record<RunKind, { label: string; route: string; key: string }> = {
  aml: { label: "Hong Kong AML", route: "/operations", key: "twinaml-hk-workflow-session" },
  investigation: { label: "The Second Ledger", route: "/investigation", key: "twinaml-second-ledger-session" },
  case: { label: "Case library", route: "/cases", key: "twinaml-case-session" },
};
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const PROGRESS_EVENT = "twinaml:progress";

export function openAccountProgress() {
  window.dispatchEvent(new Event(PROGRESS_EVENT));
}

export function AccountSettings({ accountId }: { accountId: string | null }) {
  if (!accountId || !import.meta.env.VITE_CLERK_PUBLISHABLE_KEY) return <div className="account-settings"><h3>Training account</h3><p>You are using an anonymous training workspace. Your current run can be resumed in this browser.</p><p>Account settings are available when you sign in to TwinAML.</p></div>;
  return <ClerkAccountSettings />;
}

function ClerkAccountSettings() {
  const { openUserProfile } = useClerk();
  return <div className="account-settings"><h3>Personal details and security</h3><p>Manage your name, email, connected Google account and sign-in settings.</p><button className="account-primary" onClick={() => openUserProfile()}>Manage account</button></div>;
}

async function accountRequest<T>(path: string, body?: object): Promise<T> {
  const response = await apiFetch(path, body === undefined ? {} : { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  const result = await response.json().catch(() => null);
  if (!response.ok) {
    const messages: Record<string, string> = {
      rate_limited: "Too many attempts. Please wait before trying again.",
      session_not_found: "That run is unavailable or already belongs to an account.",
    };
    throw new Error(messages[result?.error] || (typeof result?.error === "string" ? result.error.replaceAll("_", " ") : "The account service is unavailable. Please try again."));
  }
  if (!result) throw new Error("The account service returned an unreadable response.");
  return result;
}

export function AccountShell({ children }: { children: (accountId: string | null) => ReactNode }) {
  const publishableKey = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;
  if (!publishableKey) return <AccountSetup>{children}</AccountSetup>;
  return <ClerkProvider publishableKey={publishableKey} appearance={{ variables: { colorPrimary: "#4779b4", borderRadius: "6px", fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' }, elements: { rootBox: { width: "100%" }, cardBox: { width: "100%", boxShadow: "none" } } }}><ClerkWorkspace>{children}</ClerkWorkspace></ClerkProvider>;
}

function Loading({ error, onRetry }: { error?: string; onRetry?: () => void }) {
  return <main className="account-loading" aria-busy={!error}><h1>TwinAML</h1>{error ? <><p role="alert">{error}</p>{onRetry && <button onClick={onRetry}>Try again</button>}</> : <p role="status">Opening your workspace…</p>}</main>;
}

function SetupNotice({ frontendMissing }: { frontendMissing?: boolean }) {
  return <main className="account-loading"><h1>Account sign-in needs setup</h1><p>TwinAML uses Clerk for Google and email sign-in. Your saved runs stay in the existing database.</p><p>{frontendMissing ? "Set VITE_CLERK_PUBLISHABLE_KEY when building the web client." : "Configure the Clerk verification settings on the API server."} Complete the matching Clerk application setup before signing in.</p><p>See the account setup instructions in the project README.</p></main>;
}

function AccountSetup({ children }: { children: (accountId: string | null) => ReactNode }) {
  const [account, setAccount] = useState<Account | null>(null);
  const [error, setError] = useState("");
  const check = useCallback(async () => {
    setError("");
    try { setAccount(await accountRequest<Account>("/api/account")); }
    catch (err) { setError(err instanceof Error ? err.message : "Unable to check sign-in settings."); }
  }, []);
  useEffect(() => { void check(); }, [check]);
  if (!account) return <Loading error={error} onRetry={() => { void check(); }} />;
  if (!account.enabled) return <>{children(null)}</>;
  return <SetupNotice frontendMissing />;
}

function ClerkWorkspace({ children }: { children: (accountId: string | null) => ReactNode }) {
  const { isLoaded, isSignedIn, userId, getToken, signOut } = useAuth();
  const { user: clerkUser } = useUser();
  const [account, setAccount] = useState<Account | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [progressOpen, setProgressOpen] = useState(false);
  const [checking, setChecking] = useState(true);
  const [verifiedSubject, setVerifiedSubject] = useState<string | null | undefined>(undefined);
  const check = useCallback(async () => {
    try { setAccount(await accountRequest<Account>("/api/account")); setVerifiedSubject(userId); setError(""); }
    catch (err) { setError(err instanceof Error ? err.message : "Unable to verify your account."); }
    finally { setChecking(false); }
  }, [userId]);
  useEffect(() => {
    if (!isLoaded) return;
    setAccount(null); setProgressOpen(false); setChecking(true);
    setTokenGetter(getToken);
    let active = true;
    accountRequest<Account>("/api/account").then((next) => { if (active) { setAccount(next); setVerifiedSubject(userId); setError(""); } })
      .catch((err) => { if (active) { setVerifiedSubject(userId); setError(err instanceof Error ? err.message : "Unable to verify your account."); } })
      .finally(() => { if (active) setChecking(false); });
    return () => { active = false; setTokenGetter(null); };
  }, [isLoaded, isSignedIn, userId, getToken]);
  useEffect(() => {
    const expired = () => { setAccount(null); setProgressOpen(false); setChecking(false); setError("Your sign-in could not be verified. Sign in again to continue your saved work."); };
    window.addEventListener(ACCOUNT_EXPIRED, expired);
    return () => { window.removeEventListener(ACCOUNT_EXPIRED, expired); };
  }, []);
  useEffect(() => {
    const openProgress = () => { setProgressOpen(true); window.scrollTo({ top: 0, behavior: "smooth" }); };
    window.addEventListener(PROGRESS_EVENT, openProgress);
    return () => { window.removeEventListener(PROGRESS_EVENT, openProgress); };
  }, []);
  async function leave() {
    setBusy(true); setError("");
    try { await signOut(); setAccount(null); setProgressOpen(false); }
    catch (err) { setError(err instanceof Error ? err.message : "Unable to sign out."); }
    finally { setBusy(false); }
  }
  if (!isLoaded || checking || verifiedSubject !== userId) return <Loading />;
  if (account && !account.enabled) return <>{children(null)}</>;
  if (account && !account.configured) return <SetupNotice />;
  if (!isSignedIn) return <div className="account-entry">
    <header className="account-entry-header"><a href="/" className="account-brand"><span className="account-logo" aria-hidden="true">T</span>TwinAML <span className="account-brand-description">— AML Training Portal</span></a><span className="account-entry-label">COMP3424 · Digital twin training</span></header>
    <main className="account-entry-main"><section className="account-signin-card" aria-labelledby="account-welcome"><div className="account-intro"><p className="account-kicker">Welcome to your training workspace</p><h1 id="account-welcome">Welcome to TwinAML</h1><p>Practise real-world decisions in a safe, synthetic environment. Sign in to start your training and keep your progress.</p></div>
    <div className="account-clerk" aria-label="Sign in or create an account">{error && <p className="account-message account-error" role="alert">{error}</p>}<SignIn routing="hash" withSignUp fallbackRedirectUrl={`${window.location.pathname}${window.location.search}`} signUpFallbackRedirectUrl={`${window.location.pathname}${window.location.search}`} fallback={<p role="status">Loading secure sign-in…</p>} /></div>
    <p className="account-help">Your submitted decisions are saved to your account. Unsaved form drafts stay in this tab.</p></section></main><footer className="account-entry-footer">TwinAML · Synthetic practice data · No live bank connection</footer>
  </div>;
  if (!account?.user || error) return <main className="account-loading"><h1>Account verification</h1><p role="alert">{error || "The server could not verify your account."}</p><div className="account-inline"><button onClick={() => { setChecking(true); void check(); }}>Try again</button><button disabled={busy} onClick={leave}>Sign out</button></div></main>;
  return <Fragment key={account.user.id}>
    <div className="account-bar">
      <div><span className="account-saved-indicator" aria-hidden="true" /><strong>{account.user.email || clerkUser?.primaryEmailAddress?.emailAddress || "Your account"}</strong><span className="account-bar-help">Progress saved to your account</span></div>
      <nav aria-label="Your account"><button aria-expanded={progressOpen} aria-controls="account-progress" onClick={() => setProgressOpen(!progressOpen)}>{progressOpen ? "Close progress" : "My progress"}</button><button disabled={busy} onClick={leave}>{busy ? "Signing out…" : "Sign out"}</button></nav>
    </div>
    {progressOpen && <Progress user={account.user} />}
    {children(account.user.id)}
  </Fragment>;
}

function Progress({ user }: { user: User }) {
  const [runs, setRuns] = useState<Run[] | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const [kind, setKind] = useState<RunKind>("aml");
  const [id, setId] = useState("");
  const [legacy] = useState(() => (Object.keys(AREAS) as RunKind[]).flatMap((area) => {
    try { const saved = localStorage.getItem(AREAS[area].key); return saved && UUID.test(saved) ? [{ kind: area, id: saved }] : []; } catch { return []; }
  }));
  const refresh = useCallback(async () => {
    try { const result = await accountRequest<{ runs: Run[] }>("/api/account/runs"); setRuns(result.runs); setError(""); }
    catch (err) { setError(err instanceof Error ? err.message : "Unable to load saved progress."); }
  }, []);
  useEffect(() => { void refresh(); }, [refresh]);
  function resume(run: Pick<Run, "kind" | "id" | "route">) {
    const simulation = run.kind === "aml" && run.route === "/simulation";
    const route = simulation ? "/simulation" : AREAS[run.kind].route;
    try { localStorage.setItem(sessionKey(simulation ? "twinaml-aml-simulation-session" : AREAS[run.kind].key, user.id), run.id); } catch { /* The URL carries the selection if storage is blocked. */ }
    window.location.assign(`${route}?run=${encodeURIComponent(run.id)}`);
  }
  async function claim(area: RunKind, runId: string) {
    setBusy(true); setError(""); setNotice("");
    try {
      await accountRequest("/api/account/claim", { kind: area, id: runId.toLowerCase() });
      try { if (localStorage.getItem(AREAS[area].key) === runId) localStorage.removeItem(AREAS[area].key); } catch { /* Claiming is saved by the server. */ }
      setNotice("Earlier run added to your account. You can now resume it below."); setId(""); await refresh();
    } catch (err) { setError(err instanceof Error ? err.message : "Unable to add this run."); }
    finally { setBusy(false); }
  }
  return <section id="account-progress" className="account-progress" aria-labelledby="progress-heading">
    <div className="account-progress-heading"><div><p className="account-kicker">Your saved workspace</p><h2 id="progress-heading">My progress</h2></div><button onClick={() => { setBusy(true); void refresh().finally(() => setBusy(false)); }} disabled={busy}>Refresh list</button></div>
    {error && <p className="account-message account-error" role="alert">{error}</p>}{notice && <p className="account-message" role="status">{notice}</p>}
    {runs === null ? <p role="status">{error ? "Saved progress could not be loaded." : "Loading saved progress…"}</p> : !runs.length ? <p>You have no saved runs yet. Start a training run below; submitted actions save automatically.</p> : <ul className="account-runs">{runs.map((run) => <li key={`${run.kind}-${run.id}`}><div><span className="account-kicker">{AREAS[run.kind].label}</span><h3>{run.title}</h3><p>{run.progress}</p><small>Last saved {new Date(run.updatedAt).toLocaleString()} · <code>{run.id.slice(0, 8)}</code></small></div><button className="account-primary" onClick={() => resume(run)}>Resume</button></li>)}</ul>}
    <details className="account-import"><summary>Add progress from before accounts</summary><p>Only add your own earlier runs. Adding a run makes it private to this account. Runs already owned by another account cannot be added.</p>
      {legacy.filter((run) => !runs?.some((saved) => saved.kind === run.kind && saved.id === run.id)).map((run) => <div className="account-legacy" key={run.kind}><span>{AREAS[run.kind].label} · <code>{run.id.slice(0, 8)}</code> (saved in this browser)</span><button disabled={busy} onClick={() => claim(run.kind, run.id)}>Add my earlier run</button></div>)}
      <form className="account-claim-form" onSubmit={(event) => { event.preventDefault(); void claim(kind, id.trim()); }}><label htmlFor="claim-kind">Training area<select id="claim-kind" value={kind} disabled={busy} onChange={(event) => setKind(event.target.value as RunKind)}>{(Object.keys(AREAS) as RunKind[]).map((area) => <option key={area} value={area}>{AREAS[area].label}</option>)}</select></label><label htmlFor="claim-id">Earlier run ID<input id="claim-id" value={id} disabled={busy} onChange={(event) => setId(event.target.value)} required pattern="[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-4[0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}" placeholder="Full run ID from your saved export" /></label><button disabled={busy || !UUID.test(id.trim())}>Add my earlier run</button></form>
    </details>
  </section>;
}
