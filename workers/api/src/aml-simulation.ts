import type { AmlActionInput, AmlEvent, AmlView } from "../../../packages/aml/types";
import type { SimulationAction, SimulationCheck, SimulationControl, SimulationDecision, SimulationPayment, SimulationReview, SimulationRubric, SimulationView } from "../../../packages/aml/simulation-types";
import type { AmlState } from "./aml";
import { createSimulationData, type SimulationVariant } from "./aml-simulation-data";
import { InputError } from "./engine";

interface EvidenceRelease { id: string; release: "initial" | "request"; requestId?: string; reliability: string; availableMinute: number | null }
interface RequestedCheck extends SimulationCheck { evidenceIds: string[]; prerequisiteEvidenceId?: string }
interface PaymentInstruction { transactionId: string; dueMinute: number; status: SimulationPayment["status"]; executedMinute: number | null }
export interface SimulationState {
  version: 1;
  datasetVersion: string;
  policyVersion: string;
  rubricVersion: string;
  variant: SimulationVariant;
  startAt: string;
  accountId: string;
  openingBalanceHkd: number;
  elapsedMinutes: number;
  endMinute: number;
  ended: boolean;
  held: boolean;
  briefing: string;
  releases: EvidenceRelease[];
  requests: RequestedCheck[];
  payments: PaymentInstruction[];
  controls: SimulationControl[];
  decisions: SimulationDecision[];
  reviews: SimulationReview[];
  context: string;
  limitations: string[];
}

function object(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new InputError("invalid_action");
  return value as Record<string, unknown>;
}
function text(value: unknown, min: number, max: number): string {
  if (typeof value !== "string" || value.trim().length < min || value.length > max) throw new InputError("simulation_text_length_invalid");
  return value.trim();
}
function id(value: unknown): string {
  const result = text(value, 1, 64);
  if (!/^[A-Za-z0-9][A-Za-z0-9_-]*$/.test(result)) throw new InputError("invalid_identifier");
  return result;
}
function option<T extends string>(value: unknown, allowed: readonly T[]): T {
  if (typeof value !== "string" || !allowed.includes(value as T)) throw new InputError("invalid_option");
  return value as T;
}
function citations(value: unknown): string[] {
  if (!Array.isArray(value) || !value.length || value.length > 30) throw new InputError("simulation_requires_cited_evidence");
  const result = value.map(id);
  if (new Set(result).size !== result.length) throw new InputError("duplicate_citation");
  return result;
}
function rubric(value: unknown): SimulationRubric {
  const row = object(value);
  const score = (key: keyof SimulationRubric): number => {
    const value = row[key];
    if (typeof value !== "number" || !Number.isInteger(value) || value < 1 || value > 4) throw new InputError("simulation_rubric_score_invalid");
    return value;
  };
  return { evidence: score("evidence"), alternatives: score("alternatives"), proportionality: score("proportionality"), documentation: score("documentation") };
}
export function isSimulationAction(action: { type: string }): action is SimulationAction { return action.type.startsWith("simulation_"); }
export function parseSimulationAction(input: Record<string, unknown>): SimulationAction {
  switch (input.type) {
    case "simulation_request": return { type: input.type, requestId: id(input.requestId) };
    case "simulation_advance": {
      const mode = option(input.mode, ["next", "work"] as const);
      if (mode === "next") return { type: input.type, mode };
      if (input.minutes !== 1 && input.minutes !== 5) throw new InputError("simulation_work_requires_one_or_five_minutes");
      return { type: input.type, mode, minutes: input.minutes };
    }
    case "simulation_recommend_control": return { type: input.type, control: option(input.control, ["hold", "release"] as const), reason: text(input.reason, 20, 4000), evidenceIds: citations(input.evidenceIds) };
    case "simulation_review_control": return { type: input.type, controlId: id(input.controlId), decision: option(input.decision, ["approve", "reject"] as const), reason: text(input.reason, 20, 4000) };
    case "simulation_submit_decision": return { type: input.type, disposition: option(input.disposition, ["close", "continue_review", "escalate"] as const), reason: text(input.reason, 20, 4000), evidenceIds: citations(input.evidenceIds), alternativeExplanation: text(input.alternativeExplanation, 10, 2000), missingInformation: text(input.missingInformation, 10, 2000) };
    case "simulation_review_decision": return { type: input.type, decisionId: id(input.decisionId), decision: option(input.decision, ["return", "approve"] as const), reason: text(input.reason, 20, 4000), rubric: rubric(input.rubric) };
    case "simulation_finish": return { type: input.type };
    default: throw new InputError("invalid_simulation_action");
  }
}

