import { useEffect, useState, type ReactNode } from "react";
import type { AmlAction, AmlChallenge, AmlView, BenchmarkScenario, ChallengeDecision, MonitoringRule } from "../../packages/aml/types";

type Act = (action: AmlAction, message: string) => Promise<AmlView | null>;
type RuleInput = Omit<MonitoringRule, "version">;
const defaultRule: RuleInput = { minCreditHkd: 100000, minFanOutPercent: 80, windowMinutes: 60, newAccountDays: 30 };
const fields: [keyof RuleInput, string, number][] = [
  ["minCreditHkd", "Minimum credits · HKD", 1000000000],
  ["minFanOutPercent", "Minimum outbound / inbound · %", 100],
  ["windowMinutes", "Monitoring window · minutes", 1440],
  ["newAccountDays", "Maximum account age · days", 365],
];
const validRule = (rule: RuleInput) => fields.every(([key, , max]) => Number.isSafeInteger(rule[key]) && rule[key] >= 1 && rule[key] <= max);
const money = (amount: number) => `HKD ${amount.toLocaleString("en-HK")}`;
const time = (at: string) => new Date(at).toLocaleString("en-GB", { timeZone: "Asia/Hong_Kong", day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", hour12: false });
const disposition = (decision: ChallengeDecision) => decision === "escalate" ? "Referred for investigation" : "Review closed";

function Panel({ title, children }: { title: string; children: ReactNode }) {
  return <section className="aml-card"><div className="aml-panel-heading"><h2>{title}</h2></div>{children}</section>;
}

function ShiftMeters({ game }: { game: AmlChallenge }) {
  const remaining = Math.max(0, game.limits.shiftMinutes - game.elapsedMinutes);
  const referrals = game.decisions.filter((row) => row.decision === "escalate").length;
  return <div className="aml-shift-meters" aria-label="Shift resources">
    <div className={remaining <= 3 ? "aml-shift-resource is-danger" : "aml-shift-resource"}><span>Time remaining</span><strong>{remaining}<small> / {game.limits.shiftMinutes} min</small></strong><progress value={remaining} max={game.limits.shiftMinutes} aria-label="Shift minutes remaining" /><p>Checks cost {game.limits.verificationMinutes} min. Decisions cost {game.limits.decisionMinutes} min.</p></div>
    <div className={referrals >= game.limits.escalationCapacity ? "aml-shift-resource is-warning" : "aml-shift-resource"}><span>Review slots used</span><strong>{referrals}<small> / {game.limits.escalationCapacity}</small></strong><progress value={Math.min(referrals, game.limits.escalationCapacity)} max={game.limits.escalationCapacity} aria-label="Investigation slots used" /><p>Exceeding capacity fails the shift.</p></div>
    <div className="aml-shift-resource"><span>Files decided</span><strong>{game.decisions.length}<small> / {game.dataset.scenarios.length}</small></strong><progress value={game.decisions.length} max={game.dataset.scenarios.length} aria-label="Files decided" /><p>Every file needs a final decision, including unflagged activity.</p></div>
  </div>;
}

function ShiftResult({ game }: { game: AmlChallenge }) {
  const result = game.result;
  if (!result) return null;
  return <section className={`aml-card aml-shift-result ${game.status === "won" ? "is-won" : "is-lost"}`} aria-label="Shift result" aria-live="polite">
    <div className="aml-shift-result-heading"><div><p className="aml-kicker">Shift complete · {game.id}</p><h2>{game.status === "won" ? "Shift passed" : "Shift failed"}</h2></div><div className="aml-shift-score"><strong>{result.score}</strong><span> / 100 points</span></div></div>
    <ul>{result.reasons.map((reason, index) => <li key={index}>{reason}</li>)}</ul>
    <div className="aml-shift-outcomes"><span><strong>{result.missedSuspicious}</strong> suspicious episodes missed</span><span><strong>{result.unnecessaryEscalations}</strong> unnecessary referrals</span><span><strong>{result.unresolved}</strong> files unfinished</span></div>
    <h3 className="aml-spaced">What happened on your desk</h3>
    <p>The answers are now unlocked. These are authored scenario outcomes; an internal referral does not establish a real offence or file an STR.</p>
    {result.answers.map((answer) => {
      const decision = game.decisions.find((row) => row.scenarioId === answer.scenarioId);
      return <article className="aml-finding" key={answer.scenarioId}><strong>{answer.scenarioId} · {answer.category === "suspicious" ? "Seeded suspicious activity" : "Legitimate activity"}</strong><small>Your decision: {decision ? disposition(decision.decision) : "Not reviewed"}{decision ? ` · minute ${decision.atMinute}` : ""}</small><p>{answer.rationale}</p>{decision && <p><strong>Your rationale:</strong> {decision.reason}</p>}</article>;
    })}
  </section>;
}

function EndShift({ game, busy, act }: { game: AmlChallenge; busy: boolean; act: Act }) {
  const [confirming, setConfirming] = useState(false);
  return <div className="aml-shift-end">{confirming ? <>
    <p>Ending the shift now locks every decision. Unfinished files or missed suspicious activity will fail the mission.</p>
    <div className="aml-inline"><button className="aml-danger" disabled={busy} onClick={() => act({ type: "end_challenge", challengeId: game.id }, "Shift ended. Review the outcome and unlocked evidence.")}>Confirm end shift</button><button disabled={busy} onClick={() => setConfirming(false)}>Keep working</button></div>
  </> : <button className="aml-link" disabled={busy} onClick={() => setConfirming(true)}>End shift now</button>}</div>;
}

function DeskFile({ game, scenario, busy, act, onDecided }: { game: AmlChallenge; scenario: BenchmarkScenario; busy: boolean; act: Act; onDecided: (next: AmlView) => void }) {
  const [reason, setReason] = useState("");
  const [decision, setDecision] = useState<ChallengeDecision | null>(null);
  const account = game.dataset.accounts.find((row) => row.id === scenario.accountId);
  const customer = game.dataset.entities.find((row) => row.id === account?.entityId);
  const transactions = game.dataset.transactions.filter((row) => scenario.transactionIds.includes(row.id));
  const evidence = game.dataset.evidence.filter((row) => scenario.evidenceIds.includes(row.id));
  const previous = game.decisions.find((row) => row.scenarioId === scenario.id);
  const verified = game.verifiedScenarioIds.includes(scenario.id);
  const active = game.status === "active";
  const matches = game.monitoring.scenarioMatches.find((row) => row.scenarioId === scenario.id)?.alertIds ?? [];
  const alerts = game.monitoring.alerts.filter((row) => matches.includes(row.id));
  const referrals = game.decisions.filter((row) => row.decision === "escalate").length;
  const remaining = game.limits.shiftMinutes - game.elapsedMinutes;
  async function commit() {
    if (!decision || reason.trim().length < 20 || reason.trim().length > 4000 || busy || previous || !active) return;
    const next = await act({ type: "decide_challenge", challengeId: game.id, scenarioId: scenario.id, decision, reason: reason.trim() }, "Final decision recorded. The shift clock and review capacity have been updated.");
    if (next) onDecided(next);
  }
  return <Panel title={`${scenario.id} · ${customer?.name || scenario.title}`}>
    <div className="aml-shift-file-status"><span className={`aml-badge ${matches.length ? "aml-status-high" : ""}`}>{matches.length ? "Monitoring flag" : "No monitoring flag"}</span><span>{previous ? disposition(previous.decision) : "Decision pending"}</span></div>
    {customer && <dl className="aml-definition"><div><dt>Declared activity</dt><dd>{customer.business}</dd></div><div><dt>Source of funds</dt><dd>{customer.sourceOfFunds}</dd></div><div><dt>Expected monthly activity</dt><dd>{money(customer.expectedMonthlyHkd)}</dd></div><div><dt>Account / opened · HKT</dt><dd>{scenario.accountId} · {account && time(account.openedAt)}</dd></div></dl>}
    <h3>Payment history</h3><div className="aml-table-wrap"><table><thead><tr><th scope="col">Record / time · HKT</th><th scope="col">From → to</th><th scope="col">Amount</th><th scope="col">Reference</th></tr></thead><tbody>{transactions.map((row) => <tr key={row.id}><td>{row.id}<small>{time(row.at)}</small></td><td>{row.fromAccount} → {row.toAccount}</td><td>{money(row.hkdAmount)}<small>{row.channel} · {row.status}</small></td><td>{row.reference}</td></tr>)}</tbody></table></div>
    <details className="aml-shift-trigger"><summary>Why the monitoring rule {matches.length ? "flagged" : "did not flag"} this file</summary>{alerts.length ? alerts.map((alert) => <dl className="aml-definition" key={alert.id}><div><dt>Window · HKT</dt><dd>{time(alert.windowStart)} to {time(alert.windowEnd)}</dd></div><div><dt>Incoming / outgoing</dt><dd>{money(alert.creditHkd)} / {money(alert.debitHkd)}</dd></div><div><dt>Outbound / inbound</dt><dd>{alert.fanOutPercent}%</dd></div></dl>) : <p className="aml-help">The activity did not meet the configured numeric rule. Your review must still consider the customer profile and available evidence.</p>}</details>
    <div className="aml-shift-verification"><h3>Independent verification</h3>{evidence.length ? evidence.map((row) => <details open className="aml-evidence" key={row.id}><summary>{row.title}</summary><p className="aml-help">{row.source}</p><p className="aml-document">{row.body}</p></details>) : <>
      <p>{previous && active ? "This file is locked. Its unchecked verification record will unlock after the shift ends." : `The source check has not been released. You can spend ${game.limits.verificationMinutes} simulated minutes to obtain the verification record.`}</p>
      {active && !previous && !verified && <><button disabled={busy} onClick={() => act({ type: "request_challenge_check", challengeId: game.id, scenarioId: scenario.id }, "Verification requested. Check the shift clock and any released evidence.")}>Request verification · {game.limits.verificationMinutes} min</button>{remaining < game.limits.verificationMinutes && <p className="aml-shift-warning">There is not enough time to complete this check. Requesting it will run out the shift clock.</p>}</>}
    </>}</div>
    {previous ? <div className="aml-shift-locked"><strong>Decision locked · minute {previous.atMinute}</strong><p>{disposition(previous.decision)}. {previous.reason}</p>{active && <p className="aml-help">The outcome will be revealed when the shift ends.</p>}</div> : active && <form className="aml-shift-decision" onSubmit={(event) => { event.preventDefault(); void commit(); }}>
      <h3>Make the call</h3><p>Choose an internal referral or close this review. Confirming costs {game.limits.decisionMinutes} minute and locks the decision for this shift.</p>
      <fieldset disabled={busy}><div className="aml-inline aml-shift-options"><button type="button" className={decision === "escalate" ? "is-selected" : ""} aria-pressed={decision === "escalate"} onClick={() => setDecision("escalate")}>Refer for investigation</button><button type="button" className={decision === "clear" ? "is-selected" : ""} aria-pressed={decision === "clear"} onClick={() => setDecision("clear")}>Close review</button></div>
      {decision === "escalate" && referrals >= game.limits.escalationCapacity && <p className="aml-shift-warning">All review slots are used. Another referral will overload the team and fail the shift.</p>}
      <label>Decision rationale<textarea value={reason} minLength={20} maxLength={4000} rows={3} required placeholder="Explain your decision using the payment history, profile or verification result." onChange={(event) => setReason(event.target.value)} /></label>
      <p className="aml-help">At least 20 characters. Your reasoning is retained for debrief.</p>
      <button className="aml-primary" disabled={!decision || reason.trim().length < 20 || reason.trim().length > 4000}>{decision === "escalate" ? "Confirm referral" : decision === "clear" ? "Confirm closure" : "Choose a decision first"} · {game.limits.decisionMinutes} min</button></fieldset>
    </form>}
  </Panel>;
}

export function Challenge({ view, busy, act }: { view: AmlView; busy: boolean; act: Act }) {
  const [rule, setRule] = useState<RuleInput>({ ...defaultRule });
  const [selectedId, setSelectedId] = useState("");
  const [scenarioId, setScenarioId] = useState("");
  const games = view.challenges ?? [];
  const active = games.find((row) => row.status === "active");
  useEffect(() => {
    if (active) { setSelectedId(active.id); setScenarioId(""); }
  }, [active?.id]);
  const game = active ?? games.find((row) => row.id === selectedId) ?? games.at(-1);
  const scenario = game?.dataset.scenarios.find((row) => row.id === scenarioId) ?? game?.dataset.scenarios.find((row) => !game.decisions.some((decision) => decision.scenarioId === row.id)) ?? game?.dataset.scenarios[0];
  const limits = game?.limits ?? { shiftMinutes: 12, verificationMinutes: 2, decisionMinutes: 1, escalationCapacity: 2 };
  async function start() {
    if (busy || active || games.length >= 20 || !validRule(rule)) return;
    const next = await act({ type: "start_challenge", rule }, "Your shift has started. Review all five files before time or investigation capacity runs out.");
    if (next?.challenges.length) { setSelectedId(next.challenges.at(-1)!.id); setScenarioId(""); }
  }
  function decided(next: AmlView) {
    const updated = next.challenges.find((row) => row.id === game?.id);
    const nextFile = updated?.dataset.scenarios.find((row) => !updated.decisions.some((decision) => decision.scenarioId === row.id));
    if (nextFile && updated?.status === "active") setScenarioId(nextFile.id);
  }
  return <>
    <section className="aml-shift-hero"><div><p className="aml-kicker">Challenge mode · the duty desk</p><h1>Five files. One shift. Your call.</h1><p>You are the duty analyst. Find the suspicious activity, keep legitimate customers out of unnecessary investigations, and leave no file unfinished.</p></div><div className="aml-shift-mission"><span>Mission limits</span><strong>{limits.shiftMinutes} min <span>/</span> {limits.escalationCapacity} review slots</strong><p>Checks and decisions use time. Reading is free.</p></div></section>
    <details className="aml-card aml-shift-brief" open={!game}><summary>Mission briefing and failure conditions</summary><p>Review all five account episodes. Refer the seeded suspicious activity and close the legitimate reviews. A monitoring flag is a lead; unflagged files still need your attention.</p><ul><li>A verification check costs {limits.verificationMinutes} simulated minutes; a final decision costs {limits.decisionMinutes} minute.</li><li>You fail if you miss suspicious activity, make an unnecessary referral, leave files unfinished, or exceed {limits.escalationCapacity} investigation slots.</li><li>Decisions are irreversible. Answers stay hidden until the shift is over.</li></ul><p className="aml-help">The clock advances only when you act, so you can read at your own pace. These are internal decisions about historical synthetic payments, with no live payment controls.</p></details>
    {games.length > 0 && <div className="aml-shift-history"><label>Shift history<select value={game?.id ?? ""} disabled={busy || Boolean(active)} onChange={(event) => { setSelectedId(event.target.value); setScenarioId(""); }}>{(active ? [active] : games.slice().reverse()).map((row) => <option value={row.id} key={row.id}>{row.id} · {row.status === "active" ? "In progress" : row.status === "won" ? "Passed" : "Failed"}</option>)}</select></label>{active && <p className="aml-help">Previous shifts and study debriefs return after this shift ends.</p>}</div>}
    {game && game.status !== "active" && <ShiftResult game={game} />}
    {!active && <Panel title={games.length ? "Take another shift" : "Start your shift"}><p>The desk receives five shuffled account episodes. Your monitoring rule is fixed when the shift starts; you decide how to handle each file.</p><form onSubmit={(event) => { event.preventDefault(); void start(); }}><fieldset disabled={busy || games.length >= 20}><details className="aml-shift-rule"><summary>Set the monitoring rule before starting</summary><div className="aml-form-grid">{fields.map(([key, label, max]) => <label key={key}>{label}<input type="number" min={1} max={max} step={1} value={rule[key]} required onChange={(event) => setRule({ ...rule, [key]: Number(event.target.value) })} /></label>)}</div></details><button className="aml-primary" disabled={!validRule(rule)}>{games.length ? "Start another shift" : "Start shift"}</button></fieldset></form><p className="aml-help">Default monitoring: HKD100,000 incoming, at least 80% outward within 60 minutes, account no more than 30 days old. Every final decision is saved to this training run.</p>{games.length >= 20 && <p className="aml-context">This run has reached its 20-shift limit. Start a new training run to play again; earlier shifts remain saved.</p>}</Panel>}
    {game && <>
      <div className="aml-shift-heading"><h2>{game.status === "active" ? "Your live desk" : "Review the completed desk"}</h2><span>{game.id} · {time(game.asOf)} HKT</span></div>
      <ShiftMeters game={game} />
      <div className="aml-shift-layout"><Panel title="Files on your desk"><div className="aml-shift-queue">{game.dataset.scenarios.map((row) => {
        const account = game.dataset.accounts.find((item) => item.id === row.accountId);
        const customer = game.dataset.entities.find((item) => item.id === account?.entityId);
        const recorded = game.decisions.find((item) => item.scenarioId === row.id);
        const flagged = game.monitoring.scenarioMatches.some((item) => item.scenarioId === row.id && item.alertIds.length > 0);
        return <button key={row.id} className={scenario?.id === row.id ? "is-active" : ""} aria-pressed={scenario?.id === row.id} onClick={() => setScenarioId(row.id)}><span><strong>{row.id}</strong><span className={`aml-shift-dot ${flagged ? "is-flagged" : ""}`} aria-hidden="true" /></span><strong>{customer?.name || row.title}</strong><small>{flagged ? "Monitoring flag" : "No monitoring flag"} · {game.verifiedScenarioIds.includes(row.id) ? "Check received" : "Unchecked"}</small><small>{recorded ? disposition(recorded.decision) : "Awaiting your decision"}</small></button>;
      })}</div><details className="aml-shift-rule"><summary>Rule deployed for this shift</summary><dl className="aml-definition">{fields.map(([key, label]) => <div key={key}><dt>{label}</dt><dd>{game.monitoring.rule[key]}</dd></div>)}</dl></details></Panel>
      <div className="aml-min-width">{scenario && <DeskFile key={`${game.id}-${scenario.id}`} game={game} scenario={scenario} busy={busy} act={act} onDecided={decided} />}{game.status === "active" && <EndShift key={game.id} game={game} busy={busy} act={act} />}</div></div>
    </>}
  </>;
}
