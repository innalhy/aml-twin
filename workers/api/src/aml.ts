import type { AmlActionInput, AmlAlert, AmlCase, AmlTransaction, AmlView, BenchmarkArm, BenchmarkDataset, BenchmarkMetrics, MonitoringRule, StrDraft, TrainingRole } from "../../../packages/aml/types";
import { InputError } from "./engine";
import { AML_ACCOUNTS, AML_AS_OF, AML_ENTITIES, AML_EVIDENCE, AML_RELATIONSHIPS, AML_TRANSACTIONS, INITIAL_RULE, MONITORING_LOOKBACK_DAYS, hkdEquivalent } from "./aml-data";
import { AML_BENCHMARK_ANSWERS, AML_BENCHMARK_AS_OF, AML_BENCHMARK_DATA, AML_BENCHMARK_VERSION } from "./aml-benchmark-data";
import { applyChallengeAction, challengeView, createChallenge, type ChallengeState } from "./aml-challenge";
import { applySimulationAction, initializeSimulation, isSimulationAction, parseSimulationAction, simulationView, type SimulationState } from "./aml-simulation";

export const AML_STATE_VERSION = 1;
export interface AmlState extends Omit<AmlView, "challenges" | "simulation"> {
  version: number;
  alertKeys: { key: string; alertId: string }[];
  challenges: ChallengeState[];
  simulation?: SimulationState;
}
const actors: Record<TrainingRole, string> = { analyst: "analyst-01", reviewer: "reviewer-01", administrator: "admin-01" };
const DAY = 86400000;
const emptyStr = (): StrDraft => ({ subjects: "", period: "", activity: "", suspicion: "", explanation: "" });

function object(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new InputError("invalid_action");
  return value as Record<string, unknown>;
}
function text(value: unknown, limit: number, required = true): string {
  if (typeof value !== "string" || value.length > limit || (required && !value.trim())) throw new InputError("invalid_text");
  return value.trim();
}
function identifier(value: unknown): string {
  const id = text(value, 64);
  if (!/^[A-Za-z0-9][A-Za-z0-9_-]*$/.test(id)) throw new InputError("invalid_identifier");
  return id;
}
function integer(value: unknown, min: number, max: number): number {
  if (typeof value !== "number" || !Number.isSafeInteger(value) || value < min || value > max) throw new InputError("invalid_number");
  return value;
}
function option<T extends string>(value: unknown, allowed: readonly T[]): T {
  if (typeof value !== "string" || !allowed.includes(value as T)) throw new InputError("invalid_option");
  return value as T;
}
function ids(value: unknown): string[] {
  if (!Array.isArray(value) || value.length > 100) throw new InputError("invalid_citations");
  const result = value.map(identifier);
  if (new Set(result).size !== result.length) throw new InputError("duplicate_citation");
  return result;
}
function strDraft(value: unknown): StrDraft {
  const draft = object(value);
  return { subjects: text(draft.subjects, 4000, false), period: text(draft.period, 1000, false), activity: text(draft.activity, 6000, false), suspicion: text(draft.suspicion, 6000, false), explanation: text(draft.explanation, 6000, false) };
}
function ruleInput(value: unknown): Omit<MonitoringRule, "version"> {
  const rule = object(value);
  return { minCreditHkd: integer(rule.minCreditHkd, 1, 1000000000), minFanOutPercent: integer(rule.minFanOutPercent, 1, 100), windowMinutes: integer(rule.windowMinutes, 1, 1440), newAccountDays: integer(rule.newAccountDays, 1, 365) };
}
function transactionInput(value: unknown): AmlTransaction {
  const row = object(value);
  const currency = option(row.currency, ["HKD", "USD", "RMB"] as const);
  const amount = integer(row.amount, 1, 1000000000);
  const hkdAmount = integer(row.hkdAmount, 1, 10000000000);
  if (hkdAmount !== hkdEquivalent(amount, currency)) throw new InputError("inconsistent_hkd_equivalent");
  const at = text(row.at, 40);
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/.test(at) || !Number.isFinite(Date.parse(at)) || new Date(at).toISOString().replace(".000Z", "Z") !== at.replace(".000Z", "Z")) throw new InputError("invalid_transaction_time");
  const channel = option(row.channel, ["FPS", "CHATS", "SWIFT", "Cash"] as const);
  const status = option(row.status, ["executed", "pending"] as const);
  if (channel === "FPS" && currency === "USD") throw new InputError("fps_requires_hkd_or_rmb");
  if (channel === "FPS" && status !== "executed") throw new InputError("fps_fixture_must_be_completed");
  return { id: identifier(row.id), at, fromAccount: identifier(row.fromAccount), toAccount: identifier(row.toAccount), amount, currency, hkdAmount, channel, status, reference: text(row.reference, 500) };
}

