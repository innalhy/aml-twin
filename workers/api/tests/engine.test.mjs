import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";
import { build } from "esbuild";

const bundle = await build({ entryPoints: ["src/engine.ts"], bundle: true, write: false, format: "esm", platform: "node" });
const { createSession, applyAction, parseAction, sessionView } = await import(`data:text/javascript;base64,${Buffer.from(bundle.outputFiles[0].text).toString("base64")}`);
const pack = JSON.parse(await readFile(new URL("../src/investigation-pack.json", import.meta.url), "utf8"));
const C1 = "SYN-001";
const C2 = "SYN-002";
const account = (state, customerId = C1) => state.runAccounts.find((row) => row.customerId === customerId);
const order = (state, id = "TX-2") => state.orders.find((row) => row.id === id);
function action(state, input) { return applyAction(state, pack, parseAction({ revision: state.revision, ...input })); }
const advance = (state, minutes) => action(state, { type: "advance", mode: "work", minutes });
const finish = (state) => action(state, { type: "finish" });
const hold = (state, customerId = C1) => action(state, { type: "hold", customerId, reason: "Review pending" });
const release = (state, customerId = C1) => action(state, { type: "release", customerId, reason: "Review completed" });
const request = (state, requestId, customerId = C1) => action(state, { type: "request", customerId, requestId });
const decide = (state, disposition, evidenceIds = ["EV-001"], customerId = C1) => action(state, { type: "decision", customerId, disposition, evidenceIds, note: "Documented assessment" });

test("minute zero exposes only twelve initial records and no delayed record metadata", () => {
  const state = createSession("first", pack);
  const view = sessionView(state, pack);
  assert.equal(view.minute, 0);
  assert.equal(view.evidence.length, 12);
  assert.equal(view.requests.length, 12);
  assert.equal(view.orders.length, 4);
  assert.equal(account(state).balance, 480000);
  const publicText = JSON.stringify(view);
  for (const evidence of pack.evidence.filter((row) => row.release === "on_request")) {
    assert.ok(!view.evidence.some((row) => row.id === evidence.id));
    assert.ok(!publicText.includes(evidence.body));
    assert.ok(!publicText.includes(evidence.id));
  }
  assert.ok(!publicText.includes("instructor_path"));
  assert.equal(view.debrief, null);
});

test("paused minute18 hold beats payment checks; minute23 is deferred independently", () => {
  let state = advance(createSession("tie", pack), 18);
  assert.ok(state.orders.every((row) => row.status === "pending"));
  state = hold(state);
  state = advance(state, 5);
  assert.equal(state.minute, 23);
  assert.equal(order(state).status, "pending");
  assert.equal(order(state).overdue, true);
  assert.equal(order(state, "TX-L-2").status, "executed");
  assert.equal(order(state, "TX-L-3").status, "pending");
  state = hold(state, C2);
  state = finish(state);
  assert.equal(state.minute, 30);
  assert.equal(account(state).balance, 480000);
  assert.equal(account(state, C2).balance, 250000);
  assert.equal(order(state, "TX-L-3").status, "pending");
  assert.equal(state.events.filter((row) => row.type === "order_executed").length, 1);
});

test("request prerequisites release at8 and independent confirmation at28 before decisions", () => {
  let state = createSession("evidence", pack);
  state = request(state, "verify_payer");
  assert.equal(state.events.at(-1).detail, "reason=prerequisite_missing");
  assert.equal(state.requests.length, 0);
  state = request(state, "request_supporting_documents");
  state = action(state, { type: "advance", mode: "next" });
  assert.equal(state.minute, 8);
  assert.equal(state.evidenceAvailable["EV-006"], 8);
  state = request(state, "verify_payer");
  assert.equal(state.requests.at(-1).dueMinute, 28);
  state = advance(state, 20);
  assert.equal(state.evidenceAvailable["EV-007"], 28);
  assert.equal(account(state).balance, 10000);
  state = decide(state, "escalation", ["EV-007"]);
  assert.equal(state.decisions.at(-1).minute, 28);
  assert.equal(state.decisions.at(-1).evidenceIds[0], "EV-007");
  assert.ok(state.events.find((row) => row.type === "evidence_released" && row.refId === "EV-007").seq < state.events.at(-1).seq);
});

test("same timestamp evidence completes before learner actions and deferred due orders", () => {
  let state = advance(createSession("completion-tie", pack), 3);
  state = request(state, "review_kyc_log");
  state = advance(state, 15);
  assert.equal(state.minute, 18);
  assert.equal(state.evidenceAvailable["EV-005"], 18);
  assert.equal(order(state).status, "pending");
  state = decide(state, "continue_review", ["EV-005"]);
  state = hold(state);
  state = finish(state);
  assert.equal(order(state).status, "pending");
});

test("release at due minute uses due trigger; overdue release executes once", () => {
  let state = hold(createSession("releases", pack));
  state = advance(state, 18);
  state = release(state);
  assert.equal(order(state).status, "pending");
  state = advance(state, 2);
  assert.equal(order(state).executedMinute, 18);
  assert.ok(state.events.find((row) => row.type === "order_executed" && row.refId === "TX-2").detail.includes("trigger=due"));
  state = hold(state);
  state = hold(state);
  assert.equal(state.events.at(-1).type, "hold_rejected");
  state = advance(state, 5);
  assert.equal(order(state, "TX-3").status, "pending");
  state = release(state);
  assert.equal(order(state, "TX-3").executedMinute, 25);
  assert.ok(state.events.find((row) => row.type === "order_executed" && row.refId === "TX-3").detail.includes("trigger=release"));
  state = release(state);
  assert.equal(state.events.at(-1).type, "release_rejected");
  state = finish(state);
  assert.equal(account(state).balance, 10000);
  assert.equal(state.events.filter((row) => row.type === "order_executed" && row.customerId === C1).length, 2);
});

