export type Row = Record<string, string>;

export interface EvidenceRecord {
  id: string;
  customerId: string;
  title: string;
  source: string;
  body: string;
  release: "initial" | "on_request";
  requestId: string;
}

export interface InvestigationPack {
  snapshotAt: string;
  briefing: string;
  policy: string;
  customers: Row[];
  accounts: Row[];
  transactions: Row[];
  alerts: Row[];
  requests: Row[];
  evidence: EvidenceRecord[];
  initialState: Row[];
  dueEvents: Row[];
}

export interface RunAccount {
  customerId: string;
  accountId: string;
  balance: number;
  held: boolean;
  holdReason: string;
  holdSince: number | null;
}

export interface RunOrder {
  id: string;
  customerId: string;
  fromAccount: string;
  toAccount: string;
  amount: number;
  dueMinute: number;
  status: "pending" | "executed" | "failed";
  executedMinute: number | null;
  overdue: boolean;
}

export interface CheckView {
  customerId: string;
  requestId: string;
  title: string;
  serviceMinutes: number;
  prerequisiteEvidenceId: string;
  status: "available" | "locked" | "waiting" | "completed";
  requestedMinute: number | null;
  dueMinute: number | null;
}

export interface VisibleEvidence {
  id: string;
  customerId: string;
  title: string;
  source: string;
  body: string;
  availableMinute: number;
}

export type Disposition = "closure" | "continue_review" | "escalation";
export interface Decision {
  id: string;
  customerId: string;
  minute: number;
  disposition: Disposition;
  evidenceIds: string[];
  note: string;
}

export interface RunEvent {
  seq: number;
  minute: number;
  type: string;
  customerId: string;
  refId: string;
  detail: string;
}

export interface SessionView {
  id: string;
  revision: number;
  minute: number;
  endMinute: number;
  ended: boolean;
  snapshotAt: string;
  briefing: string;
  policy: string;
  customers: Row[];
  accounts: Row[];
  transactions: Row[];
  alerts: Row[];
  runAccounts: RunAccount[];
  orders: RunOrder[];
  requests: CheckView[];
  evidence: VisibleEvidence[];
  decisions: Decision[];
  events: RunEvent[];
  debrief: { warnings: string[] } | null;
}

export type InvestigationAction =
  | { type: "request"; customerId: string; requestId: string }
  | { type: "hold" | "release"; customerId: string; reason: string }
  | { type: "decision"; customerId: string; disposition: Disposition; evidenceIds: string[]; note: string }
  | { type: "advance"; mode: "next" | "work"; minutes?: number }
  | { type: "finish" };

export type ActionInput = InvestigationAction & { revision: number };

// Case library: the eleven case-flow workflows and their node/choice scripts.
export interface CaseStep { label: string; decision: boolean }
export interface CaseBrief {
  number: number;
  title: string;
  method: string;
  realWorld: CaseStep[];
  role: string;
  goal: string;
}
export interface CaseLibraryView {
  workflows: (CaseBrief & {
    cases: { caseId: string; title: string; summary: string }[];
    // Read-only teaching flow, only for workflows without a playable script.
    walkthrough: { teaching: CaseStep[]; teachingNotes: string[] } | null;
  })[];
}

export interface CaseEvent {
  seq: number;
  type: "session_started" | "decision_made" | "session_closed";
  nodeId: string;
  choiceId: string;
  detail: string;
}
export interface CaseNodeView {
  id: string;
  type: "scene" | "decision" | "outcome";
  title: string;
  prompt: string;
  mediaRef: string;
  chosen: string;
}
export type CaseRating = "acceptable" | "incomplete" | "poor" | "unrated";
export interface CaseSessionView {
  id: string;
  caseId: string;
  revision: number;
  title: string;
  summary: string;
  workflow: CaseBrief;
  rules: { id: string; when: string }[];
  story: CaseNodeView[];
  choices: { id: string; label: string }[];
  twin: Record<string, unknown>;
  events: CaseEvent[];
  debrief: {
    disposition: string;
    rating: CaseRating;
    decisions: { title: string; choice: string; rationale: string }[];
    rules: { id: string; when: string; note: string }[];
    teaching: CaseStep[];
    teachingNotes: string[];
  } | null;
}
export interface CaseDecisionInput { revision: number; choiceId: string }
