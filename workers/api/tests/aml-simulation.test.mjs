import assert from "node:assert/strict";
import { test } from "node:test";
import { build } from "esbuild";

const bundle = await build({ stdin: { contents: 'export { createAmlSession, amlView, applyAmlAction, parseAmlAction } from "./src/aml.ts"; export { initializeSimulation } from "./src/aml-simulation.ts";', resolveDir: process.cwd() }, bundle: true, write: false, format: "esm", platform: "node" });
const { createAmlSession, amlView, applyAmlAction, parseAmlAction, initializeSimulation } = await import(`data:text/javascript;base64,${Buffer.from(bundle.outputFiles[0].text).toString("base64")}`);
const variants = ["suspicious", "legitimate", "unresolved"];
const view = (state) => amlView(state).simulation;
const act = (state, action) => applyAmlAction(state, { revision: state.revision, ...action });
const role = (state, role) => act(state, { type: "switch_role", role });
const advance = (state, minutes = 5) => act(state, { type: "simulation_advance", mode: "work", minutes });
const request = (state, id = "SIM-CHECK-CUSTOMER") => act(state, { type: "simulation_request", requestId: id });
const rejected = (action, status = 409) => assert.throws(action, (error) => error.status === status);
const reason = "The available bank records support a documented review of this exceptional project payment.";
function fresh(variant = "suspicious") {
  const state = createAmlSession("simulation-test", true);
  // Internal fixture seam only. No API or action accepts a scenario variant.
  initializeSimulation(state, variant);
  return state;
}
function at(state, minute) {
  while (view(state).elapsedMinutes < minute) state = advance(state, minute - view(state).elapsedMinutes >= 5 ? 5 : 1);
  return state;
}
function recommend(state, control = "hold") { return act(state, { type: "simulation_recommend_control", control, reason, evidenceIds: ["SIM-EV002"] }); }
function approve(state) {
  state = role(state, "reviewer");
  return act(state, { type: "simulation_review_control", controlId: view(state).controls.at(-1).id, decision: "approve", reason });
}
function decision(state, evidenceIds = ["SIM-EV002"], disposition = "continue_review") {
  return act(state, { type: "simulation_submit_decision", disposition, reason, evidenceIds, alternativeExplanation: "The receipt may be a supported one-off project advance.", missingInformation: "Independent confirmation of the mandate remains material." });
}

test("three private variants have identical initial learner views and no hidden evidence or context", () => {
  const projections = variants.map((variant) => {
    const state = fresh(variant);
    const publicView = amlView(state);
    const serialized = JSON.stringify(publicView);
    assert.equal(publicView.simulation.debrief, null);
    assert.equal(publicView.simulation.validationStatus, "unvalidated");
    assert.equal(publicView.simulation.balanceHkd, 128000);
    assert.deepEqual(publicView.evidence.map((item) => item.id), ["SIM-EV001", "SIM-EV002", "SIM-EV003"]);
    for (const source of state.evidence.filter((item) => !publicView.evidence.some((visible) => visible.id === item.id))) assert(!serialized.includes(source.body));
    assert(!serialized.includes(state.simulation.context));
    for (const key of ["variant", "releases", "openingBalanceHkd", "context"]) assert(!serialized.includes(`"${key}":`));
    assert.equal(publicView.transactions.length, 6, "future pending instructions are not posted ledger rows yet");
    assert.equal(publicView.simulation.payments.length, 2, "known queued instructions remain inspectable separately");
    return publicView;
  });
  assert.deepEqual(projections[0], projections[1]); assert.deepEqual(projections[1], projections[2]);
});

test("requests obey prerequisites and response delays and persist across serialization", () => {
  let state = fresh();
  rejected(() => request(state, "SIM-CHECK-INDEPENDENT"));
  state = request(state);
  assert.equal(view(state).elapsedMinutes, 0);
  assert.equal(view(state).requests[0].status, "pending");
  rejected(() => request(state));
  state = advance(state);
  assert.equal(view(state).evidence.length, 3);
  state = act(JSON.parse(JSON.stringify(state)), { type: "simulation_advance", mode: "next" });
  assert.equal(view(state).elapsedMinutes, 6);
  assert.equal(view(state).evidence.find((item) => item.id === "SIM-EV010").availableMinute, 6);
  assert.equal(view(state).requests.find((item) => item.id === "SIM-CHECK-INDEPENDENT").status, "available");
  state = request(state, "SIM-CHECK-INDEPENDENT");
  assert.equal(view(state).requests.find((item) => item.id === "SIM-CHECK-INDEPENDENT").dueMinute, 15);
  state = at(state, 14);
  assert(!view(state).evidence.some((item) => item.id === "SIM-EV011"));
  state = advance(state, 1);
  assert(view(state).evidence.some((item) => item.id === "SIM-EV011"));
});

