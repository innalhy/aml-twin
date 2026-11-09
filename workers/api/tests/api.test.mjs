import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";

const base = process.env.TWINAML_TEST_API_URL ?? "http://127.0.0.1:8787";
let checks = 0;
let token;
async function request(path, options = {}) {
  const headers = new Headers(options.headers);
  if (token) headers.set("Authorization", `Bearer ${token}`);
  const response = await fetch(`${base}${path}`, { ...options, headers });
  const body = await response.json();
  return { status: response.status, body, headers: response.headers };
}
async function create() {
  const result = await request("/api/sessions", { method: "POST" });
  assert.equal(result.status, 201);
  assert.equal(result.body.minute, 0);
  assert.equal(result.body.evidence.length, 12);
  checks++;
  return result.body;
}
async function act(view, action) {
  const result = await request(`/api/sessions/${view.id}/actions`, {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ...action, revision: view.revision }),
  });
  assert.equal(result.status, 200, JSON.stringify(result.body));
  return result.body;
}
const balance = (view, id) => view.runAccounts.find((row) => row.customerId === id).balance;

const health = await request("/health");
assert.deepEqual(health.body, { status: "ok", service: "twinaml-api" });
assert.equal(health.headers.get("cache-control"), "no-store");
checks++;

if ((await request("/api/account")).body.enabled) {
  token = process.env.TWINAML_TEST_CLERK_TOKEN;
  assert(token, "Account-enabled API checks require TWINAML_TEST_CLERK_TOKEN from a dedicated Clerk test user.");
  assert.equal((await request("/api/account")).status, 200);
}

assert.equal((await request(`/api/sessions/${randomUUID()}`)).status, 404);
assert.equal((await request("/api/sessions/not-a-session")).status, 400);
checks++;

let view = await create();
const initial = JSON.stringify(view);
assert(!initial.includes("instructor_path"));
assert(!initial.includes("answer-key"));
assert(!view.evidence.some((row) => row.id === "EV-007"));
assert(!initial.includes("Payer and invoice verification response"));
checks++;

let result = await request(`/api/sessions/${view.id}/actions`, {
  method: "POST", headers: { "Content-Type": "application/json" }, body: "{",
});
assert.equal(result.status, 400);
result = await request(`/api/sessions/${view.id}/actions`, {
  method: "POST", headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ type: "hold", revision: 0, customerId: "SYN-001", reason: "x".repeat(17000) }),
});
assert.equal(result.status, 413);
result = await request(`/api/sessions/${view.id}/actions`, {
  method: "POST", headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ type: "advance", mode: "work", minutes: -1, revision: 0 }),
});
assert.equal(result.status, 400);
assert.equal((await request(`/api/sessions/${view.id}`)).body.revision, 0);
checks++;

const action = { type: "hold", customerId: "SYN-001", reason: "Identity remains unverified", revision: view.revision };
const concurrent = await Promise.all([0, 1].map(() => request(`/api/sessions/${view.id}/actions`, {
  method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(action),
})));
assert.deepEqual(concurrent.map((item) => item.status).sort(), [200, 409]);
view = (await request(`/api/sessions/${view.id}`)).body;
assert.equal(view.events.filter((row) => row.type === "hold_placed").length, 1);
assert.equal(view.runAccounts.find((row) => row.customerId === "SYN-002").held, false);
checks++;

