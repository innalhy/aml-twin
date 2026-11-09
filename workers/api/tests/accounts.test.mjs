import assert from "node:assert/strict";
import { once } from "node:events";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import { DatabaseSync } from "node:sqlite";
import { test } from "node:test";
import { createNodeServer } from "../dist/server.mjs";
import { configureClerk, issuer, sessionToken } from "./clerk-fixture.mjs";

configureClerk();
const temporary = await mkdtemp(resolve(tmpdir(), "twinaml-accounts-"));
const dbPath = resolve(temporary, "sessions.sqlite");
const aliceToken = sessionToken("user_alice");
const bobToken = sessionToken("user_bob");
let server;
let base;
let alice;
let saved;

async function start() {
  server = createNodeServer(dbPath);
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  base = `http://127.0.0.1:${server.address().port}`;
}
async function close() {
  await new Promise((done, reject) => server.close((error) => error ? reject(error) : done()));
}
async function request(path, { token, body, ...options } = {}) {
  const headers = new Headers(options.headers);
  if (token) headers.set("Authorization", `Bearer ${token}`);
  if (body !== undefined) headers.set("Content-Type", "application/json");
  const response = await fetch(`${base}${path}`, {
    ...options, headers,
    ...(body !== undefined ? { method: "POST", body: JSON.stringify(body) } : {}),
  });
  return { status: response.status, headers: response.headers, body: await response.json() };
}
const mutation = (run) => run.kind === "aml"
  ? { type: "switch_role", role: "reviewer", revision: run.view.revision }
  : run.kind === "investigation"
    ? { type: "hold", customerId: "SYN-001", reason: "Retain progress with my account", revision: run.view.revision }
    : { choiceId: "interview", revision: run.view.revision };
const route = (kind) => kind === "aml" ? "/api/aml-sessions" : kind === "investigation" ? "/api/sessions" : "/api/case-sessions";
const actionRoute = (run) => `${route(run.kind)}/${run.view.id}/${run.kind === "case" ? "decisions" : "actions"}`;