export function initializeSimulation(state: AmlState, variant?: SimulationVariant): void {
  const data = createSimulationData(variant);
  state.role = "analyst"; state.actor = "analyst-01"; state.asOf = data.startAt;
  state.entities = structuredClone(data.entities); state.accounts = structuredClone(data.accounts);
  state.transactions = structuredClone(data.transactions); state.relationships = structuredClone(data.relationships);
  state.evidence = data.evidence.map(({ id, entityIds, title, source, body }) => ({ id, entityIds: [...entityIds], title, source, body }));
  state.alerts = []; state.cases = []; state.runs = []; state.events = []; state.alertKeys = []; state.comparisons = []; state.challenges = [];
  state.simulation = {
    version: 1, datasetVersion: data.datasetVersion, policyVersion: data.policyVersion, rubricVersion: data.rubricVersion,
    variant: data.variant, startAt: data.startAt, accountId: data.accountId, openingBalanceHkd: data.openingBalanceHkd,
    elapsedMinutes: 0, endMinute: 60, ended: false, held: false, briefing: data.briefing,
    releases: data.evidence.map((item) => ({ id: item.id, release: item.release, requestId: item.requestId, reliability: item.reliability, availableMinute: item.release === "initial" ? 0 : null })),
    requests: data.checks.map((check) => ({ id: check.id, title: check.title, source: check.source, description: check.description, delayMinutes: check.delayMinutes, evidenceIds: [...check.evidenceIds], prerequisiteEvidenceId: check.prerequisiteEvidenceId, status: "available", requestedMinute: null, dueMinute: null })),
    payments: data.payments.map((payment) => ({ transactionId: payment.transactionId, dueMinute: payment.dueMinute, status: "pending", executedMinute: null })),
    controls: [], decisions: [], reviews: [], context: data.context, limitations: [...data.limitations],
  };
  emit(state, "simulation_started", state.id, "Synthetic AML investigation opened. Practice identities share this account; independent practitioner validation is pending.");
}

