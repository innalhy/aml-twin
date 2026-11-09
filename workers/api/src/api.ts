import { Hono } from "hono";
import type { ActionInput, CaseDecisionInput, CaseSessionView, SessionView } from "../../../packages/investigation/types";
import { caseLibraryView, parseCaseDecision, parseCaseStart } from "./cases";
import { InputError, parseAction } from "./engine";
import type { AmlActionInput, AmlView } from "../../../packages/aml/types";
import { parseAmlAction } from "./aml";
import type { AccountIdentity } from "./clerk-auth";

const MAX_BODY_BYTES = 16_384;
const AML_BODY_BYTES = 131_072;
const SESSION_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
export type SessionResult = { view: SessionView } | { error: string; status: 404 | 409 };
export interface SessionStore {
  create(id: string, userId?: string): SessionView | Promise<SessionView>;
  read(id: string, userId?: string): SessionResult | Promise<SessionResult>;
  action(id: string, input: ActionInput, userId?: string): SessionResult | Promise<SessionResult>;
}
export type CaseResult = { view: CaseSessionView } | { error: string; status: InputError["status"] };
export interface CaseStore {
  create(id: string, caseId: string, userId?: string): CaseSessionView | Promise<CaseSessionView>;
  read(id: string, userId?: string): CaseResult | Promise<CaseResult>;
  decide(id: string, input: CaseDecisionInput, userId?: string): CaseResult | Promise<CaseResult>;
}
export type AmlResult = { view: AmlView } | { error: string; status: 400 | 404 | 409 | 413 };
export interface AmlStore {
  create(id: string, userId?: string, simulation?: boolean): AmlView | Promise<AmlView>;
  read(id: string, userId?: string): AmlResult | Promise<AmlResult>;
  action(id: string, input: AmlActionInput, userId?: string): AmlResult | Promise<AmlResult>;
}
export interface AccountUser { id: string; email: string; createdAt: string }
export interface SavedRun { kind: "aml" | "investigation" | "case"; id: string; title: string; progress: string; createdAt: string; updatedAt: string; route?: string }
interface AccountStore {
  resolve(identity: AccountIdentity): AccountUser;
  list(userId: string): SavedRun[];
  claim(userId: string, kind: SavedRun["kind"], id: string): SavedRun;
}
interface ApiBindings {
  store: SessionStore; cases: CaseStore; aml: AmlStore; frontendOrigin: string;
  accounts?: AccountStore;
  authenticate?: (request: Request) => Promise<AccountIdentity | null>;
}

async function boundedJson(request: Request, limit = MAX_BODY_BYTES): Promise<unknown> {
  if (request.headers.get("content-type")?.split(";")[0].trim().toLowerCase() !== "application/json") {
    throw new InputError("json_required");
  }
  if (Number(request.headers.get("content-length")) > limit) throw new InputError("body_too_large", 413);
  if (!request.body) throw new InputError("invalid_json");
  const reader = request.body.getReader();
  const decoder = new TextDecoder("utf-8", { fatal: true, ignoreBOM: false });
  let bytes = 0;
  let body = "";
  try {
    while (true) {
      const chunk = await reader.read();
      if (chunk.done) break;
      bytes += chunk.value.byteLength;
      if (bytes > limit) {
        await reader.cancel();
        throw new InputError("body_too_large", 413);
      }
      body += decoder.decode(chunk.value, { stream: true });
    }
    body += decoder.decode();
    return JSON.parse(body);
  } catch (error) {
    if (error instanceof InputError) throw error;
    throw new InputError("invalid_json");
  } finally {
    reader.releaseLock();
  }
}

const app = new Hono<{ Bindings: ApiBindings; Variables: { accountUser: AccountUser | null } }>();

