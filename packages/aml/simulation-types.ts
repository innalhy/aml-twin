import type { TrainingRole } from "./types";

export interface SimulationCheck {
  id: string;
  title: string;
  source: string;
  description: string;
  delayMinutes: number;
  status: "available" | "locked" | "pending" | "complete";
  requestedMinute: number | null;
  dueMinute: number | null;
}
export interface SimulationEvidence {
  id: string;
  title: string;
  source: string;
  body: string;
  availableMinute: number;
  reliability: string;
}
export interface SimulationPayment {
  id: string;
  fromAccount: string;
  toAccount: string;
  amountHkd: number;
  dueMinute: number;
  status: "pending" | "held" | "executed" | "failed";
  executedMinute: number | null;
}
export interface SimulationControl {
  id: string;
  control: "hold" | "release";
  status: "requested" | "approved" | "rejected" | "applied";
  reason: string;
  evidenceIds: string[];
  requestedMinute: number;
  reviewedMinute: number | null;
  dueMinute: number | null;
  appliedMinute: number | null;
  reviewReason: string;
}
export type SimulationDisposition = "close" | "continue_review" | "escalate";
export interface SimulationDecision {
  id: string;
  disposition: SimulationDisposition;
  reason: string;
  evidenceIds: string[];
  availableEvidenceIds: string[];
  alternativeExplanation: string;
  missingInformation: string;
  minute: number;
}
export interface SimulationRubric {
  evidence: number;
  alternatives: number;
  proportionality: number;
  documentation: number;
}
export interface SimulationReview {
  decisionId: string;
  decision: "return" | "approve";
  reason: string;
  rubric: SimulationRubric;
  minute: number;
  reviewer: string;
}
export interface SimulationView {
  datasetVersion: string;
  policyVersion: string;
  rubricVersion: string;
  validationStatus: "unvalidated";
  elapsedMinutes: number;
  endMinute: number;
  ended: boolean;
  briefing: string;
  balanceHkd: number;
  held: boolean;
  requests: SimulationCheck[];
  evidence: SimulationEvidence[];
  payments: SimulationPayment[];
  controls: SimulationControl[];
  decisions: SimulationDecision[];
  reviews: SimulationReview[];
  debrief: {
    scenarioContext: string;
    outcome: string;
    observations: string[];
    procedure: { label: string; complete: boolean }[];
    limitations: string[];
  } | null;
}
export type SimulationAction =
  | { type: "simulation_request"; requestId: string }
  | { type: "simulation_advance"; mode: "next" | "work"; minutes?: number }
  | { type: "simulation_recommend_control"; control: "hold" | "release"; reason: string; evidenceIds: string[] }
  | { type: "simulation_review_control"; controlId: string; decision: "approve" | "reject"; reason: string }
  | { type: "simulation_submit_decision"; disposition: SimulationDisposition; reason: string; evidenceIds: string[]; alternativeExplanation: string; missingInformation: string }
  | { type: "simulation_review_decision"; decisionId: string; decision: "return" | "approve"; reason: string; rubric: SimulationRubric }
  | { type: "simulation_finish" };

export const SIMULATION_RUBRIC_LABELS: Record<keyof SimulationRubric, string> = {
  evidence: "Evidence use",
  alternatives: "Alternative explanations",
  proportionality: "Proportionate action",
  documentation: "Documentation",
};
export const SIMULATION_RUBRIC_GUIDE: Record<keyof SimulationRubric, readonly string[]> = {
  evidence: [
    "1 — Conclusion is unsupported by the cited records.",
    "2 — Uses relevant records but treats claims as verified facts or overlooks material contradictions.",
    "3 — Connects relevant citations to the conclusion and distinguishes claims from corroboration.",
    "4 — Also weighs provenance, reliability, contradictions and the information available at decision time.",
  ],
  alternatives: [
    "1 — No plausible alternative is considered.",
    "2 — Names an alternative without evaluating it against the records.",
    "3 — Explains how available evidence supports or weakens a plausible alternative.",
    "4 — Also identifies which further observation would materially change the assessment.",
  ],
  proportionality: [
    "1 — Recommended action has no support in the available evidence.",
    "2 — Gives a reason but leaves authority, impact or uncertainty unaddressed.",
    "3 — Matches the recommendation to the available evidence, uncertainty and practice authority.",
    "4 — Also addresses customer impact, review timing and conditions for changing an interim control.",
  ],
  documentation: [
    "1 — A reviewer cannot reconstruct the basis for the assessment.",
    "2 — Records a conclusion but omits material sources, gaps or follow-up.",
    "3 — Records a clear rationale, citations, alternative explanation and missing information.",
    "4 — Also provides concise follow-up actions and clearly separates facts, claims and judgments.",
  ],
};
export const SIMULATION_ROLES: TrainingRole[] = ["analyst", "reviewer"];
