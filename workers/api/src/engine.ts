import type {
  ActionInput, Decision, InvestigationAction, InvestigationPack, RunAccount,
  RunEvent, RunOrder, SessionView,
} from "../../../packages/investigation/types";

export const END_MINUTE = 30;
export const STATE_VERSION = 1;

interface RequestedCheck {
  customerId: string;
  requestId: string;
  evidenceId: string;
  requestedMinute: number;
  dueMinute: number;
  completed: boolean;
}

export interface SessionState {
  version: number;
  id: string;
  revision: number;
  minute: number;
  ended: boolean;
  runAccounts: RunAccount[];
  orders: RunOrder[];
  requests: RequestedCheck[];
  evidenceAvailable: Record<string, number>;
  decisions: Decision[];
  events: RunEvent[];
}

export class InputError extends Error {
  constructor(message: string, readonly status: 400 | 404 | 409 | 413 = 400) {
    super(message);
  }
}

function object(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new InputError("invalid_action");
  return value as Record<string, unknown>;
}

function text(value: unknown, limit: number): string {
  if (typeof value !== "string" || value.length > limit) throw new InputError("invalid_action");
  return value;
}

export function parseAction(value: unknown): ActionInput {
  const input = object(value);
  const revision = input.revision;
  if (typeof revision !== "number" || !Number.isSafeInteger(revision) || revision < 0) {
    throw new InputError("invalid_revision");
  }
  switch (input.type) {
    case "request":
      return { type: "request", revision, customerId: text(input.customerId, 100), requestId: text(input.requestId, 100) };
    case "hold": case "release":
      return { type: input.type, revision, customerId: text(input.customerId, 100), reason: text(input.reason, 4000) };
    case "decision": {
      const disposition = input.disposition;
      if (disposition !== "closure" && disposition !== "continue_review" && disposition !== "escalation") {
        throw new InputError("invalid_disposition");
      }
      if (!Array.isArray(input.evidenceIds) || input.evidenceIds.length > 24) throw new InputError("invalid_citations");
      return {
        type: "decision", revision, customerId: text(input.customerId, 100), disposition,
        evidenceIds: input.evidenceIds.map((id) => text(id, 100)), note: text(input.note, 4000),
      };
    }
    case "advance":
      if (input.mode === "next") return { type: "advance", revision, mode: "next" };
      if (input.mode !== "work" || typeof input.minutes !== "number" || !Number.isFinite(input.minutes) || input.minutes <= 0 || input.minutes > END_MINUTE) {
        throw new InputError("invalid_duration");
      }
      return { type: "advance", revision, mode: "work", minutes: input.minutes };
    case "finish": return { type: "finish", revision };
    default: throw new InputError("invalid_action");
  }
}

function compare(a: string, b: string): number { return a < b ? -1 : a > b ? 1 : 0; }

function emit(state: SessionState, type: string, customerId = "", refId = "", detail = ""): void {
  state.events.push({ seq: state.events.length + 1, minute: state.minute, type, customerId, refId, detail });
}

function visible(state: SessionState, evidenceId: string): boolean {
  const at = state.evidenceAvailable[evidenceId];
  return at !== undefined && at <= state.minute;
}

export function createSession(id: string, pack: InvestigationPack): SessionState {
  const state: SessionState = {
    version: STATE_VERSION, id, revision: 0, minute: 0, ended: false,
    runAccounts: pack.initialState.map((row) => ({
      customerId: row.customer_id, accountId: row.account_id, balance: Number(row.snapshot_balance),
      held: false, holdReason: "", holdSince: null,
    })),
    orders: pack.dueEvents.map((row) => ({
      id: row.transaction_id, customerId: row.customer_id, fromAccount: row.from_account,
      toAccount: row.to_account, amount: Number(row.amount), dueMinute: Number(row.due_minute),
      status: "pending", executedMinute: null, overdue: false,
    })),
    requests: [], evidenceAvailable: Object.fromEntries(pack.evidence.filter((row) => row.release === "initial").map((row) => [row.id, 0])),
    decisions: [], events: [],
  };
  emit(state, "run_start", "", "", "pack=analyst-session-001;clock=guided");
  return state;
}

function completeRequests(state: SessionState, pack: InvestigationPack): void {
  const requests = state.requests.filter((row) => !row.completed && row.dueMinute === state.minute)
    .sort((a, b) => compare(a.customerId, b.customerId) || compare(a.evidenceId, b.evidenceId));
  for (const request of requests) {
    request.completed = true;
    state.evidenceAvailable[request.evidenceId] = state.minute;
    const evidence = pack.evidence.find((row) => row.id === request.evidenceId)!;
    emit(state, "evidence_released", request.customerId, evidence.id, `request_id=${request.requestId};title=${evidence.title}`);
  }
}

