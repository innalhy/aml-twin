export type CaseRow = {
  case_id: string;
  title: string;
  summary: string;
  locale: string;
  file: string;
  case_kind: string | null;
  themes: string[];
  acceptable_dispositions?: string[];
  poor_dispositions?: string[];
  rules?: Rule[];
};

export type Rule = {
  id: string;
  when: string;
  then: string;
  note: string;
};

export type Choice = {
  id: string;
  label: string;
  rationale: string;
};

export type ScriptNode = {
  id: string;
  type: "scene" | "decision" | "outcome" | string;
  title: string;
  prompt: string;
  terminal?: boolean;
  media_ref?: string;
  media_missing?: boolean;
  choices?: Choice[];
};

export type TwinEvent = {
  seq: number;
  type: string;
  at: string;
  node_id?: string;
  choice_id?: string;
  payload?: Record<string, unknown>;
};

export type Teaching = {
  disposition: string | null;
  bucket: string;
  poor_path: boolean;
  incomplete: boolean;
  rule_follow: boolean | null;
};

export type SessionView = {
  session_id: string;
  case_id: string;
  title: string;
  status: "open" | "closed";
  node: ScriptNode;
  passed_scenes: ScriptNode[];
  twin: {
    phase?: string;
    disposition?: string | null;
    customer?: { id?: string; display_name?: string };
    kyc?: { status?: string };
  };
  events: TwinEvent[];
  rules: Rule[];
  teaching: Teaching;
  risk: { score: number | null; flags: string[] };
  updated_at: string;
};

export type SessionSummary = {
  session_id: string;
  case_id: string;
  title: string;
  status: string;
  disposition: string | null;
  bucket: string;
  poor_path: boolean;
  incomplete: boolean;
  rule_follow: boolean | null;
  phase: string | null;
  score: number | null;
  flags: string[];
  event_count: number;
  updated_at: string;
};

export type Evidence = {
  session_id: string;
  case_id: string;
  title: string;
  status: string;
  mirrored: string;
  disposition: string | null;
  bucket: string;
  poor_path: boolean;
  rule_follow: boolean | null;
  flags: string[];
  event_types: string[];
  event_count: number;
  override_count: number;
  customer_id?: string;
};

async function read<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(path, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  });
  if (!response.ok) {
    let detail = response.statusText;
    try {
      const body = (await response.json()) as { detail?: string };
      if (body.detail) detail = body.detail;
    } catch {
      /* keep status text */
    }
    throw new Error(detail);
  }
  return (await response.json()) as T;
}

export function fetchCases() {
  return read<{ cases: CaseRow[] }>("/cases");
}

export function openSession(caseId: string) {
  return read<SessionView>("/sessions", {
    method: "POST",
    body: JSON.stringify({ case_id: caseId }),
  });
}

export function fetchSession(sessionId: string) {
  return read<SessionView>(`/sessions/${sessionId}`);
}

export function fetchSessions() {
  return read<{ sessions: SessionSummary[] }>("/sessions");
}

export function submitChoice(sessionId: string, choiceId: string) {
  return read<SessionView>(`/sessions/${sessionId}/decisions`, {
    method: "POST",
    body: JSON.stringify({ choice_id: choiceId }),
  });
}

export function fetchEvidence(sessionId: string) {
  return read<Evidence>(`/sessions/${sessionId}/evidence`);
}