function simulation(state: AmlState): SimulationState {
  if (!state.simulation) throw new InputError("simulation_session_required", 409);
  if (state.simulation.version !== 1) throw new InputError("incompatible_simulation", 409);
  return state.simulation;
}
function emit(state: AmlState, type: string, refId: string, detail: string): void {
  state.events.push({ seq: state.events.length + 1, at: state.asOf, actor: state.actor, role: state.role, type, refId, detail });
}
function requireRole(state: AmlState, role: "analyst" | "reviewer"): void { if (state.role !== role) throw new InputError(`requires_${role}_training_role`, 409); }
function visibleIds(sim: SimulationState): string[] { return sim.releases.filter((item) => item.availableMinute !== null && item.availableMinute <= sim.elapsedMinutes).map((item) => item.id); }
function validateCitations(sim: SimulationState, evidenceIds: string[]): void {
  const available = new Set(visibleIds(sim));
  if (!evidenceIds.length || evidenceIds.some((id) => !available.has(id))) throw new InputError("simulation_evidence_not_available", 409);
}
function balance(state: AmlState): number {
  const sim = simulation(state);
  const start = Date.parse(sim.startAt);
  return state.transactions.filter((tx) => tx.status === "executed" && Date.parse(tx.at) > start && Date.parse(tx.at) <= Date.parse(state.asOf))
    .reduce((sum, tx) => sum + (tx.toAccount === sim.accountId ? tx.hkdAmount : 0) - (tx.fromAccount === sim.accountId ? tx.hkdAmount : 0), sim.openingBalanceHkd);
}
function executePayment(state: AmlState, payment: PaymentInstruction): void {
  const sim = simulation(state);
  const tx = state.transactions.find((item) => item.id === payment.transactionId);
  if (!tx || tx.status !== "pending" || payment.executedMinute !== null) throw new InputError("incompatible_simulation", 409);
  if (sim.held) {
    payment.status = "held";
    emit(state, "simulation_payment_held", tx.id, `Scheduled payment remains pending under the applied outbound hold; due_minute=${payment.dueMinute}.`);
    return;
  }
  if (balance(state) < tx.hkdAmount) {
    payment.status = "failed";
    emit(state, "simulation_payment_failed", tx.id, "The synthetic payment could not execute because available funds were insufficient.");
    return;
  }
  tx.status = "executed"; tx.at = state.asOf;
  payment.status = "executed"; payment.executedMinute = sim.elapsedMinutes;
  emit(state, "simulation_payment_executed", tx.id, `HKD ${tx.hkdAmount} executed at simulation minute ${sim.elapsedMinutes}.`);
}
function scheduled(sim: SimulationState, state: AmlState): number[] {
  const futureLedger = state.transactions.filter((tx) => tx.status === "executed" && Date.parse(tx.at) > Date.parse(state.asOf))
    .map((tx) => Math.round((Date.parse(tx.at) - Date.parse(sim.startAt)) / 60000));
  return [...new Set([
    ...sim.requests.filter((item) => item.status === "pending" && item.dueMinute !== null).map((item) => item.dueMinute!),
    ...sim.controls.filter((item) => item.status === "approved" && item.dueMinute !== null).map((item) => item.dueMinute!),
    ...sim.payments.filter((item) => item.status === "pending").map((item) => item.dueMinute),
    ...futureLedger,
  ])].filter((minute) => minute > sim.elapsedMinutes && minute <= sim.endMinute).sort((a, b) => a - b);
}
function settle(state: AmlState): void {
  const sim = simulation(state);
  for (const request of sim.requests.filter((item) => item.status === "pending" && item.dueMinute === sim.elapsedMinutes)) {
    request.status = "complete";
    for (const id of request.evidenceIds) {
      const release = sim.releases.find((item) => item.id === id && item.requestId === request.id);
      if (!release) throw new InputError("incompatible_simulation", 409);
      release.availableMinute = sim.elapsedMinutes;
    }
    emit(state, "simulation_evidence_released", request.id, `${request.title}; available at minute ${sim.elapsedMinutes}.`);
  }
  // At one timestamp, completed checks and applied controls precede payment execution.
  for (const control of sim.controls.filter((item) => item.status === "approved" && item.dueMinute === sim.elapsedMinutes)) {
    control.status = "applied"; control.appliedMinute = sim.elapsedMinutes;
    sim.held = control.control === "hold";
    emit(state, "simulation_control_applied", control.id, `Outbound ${control.control} applied by operations after approval; no completed transfer was reversed.`);
    if (!sim.held) for (const payment of sim.payments.filter((item) => item.status === "held" && item.dueMinute <= sim.elapsedMinutes)) executePayment(state, payment);
  }
  for (const tx of state.transactions.filter((item) => item.status === "executed" && item.at === state.asOf && !sim.payments.some((payment) => payment.transactionId === item.id))) {
    emit(state, "simulation_transaction_observed", tx.id, `Ledger activity became available at minute ${sim.elapsedMinutes}.`);
  }
  for (const payment of sim.payments.filter((item) => item.status === "pending" && item.dueMinute === sim.elapsedMinutes)) executePayment(state, payment);
}
function advance(state: AmlState, target: number): void {
  const sim = simulation(state);
  const end = Math.min(sim.endMinute, target);
  if (end <= sim.elapsedMinutes) throw new InputError("simulation_clock_at_end", 409);
  for (const minute of [...scheduled(sim, state).filter((minute) => minute <= end), end].filter((minute, index, all) => all.indexOf(minute) === index)) {
    sim.elapsedMinutes = minute;
    state.asOf = new Date(Date.parse(sim.startAt) + minute * 60000).toISOString();
    settle(state);
  }
  emit(state, "simulation_clock_advanced", state.id, `Simulation clock advanced to minute ${sim.elapsedMinutes}; reading and form drafts do not advance time.`);
}

