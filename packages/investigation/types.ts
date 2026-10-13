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