try {
  await start();
  await test("Clerk identity is required for new runs and provisioned from a verified session token", async () => {
    assert.deepEqual((await request("/api/account")).body, { enabled: true, configured: true, user: null });
    for (const path of ["/api/sessions", "/api/aml-sessions", "/api/case-sessions"]) {
      assert.equal((await request(path, { body: path.includes("case-") ? { caseId: "mule-rent-001" } : {} })).status, 401);
    }
    assert.equal((await request("/api/account/runs")).status, 401);
    const account = await request("/api/account", { token: aliceToken });
    assert.equal(account.status, 200, JSON.stringify(account.body));
    assert.equal(account.body.enabled, true);
    assert.equal(account.body.configured, true);
    alice = account.body.user;
    assert.equal(alice.id, "user_alice");
    assert.equal(alice.email, "alice@example.test");
    assert.equal(typeof alice.createdAt, "string");
    assert.deepEqual(Object.keys(alice).sort(), ["createdAt", "email", "id"]);
    assert.equal(account.headers.get("cache-control"), "no-store");
    assert.equal(account.headers.get("set-cookie"), null);
    const bob = await request("/api/account", { token: bobToken });
    assert.equal(bob.body.user.id, "user_bob");
    assert.deepEqual((await request("/api/account/runs", { token: bobToken })).body, { runs: [] });
  });

  await test("invalid, expired, wrong-party, wrong-issuer and pending tokens never grant an account", async () => {
    const now = Math.floor(Date.now() / 1000);
    const tokens = [
      "invalid-token",
      sessionToken("user_alice", { exp: now - 3600 }),
      sessionToken("user_alice", { nbf: now + 3600 }),
      sessionToken("user_alice", { iss: "https://attacker.example" }),
      sessionToken("user_alice", { azp: "https://untrusted.example" }),
      sessionToken("user_alice", { azp: undefined }),
      sessionToken("user_alice", { sid: undefined }),
      sessionToken("user_alice", { sid: "not-a-session" }),
      sessionToken("mch_machine", { sid: "sess_machine" }),
      sessionToken("user_alice", { sts: "pending" }),
    ];
    const parts = aliceToken.split(".");
    const tamperedPayload = Buffer.from(JSON.stringify({ ...JSON.parse(Buffer.from(parts[1], "base64url")), sub: "user_attacker" })).toString("base64url");
    tokens.push(`${parts[0]}.${tamperedPayload}.${parts[2]}`);
    for (const token of tokens) {
      const result = await request("/api/account/runs", { token });
      assert.equal(result.status, 401, JSON.stringify(result.body));
      assert.equal((await request("/api/aml-sessions", { token, body: {} })).status, 401);
    }
    assert.equal((await request("/api/account/runs", { headers: { Authorization: aliceToken } })).status, 401);
    assert.equal((await request("/api/account", { token: aliceToken })).body.user.id, alice.id);
  });

  await test("each training area saves to its owner and rejects other users and guests", async () => {
    saved = [];
    for (const kind of ["aml", "investigation", "case"]) {
      const created = await request(route(kind), { token: aliceToken, body: kind === "case" ? { caseId: "mule-rent-001" } : {} });
      assert.equal(created.status, 201, JSON.stringify(created.body));
      const run = { kind, view: created.body };
      const changed = await request(actionRoute(run), { token: aliceToken, body: mutation(run) });
      assert.equal(changed.status, 200, JSON.stringify(changed.body));
      assert.equal(changed.body.revision, run.view.revision + 1);
      run.view = changed.body;
      saved.push(run);
      for (const token of [undefined, bobToken, "invalid-token"]) {
        const read = await request(`${route(kind)}/${run.view.id}`, { token });
        assert.equal(read.status, token === "invalid-token" ? 401 : 404, `${kind}: another user must not read a saved run`);
        const denied = await request(actionRoute(run), { token, body: mutation(run) });
        assert.equal(denied.status, token === "invalid-token" ? 401 : 404, `${kind}: another user must not mutate a saved run`);
      }
      assert.deepEqual((await request(`${route(kind)}/${run.view.id}`, { token: aliceToken })).body, run.view);
    }
    const progress = (await request("/api/account/runs", { token: aliceToken })).body.runs;
    assert.equal(progress.length, 3);
    assert.deepEqual(progress.map((run) => run.kind).sort(), ["aml", "case", "investigation"]);
    for (const run of progress) {
      assert(saved.some((item) => item.kind === run.kind && item.view.id === run.id));
      assert.equal(typeof run.title, "string");
      assert(run.progress.length > 0);
      assert(!Number.isNaN(Date.parse(run.createdAt)));
      assert(Date.parse(run.updatedAt) >= Date.parse(run.createdAt));
      assert(!("snapshot" in run));
    }
    assert.deepEqual(progress.map((run) => run.updatedAt), progress.map((run) => run.updatedAt).sort().reverse());
    assert.deepEqual((await request("/api/account/runs", { token: bobToken })).body, { runs: [] });
  });

  await test("accounts, ownership and exact progress survive restart and a fresh Clerk session", async () => {
    await close();
    const db = new DatabaseSync(dbPath);
    try {
      const users = db.prepare("SELECT * FROM users").all();
      assert.equal(users.length, 2);
      assert.deepEqual(users.map((user) => user.id).sort(), ["user_alice", "user_bob"]);
      const owners = db.prepare("SELECT * FROM run_owners").all();
      assert.equal(owners.length, 3);
      assert(owners.every((owner) => owner.user_id === "user_alice"));
      const tables = db.prepare("SELECT name FROM sqlite_master WHERE type = 'table'").all().map((row) => row.name);
      assert(!tables.includes("auth_sessions"));
      assert(!tables.includes("auth_attempts"));
      assert(!JSON.stringify(users).includes(aliceToken));
    } finally { db.close(); }
    await start();
    const fresh = sessionToken("user_alice", { sid: "sess_fresh_login" });
    assert.deepEqual((await request("/api/account", { token: fresh })).body.user, alice);
    for (const run of saved) assert.deepEqual((await request(`${route(run.kind)}/${run.view.id}`, { token: fresh })).body, run.view);
    assert.equal((await request("/api/account/runs", { token: fresh })).body.runs.length, 3);
    assert.equal((await request("/api/account")).body.user, null);
  });

  await test("a legacy run is preserved and becomes private only after its explicit owner claim", async () => {
    const created = await request("/api/aml-sessions", { token: aliceToken, body: {} });
    assert.equal(created.status, 201);
    const legacy = created.body;
    await close();
    const db = new DatabaseSync(dbPath);
    try { db.prepare("DELETE FROM run_owners WHERE kind = ? AND id = ?").run("aml", legacy.id); }
    finally { db.close(); }
    await start();
    assert.deepEqual((await request(`/api/aml-sessions/${legacy.id}`)).body, legacy);
    assert(!(await request("/api/account/runs", { token: aliceToken })).body.runs.some((run) => run.id === legacy.id));
    const claim = { kind: "aml", id: legacy.id };
    assert.equal((await request("/api/account/claim", { body: claim })).status, 401);
    assert.equal((await request("/api/account/claim", { token: aliceToken, body: { kind: "unknown", id: legacy.id } })).status, 400);
    assert.equal((await request("/api/account/claim", { token: aliceToken, body: { kind: "aml", id: "invalid" } })).status, 400);
    assert.equal((await request("/api/account/claim", { token: aliceToken, body: { kind: "case", id: legacy.id } })).status, 404);
    const claimed = await request("/api/account/claim", { token: aliceToken, body: claim });
    assert.equal(claimed.status, 200, JSON.stringify(claimed.body));
    assert.equal(claimed.body.run.id, legacy.id);
    assert.equal(claimed.body.run.kind, "aml");
    assert.deepEqual((await request(`/api/aml-sessions/${legacy.id}`, { token: aliceToken })).body, legacy);
    assert.equal((await request(`/api/aml-sessions/${legacy.id}`)).status, 404);
    assert.equal((await request("/api/account/claim", { token: bobToken, body: claim })).status, 404);
    assert(!(await request("/api/account/runs", { token: bobToken })).body.runs.some((run) => run.id === legacy.id));
    assert.equal((await request("/api/account/claim", { token: aliceToken, body: { ...claim, injected: "x".repeat(17000) } })).status, 413);
  });

  await test("browser origin checks and CORS include Clerk Authorization headers", async () => {
    const rejected = await request("/api/aml-sessions", { token: aliceToken, body: {}, headers: { Origin: "https://untrusted.example" } });
    assert.equal(rejected.status, 403);
    const allowed = await request("/api/account", { token: aliceToken, headers: { Origin: "http://127.0.0.1:5173" } });
    assert.equal(allowed.status, 200);
    assert.equal(allowed.headers.get("access-control-allow-origin"), "http://127.0.0.1:5173");
    const preflight = await fetch(`${base}/api/account/runs`, { method: "OPTIONS", headers: { Origin: "http://127.0.0.1:5173", "Access-Control-Request-Method": "GET", "Access-Control-Request-Headers": "Authorization" } });
    assert.equal(preflight.status, 204);
    assert.match(preflight.headers.get("access-control-allow-headers"), /Authorization/i);
  });

  await test("an incompatible saved run remains listed without hiding compatible progress", async () => {
    const created = await request("/api/aml-sessions", { token: aliceToken, body: {} });
    assert.equal(created.status, 201);
    await close();
    const db = new DatabaseSync(dbPath);
    try {
      const row = db.prepare("SELECT snapshot FROM aml_sessions WHERE id = ?").get(created.body.id);
      const snapshot = JSON.parse(row.snapshot);
      snapshot.version = -1;
      db.prepare("UPDATE aml_sessions SET snapshot = ? WHERE id = ?").run(JSON.stringify(snapshot), created.body.id);
    } finally { db.close(); }
    await start();
    const progress = await request("/api/account/runs", { token: aliceToken });
    assert.equal(progress.status, 200);
    const incompatible = progress.body.runs.find((run) => run.id === created.body.id);
    assert(incompatible);
    assert.equal(typeof incompatible.progress, "string");
    assert.equal((await request(`/api/aml-sessions/${created.body.id}`, { token: aliceToken })).status, 409);
    for (const run of saved) assert.deepEqual((await request(`${route(run.kind)}/${run.view.id}`, { token: aliceToken })).body, run.view);
  });

  await test("missing Clerk server credentials fail closed without blocking health", async () => {
    await close();
    delete process.env.CLERK_JWT_KEY;
    delete process.env.CLERK_SECRET_KEY;
    process.env.CLERK_ISSUER = issuer;
    await start();
    assert.equal((await request("/health")).status, 200);
    assert.deepEqual((await request("/api/account")).body, { enabled: true, configured: false, user: null });
    assert.equal((await request("/api/aml-sessions", { token: aliceToken, body: {} })).status, 503);
    await close();
    configureClerk();
    await start();
    assert.deepEqual((await request("/api/account", { token: aliceToken })).body.user, alice);
    for (const run of saved) assert.deepEqual((await request(`${route(run.kind)}/${run.view.id}`, { token: aliceToken })).body, run.view);
  });
} finally {
  if (server?.listening) await close();
  await rm(temporary, { recursive: true, force: true });
}