export function parseAmlAction(value: unknown): AmlActionInput {
  const input = object(value);
  const revision = integer(input.revision, 0, Number.MAX_SAFE_INTEGER);
  if (typeof input.type === "string" && input.type.startsWith("simulation_")) return { ...parseSimulationAction(input), revision };
  switch (input.type) {
    case "switch_role": return { type: input.type, revision, role: option(input.role, ["analyst", "reviewer", "administrator"] as const) };
    case "run_monitoring": return { type: input.type, revision };
    case "configure_rule": return { type: input.type, revision, rule: ruleInput(input.rule) };
    case "compare_rules": return { type: input.type, revision, baseline: ruleInput(input.baseline), candidate: ruleInput(input.candidate) };
    case "reveal_comparison": return { type: input.type, revision, comparisonId: identifier(input.comparisonId) };
    case "start_challenge": return { type: input.type, revision, rule: ruleInput(input.rule) };
    case "request_challenge_check": return { type: input.type, revision, challengeId: identifier(input.challengeId), scenarioId: identifier(input.scenarioId) };
    case "decide_challenge": {
      const reason = text(input.reason, 4000);
      if (reason.length < 20) throw new InputError("challenge_reason_requires_20_characters");
      return { type: input.type, revision, challengeId: identifier(input.challengeId), scenarioId: identifier(input.scenarioId), decision: option(input.decision, ["escalate", "clear"] as const), reason };
    }
    case "end_challenge": return { type: input.type, revision, challengeId: identifier(input.challengeId) };
    case "add_transaction": return { type: input.type, revision, transaction: transactionInput(input.transaction) };
    case "claim_alert": case "release_alert": return { type: input.type, revision, alertId: identifier(input.alertId) };
    case "close_alert": return { type: input.type, revision, alertId: identifier(input.alertId), reason: text(input.reason, 4000) };
    case "create_case": return { type: input.type, revision, alertId: identifier(input.alertId), title: text(input.title, 200) };
    case "attach_alert": return { type: input.type, revision, alertId: identifier(input.alertId), caseId: identifier(input.caseId) };
    case "add_finding": return { type: input.type, revision, caseId: identifier(input.caseId), text: text(input.text, 6000), transactionIds: ids(input.transactionIds), evidenceIds: ids(input.evidenceIds) };
    case "save_case": return { type: input.type, revision, caseId: identifier(input.caseId), narrative: text(input.narrative, 12000, false), recommendation: option(input.recommendation, ["close", "str"] as const), strDraft: strDraft(input.strDraft) };
    case "submit_case": return { type: input.type, revision, caseId: identifier(input.caseId) };
    case "review_case": return { type: input.type, revision, caseId: identifier(input.caseId), decision: option(input.decision, ["return", "approve_close", "approve_str"] as const), reason: text(input.reason, 4000) };
    default: throw new InputError("invalid_action");
  }
}

