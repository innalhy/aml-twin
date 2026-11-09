import type { SimulationAction, SimulationView } from "./simulation-types";

export type TrainingRole = "analyst" | "reviewer" | "administrator";
export interface AmlEntity {
  id: string;
  name: string;
  kind: "person" | "company";
  aliases: string[];
  jurisdiction: string;
  identifier: string;
  address: string;
  business: string;
  sourceOfFunds: string;
  expectedMonthlyHkd: number;
  risk: "low" | "medium" | "high";
}
export interface AmlAccount {
  id: string;
  entityId: string;
  bank: string;
  jurisdiction: string;
  currency: string;
  internal: boolean;
  openedAt: string;
}
export interface AmlTransaction {
  id: string;
  at: string;
  fromAccount: string;
  toAccount: string;
  amount: number;
  currency: "HKD" | "USD" | "RMB";
  hkdAmount: number;
  channel: "FPS" | "CHATS" | "SWIFT" | "Cash";
  reference: string;
  status: "executed" | "pending";
}
export interface AmlRelationship {
  id: string;
  fromEntity: string;
  toEntity: string;
  type: string;
  source: string;
  confirmed: boolean;
}
export interface AmlEvidence {
  id: string;
  entityIds: string[];
  title: string;
  source: string;
  body: string;
}
export interface MonitoringRule {
  version: number;
  minCreditHkd: number;
  minFanOutPercent: number;
  windowMinutes: number;
  newAccountDays: number;
}
export interface MonitoringRun {
  id: string;
  at: string;
  rule: MonitoringRule;
  transactionCount: number;
  matchedAlertIds: string[];
  newAlertIds: string[];
}
export interface BenchmarkScenario {
  id: string;
  title: string;
  accountId: string;
  transactionIds: string[];
  evidenceIds: string[];
}
export interface BenchmarkAnswer {
  scenarioId: string;
  category: "suspicious" | "legitimate";
  rationale: string;
}
export interface BenchmarkDataset {
  entities: AmlEntity[];
  accounts: AmlAccount[];
  transactions: AmlTransaction[];
  relationships: AmlRelationship[];
  evidence: AmlEvidence[];
  scenarios: BenchmarkScenario[];
}
export interface BenchmarkArm {
  rule: MonitoringRule;
  alerts: AmlAlert[];
  scenarioMatches: { scenarioId: string; alertIds: string[] }[];
  transactionCount: number;
}
export interface BenchmarkMetrics {
  truePositives: number;
  falsePositives: number;
  falseNegatives: number;
  trueNegatives: number;
  precision: number | null;
  recall: number | null;
}
export interface AmlRuleComparison {
  id: string;
  datasetVersion: string;
  asOf: string;
  dataset: BenchmarkDataset;
  baseline: BenchmarkArm;
  candidate: BenchmarkArm;
  debrief?: {
    revealedAt: string;
    answers: BenchmarkAnswer[];
    baseline: BenchmarkMetrics;
    candidate: BenchmarkMetrics;
  };
}
export type ChallengeDecision = "escalate" | "clear";
export interface AmlChallenge {
  id: string;
  datasetVersion: string;
  asOf: string;
  status: "active" | "won" | "lost";
  dataset: BenchmarkDataset;
  monitoring: BenchmarkArm;
  limits: { shiftMinutes: number; verificationMinutes: number; decisionMinutes: number; escalationCapacity: number };
  elapsedMinutes: number;
  verifiedScenarioIds: string[];
  decisions: { scenarioId: string; decision: ChallengeDecision; reason: string; atMinute: number }[];
  result?: {
    score: number;
    reasons: string[];
    missedSuspicious: number;
    unnecessaryEscalations: number;
    unresolved: number;
    answers: BenchmarkAnswer[];
  };
}
export interface AmlAlert {
  id: string;
  entityId: string;
  accountId: string;
  scenario: string;
  createdAt: string;
  priority: "high" | "medium";
  owner: string;
  status: "new" | "claimed" | "in_case" | "closed";
  caseId: string;
  closureReason: string;
  rule: MonitoringRule;
  windowStart: string;
  windowEnd: string;
  creditHkd: number;
  debitHkd: number;
  fanOutPercent: number;
  transactionIds: string[];
}
export interface CaseFinding {
  id: string;
  at: string;
  author: string;
  text: string;
  transactionIds: string[];
  evidenceIds: string[];
}
export interface StrDraft {
  subjects: string;
  period: string;
  activity: string;
  suspicion: string;
  explanation: string;
}
export interface AmlCase {
  id: string;
  title: string;
  owner: string;
  status: "investigation" | "returned" | "pending_review" | "closed" | "str_approved";
  createdAt: string;
  updatedAt: string;
  alertIds: string[];
  entityIds: string[];
  transactionIds: string[];
  findings: CaseFinding[];
  narrative: string;
  recommendation: "close" | "str";
  strDraft: StrDraft;
  reviews: { at: string; author: string; decision: "return" | "approve_close" | "approve_str"; reason: string }[];
}
export interface AmlEvent {
  seq: number;
  at: string;
  actor: string;
  role: TrainingRole;
  type: string;
  refId: string;
  detail: string;
}
export interface AmlView {
  id: string;
  revision: number;
  role: TrainingRole;
  actor: string;
  asOf: string;
  rule: MonitoringRule;
  entities: AmlEntity[];
  accounts: AmlAccount[];
  transactions: AmlTransaction[];
  relationships: AmlRelationship[];
  evidence: AmlEvidence[];
  alerts: AmlAlert[];
  cases: AmlCase[];
  runs: MonitoringRun[];
  events: AmlEvent[];
  comparisons: AmlRuleComparison[];
  challenges: AmlChallenge[];
  simulation?: SimulationView;
}
export type AmlAction =
  | SimulationAction
  | { type: "switch_role"; role: TrainingRole }
  | { type: "run_monitoring" }
  | { type: "configure_rule"; rule: Omit<MonitoringRule, "version"> }
  | { type: "compare_rules"; baseline: Omit<MonitoringRule, "version">; candidate: Omit<MonitoringRule, "version"> }
  | { type: "reveal_comparison"; comparisonId: string }
  | { type: "start_challenge"; rule: Omit<MonitoringRule, "version"> }
  | { type: "request_challenge_check"; challengeId: string; scenarioId: string }
  | { type: "decide_challenge"; challengeId: string; scenarioId: string; decision: ChallengeDecision; reason: string }
  | { type: "end_challenge"; challengeId: string }
  | { type: "add_transaction"; transaction: AmlTransaction }
  | { type: "claim_alert"; alertId: string }
  | { type: "release_alert"; alertId: string }
  | { type: "close_alert"; alertId: string; reason: string }
  | { type: "create_case"; alertId: string; title: string }
  | { type: "attach_alert"; alertId: string; caseId: string }
  | { type: "add_finding"; caseId: string; text: string; transactionIds: string[]; evidenceIds: string[] }
  | { type: "save_case"; caseId: string; narrative: string; recommendation: "close" | "str"; strDraft: StrDraft }
  | { type: "submit_case"; caseId: string }
  | { type: "review_case"; caseId: string; decision: "return" | "approve_close" | "approve_str"; reason: string };
export type AmlActionInput = AmlAction & { revision: number };
