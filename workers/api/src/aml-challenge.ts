import type { AmlAction, AmlChallenge, BenchmarkAnswer, BenchmarkDataset, MonitoringRule } from "../../../packages/aml/types";
import { AML_BENCHMARK_ANSWERS, AML_BENCHMARK_AS_OF, AML_BENCHMARK_DATA, AML_BENCHMARK_VERSION } from "./aml-benchmark-data";
import { InputError } from "./engine";

export interface ChallengeState extends AmlChallenge {
  answers: BenchmarkAnswer[];
}

type ChallengeAction = Extract<AmlAction, { type: "request_challenge_check" | "decide_challenge" | "end_challenge" }>;

function shuffledDataset(): { dataset: BenchmarkDataset; answers: BenchmarkAnswer[] } {
  const order = [...AML_BENCHMARK_DATA.scenarios];
  for (let i = order.length - 1; i > 0; i--) {
    const j = Math.floor(crypto.getRandomValues(new Uint32Array(1))[0] / 0x100000000 * (i + 1));
    [order[i], order[j]] = [order[j], order[i]];
  }
  const replacements: [string, string][] = [];
  for (const [index, scenario] of order.entries()) {
    const source = scenario.id.slice(2);
    const slot = String(index + 1).padStart(2, "0");
    for (const prefix of ["A", "X", "E", "T", "D"]) replacements.push([`BM-${prefix}${source}`, `GS${slot}-${prefix}`]);
    replacements.push([scenario.id, `GS${slot}`], [`REF-10${Number(source)}`, `REF-GS${slot}`]);
  }
  function remap<T>(value: T): T {
    let json = JSON.stringify(value);
    for (const [from, to] of replacements) json = json.replaceAll(from, to);
    return JSON.parse(json) as T;
  }
  const dataset: BenchmarkDataset = remap(AML_BENCHMARK_DATA);
  for (const rows of [dataset.entities, dataset.accounts, dataset.transactions, dataset.evidence, dataset.scenarios]) rows.sort((a, b) => a.id.localeCompare(b.id));
  for (const [index, scenario] of dataset.scenarios.entries()) scenario.title = `Desk file ${String(index + 1).padStart(2, "0")}`;
  return { dataset, answers: remap(AML_BENCHMARK_ANSWERS).sort((a, b) => a.scenarioId.localeCompare(b.scenarioId)) };
}

export function createChallenge(id: string, rule: MonitoringRule): ChallengeState {
  const { dataset, answers } = shuffledDataset();
  return {
    id, datasetVersion: `${AML_BENCHMARK_VERSION}-game-v1`, asOf: AML_BENCHMARK_AS_OF,
    status: "active", dataset, answers,
    monitoring: { rule: structuredClone(rule), alerts: [], scenarioMatches: [], transactionCount: 0 },
    limits: { shiftMinutes: 12, verificationMinutes: 2, decisionMinutes: 1, escalationCapacity: 2 },
    elapsedMinutes: 0, verifiedScenarioIds: [], decisions: [],
  };
}

export function challengeView(state: ChallengeState): AmlChallenge {
  const finished = state.status !== "active";
  const visibleEvidence = new Set(state.dataset.scenarios.filter((scenario) => finished || state.verifiedScenarioIds.includes(scenario.id)).flatMap((scenario) => scenario.evidenceIds));
  return structuredClone({
    id: state.id, datasetVersion: state.datasetVersion, asOf: state.asOf, status: state.status,
    dataset: {
      entities: state.dataset.entities, accounts: state.dataset.accounts, transactions: state.dataset.transactions,
      relationships: state.dataset.relationships,
      scenarios: state.dataset.scenarios.map((scenario) => ({ ...scenario, evidenceIds: scenario.evidenceIds.filter((id) => visibleEvidence.has(id)) })),
      evidence: state.dataset.evidence.filter((record) => visibleEvidence.has(record.id)),
    },
    monitoring: state.monitoring, limits: state.limits, elapsedMinutes: state.elapsedMinutes,
    verifiedScenarioIds: state.verifiedScenarioIds, decisions: state.decisions,
    ...(finished && state.result ? { result: state.result } : {}),
  });
}