app.use("*", async (c, next) => {
  c.header("Cache-Control", "no-store");
  c.header("X-Content-Type-Options", "nosniff");
  const origin = c.req.header("Origin");
  const allowed = new Set(["http://localhost:5173", "http://127.0.0.1:5173", "http://localhost:4173", "http://127.0.0.1:4173", "http://localhost:8787", "http://127.0.0.1:8787", ...c.env.frontendOrigin.split(",").map((item) => item.trim())].filter(Boolean));
  if (origin) {
    if (!allowed.has(origin)) return c.json({ error: "origin_not_allowed" }, 403);
    c.header("Access-Control-Allow-Origin", origin);
    c.header("Vary", "Origin");
  }
  if (c.req.method === "OPTIONS") {
    c.header("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    c.header("Access-Control-Allow-Headers", "Content-Type, Authorization");
    return c.body(null, 204);
  }
  await next();
});

app.get("/health", (c) => c.json({ status: "ok", service: "twinaml-api" }));

app.use("/api/*", async (c, next) => {
  c.set("accountUser", null);
  if (c.env.accounts && c.env.authenticate) {
    const identity = await c.env.authenticate(c.req.raw);
    if (identity) c.set("accountUser", c.env.accounts.resolve(identity));
    else if (c.req.header("Authorization")) return c.json({ error: "sign_in_required" }, 401);
  }
  await next();
});

app.get("/api/account", (c) => c.json({ enabled: Boolean(c.env.accounts), configured: Boolean(c.env.authenticate), user: c.get("accountUser") }));

app.use("/api/account/*", async (c, next) => {
  if (!c.env.accounts || !c.env.authenticate) return c.json({ error: "accounts_not_configured" }, 503);
  if (!c.get("accountUser")) return c.json({ error: "sign_in_required" }, 401);
  await next();
});

app.get("/api/account/runs", (c) => c.json({ runs: c.env.accounts!.list(c.get("accountUser")!.id) }));

app.post("/api/account/claim", async (c) => {
  const input = await boundedJson(c.req.raw, 4096);
  if (!input || typeof input !== "object" || Array.isArray(input)) throw new InputError("invalid_claim");
  const { kind, id } = input as Record<string, unknown>;
  if ((kind !== "aml" && kind !== "investigation" && kind !== "case") || typeof id !== "string" || !SESSION_ID.test(id)) throw new InputError("invalid_claim");
  return c.json({ run: c.env.accounts!.claim(c.get("accountUser")!.id, kind, id) });
});

for (const path of ["/api/sessions", "/api/case-sessions", "/api/aml-sessions", "/api/aml-simulations"]) {
  app.use(path, async (c, next) => {
    if (c.req.method === "POST" && c.env.accounts) {
      if (!c.env.authenticate) return c.json({ error: "accounts_not_configured" }, 503);
      if (!c.get("accountUser")) return c.json({ error: "sign_in_required" }, 401);
    }
    await next();
  });
}

app.post("/api/sessions", async (c) => {
  const id = crypto.randomUUID();
  return c.json(await c.env.store.create(id, c.get("accountUser")?.id), 201);
});

for (const path of ["/api/sessions/:id", "/api/sessions/:id/*", "/api/case-sessions/:id", "/api/case-sessions/:id/*", "/api/aml-sessions/:id", "/api/aml-sessions/:id/*"]) {
  app.use(path, async (c, next) => {
    if (!SESSION_ID.test(c.req.param("id") ?? "")) return c.json({ error: "invalid_session_id" }, 400);
    await next();
  });
}

app.get("/api/sessions/:id", async (c) => {
  const result = await c.env.store.read(c.req.param("id"), c.get("accountUser")?.id);
  return "view" in result ? c.json(result.view) : c.json({ error: result.error }, result.status);
});

app.post("/api/sessions/:id/actions", async (c) => {
  const input = parseAction(await boundedJson(c.req.raw));
  const result = await c.env.store.action(c.req.param("id"), input, c.get("accountUser")?.id);
  return "view" in result ? c.json(result.view) : c.json({ error: result.error }, result.status);
});

app.get("/api/cases", (c) => c.json(caseLibraryView()));

app.post("/api/case-sessions", async (c) => {
  const caseId = parseCaseStart(await boundedJson(c.req.raw));
  return c.json(await c.env.cases.create(crypto.randomUUID(), caseId, c.get("accountUser")?.id), 201);
});

app.get("/api/case-sessions/:id", async (c) => {
  const result = await c.env.cases.read(c.req.param("id"), c.get("accountUser")?.id);
  return "view" in result ? c.json(result.view) : c.json({ error: result.error }, result.status);
});

app.post("/api/case-sessions/:id/decisions", async (c) => {
  const input = parseCaseDecision(await boundedJson(c.req.raw));
  const result = await c.env.cases.decide(c.req.param("id"), input, c.get("accountUser")?.id);
  return "view" in result ? c.json(result.view) : c.json({ error: result.error }, result.status);
});

app.post("/api/aml-sessions", async (c) => c.json(await c.env.aml.create(crypto.randomUUID(), c.get("accountUser")?.id), 201));

app.post("/api/aml-simulations", async (c) => {
  // Scenario assignment belongs to the server; clients cannot choose an answer category.
  if (c.req.raw.body) {
    const input = await boundedJson(c.req.raw, 4096);
    if (!input || typeof input !== "object" || Array.isArray(input) || Object.keys(input).length) throw new InputError("simulation_start_takes_no_options");
  }
  return c.json(await c.env.aml.create(crypto.randomUUID(), c.get("accountUser")?.id, true), 201);
});

app.get("/api/aml-sessions/:id", async (c) => {
  const result = await c.env.aml.read(c.req.param("id"), c.get("accountUser")?.id);
  return "view" in result ? c.json(result.view) : c.json({ error: result.error }, result.status);
});

app.post("/api/aml-sessions/:id/actions", async (c) => {
  const input = parseAmlAction(await boundedJson(c.req.raw, AML_BODY_BYTES));
  const result = await c.env.aml.action(c.req.param("id"), input, c.get("accountUser")?.id);
  return "view" in result ? c.json(result.view) : c.json({ error: result.error }, result.status);
});

app.onError((error, c) => {
  if (error instanceof InputError) return c.json({ error: error.message }, error.status);
  console.error(JSON.stringify({ event: "api_error", path: c.req.path, error: error.name }));
  return c.json({ error: "internal_error" }, 500);
});
app.notFound((c) => c.json({ error: "not_found" }, 404));

export default app;