export function applySimulationAction(state: AmlState, action: AmlActionInput): void {
  const sim = simulation(state);
  if (sim.ended) throw new InputError("simulation_ended", 409);
  if (action.type === "switch_role") {
    if (action.role !== "analyst" && action.role !== "reviewer") throw new InputError("simulation_role_not_available", 409);
    state.role = action.role; state.actor = `${action.role}-01`;
    emit(state, "simulation_practice_role_switched", state.actor, "Practice identity switched; this is not independent reviewer authentication.");
    return;
  }
  if (!isSimulationAction(action)) throw new InputError("simulation_action_required", 409);
  if (action.type === "simulation_advance") {
    advance(state, action.mode === "next" ? scheduled(sim, state)[0] ?? sim.endMinute : sim.elapsedMinutes + action.minutes!);
    return;
  }
  if (action.type === "simulation_finish") {
    if (sim.elapsedMinutes < sim.endMinute) advance(state, sim.endMinute);
    sim.ended = true;
    emit(state, "simulation_finished", state.id, "Clock settled through the end of the exercise. Authored scenario context is now available; the run is immutable.");
    return;
  }
  if (action.type === "simulation_review_control") {
    requireRole(state, "reviewer");
    const control = sim.controls.find((item) => item.id === action.controlId);
    if (!control || control.status !== "requested") throw new InputError("simulation_control_not_awaiting_review", 409);
    control.reviewedMinute = sim.elapsedMinutes; control.reviewReason = action.reason;
    control.status = action.decision === "approve" ? "approved" : "rejected";
    control.dueMinute = action.decision === "approve" ? sim.elapsedMinutes + 2 : null;
    emit(state, "simulation_control_reviewed", control.id, `${action.decision}; ${action.reason}${control.dueMinute !== null ? `; operations_due_minute=${control.dueMinute}` : ""}`);
    return;
  }
  if (action.type === "simulation_review_decision") {
    requireRole(state, "reviewer");
    const decision = sim.decisions.find((item) => item.id === action.decisionId);
    if (!decision) throw new InputError("simulation_decision_not_found", 404);
    if (sim.reviews.some((item) => item.decisionId === decision.id)) throw new InputError("simulation_decision_already_reviewed", 409);
    sim.reviews.push({ decisionId: decision.id, decision: action.decision, reason: action.reason, rubric: { ...action.rubric }, minute: sim.elapsedMinutes, reviewer: state.actor });
    emit(state, "simulation_decision_reviewed", decision.id, `${action.decision}; practice reviewer rubric recorded against evidence available at minute ${decision.minute}; ${action.reason}`);
    return;
  }
  requireRole(state, "analyst");
  if (action.type === "simulation_request") {
    const request = sim.requests.find((item) => item.id === action.requestId);
    if (!request) throw new InputError("simulation_check_not_found", 404);
    if (request.status === "pending" || request.status === "complete") throw new InputError("simulation_check_already_requested", 409);
    if (request.prerequisiteEvidenceId && !visibleIds(sim).includes(request.prerequisiteEvidenceId)) throw new InputError("simulation_check_prerequisite_missing", 409);
    request.status = "pending"; request.requestedMinute = sim.elapsedMinutes; request.dueMinute = sim.elapsedMinutes + request.delayMinutes;
    emit(state, "simulation_check_requested", request.id, `${request.title}; response due at minute ${request.dueMinute}.`);
    return;
  }
  if (action.type === "simulation_recommend_control") {
    validateCitations(sim, action.evidenceIds);
    if (action.control === "release" && !sim.held || action.control === "hold" && sim.held) throw new InputError("simulation_control_not_applicable", 409);
    if (sim.controls.some((item) => item.status === "requested" || item.status === "approved")) throw new InputError("simulation_control_already_pending", 409);
    const control: SimulationControl = { id: `CTL${sim.controls.length + 1}`, control: action.control, status: "requested", reason: action.reason, evidenceIds: [...action.evidenceIds], requestedMinute: sim.elapsedMinutes, reviewedMinute: null, dueMinute: null, appliedMinute: null, reviewReason: "" };
    sim.controls.push(control);
    emit(state, "simulation_control_recommended", control.id, `${control.control} recommended; no restriction changed; ${action.reason}`);
    return;
  }
  if (action.type === "simulation_submit_decision") {
    validateCitations(sim, action.evidenceIds);
    const decision: SimulationDecision = { id: `DEC${sim.decisions.length + 1}`, disposition: action.disposition, reason: action.reason, evidenceIds: [...action.evidenceIds], availableEvidenceIds: [...visibleIds(sim)], alternativeExplanation: action.alternativeExplanation, missingInformation: action.missingInformation, minute: sim.elapsedMinutes };
    sim.decisions.push(decision);
    emit(state, "simulation_decision_recorded", decision.id, `${decision.disposition}; cited=${decision.evidenceIds.join(",")}; decision_minute=${decision.minute}; ${decision.reason}`);
  }
}

