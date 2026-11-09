import assert from "node:assert/strict";
import { once } from "node:events";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import { test } from "node:test";
import { createNodeServer } from "../dist/server.mjs";
import { configureClerk, sessionToken } from "./clerk-fixture.mjs";

configureClerk();

const temporary = await mkdtemp(resolve(tmpdir(), "twinaml-aml-http-"));
const dbPath = resolve(temporary, "sessions.sqlite");
let server;
let base;
const token = sessionToken("user_aml_tests");
async function start() {
  server = createNodeServer(dbPath);
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  base = `http://127.0.0.1:${server.address().port}`;
}
async function close() { await new Promise((done, reject) => server.close((error) => error ? reject(error) : done())); }
async function request(path, options = {}) {
  const headers = new Headers(options.headers);
  headers.set("Authorization", `Bearer ${token}`);
  const response = await fetch(`${base}${path}`, { ...options, headers });
  return { status: response.status, body: await response.json(), headers: response.headers };
}
const post = (path, body) => request(path, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
async function create() {
  const result = await request("/api/aml-sessions", { method: "POST" });
  assert.equal(result.status, 201, JSON.stringify(result.body));
  return result.body;
}
async function act(state, input) {
  const result = await post(`/api/aml-sessions/${state.id}/actions`, { revision: state.revision, ...input });
  assert.equal(result.status, 200, JSON.stringify(result.body));
  return result.body;
}

try {
  await start();
  await test("AML endpoints create an isolated generated queue without breaking health or existing exercises", async () => {
    const health = await request("/health");
    assert.equal(health.status, 200);
    assert.deepEqual(health.body, { status: "ok", service: "twinaml-api" });
    assert.equal(health.headers.get("cache-control"), "no-store");
    const first = await create();
    const second = await create();
    assert.notEqual(first.id, second.id);
    assert.equal(first.alerts.length, 3);
    assert.equal(first.runs[0].matchedAlertIds.length, 3);
    assert.equal(first.revision, 0);
    assert.deepEqual((await request(`/api/aml-sessions/${first.id}`)).body, first);
    assert.equal((await request("/api/aml-sessions/not-a-uuid")).status, 400);
    assert.equal((await request(`/api/aml-sessions/${crypto.randomUUID()}`)).status, 404);
    assert.equal((await post(`/api/aml-sessions/${crypto.randomUUID()}/actions`, { type: "run_monitoring", revision: 0 })).status, 404);
    const old = await request("/api/sessions", { method: "POST" });
    assert.equal(old.status, 201);
    assert.equal(old.body.alerts.length, 6);
    assert.equal((await request("/api/cases")).body.workflows.length, 11);
    assert.equal((await request(`/api/aml-sessions/${old.body.id}`)).status, 404);
    assert.equal((await request(`/api/sessions/${first.id}`)).status, 404);
  });

  await test("HTTP rejects forbidden roles, malformed input and oversized bodies without partial writes", async () => {
    const state = await create();
    const path = `/api/aml-sessions/${state.id}/actions`;
    assert.equal((await post(path, { type: "run_monitoring", revision: state.revision })).status, 409);
    assert.equal((await post(path, { type: "switch_role", role: "owner", revision: state.revision })).status, 400);
    assert.equal((await post(path, { type: "claim_alert", alertId: state.alerts[0].id, revision: -1 })).status, 400);
    assert.equal((await request(path, { method: "POST", headers: { "Content-Type": "application/json" }, body: "{" })).status, 400);
    assert.equal((await request(path, { method: "POST", headers: { "Content-Type": "text/plain" }, body: "{}" })).status, 400);
    assert.equal((await post(path, { type: "close_alert", alertId: state.alerts[0].id, revision: state.revision, reason: "x".repeat(17000) })).status, 400);
    assert.equal((await post(path, { type: "switch_role", role: "reviewer", revision: state.revision, injected: "x".repeat(140000) })).status, 413);
    const chunked = new ReadableStream({ start(controller) {
      controller.enqueue(new TextEncoder().encode(JSON.stringify({ type: "switch_role", role: "reviewer", revision: state.revision, injected: "x".repeat(140000) })));
      controller.close();
    } });
    assert.equal((await request(path, { method: "POST", headers: { "Content-Type": "application/json" }, body: chunked, duplex: "half" })).status, 413);
    assert.deepEqual((await request(`/api/aml-sessions/${state.id}`)).body, state);
    const rejectedOrigin = await request("/api/aml-sessions", { method: "POST", headers: { Origin: "https://untrusted.example" } });
    assert.equal(rejectedOrigin.status, 403);
    const cors = await request(`/api/aml-sessions/${state.id}`, { headers: { Origin: "http://127.0.0.1:5173" } });
    assert.equal(cors.headers.get("access-control-allow-origin"), "http://127.0.0.1:5173");
  });

  await test("valid case drafts larger than16KiB save and retain the earlier draft version", async () => {
    let state = await create();
    const alertId = state.alerts[0].id;
    state = await act(state, { type: "claim_alert", alertId });
    state = await act(state, { type: "create_case", alertId, title: "Detailed documented investigation" });
    const caseId = state.cases[0].id;
    const firstDraft = {
      type: "save_case", caseId, narrative: "First assessment. ".repeat(600).trim(), recommendation: "str",
      strDraft: {
        subjects: "Synthetic account holder and documented related counterparties. ".repeat(40).trim(),
        period: "1 November 2026, 10:00 to 10:30 HKT.",
        activity: "Observed transfers and their source references. ".repeat(100).trim(),
        suspicion: "Material contradictions remain unresolved after independent checks. ".repeat(70).trim(),
        explanation: "The customer's explanation is recorded alongside the corroboration gaps. ".repeat(65).trim(),
      },
    };
    const bytes = Buffer.byteLength(JSON.stringify({ revision: state.revision, ...firstDraft }), "utf8");
    assert(bytes > 16384 && bytes < 131072);
    state = await act(state, firstDraft);
    assert.equal(state.cases[0].narrative, firstDraft.narrative);
    assert.deepEqual(state.cases[0].strDraft, firstDraft.strDraft);
    state = await act(state, { ...firstDraft, narrative: "Revised assessment. ".repeat(550).trim() });
    const savedVersions = state.events.filter((event) => event.type === "case_draft_saved" && event.refId === caseId).map((event) => JSON.parse(event.detail));
    assert.equal(savedVersions.length, 2);
    assert.equal(savedVersions[0].narrative, firstDraft.narrative);
    assert.deepEqual(savedVersions[0].strDraft, firstDraft.strDraft);
    assert.equal(savedVersions[1].narrative, state.cases[0].narrative);
    assert.notEqual(savedVersions[0].narrative, savedVersions[1].narrative);
    assert.deepEqual((await request(`/api/aml-sessions/${state.id}`)).body, state);
  });

  await test("concurrent claims use the observed revision so exactly one action is persisted", async () => {
    const state = await create();
    const action = { type: "claim_alert", alertId: state.alerts[0].id, revision: state.revision };
    const responses = await Promise.all([post(`/api/aml-sessions/${state.id}/actions`, action), post(`/api/aml-sessions/${state.id}/actions`, action)]);
    assert.deepEqual(responses.map((r) => r.status).sort(), [200, 409]);
    const saved = (await request(`/api/aml-sessions/${state.id}`)).body;
    assert.equal(saved.revision, state.revision + 1);
    assert.equal(saved.events.filter((e) => e.type === "alert_claimed").length, 1);
  });

  await test("a generated alert becomes a reviewed STR training draft and survives a SQLite restart", async () => {
    let state = await create();
    const alert = state.alerts.find((a) => a.accountId === "HK-A001");
    state = await act(state, { type: "claim_alert", alertId: alert.id });
    state = await act(state, { type: "create_case", alertId: alert.id, title: "Review collection mandate and recipient relationships" });
    const caseId = state.cases[0].id;
    state = await act(state, { type: "add_finding", caseId, text: "The independent project contact did not corroborate collection authority. This contradicts the customer's equipment-payment explanation.", transactionIds: alert.transactionIds, evidenceIds: ["HK-EV001", "HK-EV002"] });
    state = await act(state, { type: "save_case", caseId, narrative: "The account profile is salaried employment. The project mandate and destination relationships remain unexplained after recorded checks. Escalation is supported by those contradictions, rather than by amount alone.", recommendation: "str", strDraft: {
      subjects: "Synthetic Adrian Lam, HK-A001 and the counterparties in HK-T001 to HK-T003.",
      period: "1 November 2026, 10:00 to 10:30 HKT.",
      activity: "HKD 500,000 received and HKD 490,000 paid to two recipients within 14 minutes.",
      suspicion: "No collection mandate was provided and an independently verified contact could not corroborate the authority or recipients.",
      explanation: "The customer described a project advance and equipment purchases; the supporting authority remains unverified.",
    } });
    state = await act(state, { type: "submit_case", caseId });
    assert.equal((await post(`/api/aml-sessions/${state.id}/actions`, { type: "review_case", caseId, decision: "approve_str", reason: "Analyst must not self-approve", revision: state.revision })).status, 409);
    state = await act(state, { type: "switch_role", role: "reviewer" });
    state = await act(state, { type: "review_case", caseId, decision: "return", reason: "Include the difference between gross receipt and declared salary in the final narrative." });
    assert.equal(state.cases[0].status, "returned");
    state = await act(state, { type: "switch_role", role: "analyst" });
    state = await act(state, { type: "save_case", caseId, narrative: `${state.cases[0].narrative} The receipt materially exceeds the customer's declared salary and no payment-collection business was declared.`, recommendation: "str", strDraft: state.cases[0].strDraft });
    state = await act(state, { type: "submit_case", caseId });
    state = await act(state, { type: "switch_role", role: "reviewer" });
    state = await act(state, { type: "review_case", caseId, decision: "approve_str", reason: "Approved as an internal training draft. No report is submitted to JFIU." });
    assert.equal(state.cases[0].status, "str_approved");
    assert.equal(state.cases[0].reviews.length, 2);
    assert.equal(state.alerts.find((a) => a.id === alert.id).status, "closed");
    assert.equal(state.transactions.find((tx) => tx.id === "HK-T002").status, "executed");
    const saved = structuredClone(state);
    await close();
    await start();
    assert.deepEqual((await request(`/api/aml-sessions/${state.id}`)).body, saved);
    assert.equal((await post(`/api/aml-sessions/${state.id}/actions`, { type: "review_case", caseId, decision: "return", reason: "Cannot edit a final approval", revision: state.revision })).status, 409);
    assert.deepEqual((await request(`/api/aml-sessions/${state.id}`)).body, saved);
  });

  await test("administrator rule reruns change current matches without erasing historical triggers", async () => {
    let state = await create();
    const original = structuredClone(state.alerts);
    state = await act(state, { type: "switch_role", role: "administrator" });
    state = await act(state, { type: "run_monitoring" });
    assert.equal(state.runs.at(-1).newAlertIds.length, 0);
    state = await act(state, { type: "configure_rule", rule: { ...state.rule, minCreditHkd: 10000000 } });
    state = await act(state, { type: "run_monitoring" });
    assert.equal(state.runs.at(-1).matchedAlertIds.length, 0);
    assert.deepEqual(state.alerts, original);
    assert.equal((await request(`/api/aml-sessions/${state.id}`)).body.rule.version, 2);
  });

  await test("HTTP comparisons keep answers hidden across restart and persist only an explicitly revealed debrief", async () => {
    let state = await create();
    const active = structuredClone(state);
    const baseline = { minCreditHkd: 100000, minFanOutPercent: 80, windowMinutes: 30, newAccountDays: 30 };
    const candidate = { ...baseline, windowMinutes: 60 };
    const path = `/api/aml-sessions/${state.id}/actions`;
    assert.equal((await post(path, { type: "compare_rules", revision: state.revision, baseline, candidate })).status, 409);
    state = await act(state, { type: "switch_role", role: "administrator" });
    state = await act(state, { type: "compare_rules", baseline, candidate });
    const comparison = state.comparisons[0];
    assert.equal(comparison.dataset.scenarios.length, 5);
    assert.equal(comparison.baseline.alerts.length, 2);
    assert.equal(comparison.candidate.alerts.length, 4);
    assert(!Object.hasOwn(comparison, "debrief"));
    assert(!/"(?:answers|category|rationale|truePositives|falsePositives|falseNegatives|trueNegatives|precision|recall)"/.test(JSON.stringify(comparison)));
    for (const key of ["rule", "transactions", "alerts", "cases", "runs"]) assert.deepEqual(state[key], active[key]);
    const hiddenState = structuredClone(state);
    await close();
    await start();
    assert.deepEqual((await request(`/api/aml-sessions/${state.id}`)).body, hiddenState);
    state = await act(state, { type: "switch_role", role: "analyst" });
    state = await act(state, { type: "reveal_comparison", comparisonId: comparison.id });
    assert.equal(state.comparisons[0].debrief.answers.length, 5);
    assert.deepEqual(state.comparisons[0].debrief.baseline, { truePositives: 1, falsePositives: 1, falseNegatives: 1, trueNegatives: 2, precision: 0.5, recall: 0.5 });
    assert.deepEqual(state.comparisons[0].debrief.candidate, { truePositives: 2, falsePositives: 2, falseNegatives: 0, trueNegatives: 1, precision: 0.5, recall: 1 });
    const revealedState = structuredClone(state);
    await close();
    await start();
    assert.deepEqual((await request(`/api/aml-sessions/${state.id}`)).body, revealedState);
  });

  await test("HTTP rejects invalid and stale comparison actions without changing the stored experiment", async () => {
    let state = await create();
    state = await act(state, { type: "switch_role", role: "administrator" });
    const baseline = { minCreditHkd: 100000, minFanOutPercent: 80, windowMinutes: 30, newAccountDays: 30 };
    const path = `/api/aml-sessions/${state.id}/actions`;
    for (const input of [
      { type: "compare_rules", baseline, candidate: { ...baseline, windowMinutes: 0 } },
      { type: "compare_rules", baseline: null, candidate: baseline },
      { type: "reveal_comparison", comparisonId: "CMP9999" },
    ]) {
      assert([400, 409].includes((await post(path, { revision: state.revision, ...input })).status));
      assert.deepEqual((await request(`/api/aml-sessions/${state.id}`)).body, state);
    }
    const previousRevision = state.revision;
    state = await act(state, { type: "compare_rules", baseline, candidate: { ...baseline, windowMinutes: 60 } });
    assert.equal((await post(path, { type: "reveal_comparison", comparisonId: state.comparisons[0].id, revision: previousRevision })).status, 409);
    assert.deepEqual((await request(`/api/aml-sessions/${state.id}`)).body, state);
  });
  await test("HTTP challenge checks and hidden answers survive restart, then a failed shift persists", async () => {
    let state = await create();
    const active = structuredClone(state);
    const rule = { minCreditHkd: 100000, minFanOutPercent: 80, windowMinutes: 60, newAccountDays: 30 };
    state = await act(state, { type: "start_challenge", rule });
    let game = state.challenges.at(-1);
    assert.equal(game.status, "active");
    assert.equal(game.dataset.scenarios.length, 5);
    assert.equal(game.dataset.evidence.length, 0);
    assert(!/"(?:answers|category|rationale|result|score|missedSuspicious)"/.test(JSON.stringify(game)));
    assert(game.dataset.scenarios.every((row) => row.evidenceIds.length === 0));
    for (const key of ["rule", "transactions", "alerts", "cases", "runs", "comparisons"]) assert.deepEqual(state[key], active[key]);
    const id = game.dataset.scenarios[0].id;
    state = await act(state, { type: "request_challenge_check", challengeId: game.id, scenarioId: id });
    game = state.challenges.at(-1);
    assert.equal(game.elapsedMinutes, 2);
    assert.equal(game.dataset.evidence.length, 1);
    assert.deepEqual(game.verifiedScenarioIds, [id]);
    assert(!/"(?:answers|category|rationale|result|score)"/.test(JSON.stringify(game)));
    const checked = structuredClone(state);
    await close();
    await start();
    assert.deepEqual((await request(`/api/aml-sessions/${state.id}`)).body, checked);
    for (const scenario of game.dataset.scenarios) {
      state = await act(state, { type: "decide_challenge", challengeId: game.id, scenarioId: scenario.id, decision: "clear", reason: "Recorded a closure decision after examining the supplied customer and transfer context." });
    }
    game = state.challenges.at(-1);
    assert.equal(game.status, "lost");
    assert.equal(game.elapsedMinutes, 7);
    assert.equal(game.result.missedSuspicious, 2);
    assert.equal(game.result.unnecessaryEscalations, 0);
    assert.equal(game.result.unresolved, 0);
    assert.equal(game.result.answers.length, 5);
    assert(game.result.score < 100);
    assert.equal(game.dataset.evidence.length, 5);
    assert(!Object.hasOwn(game, "answers"));
    const ended = structuredClone(state);
    await close();
    await start();
    assert.deepEqual((await request(`/api/aml-sessions/${state.id}`)).body, ended);
    state = await act(state, { type: "start_challenge", rule });
    assert.equal(state.challenges.length, 1, "the active shift temporarily hides earlier game answers and decision histories");
    assert.equal(state.challenges.at(-1).status, "active");
    assert(!Object.hasOwn(state.challenges.at(-1), "result"));
    assert(!state.events.some((event) => event.refId === game.id));
    const playing = structuredClone(state);
    await close();
    await start();
    assert.deepEqual((await request(`/api/aml-sessions/${state.id}`)).body, playing);
    state = await act(state, { type: "end_challenge", challengeId: state.challenges[0].id });
    assert.deepEqual(state.challenges[0], game, "server-retained history returns after the shift ends");
  });

  await test("HTTP challenge actions cannot bypass the clock, active-attempt limit or committed decisions", async () => {
    let state = await create();
    const rule = { minCreditHkd: 100000, minFanOutPercent: 80, windowMinutes: 60, newAccountDays: 30 };
    state = await act(state, { type: "start_challenge", rule });
    const game = state.challenges.at(-1);
    const id = game.dataset.scenarios[0].id;
    const path = `/api/aml-sessions/${state.id}/actions`;
    for (const input of [
      { type: "start_challenge", rule },
      { type: "request_challenge_check", challengeId: game.id, scenarioId: "missing" },
      { type: "decide_challenge", challengeId: game.id, scenarioId: id, decision: "freeze", reason: "A sufficiently long but invalid action justification." },
      { type: "decide_challenge", challengeId: game.id, scenarioId: id, decision: "clear", reason: "Too short" },
    ]) {
      assert([400, 409].includes((await post(path, { revision: state.revision, ...input })).status));
      assert.deepEqual((await request(`/api/aml-sessions/${state.id}`)).body, state);
    }
    const previousRevision = state.revision;
    state = await act(state, { type: "decide_challenge", challengeId: game.id, scenarioId: id, decision: "clear", reason: "Committed a closure decision based on the available declared activity and transfers." });
    assert.equal(state.challenges.at(-1).elapsedMinutes, 1);
    assert.equal((await post(path, { type: "end_challenge", challengeId: game.id, revision: previousRevision })).status, 409);
    for (const input of [
      { type: "decide_challenge", challengeId: game.id, scenarioId: id, decision: "escalate", reason: "Attempted to change a disposition after it was already committed." },
      { type: "request_challenge_check", challengeId: game.id, scenarioId: id },
    ]) {
      assert([400, 409].includes((await post(path, { revision: state.revision, ...input })).status));
      assert.deepEqual((await request(`/api/aml-sessions/${state.id}`)).body, state);
    }
    state = await act(state, { type: "end_challenge", challengeId: game.id });
    assert.equal(state.challenges.at(-1).status, "lost");
    assert.equal((await post(path, { type: "end_challenge", challengeId: game.id, revision: state.revision })).status, 409);
    assert.deepEqual((await request(`/api/aml-sessions/${state.id}`)).body, state);
  });
} finally {
  if (server?.listening) await close();
  await rm(temporary, { recursive: true, force: true });
}