function executeOrder(state: SessionState, order: RunOrder, trigger: "due" | "release"): void {
  if (order.status !== "pending") return;
  const account = state.runAccounts.find((row) => row.accountId === order.fromAccount)!;
  if (account.held) {
    order.overdue = true;
    emit(state, "order_held", order.customerId, order.id, `hold_since=${account.holdSince}`);
  } else if (account.balance < order.amount) {
    order.status = "failed";
    emit(state, "order_failed", order.customerId, order.id, `reason=insufficient_funds;available=${account.balance}`);
  } else {
    account.balance -= order.amount;
    order.status = "executed";
    order.executedMinute = state.minute;
    emit(state, "order_executed", order.customerId, order.id, `to=${order.toAccount};trigger=${trigger};amount=${order.amount};balance=${account.balance}`);
  }
}

function checkDueOrders(state: SessionState): void {
  for (const order of state.orders.filter((row) => row.status === "pending" && row.dueMinute === state.minute)
    .sort((a, b) => compare(a.fromAccount, b.fromAccount) || compare(a.id, b.id))) {
    executeOrder(state, order, "due");
  }
}

function scheduledMinutes(state: SessionState): number[] {
  return [...new Set([
    ...state.requests.filter((row) => !row.completed).map((row) => row.dueMinute),
    ...state.orders.filter((row) => row.status === "pending").map((row) => row.dueMinute),
  ])].filter((minute) => minute > state.minute && minute <= END_MINUTE).sort((a, b) => a - b);
}

function moveClock(state: SessionState, pack: InvestigationPack, target: number): void {
  if (target <= state.minute) return;
  const scheduled = scheduledMinutes(state).filter((minute) => minute <= target);
  checkDueOrders(state);
  for (const minute of scheduled) {
    state.minute = minute;
    completeRequests(state, pack);
    // A guided pause lets the learner act at the due minute before the payment check.
    if (minute < target) checkDueOrders(state);
  }
  state.minute = target;
}

function act(state: SessionState, pack: InvestigationPack, action: InvestigationAction): void {
  if (action.type === "advance") {
    const target = action.mode === "next" ? scheduledMinutes(state)[0] ?? END_MINUTE : Math.min(state.minute + action.minutes!, END_MINUTE);
    if (target <= state.minute) return;
    emit(state, "clock_advanced", "", "", `to_minute=${target}`);
    moveClock(state, pack, target);
    return;
  }
  if (action.type === "finish") {
    moveClock(state, pack, END_MINUTE);
    checkDueOrders(state);
    state.ended = true;
    emit(state, "run_end", "", "", `final_minute=${state.minute}`);
    return;
  }
  const customer = pack.customers.find((row) => row.customer_id === action.customerId);
  const account = customer && state.runAccounts.find((row) => row.accountId === customer.account_id);
  if (!account) {
    emit(state, "action_rejected", "", "", `reason=unknown_customer;action=${action.type};customer_id=${action.customerId}`);
    return;
  }
  switch (action.type) {
    case "hold":
      if (account.held) emit(state, "hold_rejected", action.customerId, "", "reason=already_held");
      else {
        account.held = true;
        account.holdReason = action.reason;
        account.holdSince = state.minute;
        emit(state, "hold_placed", action.customerId, "", `reason=${action.reason}`);
      }
      return;
    case "release":
      if (!account.held) emit(state, "release_rejected", action.customerId, "", "reason=not_held");
      else {
        account.held = false;
        account.holdReason = "";
        account.holdSince = null;
        emit(state, "hold_released", action.customerId, "", `note=${action.reason}`);
        for (const order of state.orders.filter((row) => row.fromAccount === account.accountId && row.status === "pending" && row.dueMinute < state.minute)
          .sort((a, b) => a.dueMinute - b.dueMinute || compare(a.id, b.id))) executeOrder(state, order, "release");
      }
      return;
    case "request": {
      const request = pack.requests.find((row) => row.customer_id === action.customerId && row.request_id === action.requestId);
      let rejection = "";
      if (!request) rejection = "reason=unknown_request";
      else if (state.requests.some((row) => row.customerId === action.customerId && row.requestId === action.requestId)) rejection = "reason=duplicate";
      else if (request.prerequisite_evidence_id && !visible(state, request.prerequisite_evidence_id)) rejection = "reason=prerequisite_missing";
      if (rejection) emit(state, "request_rejected", action.customerId, action.requestId, rejection);
      else {
        const evidence = pack.evidence.find((row) => row.customerId === action.customerId && row.requestId === action.requestId)!;
        const dueMinute = state.minute + Number(request!.service_minutes);
        state.requests.push({ customerId: action.customerId, requestId: action.requestId, evidenceId: evidence.id, requestedMinute: state.minute, dueMinute, completed: false });
        emit(state, "request_accepted", action.customerId, action.requestId, `due_minute=${dueMinute}`);
        if (dueMinute === state.minute) completeRequests(state, pack);
      }
      return;
    }
    case "decision": {
      const unavailable = action.evidenceIds.some((id) => !visible(state, id) || !pack.evidence.some((row) => row.id === id && row.customerId === action.customerId));
      if (unavailable) {
        emit(state, "decision_rejected", action.customerId, "", `reason=evidence_not_available;decision=${action.disposition}`);
        return;
      }
      const decision: Decision = {
        id: `D${state.decisions.length + 1}`, customerId: action.customerId, minute: state.minute,
        disposition: action.disposition, evidenceIds: [...action.evidenceIds], note: action.note,
      };
      state.decisions.push(decision);
      emit(state, "decision_recorded", action.customerId, decision.id, `decision=${decision.disposition};cites=${decision.evidenceIds.join("|")};note=${decision.note}`);
    }
  }
}