function emit(state: AmlState, type: string, refId: string, detail: string): void {
  state.events.push({ seq: state.events.length + 1, at: state.asOf, actor: state.actor, role: state.role, type, refId, detail });
}
function requireRole(state: AmlState, role: TrainingRole): void {
  if (state.role !== role) throw new InputError(`requires_${role}_training_role`, 409);
}
function alertFor(state: AmlState, id: string): AmlAlert {
  const alert = state.alerts.find((item) => item.id === id);
  if (!alert) throw new InputError("unknown_alert");
  return alert;
}
function ownedAlert(state: AmlState, id: string): AmlAlert {
  const alert = alertFor(state, id);
  if (alert.owner !== state.actor || alert.status !== "claimed" || alert.caseId) throw new InputError("alert_must_be_claimed_and_unlinked", 409);
  return alert;
}
function caseFor(state: AmlState, id: string): AmlCase {
  const item = state.cases.find((row) => row.id === id);
  if (!item) throw new InputError("unknown_case");
  return item;
}
function editableCase(state: AmlState, id: string): AmlCase {
  const item = caseFor(state, id);
  if (item.owner !== state.actor || (item.status !== "investigation" && item.status !== "returned")) throw new InputError("case_not_editable", 409);
  return item;
}
function union(a: string[], b: string[]): string[] { return [...new Set([...a, ...b])]; }

function runMonitoring(state: AmlState): void {
  const asOf = Date.parse(state.asOf);
  const since = asOf - MONITORING_LOOKBACK_DAYS * DAY;
  const eligible = state.transactions.filter((row) => row.status === "executed" && Date.parse(row.at) >= since && Date.parse(row.at) <= asOf)
    .slice().sort((a, b) => Date.parse(a.at) - Date.parse(b.at) || a.id.localeCompare(b.id));
  const matchedAlertIds: string[] = [];
  const newAlertIds: string[] = [];
  for (const account of state.accounts.filter((row) => row.internal)) {
    for (const anchor of eligible.filter((row) => row.toAccount === account.id)) {
      const start = Date.parse(anchor.at);
      const age = start - Date.parse(account.openedAt);
      if (age < 0 || age > state.rule.newAccountDays * DAY) continue;
      const end = Math.min(start + state.rule.windowMinutes * 60000, asOf);
      const window = eligible.filter((row) => Date.parse(row.at) >= start && Date.parse(row.at) <= end);
      const credits = window.filter((row) => row.toAccount === account.id && row.fromAccount !== account.id);
      const debits = window.filter((row) => row.fromAccount === account.id && row.toAccount !== account.id);
      const creditHkd = credits.reduce((sum, row) => sum + row.hkdAmount, 0);
      const debitHkd = debits.reduce((sum, row) => sum + row.hkdAmount, 0);
      if (creditHkd < state.rule.minCreditHkd || debitHkd * 100 < creditHkd * state.rule.minFanOutPercent) continue;
      const transactionIds = window.filter((row) => credits.includes(row) || debits.includes(row)).map((row) => row.id);
      const windowStart = new Date(start).toISOString();
      const windowEnd = new Date(end).toISOString();
      const key = JSON.stringify([state.rule.version, account.id, windowStart, windowEnd, transactionIds]);
      const existing = state.alertKeys.find((row) => row.key === key);
      if (existing) { matchedAlertIds.push(existing.alertId); continue; }
      const id = `A${String(state.alerts.length + 1).padStart(4, "0")}`;
      const fanOutPercent = Math.round(debitHkd / creditHkd * 10000) / 100;
      state.alerts.push({ id, entityId: account.entityId, accountId: account.id, scenario: "New account rapid outflow", createdAt: state.asOf, priority: fanOutPercent >= 95 ? "high" : "medium", owner: "", status: "new", caseId: "", closureReason: "", rule: structuredClone(state.rule), windowStart, windowEnd, creditHkd, debitHkd, fanOutPercent, transactionIds });
      state.alertKeys.push({ key, alertId: id });
      matchedAlertIds.push(id); newAlertIds.push(id);
      emit(state, "alert_generated", id, JSON.stringify({ rule: state.rule, accountId: account.id, windowStart, windowEnd, creditHkd, debitHkd, fanOutPercent, transactionIds }));
    }
  }
  const id = `RUN${String(state.runs.length + 1).padStart(4, "0")}`;
  state.runs.push({ id, at: state.asOf, rule: structuredClone(state.rule), transactionCount: eligible.length, matchedAlertIds: [...new Set(matchedAlertIds)], newAlertIds });
  emit(state, "monitoring_run", id, `Rule v${state.rule.version}; executed transactions in seven-day lookback=${eligible.length}; matched=${new Set(matchedAlertIds).size}; new=${newAlertIds.length}. Alert generation is separate from a suspicion assessment.`);
}