function finish(state: ChallengeState, cause?: "time" | "capacity"): void {
  const decisions = new Map(state.decisions.map((decision) => [decision.scenarioId, decision.decision]));
  const missedSuspicious = state.answers.filter((answer) => answer.category === "suspicious" && decisions.get(answer.scenarioId) !== "escalate").length;
  const unnecessaryEscalations = state.answers.filter((answer) => answer.category === "legitimate" && decisions.get(answer.scenarioId) === "escalate").length;
  const unresolved = state.dataset.scenarios.filter((scenario) => !decisions.has(scenario.id)).length;
  const escalations = state.decisions.filter((decision) => decision.decision === "escalate").length;
  const reasons: string[] = [];
  if (cause === "time" || state.elapsedMinutes > state.limits.shiftMinutes) reasons.push("The shift deadline was reached before all required work could be completed.");
  if (cause === "capacity" || escalations > state.limits.escalationCapacity) reasons.push(`The review queue exceeded its ${state.limits.escalationCapacity} escalation slots. Additional referrals could not be handled this shift.`);
  if (missedSuspicious) reasons.push(`${missedSuspicious} seeded suspicious ${missedSuspicious === 1 ? "episode was" : "episodes were"} cleared or left unresolved instead of referred for review.`);
  if (unnecessaryEscalations) reasons.push(`${unnecessaryEscalations} legitimate ${unnecessaryEscalations === 1 ? "episode consumed" : "episodes consumed"} scarce escalation capacity.`);
  if (unresolved) reasons.push(`${unresolved} ${unresolved === 1 ? "file still needed" : "files still needed"} a final decision when the shift ended.`);
  state.status = reasons.length ? "lost" : "won";
  if (state.status === "won") reasons.push("All five files were resolved within the shift. The seeded suspicious activity reached review and legitimate activity was cleared without overloading the queue.");
  const score = Math.max(0, 100 - 40 * missedSuspicious - 20 * unnecessaryEscalations - 10 * unresolved);
  state.result = {
    score: state.status === "won" ? score : Math.min(score, 50), reasons,
    missedSuspicious, unnecessaryEscalations, unresolved, answers: structuredClone(state.answers),
  };
}

function spendTime(state: ChallengeState, minutes: number): boolean {
  if (state.elapsedMinutes + minutes > state.limits.shiftMinutes) {
    state.elapsedMinutes = state.limits.shiftMinutes;
    finish(state, "time");
    return false;
  }
  state.elapsedMinutes += minutes;
  return true;
}

export function applyChallengeAction(state: ChallengeState, action: ChallengeAction): void {
  if (action.challengeId !== state.id) throw new InputError("unknown_challenge");
  if (state.status !== "active") throw new InputError("challenge_already_finished", 409);
  if (action.type === "end_challenge") { finish(state); return; }
  if (!state.dataset.scenarios.some((scenario) => scenario.id === action.scenarioId)) throw new InputError("unknown_challenge_scenario");
  if (state.decisions.some((decision) => decision.scenarioId === action.scenarioId)) throw new InputError("challenge_decision_already_committed", 409);
  if (action.type === "request_challenge_check") {
    if (state.verifiedScenarioIds.includes(action.scenarioId)) throw new InputError("challenge_check_already_completed", 409);
    if (!spendTime(state, state.limits.verificationMinutes)) return;
    state.verifiedScenarioIds.push(action.scenarioId);
  } else {
    const reason = action.reason.trim();
    if (reason.length < 20 || reason.length > 4000 || !["clear", "escalate"].includes(action.decision)) throw new InputError("invalid_challenge_decision");
    if (!spendTime(state, state.limits.decisionMinutes)) return;
    state.decisions.push({ scenarioId: action.scenarioId, decision: action.decision, reason, atMinute: state.elapsedMinutes });
    if (state.decisions.filter((decision) => decision.decision === "escalate").length > state.limits.escalationCapacity) { finish(state, "capacity"); return; }
  }
  if (state.decisions.length === state.dataset.scenarios.length) finish(state);
  else if (state.elapsedMinutes === state.limits.shiftMinutes) finish(state, "time");
}