view = await act(view, { type: "request", customerId: "SYN-001", requestId: "verify_payer" });
assert.equal(view.events.at(-1).type, "request_rejected");
view = await act(view, { type: "request", customerId: "SYN-001", requestId: "request_supporting_documents" });
view = await act(view, { type: "advance", mode: "next" });
assert.equal(view.minute, 8);
assert(view.evidence.some((row) => row.id === "EV-006"));
view = await act(view, { type: "request", customerId: "SYN-001", requestId: "verify_payer" });
view = await act(view, { type: "advance", mode: "work", minutes: 12 });
assert.equal(view.minute, 20);
assert(!view.evidence.some((row) => row.id === "EV-007"));
view = await act(view, { type: "decision", customerId: "SYN-001", disposition: "escalation", evidenceIds: ["EV-007"], note: "Unavailable citation" });
assert.equal(view.events.at(-1).type, "decision_rejected");
assert.equal(view.decisions.length, 0);
view = await act(view, { type: "advance", mode: "work", minutes: 8 });
assert.equal(view.minute, 28);
assert(view.evidence.some((row) => row.id === "EV-007"));
view = await act(view, { type: "decision", customerId: "SYN-001", disposition: "escalation", evidenceIds: ["EV-003", "EV-007"], note: "The independent check did not confirm the invoice authority." });
assert.equal(view.decisions.length, 1);
assert.equal(balance(view, "SYN-001"), 480000);
assert.equal(balance(view, "SYN-002"), 10000);
checks++;

view = await act(view, { type: "release", customerId: "SYN-001", reason: "Demonstrate overdue-payment consequences" });
assert.equal(balance(view, "SYN-001"), 10000);
assert.equal(view.orders.filter((row) => row.customerId === "SYN-001" && row.status === "executed").length, 2);
view = await act(view, { type: "finish" });
assert.equal(view.ended, true);
assert.equal(view.minute, 30);
assert(view.debrief && Array.isArray(view.debrief.warnings));
assert.deepEqual((await request(`/api/sessions/${view.id}`)).body, view);
const blocked = await request(`/api/sessions/${view.id}/actions`, {
  method: "POST", headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ type: "hold", revision: view.revision, customerId: "SYN-001", reason: "After run end" }),
});
assert.equal(blocked.status, 409);
checks++;

const other = await create();
assert.notEqual(other.id, view.id);
assert.equal(other.decisions.length, 0);
assert.equal(balance(other, "SYN-001"), 480000);
assert.equal((await request(`/api/sessions/${view.id}`)).body.ended, true);
checks++;

const cors = await request("/health", { headers: { Origin: "http://127.0.0.1:5173" } });
assert.equal(cors.headers.get("access-control-allow-origin"), "http://127.0.0.1:5173");
assert.equal((await request("/api/sessions", { method: "POST", headers: { Origin: "https://untrusted.example" } })).status, 403);
checks++;

const cases = await request("/api/cases");
assert.equal(cases.status, 200);
assert.equal(cases.body.workflows.length, 11);
assert.doesNotMatch(JSON.stringify(cases.body), /"rationale"/);
checks++;

const postJson = (path, body) => request(path, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
assert.equal((await postJson("/api/case-sessions", { caseId: "not-a-case" })).status, 400);
let run = (await postJson("/api/case-sessions", { caseId: "mule-rent-001" })).body;
assert.equal(run.caseId, "mule-rent-001");
assert.equal(run.debrief, null);
const invalidChoice = await postJson(`/api/case-sessions/${run.id}/decisions`, { revision: run.revision, choiceId: "not-on-this-node" });
assert.equal(invalidChoice.status, 400);
assert.equal(invalidChoice.body.error, "invalid_choice");
assert.equal((await request(`/api/case-sessions/${run.id}`)).body.revision, run.revision);
assert.equal((await postJson(`/api/case-sessions/${run.id}/decisions`, { revision: run.revision + 1, choiceId: "interview" })).status, 409);
for (const choiceId of ["interview", "exit_and_str"]) {
  const step = await postJson(`/api/case-sessions/${run.id}/decisions`, { revision: run.revision, choiceId });
  assert.equal(step.status, 200, JSON.stringify(step.body));
  run = step.body;
}
assert.equal(run.debrief.disposition, "str_drafted");
assert.equal(run.debrief.rating, "acceptable");
assert.deepEqual((await request(`/api/case-sessions/${run.id}`)).body.events, run.events);
assert.equal((await request(`/api/case-sessions/${randomUUID()}`)).status, 404);
checks++;

console.log(`Passed ${checks} HTTP integration checks against ${base}.`);