test("a recommendation alone never holds an instruction, and approval has an operational delay", () => {
  let state = recommend(fresh());
  assert.equal(view(state).held, false);
  const unapproved = at(state, 12);
  assert.equal(view(unapproved).payments[0].status, "executed");
  assert.equal(view(unapproved).balanceHkd, 78000);
  state = approve(state);
  assert.equal(view(state).held, false);
  assert.equal(view(state).controls[0].dueMinute, 2);
  state = advance(state, 1);
  assert.equal(view(state).held, false);
  state = advance(state, 1);
  assert.equal(view(state).held, true);
  state = at(state, 22);
  assert.deepEqual(view(state).payments.map((item) => item.status), ["held", "held"]);
  assert.equal(view(state).balanceHkd, 128000);
});

test("a late hold cannot reverse an executed payment; release executes overdue held instructions once", () => {
  let late = at(fresh(), 15);
  late = approve(recommend(late));
  late = at(late, 25);
  assert.deepEqual(view(late).payments.map((item) => item.status), ["executed", "held"]);
  assert.equal(view(late).balanceHkd, 78000);
  assert.equal(view(late).payments[0].executedMinute, 12);
  let state = at(approve(recommend(fresh())), 15);
  state = role(state, "analyst"); state = approve(recommend(state, "release"));
  assert.equal(view(state).held, true);
  state = at(state, 17);
  assert.equal(view(state).held, false);
  assert.equal(view(state).payments[0].executedMinute, 17);
  assert.equal(view(state).balanceHkd, 78000);
  state = at(state, 23);
  assert.deepEqual(view(state).payments.map((item) => item.status), ["executed", "executed"]);
  assert.equal(view(state).balanceHkd, 18000);
  assert.equal(amlView(state).transactions.filter((item) => item.id === "SIM-T013").length, 1);
});

test("control application at a payment timestamp precedes execution and rejection never applies a control", () => {
  let state = at(fresh(), 10);
  state = approve(recommend(state)); state = at(state, 12);
  assert.equal(view(state).controls[0].appliedMinute, 12);
  assert.equal(view(state).payments[0].status, "held");
  let rejectedControl = role(recommend(fresh()), "reviewer");
  rejectedControl = act(rejectedControl, { type: "simulation_review_control", controlId: "CTL1", decision: "reject", reason });
  rejectedControl = at(rejectedControl, 22);
  assert.equal(view(rejectedControl).held, false);
  assert.equal(view(rejectedControl).balanceHkd, 18000);
});

test("decision citations are validated at decision time; later evidence cannot change that snapshot", () => {
  let state = fresh("legitimate");
  rejected(() => decision(state, ["SIM-EV011"]));
  state = request(state); state = at(state, 6);
  state = decision(state, ["SIM-EV010"]);
  const recorded = structuredClone(view(state).decisions[0]);
  assert.equal(view(state).ended, false, "EDD or continuation is a decision, not the end of the simulation");
  state = request(state, "SIM-CHECK-INDEPENDENT"); state = at(state, 15);
  assert.deepEqual(view(state).decisions[0], recorded);
  assert(!recorded.availableEvidenceIds.includes("SIM-EV011"));
  state = role(state, "reviewer");
  state = act(state, { type: "simulation_review_decision", decisionId: recorded.id, decision: "return", reason, rubric: { evidence: 3, alternatives: 4, proportionality: 2, documentation: 3 } });
  assert.equal(view(state).reviews[0].reviewer, "reviewer-01");
  assert.deepEqual(view(state).decisions[0], recorded);
  rejected(() => act(state, { type: "simulation_review_decision", decisionId: recorded.id, decision: "approve", reason, rubric: { evidence: 4, alternatives: 4, proportionality: 4, documentation: 4 } }));
});