function publicCheck(sim: SimulationState, request: RequestedCheck): SimulationCheck {
  const locked = request.prerequisiteEvidenceId && !visibleIds(sim).includes(request.prerequisiteEvidenceId);
  return { id: request.id, title: request.title, source: request.source, description: request.description, delayMinutes: request.delayMinutes, status: request.status === "available" && locked ? "locked" : request.status, requestedMinute: request.requestedMinute, dueMinute: request.dueMinute };
}
function debrief(state: AmlState): SimulationView["debrief"] {
  const sim = simulation(state);
  if (!sim.ended) return null;
  const executed = sim.payments.filter((item) => item.status === "executed");
  const held = sim.payments.filter((item) => item.status === "held");
  const amount = executed.reduce((sum, item) => sum + (state.transactions.find((tx) => tx.id === item.transactionId)?.hkdAmount || 0), 0);
  const latest = sim.decisions.at(-1);
  const requestedIds = new Set(sim.releases.filter((item) => item.release === "request").map((item) => item.id));
  return {
    scenarioContext: sim.context,
    outcome: `${executed.length} of ${sim.payments.length} scheduled payments executed (HKD ${amount.toLocaleString("en-HK")}); ${held.length} remain held. Closing synthetic balance: HKD ${balance(state).toLocaleString("en-HK")}. Completed transfers were not reversed.`,
    observations: [
      `${sim.requests.filter((item) => item.status === "complete").length} checks completed; ${sim.requests.filter((item) => item.status === "pending").length} requested responses remained pending at the end.`,
      latest ? `The latest analyst decision was ${latest.disposition.replaceAll("_", " ")} at minute ${latest.minute}, citing ${latest.evidenceIds.length} of the ${latest.availableEvidenceIds.length} records then available.` : "No analyst decision was recorded.",
      sim.held ? "An approved outbound hold remains in force in the simulation." : "No outbound hold is in force at the end of the simulation.",
      "A decision, reviewer approval or STR recommendation alone does not execute an account control or send an external report.",
    ],
    procedure: [
      { label: "Recorded an analyst decision with available evidence citations", complete: Boolean(latest?.evidenceIds.length) },
      { label: "Cited a requested response available at decision time", complete: Boolean(latest?.evidenceIds.some((id) => requestedIds.has(id) && latest.availableEvidenceIds.includes(id))) },
      { label: "Recorded an alternative explanation (quality requires human review)", complete: Boolean(latest?.alternativeExplanation) },
      { label: "Recorded missing information (quality requires human review)", complete: Boolean(latest?.missingInformation) },
      { label: "Received practice reviewer feedback on the latest decision", complete: Boolean(latest && sim.reviews.some((item) => item.decisionId === latest.id)) },
    ],
    limitations: [...sim.limitations, "The checklist measures recorded procedure, not whether a crime occurred or the quality of free-text reasoning.", "Reviewer scores are practice feedback from switchable identities. Independent AML-practitioner validation and real-world calibration are pending."],
  };
}

export function simulationView(state: AmlState): AmlView {
  const sim = simulation(state);
  const available = new Set(visibleIds(sim));
  const evidence = state.evidence.filter((item) => available.has(item.id));
  const transactions = state.transactions.filter((item) => Date.parse(item.at) <= Date.parse(state.asOf));
  const view: SimulationView = {
    datasetVersion: sim.datasetVersion, policyVersion: sim.policyVersion, rubricVersion: sim.rubricVersion, validationStatus: "unvalidated",
    elapsedMinutes: sim.elapsedMinutes, endMinute: sim.endMinute, ended: sim.ended, briefing: sim.briefing, balanceHkd: balance(state), held: sim.held,
    requests: sim.requests.map((item) => publicCheck(sim, item)),
    evidence: evidence.map((item) => { const release = sim.releases.find((row) => row.id === item.id)!; return { id: item.id, title: item.title, source: item.source, body: item.body, availableMinute: release.availableMinute!, reliability: release.reliability }; }),
    payments: sim.payments.map((item) => { const tx = state.transactions.find((tx) => tx.id === item.transactionId)!; return { id: tx.id, fromAccount: tx.fromAccount, toAccount: tx.toAccount, amountHkd: tx.hkdAmount, dueMinute: item.dueMinute, status: item.status, executedMinute: item.executedMinute }; }),
    controls: sim.controls.map((item) => ({ ...item, evidenceIds: [...item.evidenceIds] })),
    decisions: sim.decisions.map((item) => ({ ...item, evidenceIds: [...item.evidenceIds], availableEvidenceIds: [...item.availableEvidenceIds] })),
    reviews: sim.reviews.map((item) => ({ ...item, rubric: { ...item.rubric } })), debrief: debrief(state),
  };
  // Explicit projection: adding private state fields cannot accidentally expose an answer key.
  return structuredClone({ id: state.id, revision: state.revision, role: state.role, actor: state.actor, asOf: state.asOf, rule: state.rule,
    entities: state.entities, accounts: state.accounts, transactions, relationships: state.relationships, evidence,
    alerts: state.alerts.filter((alert) => alert.transactionIds.every((id) => transactions.some((tx) => tx.id === id))), cases: [], runs: state.runs,
    events: state.events.map(({ seq, at, actor, role, type, refId, detail }: AmlEvent) => ({ seq, at, actor, role, type, refId, detail })), comparisons: [], challenges: [], simulation: view });
}
