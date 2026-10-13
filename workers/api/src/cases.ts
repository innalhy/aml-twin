import type {
  CaseBrief, CaseDecisionInput, CaseEvent, CaseLibraryView, CaseRating, CaseSessionView, CaseStep,
} from "../../../packages/investigation/types";
import { play } from "../../../scripts/apply-effects.mjs";
import library from "./case-library.json";
import { InputError } from "./engine";

export const CASE_STATE_VERSION = 1;

// A case session is its event list; the twin and current node are replayed from the decisions.
export interface CaseState {
  version: number;
  id: string;
  caseId: string;
  revision: number;
  events: CaseEvent[];
}

interface ScriptNode {
  id: string;
  type: "scene" | "decision" | "outcome";
  title: string;
  prompt: string;
  media_ref?: string;
  choices?: { id: string; label: string; rationale?: string }[];
}
interface Script {
  case_id: string;
  title: string;
  summary: string;
  start_node_id: string;
  teaching: { acceptable_dispositions: string[]; poor_dispositions: string[]; incomplete_dispositions?: string[] };
  rules: { id: string; when: string; note?: string }[];
  nodes: ScriptNode[];
}
interface Workflow extends CaseBrief { teaching: CaseStep[]; teachingNotes: string[]; caseIds: string[] }

const scripts = new Map((library.scripts as unknown as Script[]).map((script) => [script.case_id, script]));
const workflows = library.workflows as Workflow[];
const workflowFor = new Map(workflows.flatMap((workflow) => workflow.caseIds.map((id) => [id, workflow] as const)));

function brief({ number, title, method, realWorld, role, goal }: Workflow): CaseBrief {
  return { number, title, method, realWorld, role, goal };
}

function node(script: Script, id: string): ScriptNode {
  const found = script.nodes.find((item) => item.id === id);
  if (!found) throw new InputError("incompatible_session", 409);
  return found;
}

function decisions(state: CaseState) {
  return state.events.filter((event) => event.type === "decision_made");
}

function replay(state: CaseState) {
  const script = scripts.get(state.caseId);
  if (!script) throw new InputError("incompatible_session", 409);
  try {
    return { script, ...play(script, decisions(state).map((event) => event.choiceId)) };
  } catch {
    // A script edit removed a node or choice this saved run used.
    throw new InputError("incompatible_session", 409);
  }
}

export function caseLibraryView(): CaseLibraryView {
  return {
    workflows: workflows.map((workflow) => ({
      ...brief(workflow),
      cases: workflow.caseIds.map((id) => {
        const script = scripts.get(id)!;
        return { caseId: id, title: script.title, summary: script.summary };
      }),
      walkthrough: workflow.caseIds.length ? null : { teaching: workflow.teaching, teachingNotes: workflow.teachingNotes },
    })),
  };
}

export function parseCaseStart(value: unknown): string {
  const caseId = (value as { caseId?: unknown } | null)?.caseId;
  if (typeof caseId !== "string" || !scripts.has(caseId)) throw new InputError("unknown_case");
  return caseId;
}

export function parseCaseDecision(value: unknown): CaseDecisionInput {
  const input = (value ?? {}) as { revision?: unknown; choiceId?: unknown };
  if (typeof input.revision !== "number" || !Number.isSafeInteger(input.revision) || input.revision < 0) throw new InputError("invalid_revision");
  if (typeof input.choiceId !== "string" || input.choiceId.length > 100) throw new InputError("invalid_choice");
  return { revision: input.revision, choiceId: input.choiceId };
}

export function createCaseSession(id: string, caseId: string): CaseState {
  const script = scripts.get(caseId);
  if (!script) throw new InputError("unknown_case");
  return {
    version: CASE_STATE_VERSION, id, caseId, revision: 0,
    events: [{ seq: 1, type: "session_started", nodeId: script.start_node_id, choiceId: "", detail: script.title }],
  };
}

export function decideCase(current: CaseState, input: CaseDecisionInput): CaseState {
  if (current.revision !== input.revision) throw new InputError("stale_revision", 409);
  const { script, nodeId } = replay(current);
  const at = node(script, nodeId);
  if (at.type !== "decision") throw new InputError("case_closed", 409);
  const choice = at.choices?.find((item) => item.id === input.choiceId);
  if (!choice) throw new InputError("invalid_choice");
  const state: CaseState = { ...current, revision: current.revision + 1, events: [...current.events] };
  state.events.push({ seq: state.events.length + 1, type: "decision_made", nodeId: at.id, choiceId: choice.id, detail: choice.label });
  const after = replay(state);
  if (node(script, after.nodeId).type === "outcome") {
    state.events.push({ seq: state.events.length + 1, type: "session_closed", nodeId: after.nodeId, choiceId: "", detail: String(after.twin.disposition ?? "") });
  }
  return state;
}

function rate(script: Script, disposition: string): CaseRating {
  const { acceptable_dispositions, incomplete_dispositions = [], poor_dispositions } = script.teaching;
  if (acceptable_dispositions.includes(disposition)) return "acceptable";
  if (incomplete_dispositions.includes(disposition)) return "incomplete";
  return poor_dispositions.includes(disposition) ? "poor" : "unrated";
}

export function caseView(state: CaseState): CaseSessionView {
  const { script, twin, nodeId, visited } = replay(state);
  const workflow = workflowFor.get(state.caseId)!;
  const made = decisions(state);
  let answered = 0;
  const story = visited.map((id) => {
    const item = node(script, id);
    const chosen = item.type === "decision" && answered < made.length ? made[answered++].detail : "";
    return { id, type: item.type, title: item.title, prompt: item.prompt, mediaRef: item.media_ref ?? "", chosen };
  });
  const current = node(script, nodeId);
  const disposition = String(twin.disposition ?? "");
  return {
    id: state.id, caseId: state.caseId, revision: state.revision,
    title: script.title, summary: script.summary, workflow: brief(workflow),
    rules: script.rules.map(({ id, when }) => ({ id, when })),
    story,
    choices: current.type === "decision" ? (current.choices ?? []).map(({ id, label }) => ({ id, label })) : [],
    twin, events: state.events,
    // Rationale, rule notes and the model teaching flow stay server-side until the case closes.
    debrief: current.type !== "outcome" ? null : {
      disposition, rating: rate(script, disposition),
      decisions: made.map((event) => {
        const choice = node(script, event.nodeId).choices?.find((item) => item.id === event.choiceId);
        return { title: node(script, event.nodeId).title, choice: event.detail, rationale: choice?.rationale ?? "" };
      }),
      rules: script.rules.map(({ id, when, note }) => ({ id, when, note: note ?? "" })),
      teaching: workflow.teaching, teachingNotes: workflow.teachingNotes,
    },
  };
}