test("duplicate requests never release twice and unknown requests cannot create checks", () => {
  let state = request(createSession("duplicates", pack), "resolve_screening");
  state = request(state, "resolve_screening");
  assert.equal(state.events.at(-1).detail, "reason=duplicate");
  state = advance(state, 5);
  state = request(state, "resolve_screening");
  assert.equal(state.events.at(-1).detail, "reason=duplicate");
  state = request(state, "bogus");
  assert.equal(state.events.at(-1).detail, "reason=unknown_request");
  assert.equal(state.requests.length, 1);
  assert.equal(state.events.filter((row) => row.type === "evidence_released").length, 1);
});

test("unreleased, wrong-customer and unknown citations reject without decisions", () => {
  let state = createSession("citations", pack);
  for (const id of ["EV-007", "EV-011", "unlisted"]) {
    state = decide(state, "escalation", [id]);
    assert.equal(state.decisions.length, 0);
    assert.equal(state.events.at(-1).type, "decision_rejected");
  }
  assert.ok(!JSON.stringify(sessionView(state, pack)).includes("EV-007"));
  state = hold(state, "unknown");
  assert.equal(state.events.at(-1).type, "action_rejected");
  assert.ok(state.runAccounts.every((row) => !row.held));
});

test("decisions do not hold or release funds; latest decision and full history remain", () => {
  let state = decide(createSession("decisions", pack), "escalation");
  state = finish(state);
  assert.equal(account(state).balance, 10000);
  assert.ok(sessionView(state, pack).debrief.warnings.some((row) => row.includes("executed after the latest escalation")));
  let closure = hold(createSession("closure", pack));
  closure = request(closure, "review_kyc_log");
  closure = decide(closure, "continue_review");
  closure = decide(closure, "closure");
  closure = finish(closure);
  assert.equal(account(closure).held, true);
  assert.equal(closure.decisions.length, 2);
  const warnings = sessionView(closure, pack).debrief.warnings;
  assert.ok(warnings.some((row) => row.includes("closure, but an outbound hold remains")));
  assert.ok(warnings.some((row) => row.includes("still outstanding when the latest closure")));
});

test("closure checks use event sequence when a request follows closure in the same minute", () => {
  let state = decide(createSession("closure-seq", pack), "closure");
  state = request(state, "review_kyc_log");
  state = finish(state);
  assert.ok(!sessionView(state, pack).debrief.warnings.some((row) => row.startsWith("Mira Solen:") && row.includes("still outstanding")));
});

test("finishing processes due minute30 and deliveries then prohibits further actions", () => {
  const customPack = structuredClone(pack);
  customPack.dueEvents[0].due_minute = "30";
  let state = createSession("end", customPack);
  state = advance(state, 15);
  state = request(state, "review_kyc_log");
  state = applyAction(state, customPack, parseAction({ type: "finish", revision: state.revision }));
  assert.equal(state.evidenceAvailable["EV-005"], 30);
  assert.equal(order(state).executedMinute, 30);
  assert.equal(state.events.at(-1).type, "run_end");
  assert.throws(() => hold(state), /session_ended/);
});

test("separate runs and customer accounts cannot mutate each other; stale actions reject", () => {
  const original = createSession("one", pack);
  const another = createSession("two", pack);
  let state = hold(original);
  assert.equal(account(original).held, false);
  assert.equal(account(another).held, false);
  assert.equal(account(state, C2).held, false);
  assert.throws(() => applyAction(state, pack, parseAction({ type: "finish", revision: 0 })), /stale_revision/);
  state = finish(state);
  assert.equal(account(state).balance, 480000);
  assert.equal(account(state, C2).balance, 10000);
  assert.equal(another.minute, 0);
});

test("insufficient balance fails terminally and preserves funds", () => {
  let state = createSession("insufficient", pack);
  account(state).balance = 100;
  state = finish(state);
  assert.equal(order(state).status, "failed");
  assert.equal(order(state, "TX-3").status, "failed");
  assert.equal(account(state).balance, 100);
});

test("decimal durations work; reading does not advance; late checks remain waiting", () => {
  let state = advance(createSession("decimals", pack), 18.5);
  assert.equal(order(state).status, "executed");
  state = request(state, "review_kyc_log");
  const view = sessionView(state, pack);
  assert.equal(view.minute, 18.5);
  assert.equal(state.minute, 18.5);
  state = finish(state);
  assert.equal(state.requests[0].completed, false);
  assert.equal(state.evidenceAvailable["EV-005"], undefined);
  assert.equal(sessionView(state, pack).requests.find((row) => row.customerId === C1 && row.requestId === "review_kyc_log").status, "waiting");
});

test("malformed and oversized action fields fail validation", () => {
  for (const value of [null, [], {}, { type: "finish", revision: -1 }, { type: "finish", revision: 0.5 },
    { type: "advance", revision: 0, mode: "work", minutes: NaN }, { type: "advance", revision: 0, mode: "work", minutes: 0 },
    { type: "hold", revision: 0, customerId: C1, reason: "a".repeat(4001) },
    { type: "decision", revision: 0, customerId: C1, disposition: "ban", evidenceIds: [], note: "" },
    { type: "decision", revision: 0, customerId: C1, disposition: "closure", evidenceIds: Array(25).fill("EV-001"), note: "" },
    { type: "request", revision: 0, customerId: {}, requestId: "resolve_screening" }]) {
    assert.throws(() => parseAction(value));
  }
  assert.deepEqual(parseAction({ type: "finish", revision: 0, unexpected: "ignored" }), { type: "finish", revision: 0 });
});
