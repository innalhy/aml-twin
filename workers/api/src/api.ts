import { Hono } from "hono";
import type { ActionInput, CaseDecisionInput, CaseSessionView, SessionView } from "../../../packages/investigation/types";
import { caseLibraryView, parseCaseDecision, parseCaseStart } from "./cases";
import { InputError, parseAction } from "./engine";

const MAX_BODY_BYTES = 16_384;
const SESSION_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
export type SessionResult = { view: SessionView } | { error: string; status: 404 | 409 };
export interface SessionStore {
  create(id: string): SessionView | Promise<SessionView>;
  read(id: string): SessionResult | Promise<SessionResult>;
  action(id: string, input: ActionInput): SessionResult | Promise<SessionResult>;
}
export type CaseResult = { view: CaseSessionView } | { error: string; status: 404 | 409 };
export interface CaseStore {
  create(id: string, caseId: string): CaseSessionView | Promise<CaseSessionView>;
  read(id: string): CaseResult | Promise<CaseResult>;
  decide(id: string, input: CaseDecisionInput): CaseResult | Promise<CaseResult>;
}
interface ApiBindings { store: SessionStore; cases: CaseStore; frontendOrigin: string }

async function boundedJson(request: Request): Promise<unknown> {
  if (request.headers.get("content-type")?.split(";")[0].trim().toLowerCase() !== "application/json") {
    throw new InputError("json_required");
  }
  if (Number(request.headers.get("content-length")) > MAX_BODY_BYTES) throw new InputError("body_too_large", 413);
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
      if (bytes > MAX_BODY_BYTES) {
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

const app = new Hono<{ Bindings: ApiBindings }>();

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
    c.header("Access-Control-Allow-Headers", "Content-Type");
    return c.body(null, 204);
  }
  await next();
});

app.get("/health", (c) => c.json({ status: "ok", service: "twinaml-api" }));

app.post("/api/sessions", async (c) => {
  const id = crypto.randomUUID();
  return c.json(await c.env.store.create(id), 201);
});

for (const path of ["/api/sessions/:id", "/api/sessions/:id/*", "/api/case-sessions/:id", "/api/case-sessions/:id/*"]) {
  app.use(path, async (c, next) => {
    if (!SESSION_ID.test(c.req.param("id") ?? "")) return c.json({ error: "invalid_session_id" }, 400);
    await next();
  });
}

app.get("/api/sessions/:id", async (c) => {
  const result = await c.env.store.read(c.req.param("id"));
  return "view" in result ? c.json(result.view) : c.json({ error: result.error }, result.status);
});

app.post("/api/sessions/:id/actions", async (c) => {
  const input = parseAction(await boundedJson(c.req.raw));
  const result = await c.env.store.action(c.req.param("id"), input);
  return "view" in result ? c.json(result.view) : c.json({ error: result.error }, result.status);
});

app.get("/api/cases", (c) => c.json(caseLibraryView()));

app.post("/api/case-sessions", async (c) => {
  const caseId = parseCaseStart(await boundedJson(c.req.raw));
  return c.json(await c.env.cases.create(crypto.randomUUID(), caseId), 201);
});

app.get("/api/case-sessions/:id", async (c) => {
  const result = await c.env.cases.read(c.req.param("id"));
  return "view" in result ? c.json(result.view) : c.json({ error: result.error }, result.status);
});

app.post("/api/case-sessions/:id/decisions", async (c) => {
  const input = parseCaseDecision(await boundedJson(c.req.raw));
  const result = await c.env.cases.decide(c.req.param("id"), input);
  return "view" in result ? c.json(result.view) : c.json({ error: result.error }, result.status);
});

app.onError((error, c) => {
  if (error instanceof InputError) return c.json({ error: error.message }, error.status);
  console.error(JSON.stringify({ event: "api_error", path: c.req.path, error: error.name }));
  return c.json({ error: "internal_error" }, 500);
});
app.notFound((c) => c.json({ error: "not_found" }, 404));

export default app;