function benchmarkArm(dataset: BenchmarkDataset, rule: MonitoringRule): BenchmarkArm {
  const state: AmlState = {
    ...structuredClone(dataset), version: AML_STATE_VERSION, id: "benchmark", revision: 0,
    role: "administrator", actor: "system", asOf: AML_BENCHMARK_AS_OF, rule: structuredClone(rule),
    alerts: [], cases: [], runs: [], events: [], alertKeys: [], comparisons: [], challenges: [],
  };
  runMonitoring(state);
  return {
    rule: structuredClone(rule), alerts: state.alerts, transactionCount: state.runs[0].transactionCount,
    scenarioMatches: dataset.scenarios.map((scenario) => ({
      scenarioId: scenario.id,
      alertIds: state.alerts.filter((alert) => alert.accountId === scenario.accountId && alert.transactionIds.some((id) => scenario.transactionIds.includes(id))).map((alert) => alert.id),
    })),
  };
}

function benchmarkMetrics(arm: BenchmarkArm): BenchmarkMetrics {
  const result: BenchmarkMetrics = { truePositives: 0, falsePositives: 0, falseNegatives: 0, trueNegatives: 0, precision: null, recall: null };
  for (const answer of AML_BENCHMARK_ANSWERS) {
    const detected = arm.scenarioMatches.some((match) => match.scenarioId === answer.scenarioId && match.alertIds.length > 0);
    if (answer.category === "suspicious") result[detected ? "truePositives" : "falseNegatives"]++;
    else result[detected ? "falsePositives" : "trueNegatives"]++;
  }
  const positive = result.truePositives + result.falsePositives;
  const suspicious = result.truePositives + result.falseNegatives;
  result.precision = positive ? result.truePositives / positive : null;
  result.recall = suspicious ? result.truePositives / suspicious : null;
  return result;
}

export function createAmlSession(id: string, simulation = false): AmlState {
  const state: AmlState = {
    version: AML_STATE_VERSION, id, revision: 0, role: "administrator", actor: "system", asOf: AML_AS_OF,
    rule: structuredClone(INITIAL_RULE), entities: structuredClone(AML_ENTITIES), accounts: structuredClone(AML_ACCOUNTS), transactions: structuredClone(AML_TRANSACTIONS),
    relationships: structuredClone(AML_RELATIONSHIPS), evidence: structuredClone(AML_EVIDENCE), alerts: [], cases: [], runs: [], events: [], alertKeys: [], comparisons: [], challenges: [],
  };
  if (simulation) { initializeSimulation(state); runMonitoring(state); return state; }
  emit(state, "session_created", id, "Synthetic Hong Kong training snapshot; role controls are an exercise, not authentication. No report is sent externally.");
  runMonitoring(state);
  state.role = "analyst"; state.actor = actors.analyst;
  return state;
}

export function amlView(state: AmlState): AmlView {
  if (state.simulation) return simulationView(state);
  const { version: _version, alertKeys: _keys, challenges, simulation: _simulation, ...view } = state;
  const active = (challenges ?? []).find((challenge) => challenge.status === "active");
  const studyIds = new Set([
    ...(challenges ?? []).filter((challenge) => challenge.id !== active?.id).map((challenge) => challenge.id),
    ...(state.comparisons ?? []).map((comparison) => comparison.id),
  ]);
  return structuredClone({
    ...view,
    comparisons: active ? [] : state.comparisons ?? [],
    challenges: (active ? [active] : challenges ?? []).map(challengeView),
    events: active ? state.events.filter((event) => !studyIds.has(event.refId)) : state.events,
  });
}