test("roles and action boundaries prohibit direct ledger changes and revealing other exercise answers", () => {
  const state = fresh();
  rejected(() => act(state, { type: "switch_role", role: "administrator" }));
  for (const action of [
    { type: "run_monitoring" }, { type: "start_challenge", rule: amlView(state).rule },
    { type: "compare_rules", baseline: amlView(state).rule, candidate: amlView(state).rule },
    { type: "simulation_review_control", controlId: "CTL1", decision: "approve", reason },
  ]) rejected(() => act(state, action));
  const reviewer = role(state, "reviewer");
  rejected(() => request(reviewer)); rejected(() => decision(reviewer)); rejected(() => recommend(reviewer));
  rejected(() => act(createAmlSession("ordinary"), { type: "simulation_finish" }));
});

test("invalid rationale, citations, clock, rubric and stale revision reject without mutation", () => {
  const state = fresh(); const snapshot = structuredClone(state);
  const malformed = [
    { type: "simulation_advance", mode: "work", minutes: 2 },
    { type: "simulation_recommend_control", control: "hold", reason: "short", evidenceIds: ["SIM-EV002"] },
    { type: "simulation_recommend_control", control: "hold", reason, evidenceIds: [] },
    { type: "simulation_recommend_control", control: "hold", reason, evidenceIds: ["SIM-EV002", "SIM-EV002"] },
    { type: "simulation_submit_decision", disposition: "close", reason, evidenceIds: ["SIM-EV002"], alternativeExplanation: "short", missingInformation: "A documented information gap" },
    { type: "simulation_review_decision", decisionId: "DEC1", decision: "approve", reason, rubric: { evidence: 5, alternatives: 4, proportionality: 4, documentation: 4 } },
  ];
  for (const action of malformed) rejected(() => act(state, action), 400);
  rejected(() => applyAmlAction(state, { revision: state.revision + 1, type: "simulation_finish" }));
  assert.deepEqual(state, snapshot);
  assert.throws(() => parseAmlAction({ type: "simulation_select_variant", revision: 0, variant: "legitimate" }));
});

test("finishing settles due events, reveals variant-specific context without a crime grade, and freezes the run", () => {
  const contexts = new Set();
  for (const variant of variants) {
    let state = request(fresh(variant));
    state = decision(state);
    state = act(state, { type: "simulation_finish" });
    const result = view(state);
    assert.equal(result.elapsedMinutes, 60); assert.equal(result.ended, true);
    assert.equal(result.balanceHkd, 18000);
    assert(result.evidence.some((item) => item.id === "SIM-EV010"));
    assert.equal(result.payments.filter((item) => item.status === "executed").length, 2);
    assert.equal(result.debrief.procedure.find((item) => item.label.startsWith("Cited a requested")).complete, false, "a response arriving after the decision cannot earn evidence credit");
    assert(result.debrief.limitations.some((item) => item.includes("Independent AML-practitioner validation")));
    assert(!("score" in result.debrief)); assert(!("rating" in result.debrief));
    contexts.add(result.debrief.scenarioContext);
    for (const action of [{ type: "simulation_finish" }, { type: "simulation_advance", mode: "next" }, { type: "switch_role", role: "reviewer" }]) rejected(() => act(state, action));
  }
  assert.equal(contexts.size, 3);
});

test("an unreplied late check remains pending at the deadline and does not leak its body", () => {
  let state = at(fresh("unresolved"), 58);
  state = request(state); state = act(state, { type: "simulation_finish" });
  const result = amlView(state);
  assert.equal(result.simulation.requests[0].status, "pending");
  assert(!result.evidence.some((item) => item.id === "SIM-EV010"));
  assert(!JSON.stringify(result).includes(state.evidence.find((item) => item.id === "SIM-EV010").body));
});

test("clock-only advances preserve alert history and newly posted payments rerun monitoring", () => {
  let state = createAmlSession("monitoring-simulation", true);
  const initial = amlView(state);
  state = advance(state, 1); state = advance(state, 1); state = advance(state, 5);
  const unchanged = amlView(state);
  assert.deepEqual(unchanged.alerts, initial.alerts);
  assert.deepEqual(unchanged.runs, initial.runs);
  state = advance(state, 5);
  const posted = amlView(state);
  assert.equal(posted.simulation.elapsedMinutes, 12);
  assert.equal(posted.simulation.payments[0].status, "executed");
  assert.equal(posted.runs.length, initial.runs.length + 1);
  assert.equal(posted.transactions.filter((tx) => tx.status === "executed").length, initial.transactions.filter((tx) => tx.status === "executed").length + 1);
  const latestRuns = structuredClone(posted.runs);
  state = advance(state, 1);
  assert.deepEqual(amlView(state).runs, latestRuns);
});