export function applyAction(current: SessionState, pack: InvestigationPack, action: ActionInput): SessionState {
  if (current.revision !== action.revision) throw new InputError("stale_revision", 409);
  if (current.ended) throw new InputError("session_ended", 409);
  if (current.revision >= 1000 && action.type !== "finish") throw new InputError("action_limit_reached", 409);
  const state = structuredClone(current);
  act(state, pack, action);
  if (state.events.length !== current.events.length) state.revision++;
  return state;
}

function debrief(state: SessionState, pack: InvestigationPack): { warnings: string[] } {
  const warnings: string[] = [];
  for (const customer of pack.customers) {
    const latest = state.decisions.filter((row) => row.customerId === customer.customer_id).at(-1);
    if (!latest) warnings.push(`${customer.display_name}: no disposition recorded.`);
    else {
      if (!latest.note.trim()) warnings.push(`${customer.display_name}: the latest decision has no rationale.`);
      if (!latest.evidenceIds.length) warnings.push(`${customer.display_name}: the latest decision cites no records.`);
      const decisionEvent = state.events.find((row) => row.type === "decision_recorded" && row.refId === latest.id)!;
      if (latest.disposition === "closure") {
        if (state.runAccounts.some((row) => row.customerId === customer.customer_id && row.held)) {
          warnings.push(`${customer.display_name}: the latest decision is closure, but an outbound hold remains.`);
        }
        const outstandingAtClosure = state.events.some((row) => row.type === "request_accepted" && row.customerId === customer.customer_id && row.seq < decisionEvent.seq
          && !state.events.some((delivery) => delivery.type === "evidence_released" && delivery.customerId === customer.customer_id
            && delivery.detail.startsWith(`request_id=${row.refId};`) && delivery.seq < decisionEvent.seq));
        if (outstandingAtClosure) warnings.push(`${customer.display_name}: checks were still outstanding when the latest closure was recorded.`);
      }
      if (latest.disposition === "escalation" && state.events.some((row) => row.type === "order_executed" && row.customerId === customer.customer_id && row.seq > decisionEvent.seq)) {
        warnings.push(`${customer.display_name}: outgoing payments executed after the latest escalation; escalation itself does not place a hold.`);
      }
    }
  }
  const waiting = state.requests.filter((row) => !row.completed).length;
  if (waiting) warnings.push(`${waiting} requested check(s) did not complete before the shift ended.`);
  const holds = state.runAccounts.filter((row) => row.held).length;
  if (holds) warnings.push(`${holds} account(s) still have outbound holds at the end of the shift.`);
  return { warnings };
}

export function sessionView(state: SessionState, pack: InvestigationPack): SessionView {
  return {
    id: state.id, revision: state.revision, minute: state.minute, endMinute: END_MINUTE, ended: state.ended,
    snapshotAt: pack.snapshotAt, briefing: pack.briefing, policy: pack.policy,
    customers: pack.customers, accounts: pack.accounts, transactions: pack.transactions, alerts: pack.alerts,
    runAccounts: state.runAccounts, orders: state.orders,
    requests: pack.requests.map((row) => {
      const accepted = state.requests.find((request) => request.customerId === row.customer_id && request.requestId === row.request_id);
      const locked = !!row.prerequisite_evidence_id && !visible(state, row.prerequisite_evidence_id);
      return {
        customerId: row.customer_id, requestId: row.request_id, title: row.title, serviceMinutes: Number(row.service_minutes),
        prerequisiteEvidenceId: locked ? "" : row.prerequisite_evidence_id,
        status: accepted ? accepted.completed ? "completed" : "waiting" : locked ? "locked" : "available",
        requestedMinute: accepted?.requestedMinute ?? null, dueMinute: accepted?.dueMinute ?? null,
      };
    }),
    evidence: pack.evidence.filter((row) => visible(state, row.id)).map((row) => ({
      id: row.id, customerId: row.customerId, title: row.title, source: row.source, body: row.body,
      availableMinute: state.evidenceAvailable[row.id],
    })),
    decisions: state.decisions, events: state.events, debrief: state.ended ? debrief(state, pack) : null,
  };
}
