import assert from "node:assert/strict";
import { once } from "node:events";
import { existsSync } from "node:fs";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import { DatabaseSync } from "node:sqlite";
import { test } from "node:test";
import { createNodeServer } from "../dist/server.mjs";

const temporary = await mkdtemp(resolve(tmpdir(), "twinaml-dev-mode-"));
const variables = ["NODE_ENV", "TWINAML_DEV_MODE", "CLERK_ISSUER", "CLERK_SECRET_KEY", "CLERK_JWT_KEY"];
const previous = Object.fromEntries(variables.map((key) => [key, process.env[key]]));
function configure(mode, nodeEnv = "development") {
  for (const key of variables) delete process.env[key];
  if (mode !== undefined) process.env.TWINAML_DEV_MODE = mode;
  if (nodeEnv !== undefined) process.env.NODE_ENV = nodeEnv;
}
async function serverAt(path) {
  const server = createNodeServer(path);
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  const base = `http://127.0.0.1:${server.address().port}`;
  return {
    request: async (route, body) => {
      const response = await fetch(`${base}${route}`, body === undefined ? {} : { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      return { status: response.status, body: await response.json() };
    },
    close: () => new Promise((done, reject) => server.close((error) => error ? reject(error) : done())),
  };
}

try {
  await test("missing Clerk configuration remains fail-closed unless anonymous mode is explicitly enabled", async () => {
    configure(undefined);
    const app = await serverAt(resolve(temporary, "default.sqlite"));
    try {
      assert.deepEqual((await app.request("/api/account")).body, { enabled: true, configured: false, user: null });
      const denied = await app.request("/api/aml-sessions", {});
      assert.equal(denied.status, 503);
      assert.equal(denied.body.error, "accounts_not_configured");
    } finally { await app.close(); }
  });

  await test("explicit development mode opens anonymous runs and retains them after restart", async () => {
    configure("1");
    const path = resolve(temporary, "development.sqlite");
    let app = await serverAt(path);
    let saved;
    try {
      assert.deepEqual((await app.request("/api/account")).body, { enabled: false, configured: false, user: null });
      assert.equal((await app.request("/api/account/runs")).status, 503);
      const created = await app.request("/api/aml-sessions", {});
      assert.equal(created.status, 201);
      assert.equal(created.body.alerts.length, 3);
      const changed = await app.request(`/api/aml-sessions/${created.body.id}/actions`, { type: "claim_alert", alertId: created.body.alerts[0].id, revision: created.body.revision });
      assert.equal(changed.status, 200);
      saved = changed.body;
      assert.deepEqual((await app.request(`/api/aml-sessions/${saved.id}`)).body, saved);
    } finally { await app.close(); }
    app = await serverAt(path);
    try { assert.deepEqual((await app.request(`/api/aml-sessions/${saved.id}`)).body, saved); }
    finally { await app.close(); }
    const db = new DatabaseSync(path);
    try { assert.equal(db.prepare("SELECT COUNT(*) AS count FROM run_owners").get().count, 0); }
    finally { db.close(); }
  });

  await test("anonymous mode refuses non-development environments before creating a database", () => {
    for (const environment of ["production", "test", ""]) {
      configure("1", environment);
      const path = resolve(temporary, `denied-${environment || "unset"}.sqlite`);
      assert.throws(() => createNodeServer(path), /requires NODE_ENV=development/);
      assert.equal(existsSync(path), false);
    }
  });

  await test("anonymous mode refuses account-owned data and leaves it intact", () => {
    const path = resolve(temporary, "owned.sqlite");
    let db = new DatabaseSync(path);
    db.exec("CREATE TABLE run_owners (kind TEXT NOT NULL, id TEXT NOT NULL, user_id TEXT NOT NULL); INSERT INTO run_owners VALUES ('aml', 'protected-run', 'user_owner')");
    db.close();
    configure("1");
    assert.throws(() => createNodeServer(path), /database without account-owned runs/);
    db = new DatabaseSync(path);
    try {
      assert.deepEqual({ ...db.prepare("SELECT * FROM run_owners").get() }, { kind: "aml", id: "protected-run", user_id: "user_owner" });
      assert.equal(db.prepare("SELECT COUNT(*) AS count FROM sqlite_master WHERE name = 'aml_sessions'").get().count, 0);
    } finally { db.close(); }
  });
} finally {
  for (const key of variables) {
    if (previous[key] === undefined) delete process.env[key];
    else process.env[key] = previous[key];
  }
  await rm(temporary, { recursive: true, force: true });
}
