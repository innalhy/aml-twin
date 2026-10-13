import assert from "node:assert/strict";
import { test } from "node:test";
import { build } from "esbuild";

const bundle = await build({ entryPoints: ["src/cases.ts"], bundle: true, write: false, format: "esm", platform: "node" });
const { caseLibraryView, caseView, createCaseSession, decideCase, parseCaseDecision, parseCaseStart } = await import(`data:text/javascript;base64,${Buffer.from(bundle.outputFiles[0].text).toString("base64")}`);
const decide = (state, choiceId) => decideCase(state, parseCaseDecision({ revision: state.revision, choiceId }));
const library = caseLibraryView();
const caseIds = library.workflows.flatMap((workflow) => workflow.cases.map((item) => item.caseId));

// Every route from the start of a case to an outcome, depth first.
function endings(state) {
  const view = caseView(state);
  if (!view.choices.length) return [view];
  assert.equal(view.debrief, null);
  assert.doesNotMatch(JSON.stringify(view), /"rationale"|"teaching"/, `${view.caseId} leaked debrief content before closing`);
  return view.choices.flatMap((choice) => endings(decide(state, choice.id)));
}

test("the library lists eleven workflows and every script once", () => {
  assert.equal(library.workflows.length, 11);
  assert.deepEqual(library.workflows.map((workflow) => workflow.number), [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]);
  assert.equal(new Set(caseIds).size, 11);
  for (const workflow of library.workflows) {
    assert.ok(workflow.role && workflow.goal && workflow.method && workflow.realWorld.length >= 2, `workflow ${workflow.number} brief`);
    assert.equal(workflow.walkthrough === null, workflow.cases.length > 0, `workflow ${workflow.number} walkthrough`);
  }
  assert.doesNotMatch(JSON.stringify(library), /"rationale"/);
});

test("every path in every script ends in a rated outcome, with good and poor endings in each", () => {
  let paths = 0;
  for (const caseId of caseIds) {
    const ratings = new Set();
    for (const view of endings(createCaseSession(`run-${caseId}`, caseId))) {
      paths++;
      assert.ok(view.debrief, `${caseId} outcome has a debrief`);
      assert.notEqual(view.debrief.rating, "unrated", `${caseId} disposition ${view.debrief.disposition} is not in its teaching lists`);
      assert.equal(view.twin.disposition, view.debrief.disposition);
      assert.equal(view.story.at(-1).type, "outcome");
      assert.equal(view.events.at(-1).type, "session_closed");
      assert.equal(view.debrief.decisions.length, view.events.filter((event) => event.type === "decision_made").length);
      assert.ok(view.debrief.decisions.every((item) => item.rationale), `${caseId} decisions carry a rationale`);
      assert.ok(view.debrief.teaching.length > 0);
      ratings.add(view.debrief.rating);
    }
    assert.ok(ratings.has("acceptable"), `${caseId} has an acceptable ending`);
    assert.ok(ratings.has("poor") || ratings.has("incomplete"), `${caseId} has a poor or incomplete ending`);
  }
  assert.ok(paths >= 33, `walked ${paths} paths`);
});

test("decisions are checked against the current node, revision and case state", () => {
  assert.throws(() => parseCaseStart({ caseId: "nope" }), /unknown_case/);
  assert.throws(() => parseCaseDecision({ revision: -1, choiceId: "x" }), /invalid_revision/);
  const start = createCaseSession("run", "mule-rent-001");
  assert.throws(() => decide(start, "not_a_choice"), /invalid_choice/);
  assert.throws(() => decideCase(start, { revision: 5, choiceId: "interview" }), (error) => error.message === "stale_revision" && error.status === 409);
  const interviewed = decide(start, "interview");
  assert.equal(interviewed.revision, 1);
  assert.equal(start.events.length, 1, "deciding does not mutate the previous state");
  const view = caseView(interviewed);
  assert.deepEqual(view.story.map((item) => item.id), ["n_alert", "n_triage", "n_admission", "n_r1_gate"]);
  assert.equal(view.story[1].chosen, "Interview the customer");
  assert.ok(view.twin.risk.flags.includes("RENTAL_ADMITTED"));
  const closed = decide(interviewed, "exit_only");
  assert.equal(caseView(closed).debrief.rating, "poor");
  assert.throws(() => decide(closed, "exit_only"), (error) => error.message === "case_closed" && error.status === 409);
});
