import { DurableObject } from "cloudflare:workers";
import type { ActionInput, InvestigationPack, SessionView } from "../../../packages/investigation/types";
import packData from "./investigation-pack.json";
import { applyAction, createSession, InputError, sessionView, STATE_VERSION, type SessionState } from "./engine";
import api, { type SessionResult } from "./api";

const pack = packData as InvestigationPack;

export class InvestigationSession extends DurableObject<Env> {
  constructor(ctx: DurableObjectState, env: Env) {
    super(ctx, env);
    this.ctx.storage.sql.exec("CREATE TABLE IF NOT EXISTS session (id INTEGER PRIMARY KEY CHECK (id = 1), snapshot TEXT NOT NULL)");
  }

  private load(): SessionState | null {
    const row = this.ctx.storage.sql.exec<{ snapshot: string }>("SELECT snapshot FROM session WHERE id = 1").toArray()[0];
    if (!row) return null;
    const state: SessionState = JSON.parse(row.snapshot);
    if (state.version !== STATE_VERSION) throw new InputError("incompatible_session", 409);
    return state;
  }

  private save(state: SessionState): void {
    this.ctx.storage.sql.exec("INSERT INTO session (id, snapshot) VALUES (1, ?) ON CONFLICT(id) DO UPDATE SET snapshot = excluded.snapshot", JSON.stringify(state));
  }

  create(id: string): SessionView {
    const state = this.load() ?? createSession(id, pack);
    this.save(state);
    return sessionView(state, pack);
  }

  read(): SessionResult {
    try {
      const state = this.load();
      return state ? { view: sessionView(state, pack) } : { error: "session_not_found", status: 404 };
    } catch (error) {
      if (error instanceof InputError) return { error: error.message, status: 409 };
      throw error;
    }
  }

  action(input: ActionInput): SessionResult {
    try {
      // Keep the revision check, transition, and write synchronous in the same object turn.
      const current = this.load();
      if (!current) return { error: "session_not_found", status: 404 };
      const state = applyAction(current, pack, input);
      this.save(state);
      return { view: sessionView(state, pack) };
    } catch (error) {
      if (error instanceof InputError) return { error: error.message, status: 409 };
      throw error;
    }
  }
}

export default {
  fetch(request: Request, env: Env, ctx: ExecutionContext): Response | Promise<Response> {
    return api.fetch(request, {
      frontendOrigin: env.FRONTEND_ORIGIN,
      store: {
        create: (id) => env.SESSIONS.getByName(id).create(id),
        read: (id) => env.SESSIONS.getByName(id).read(),
        action: (id, input) => env.SESSIONS.getByName(id).action(input),
      },
    }, ctx);
  },
};