function relevantEntities(state: AmlState, item: AmlCase): Set<string> {
  const result = new Set(item.entityIds);
  for (const link of state.relationships) {
    if (item.entityIds.includes(link.fromEntity) || item.entityIds.includes(link.toEntity)) { result.add(link.fromEntity); result.add(link.toEntity); }
  }
  return result;
}
function linkAlert(item: AmlCase, alert: AmlAlert): void {
  item.alertIds = union(item.alertIds, [alert.id]);
  item.entityIds = union(item.entityIds, [alert.entityId]);
  item.transactionIds = union(item.transactionIds, alert.transactionIds);
  alert.caseId = item.id; alert.status = "in_case";
}
function act(state: AmlState, action: AmlActionInput): void {
  if (state.simulation) {
    const executedBefore = new Set(state.transactions.filter((tx) => tx.status === "executed" && Date.parse(tx.at) <= Date.parse(state.asOf)).map((tx) => tx.id));
    applySimulationAction(state, action);
    const executedAfter = state.transactions.filter((tx) => tx.status === "executed" && Date.parse(tx.at) <= Date.parse(state.asOf));
    if (executedAfter.length !== executedBefore.size || executedAfter.some((tx) => !executedBefore.has(tx.id))) runMonitoring(state);
    return;
  }
  if (isSimulationAction(action)) throw new InputError("simulation_session_required", 409);
  if (action.type === "switch_role") {
    emit(state, "training_role_switched", action.role, `Training role changed from ${state.role} to ${action.role}; this is not authentication.`);
    state.role = action.role; state.actor = actors[action.role]; return;
  }
  if (action.type === "start_challenge") {
    const challenges = state.challenges ??= [];
    if (challenges.some((challenge) => challenge.status === "active")) throw new InputError("challenge_already_active", 409);
    if (challenges.length >= 20) throw new InputError("challenge_limit_reached", 409);
    const id = `CH${String(challenges.length + 1).padStart(4, "0")}`;
    const challenge = createChallenge(id, { ...action.rule, version: 1 });
    challenge.monitoring = benchmarkArm(challenge.dataset, challenge.monitoring.rule);
    challenges.push(challenge);
    emit(state, "challenge_started", id, JSON.stringify({ datasetVersion: challenge.datasetVersion, rule: challenge.monitoring.rule, limits: challenge.limits, episodes: challenge.dataset.scenarios.length }));
    return;
  }
  if (action.type === "request_challenge_check" || action.type === "decide_challenge" || action.type === "end_challenge") {
    const challenge = state.challenges?.find((item) => item.id === action.challengeId);
    if (!challenge) throw new InputError("unknown_challenge");
    applyChallengeAction(challenge, action);
    const detail = action.type === "decide_challenge" ? { scenarioId: action.scenarioId, decision: action.decision, reason: action.reason, elapsedMinutes: challenge.elapsedMinutes }
      : { scenarioId: action.type === "request_challenge_check" ? action.scenarioId : undefined, elapsedMinutes: challenge.elapsedMinutes };
    emit(state, action.type, challenge.id, JSON.stringify(detail));
    if (challenge.status !== "active") emit(state, "challenge_finished", challenge.id, JSON.stringify({ status: challenge.status, score: challenge.result?.score, reasons: challenge.result?.reasons }));
    return;
  }
  if (action.type === "compare_rules") {
    if (state.challenges?.some((challenge) => challenge.status === "active")) throw new InputError("finish_challenge_before_study", 409);
    requireRole(state, "administrator");
    const comparisons = state.comparisons ??= [];
    if (comparisons.length >= 20) throw new InputError("comparison_limit_reached", 409);
    const id = `CMP${String(comparisons.length + 1).padStart(4, "0")}`;
    const dataset = structuredClone(AML_BENCHMARK_DATA);
    const baseline = benchmarkArm(dataset, { ...action.baseline, version: 1 });
    const candidate = benchmarkArm(dataset, { ...action.candidate, version: 2 });
    comparisons.push({ id, datasetVersion: AML_BENCHMARK_VERSION, asOf: AML_BENCHMARK_AS_OF, dataset, baseline, candidate });
    emit(state, "rule_comparison_created", id, JSON.stringify({ datasetVersion: AML_BENCHMARK_VERSION, asOf: AML_BENCHMARK_AS_OF, baseline: baseline.rule, candidate: candidate.rule, baselineAlerts: baseline.alerts.length, candidateAlerts: candidate.alerts.length }));
    return;
  }
  if (action.type === "reveal_comparison") {
    if (state.challenges?.some((challenge) => challenge.status === "active")) throw new InputError("finish_challenge_before_study", 409);
    const comparison = state.comparisons?.find((item) => item.id === action.comparisonId);
    if (!comparison) throw new InputError("unknown_comparison");
    if (comparison.debrief) throw new InputError("comparison_already_revealed", 409);
    if (comparison.datasetVersion !== AML_BENCHMARK_VERSION) throw new InputError("unsupported_benchmark_version", 409);
    comparison.debrief = { revealedAt: state.asOf, answers: structuredClone(AML_BENCHMARK_ANSWERS), baseline: benchmarkMetrics(comparison.baseline), candidate: benchmarkMetrics(comparison.candidate) };
    emit(state, "comparison_debrief_revealed", comparison.id, "The learner explicitly opened the synthetic scenario answers and detection scores. These are authored teaching labels, not legal findings.");
    return;
  }
  if (action.type === "configure_rule" || action.type === "run_monitoring" || action.type === "add_transaction") {
    requireRole(state, "administrator");
    if (action.type === "configure_rule") {
      state.rule = { version: state.rule.version + 1, ...action.rule };
      emit(state, "rule_configured", `v${state.rule.version}`, JSON.stringify(state.rule));
    } else if (action.type === "run_monitoring") runMonitoring(state);
    else {
      if (state.transactions.length >= 500) throw new InputError("transaction_limit_reached", 409);
      const tx = action.transaction;
      const from = state.accounts.find((row) => row.id === tx.fromAccount);
      const to = state.accounts.find((row) => row.id === tx.toAccount);
      if (!from || !to || tx.fromAccount === tx.toAccount || (!from.internal && !to.internal)) throw new InputError("invalid_transaction_accounts");
      if (state.transactions.some((row) => row.id === tx.id)) throw new InputError("duplicate_transaction_id", 409);
      const at = Date.parse(tx.at);
      if (at > Date.parse(state.asOf) || at < Date.parse(state.asOf) - 365 * DAY || at < Date.parse(from.openedAt) || at < Date.parse(to.openedAt)) throw new InputError("transaction_outside_snapshot_or_account_lifetime");
      state.transactions.push(structuredClone(tx));
      emit(state, "transaction_added", tx.id, `${tx.status}; ${tx.amount} ${tx.currency}; fixed training equivalent HKD ${tx.hkdAmount}; ${tx.fromAccount} to ${tx.toAccount}. Run monitoring to evaluate.`);
    }
    return;
  }
  if (action.type === "review_case") {
    requireRole(state, "reviewer");
    const item = caseFor(state, action.caseId);
    if (item.status !== "pending_review") throw new InputError("case_not_pending_review", 409);
    if ((action.decision === "approve_close" && item.recommendation !== "close") || (action.decision === "approve_str" && item.recommendation !== "str")) throw new InputError("review_does_not_match_recommendation", 409);
    item.reviews.push({ at: state.asOf, author: state.actor, decision: action.decision, reason: action.reason });
    item.status = action.decision === "return" ? "returned" : action.decision === "approve_str" ? "str_approved" : "closed";
    item.updatedAt = state.asOf;
    if (action.decision !== "return") for (const id of item.alertIds) {
      const alert = alertFor(state, id); alert.status = "closed";
      alert.closureReason = `${action.decision === "approve_str" ? "Internal STR recommendation approved (not filed)" : "Case closure approved"}: ${action.reason}`;
    }
    emit(state, "case_reviewed", item.id, `${action.decision}: ${action.reason}`); return;
  }
  requireRole(state, "analyst");
  if (action.type === "claim_alert") {
    const alert = alertFor(state, action.alertId);
    if (alert.status !== "new" || alert.owner || alert.caseId) throw new InputError("alert_not_available", 409);
    alert.owner = state.actor; alert.status = "claimed";
    emit(state, "alert_claimed", alert.id, `Claimed by ${state.actor}`); return;
  }
  if (action.type === "release_alert") {
    const alert = ownedAlert(state, action.alertId); alert.owner = ""; alert.status = "new";
    emit(state, "alert_released", alert.id, "Returned to unassigned queue"); return;
  }
  if (action.type === "close_alert") {
    const alert = ownedAlert(state, action.alertId); alert.status = "closed"; alert.closureReason = action.reason;
    emit(state, "alert_closed", alert.id, action.reason); return;
  }
  if (action.type === "create_case") {
    const alert = ownedAlert(state, action.alertId);
    const id = `C${String(state.cases.length + 1).padStart(4, "0")}`;
    const item: AmlCase = { id, title: action.title, owner: state.actor, status: "investigation", createdAt: state.asOf, updatedAt: state.asOf, alertIds: [], entityIds: [], transactionIds: [], findings: [], narrative: "", recommendation: "close", strDraft: emptyStr(), reviews: [] };
    linkAlert(item, alert); state.cases.push(item);
    emit(state, "case_created", id, `From alert ${alert.id}; owner=${state.actor}`); return;
  }
  const item = editableCase(state, action.caseId);
  if (action.type === "attach_alert") {
    const alert = ownedAlert(state, action.alertId); linkAlert(item, alert);
    emit(state, "alert_attached", item.id, alert.id);
  } else if (action.type === "add_finding") {
    if (!action.transactionIds.length && !action.evidenceIds.length) throw new InputError("finding_requires_cited_source");
    const related = relevantEntities(state, item);
    for (const id of action.transactionIds) {
      const tx = state.transactions.find((row) => row.id === id);
      if (!tx || !state.accounts.some((account) => (account.id === tx.fromAccount || account.id === tx.toAccount) && related.has(account.entityId))) throw new InputError("transaction_source_not_related_to_case");
    }
    for (const id of action.evidenceIds) {
      const source = state.evidence.find((row) => row.id === id);
      if (!source || !source.entityIds.some((entityId) => related.has(entityId))) throw new InputError("evidence_source_not_related_to_case");
    }
    const id = `${item.id}-F${item.findings.length + 1}`;
    item.findings.push({ id, at: state.asOf, author: state.actor, text: action.text, transactionIds: action.transactionIds, evidenceIds: action.evidenceIds });
    item.transactionIds = union(item.transactionIds, action.transactionIds);
    emit(state, "finding_added", item.id, `${id}; transactions=${action.transactionIds.join(",")}; evidence=${action.evidenceIds.join(",")}; ${action.text}`);
  } else if (action.type === "save_case") {
    item.narrative = action.narrative; item.recommendation = action.recommendation; item.strDraft = action.strDraft;
    emit(state, "case_draft_saved", item.id, JSON.stringify({ narrative: item.narrative, recommendation: item.recommendation, strDraft: item.strDraft, externalSubmission: false }));
  } else if (action.type === "submit_case") {
    if (item.narrative.length < 20 || !item.findings.length) throw new InputError("case_requires_narrative_and_cited_finding");
    if (item.recommendation === "str" && Object.values(item.strDraft).some((value) => !value.trim())) throw new InputError("str_draft_fields_required");
    item.status = "pending_review";
    emit(state, "case_submitted_for_internal_review", item.id, `Recommendation=${item.recommendation}; no report sent to JFIU or any external recipient.`);
  }
  item.updatedAt = state.asOf;
}

export function applyAmlAction(current: AmlState, input: AmlActionInput): AmlState {
  const action = parseAmlAction(input);
  if (current.revision !== action.revision) throw new InputError("stale_revision", 409);
  if (current.version !== AML_STATE_VERSION) throw new InputError("incompatible_session", 409);
  if (current.revision >= 1000) throw new InputError("action_limit_reached", 409);
  const state = structuredClone(current);
  act(state, action); state.revision++;
  return state;
}
