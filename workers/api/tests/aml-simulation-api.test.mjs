import assert from "node:assert/strict";
import { once } from "node:events";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import { test } from "node:test";
import { createNodeServer } from "../dist/server.mjs";
import { configureClerk, sessionToken } from "./clerk-fixture.mjs";

configureClerk();
const directory = await mkdtemp(resolve(tmpdir(), "twinaml-simulation-http-"));
const database = resolve(directory, "simulation.sqlite");
const token = sessionToken("user_simulation_owner");
const stranger = sessionToken("user_simulation_other");
let server;
let origin;
async function start() {
  server = createNodeServer(database); server.listen(0, "127.0.0.1");
  await once(server, "listening"); origin = `http://127.0.0.1:${server.address().port}`;
}
async function stop() { await new Promise((done) => server.close(done)); }
async function request(path, body, identity = token) {
  const headers = { ...(identity ? { Authorization: `Bearer ${identity}` } : {}), ...(body !== undefined ? { "Content-Type": "application/json" } : {}) };
  const response = await fetch(`${origin}${path}`, { headers, ...(body !== undefined ? { method: "POST", body: JSON.stringify(body) } : {}) });
  return { status: response.status, body: await response.json() };
}
async function action(view, input) {
  const result = await request(`/api/aml-sessions/${view.id}/actions`, { revision: view.revision, ...input });
  assert.equal(result.status, 200, JSON.stringify(result.body)); return result.body;
}
const reason = "The visible account pattern warrants a proportionate temporary review while independent supporting records are checked.";
function noHiddenState(view) {
  assert.equal(view.simulation.debrief, null);
  const serialized = JSON.stringify(view);
  for (const field of ["\"variant\"", "\"context\"", "\"openingBalanceHkd\"", "\"privateEvidence\""]) assert(!serialized.includes(field), `leaked ${field}`);
  assert.equal(view.simulation.validationStatus, "unvalidated");
}

try {
  await start();
  await test("simulation creation enforces accounts and server-side scenario assignment", async () => {
    assert.equal((await request("/api/aml-simulations", {}, null)).status, 401);
    assert.equal((await request("/api/aml-simulations", { variant: "legitimate" })).status, 400);
    const created = await request("/api/aml-simulations", {});
    assert.equal(created.status, 201, JSON.stringify(created.body));
    const view = created.body;
    assert.equal(view.simulation.elapsedMinutes, 0); assert.equal(view.simulation.held, false); noHiddenState(view);
    assert.equal((await request(`/api/aml-sessions/${view.id}`, undefined, stranger)).status, 404);
    assert.equal((await request(`/api/aml-sessions/${view.id}/actions`, { type: "simulation_finish", revision: view.revision }, stranger)).status, 404);
    const runs = (await request("/api/account/runs")).body.runs;
    assert.equal(runs.find((run) => run.id === view.id).route, "/simulation");
    const forbidden = await request(`/api/aml-sessions/${view.id}/actions`, { type: "switch_role", role: "administrator", revision: view.revision });
    assert([400, 409].includes(forbidden.status));
    assert.deepEqual((await request(`/api/aml-sessions/${view.id}`)).body, view);
    assert.equal((await request("/health")).body.status, "ok");
  });

  await test("timed evidence and approved account controls persist through SQLite restart", async () => {
    let view = (await request("/api/aml-simulations", {})).body;
    const evidence = view.simulation.evidence[0].id;
    const check = view.simulation.requests.find((item) => item.status === "available");
    const initialEvidence = view.simulation.evidence.map((item) => item.id);
    const revision = view.revision;
    view = await action(view, { type: "simulation_request", requestId: check.id });
    assert.deepEqual(view.simulation.evidence.map((item) => item.id), initialEvidence);
    assert.equal(view.simulation.requests.find((item) => item.id === check.id).status, "pending");
    assert.equal((await request(`/api/aml-sessions/${view.id}/actions`, { type: "simulation_finish", revision })).status, 409);
    noHiddenState(view);
    const path = `/api/aml-sessions/${view.id}/actions`;
    const rejected = await request(path, { type: "simulation_recommend_control", control: "hold", reason, evidenceIds: ["UNRELEASED"], revision: view.revision });
    assert([400, 409].includes(rejected.status));
    view = await action(view, { type: "simulation_recommend_control", control: "hold", reason, evidenceIds: [evidence] });
    assert.equal(view.simulation.held, false, "recommendation is not implementation");
    const controlId = view.simulation.controls.at(-1).id;
    assert.equal((await request(path, { type: "simulation_review_control", controlId, decision: "approve", reason, revision: view.revision })).status, 409);
    view = await action(view, { type: "switch_role", role: "reviewer" });
    view = await action(view, { type: "simulation_review_control", controlId, decision: "approve", reason });
    assert.equal(view.simulation.held, false, "approval still awaits the operational delay");
    view = await action(view, { type: "simulation_advance", mode: "work", minutes: 1 });
    view = await action(view, { type: "simulation_advance", mode: "work", minutes: 1 });
    assert.equal(view.simulation.held, true);
    const saved = structuredClone(view);
    await stop(); await start();
    assert.deepEqual((await request(`/api/aml-sessions/${view.id}`)).body, saved);
    view = await action(view, { type: "simulation_advance", mode: "next" });
    assert(view.simulation.evidence.length > initialEvidence.length);
    noHiddenState(view);
    view = await action(view, { type: "switch_role", role: "analyst" });
    view = await action(view, { type: "simulation_submit_decision", disposition: "continue_review", reason, evidenceIds: [evidence], alternativeExplanation: "The funds may be a documented supplier collection arrangement.", missingInformation: "Independent recipient confirmation and the source of funds remain material." });
    const assessment = view.simulation.decisions.at(-1);
    assert(assessment.availableEvidenceIds.includes(evidence));
    assert.equal(view.simulation.ended, false, "an EDD recommendation does not end the world");
    view = await action(view, { type: "switch_role", role: "reviewer" });
    view = await action(view, { type: "simulation_review_decision", decisionId: assessment.id, decision: "return", reason: "Check the independent source response and explain the remaining uncertainty before concluding.", rubric: { evidence: 2, alternatives: 3, proportionality: 2, documentation: 3 } });
    assert.equal(view.simulation.reviews.at(-1).decision, "return");
    view = await action(view, { type: "simulation_finish" });
    assert.equal(view.simulation.ended, true); assert(view.simulation.debrief);
    assert(view.simulation.payments.some((payment) => payment.status === "held"));
    assert.equal(view.simulation.validationStatus, "unvalidated");
    assert.equal((await request(path, { type: "simulation_advance", mode: "work", minutes: 1, revision: view.revision })).status, 409);
  });
} finally {
  if (server?.listening) await stop();
  await rm(directory, { recursive: true, force: true });
}
