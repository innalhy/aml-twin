import assert from "node:assert/strict";
import { once } from "node:events";
import { request } from "node:http";
import { mkdtemp, readFile, rm, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { test } from "node:test";
import { createNodeServer } from "../dist/server.mjs";

const temporary = await mkdtemp(resolve(tmpdir(), "twinaml-node-test-"));
const dbPath = resolve(temporary, "sessions.sqlite");
let server;
let base;
async function start() {
  server = createNodeServer(dbPath);
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  base = `http://127.0.0.1:${server.address().port}`;
}
async function close() { await new Promise((done, reject) => server.close((error) => error ? reject(error) : done())); }
function rawPath(path) {
  return new Promise((done, reject) => {
    const req = request(base, { path }, (res) => { res.resume(); res.on("end", () => done(res.statusCode)); });
    req.on("error", reject);
    req.end();
  });
}

try {
  await start();
  await test("SQLite preserves the exact session after closing and reopening the server", async () => {
    const initial = await (await fetch(`${base}/api/sessions`, { method: "POST" })).json();
    const response = await fetch(`${base}/api/sessions/${initial.id}/actions`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "hold", revision: initial.revision, customerId: "SYN-001", reason: "Persist this decision" }),
    });
    assert.equal(response.status, 200);
    const changed = await response.json();
    await close();
    await start();
    assert.deepEqual(await (await fetch(`${base}/api/sessions/${initial.id}`)).json(), changed);
  });

  await test("static routing cannot read source, databases, traversal paths, or malformed URLs", async () => {
    for (const path of ["/workers/api/src/investigation-pack.json", "/data/local/investigation.sqlite", "/api/unknown", "/assets/missing.js"]) {
      assert.equal(await rawPath(path), 404, path);
    }
    for (const path of ["/..%2fpackage.json", "/api/%2e%2e%2fworkers/api/src/investigation-pack.json", "/%E0%A4%A", "/%00"]) {
      assert.equal(await rawPath(path), 400, path);
    }
  });

  await test("chunked bodies enforce the same16KiB bound without losing the error response", async () => {
    const initial = await (await fetch(`${base}/api/sessions`, { method: "POST" })).json();
    const body = new ReadableStream({ start(controller) { controller.enqueue(new TextEncoder().encode("x".repeat(17000))); controller.close(); } });
    const response = await fetch(`${base}/api/sessions/${initial.id}/actions`, {
      method: "POST", headers: { "Content-Type": "application/json" }, body, duplex: "half",
    });
    assert.equal(response.status, 413);
    assert.deepEqual(await response.json(), { error: "body_too_large" });
  });

  const staticDir = fileURLToPath(new URL("../../../frontend/dist/", import.meta.url));
  let built = false;
  try { await readFile(resolve(staticDir, "index.html")); built = true; } catch {}
  await test("built frontend serves HTML and blocks symlinks outside its output folder", { skip: !built }, async () => {
    assert.equal((await fetch(`${base}/`)).headers.get("content-type"), "text/html; charset=utf-8");
    assert.equal((await fetch(`${base}/investigation`)).status, 200);
    const outside = resolve(temporary, "private.json");
    const link = resolve(staticDir, "__twinaml_test_escape.json");
    await writeFile(outside, "unreleased content");
    await symlink(outside, link);
    try { assert.equal(await rawPath("/__twinaml_test_escape.json"), 400); }
    finally { await rm(link); }
  });
} finally {
  if (server.listening) await close();
  await rm(temporary, { recursive: true, force: true });
}
