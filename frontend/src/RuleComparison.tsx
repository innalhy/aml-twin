import { useState, type ReactNode } from "react";
import type { AmlAction, AmlRuleComparison, AmlView, BenchmarkArm, BenchmarkMetrics, BenchmarkScenario, MonitoringRule } from "../../packages/aml/types";

type RuleInput = Omit<MonitoringRule, "version">;
type Act = (action: AmlAction, message: string) => Promise<AmlView | null>;
const baselineDefault: RuleInput = { minCreditHkd: 100000, minFanOutPercent: 80, windowMinutes: 30, newAccountDays: 30 };
const ruleFields: [keyof RuleInput, string, number][] = [
  ["minCreditHkd", "Minimum credits · HKD", 1000000000],
  ["minFanOutPercent", "Minimum outbound / inbound · %", 100],
  ["windowMinutes", "Window · minutes", 1440],
  ["newAccountDays", "Maximum account age · days", 365],
];
const validRule = (rule: RuleInput) => ruleFields.every(([key, , max]) => Number.isSafeInteger(rule[key]) && rule[key] >= 1 && rule[key] <= max);
const money = (value: number) => `HKD ${value.toLocaleString("en-HK")}`;
const time = (value: string) => new Date(value).toLocaleString("en-GB", { timeZone: "Asia/Hong_Kong", day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", hour12: false });
const percent = (value: number | null) => value === null ? "Not defined" : `${Math.round(value * 1000) / 10}%`;
const matched = (arm: BenchmarkArm, scenarioId: string) => arm.scenarioMatches.find((row) => row.scenarioId === scenarioId)?.alertIds ?? [];

function Panel({ title, children }: { title: string; children: ReactNode }) {
  return <section className="aml-card"><div className="aml-panel-heading"><h2>{title}</h2></div>{children}</section>;
}

function RuleFields({ title, rule, setRule }: { title: string; rule: RuleInput; setRule: (rule: RuleInput) => void }) {
  return <div className="aml-comparison-rule"><h3>{title}</h3>{ruleFields.map(([key, label, max]) => <label key={key}>{title} · {label}<input type="number" min="1" max={max} step="1" required value={rule[key]} onChange={(event) => setRule({ ...rule, [key]: Number(event.target.value) })} /></label>)}</div>;
}

function ArmSummary({ title, arm, total }: { title: string; arm: BenchmarkArm; total: number }) {
  const episodeCount = arm.scenarioMatches.filter((row) => row.alertIds.length).length;
  return <section className="aml-comparison-arm"><h3>{title}</h3><div className="aml-stat-grid"><div><span>Raw alerts</span><strong>{arm.alerts.length}</strong></div><div><span>Episodes with an alert</span><strong>{episodeCount} / {total}</strong></div></div><p className="aml-help">{arm.transactionCount} transactions inspected. An alert is an investigation signal.</p><details><summary>Recorded rule configuration</summary><dl className="aml-definition">{ruleFields.map(([key, label]) => <div key={key}><dt>{label}</dt><dd>{key === "minCreditHkd" ? money(arm.rule[key]) : arm.rule[key]}</dd></div>)}<div><dt>Rule version</dt><dd>{arm.rule.version}</dd></div></dl></details></section>;
}

function TriggerDetails({ title, arm, scenarioId }: { title: string; arm: BenchmarkArm; scenarioId: string }) {
  const ids = matched(arm, scenarioId);
  const alerts = arm.alerts.filter((alert) => ids.includes(alert.id));
  return <div className="aml-comparison-arm"><h3>{title} trigger evidence</h3>{alerts.length ? alerts.map((alert) => <dl className="aml-definition" key={alert.id}><div><dt>Alert</dt><dd>{alert.id}</dd></div><div><dt>Window · HKT</dt><dd>{time(alert.windowStart)} to {time(alert.windowEnd)}</dd></div><div><dt>Incoming / outgoing</dt><dd>{money(alert.creditHkd)} / {money(alert.debitHkd)}</dd></div><div><dt>Outbound / inbound</dt><dd>{alert.fanOutPercent}%</dd></div><div><dt>Contributing records</dt><dd>{alert.transactionIds.join(", ")}</dd></div></dl>) : <p className="aml-help">No alert matched this episode under this configuration. This does not establish that its activity is legitimate.</p>}</div>;
}

function ScenarioInspection({ comparison, scenario }: { comparison: AmlRuleComparison; scenario: BenchmarkScenario }) {
  const { dataset } = comparison;
  const account = dataset.accounts.find((row) => row.id === scenario.accountId);
  const customer = dataset.entities.find((row) => row.id === account?.entityId);
  const transactions = dataset.transactions.filter((row) => scenario.transactionIds.includes(row.id));
  const evidence = dataset.evidence.filter((row) => scenario.evidenceIds.includes(row.id));
  return <Panel title={`${scenario.id} · ${scenario.title}`}>
    {customer && <dl className="aml-definition"><div><dt>Customer / account</dt><dd>{customer.name} · {scenario.accountId}</dd></div><div><dt>Declared activity</dt><dd>{customer.business}</dd></div><div><dt>Source of funds</dt><dd>{customer.sourceOfFunds}</dd></div><div><dt>Expected monthly activity</dt><dd>{money(customer.expectedMonthlyHkd)}</dd></div><div><dt>Account opened · HKT</dt><dd>{account && time(account.openedAt)}</dd></div></dl>}
    <h3>Transactions</h3><div className="aml-table-wrap"><table><thead><tr><th scope="col">Record / time · HKT</th><th scope="col">From → to</th><th scope="col">Amount / status</th><th scope="col">Reference</th></tr></thead><tbody>{transactions.map((row) => <tr key={row.id}><td>{row.id}<small>{time(row.at)}</small></td><td>{row.fromAccount} → {row.toAccount}</td><td>{money(row.hkdAmount)}<small>{row.channel} · {row.status}</small></td><td>{row.reference}</td></tr>)}</tbody></table></div>
    <h3 className="aml-spaced">Source documents</h3>{evidence.map((row) => <details className="aml-evidence" key={row.id}><summary>{row.id} · {row.title}</summary><p className="aml-help">{row.source}</p><p className="aml-document">{row.body}</p></details>)}
    <div className="aml-comparison-columns aml-separated"><TriggerDetails title="Baseline A" arm={comparison.baseline} scenarioId={scenario.id} /><TriggerDetails title="Candidate B" arm={comparison.candidate} scenarioId={scenario.id} /></div>
  </Panel>;
}

function DebriefMetrics({ baseline, candidate }: { baseline: BenchmarkMetrics; candidate: BenchmarkMetrics }) {
  const rows: [string, keyof BenchmarkMetrics][] = [["Suspicious episodes detected", "truePositives"], ["Suspicious episodes missed", "falseNegatives"], ["Legitimate episodes alerted", "falsePositives"], ["Legitimate episodes without alerts", "trueNegatives"], ["Precision · detected suspicious / alerted episodes", "precision"], ["Recall · detected suspicious / all suspicious episodes", "recall"]];
  return <div className="aml-table-wrap"><table><thead><tr><th scope="col">Scenario-level measure</th><th scope="col">Baseline A</th><th scope="col">Candidate B</th></tr></thead><tbody>{rows.map(([label, key]) => <tr key={key}><th scope="row">{label}</th><td>{key === "precision" || key === "recall" ? percent(baseline[key]) : baseline[key]}</td><td>{key === "precision" || key === "recall" ? percent(candidate[key]) : candidate[key]}</td></tr>)}</tbody></table></div>;
}

export function RuleComparison({ view, busy, act, onResumeChallenge }: { view: AmlView; busy: boolean; act: Act; onResumeChallenge: () => void }) {
  const [baseline, setBaseline] = useState<RuleInput>({ ...baselineDefault });
  const [candidate, setCandidate] = useState<RuleInput>({ ...baselineDefault, windowMinutes: 60 });
  const [selectedId, setSelectedId] = useState("");
  const [scenarioId, setScenarioId] = useState("");
  const comparisons = view.comparisons ?? [];
  const comparison = comparisons.find((row) => row.id === selectedId) ?? comparisons.at(-1);
  const scenario = comparison?.dataset.scenarios.find((row) => row.id === scenarioId) ?? comparison?.dataset.scenarios[0];
  const administrator = view.role === "administrator";
  const activeChallenge = view.challenges?.find((row) => row.status === "active");
  const valid = validRule(baseline) && validRule(candidate);
  async function compare() {
    if (!valid || !administrator || busy || activeChallenge) return;
    const next = await act({ type: "compare_rules", baseline, candidate }, "Both configurations evaluated the same five-scenario benchmark. Inspect the evidence before revealing the debrief.");
    if (next?.comparisons.length) { setSelectedId(next.comparisons.at(-1)!.id); setScenarioId(""); }
  }
  if (activeChallenge) return <>
    <div className="aml-page-heading"><div><p className="aml-kicker">Controlled experiment</p><h1>Compare rules</h1></div></div>
    <Panel title="Study mode paused during your shift"><p>Finish or end your current challenge before opening rule comparisons or previous debriefs. Their saved results will return after the shift ends.</p><button className="aml-primary" disabled={busy} onClick={onResumeChallenge}>Resume challenge</button></Panel>
  </>;
  return <>
    <div className="aml-page-heading"><div><p className="aml-kicker">Controlled experiment</p><h1>Compare rules</h1><p>Run two configurations against the same five synthetic account episodes. Inspect the matches, review the evidence, then reveal the scenario answers.</p></div></div>
    <div className="aml-context">This benchmark uses a fixed dataset, independent of edits to the operational training ledger. Both configurations receive identical transactions and the same snapshot. Rule settings are classroom parameters.</div>
    <Panel title="Configure a comparison">
      {!administrator && <p className="aml-context">Switch the training role to Administrator to run a new comparison. Saved results and their source records are available in every training role.</p>}
      <form onSubmit={(event) => { event.preventDefault(); void compare(); }}><fieldset disabled={busy || !administrator || comparisons.length >= 20}><div className="aml-comparison-columns"><RuleFields title="Baseline A" rule={baseline} setRule={setBaseline} /><RuleFields title="Candidate B" rule={candidate} setRule={setCandidate} /></div><button className="aml-primary" disabled={!valid}>Run comparison</button></fieldset></form>
      <p className="aml-help">The defaults change only the monitoring window: 30 to 60 minutes. A longer window can surface additional activity and additional legitimate payments. Each run retains its own configuration and results.</p>
      {comparisons.length >= 20 && <p className="aml-context">This training run has reached its 20-comparison limit. Start a new training run to run more experiments; these results remain saved.</p>}
    </Panel>
    {!comparison ? <Panel title="Comparison results"><p className="aml-empty">Run a comparison to receive the five episodes and their generated alerts. Scenario answers remain on the server until you request the debrief.</p></Panel> : <>
      <Panel title="Recorded comparison">
        <label className="aml-comparison-history">Saved comparison<select value={comparison.id} disabled={busy} onChange={(event) => { setSelectedId(event.target.value); setScenarioId(""); }}>{comparisons.slice().reverse().map((row) => <option key={row.id} value={row.id}>{row.id} · A {row.baseline.rule.windowMinutes} min / B {row.candidate.rule.windowMinutes} min{row.debrief ? " · debrief revealed" : ""}</option>)}</select></label>
        <p className="aml-help">Dataset {comparison.datasetVersion} · snapshot {time(comparison.asOf)} HKT · {comparison.dataset.scenarios.length} episodes. Editing the configuration above does not change this saved result.</p>
        <div className="aml-comparison-columns aml-separated"><ArmSummary title="Baseline A" arm={comparison.baseline} total={comparison.dataset.scenarios.length} /><ArmSummary title="Candidate B" arm={comparison.candidate} total={comparison.dataset.scenarios.length} /></div>
      </Panel>
      <Panel title="Inspect account episodes"><p className="aml-help">Choose an episode to inspect its customer profile, payments, source documents and trigger calculations. Raw alert count and episode count are separate: overlapping windows may alert on the same episode more than once.</p><div className="aml-table-wrap"><table><thead><tr><th scope="col">Episode / account</th><th scope="col">Baseline A</th><th scope="col">Candidate B</th><th scope="col">Source records</th></tr></thead><tbody>{comparison.dataset.scenarios.map((row) => <tr key={row.id} className={scenario?.id === row.id ? "aml-selected-row" : ""}><td><button className="aml-link" aria-pressed={scenario?.id === row.id} onClick={() => setScenarioId(row.id)}>{row.id} · {row.title}</button><small>{row.accountId}</small></td><td>{matched(comparison.baseline, row.id).length ? `${matched(comparison.baseline, row.id).length} alert(s)` : "No alert"}</td><td>{matched(comparison.candidate, row.id).length ? `${matched(comparison.candidate, row.id).length} alert(s)` : "No alert"}</td><td>{row.transactionIds.length} transactions · {row.evidenceIds.length} documents</td></tr>)}</tbody></table></div></Panel>
      {scenario && <ScenarioInspection key={`${comparison.id}-${scenario.id}`} comparison={comparison} scenario={scenario} />}
      <Panel title="Scenario debrief">{comparison.debrief ? <>
        <p>The answers below describe the authored synthetic scenarios. They do not establish criminality in real customer activity. A legitimate payment can still reasonably warrant investigation.</p>
        <DebriefMetrics baseline={comparison.debrief.baseline} candidate={comparison.debrief.candidate} />
        <p className="aml-help">Detection scores count each account episode once. Precision and recall use the hidden scenario labels; they are not estimates of performance at a real bank. A score is not defined when its denominator is zero.</p>
        <div className="aml-separated">{comparison.debrief.answers.map((answer) => <article className="aml-finding" key={answer.scenarioId}><strong>{answer.scenarioId} · {answer.category === "suspicious" ? "Seeded suspicious activity" : "Legitimate activity"}</strong><p>{answer.rationale}</p></article>)}</div>
      </> : <><p>Review the evidence before opening the answer key. The server has not sent the scenario labels, rationales or detection-quality scores to this workspace.</p><button disabled={busy} onClick={() => act({ type: "reveal_comparison", comparisonId: comparison.id }, "Scenario answers and detection scores revealed for this comparison.")}>Reveal debrief</button><p className="aml-help">Revealing the debrief is recorded in the run history and remains visible when you resume this comparison.</p></>}</Panel>
    </>}
  </>;
}
