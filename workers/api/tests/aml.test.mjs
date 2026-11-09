import assert from "node:assert/strict";
import { test } from "node:test";
import { build } from "esbuild";

const bundle = await build({ entryPoints: ["src/aml.ts"], bundle: true, write: false, format: "esm", platform: "node" });
const { createAmlSession, amlView, parseAmlAction, applyAmlAction } = await import(`data:text/javascript;base64,${Buffer.from(bundle.outputFiles[0].text).toString("base64")}`);
const fresh = () => createAmlSession(crypto.randomUUID());
const act = (state, action) => applyAmlAction(state, parseAmlAction({ revision: state.revision, ...action }));
const role = (state, value) => act(state, { type: "switch_role", role: value });
const admin = (state) => role(state, "administrator");
const scan = (state) => act(state, { type: "run_monitoring" });
const view = (state) => amlView(state);
const lastRun = (state) => view(state).runs.at(-1);
const rejection = (fn) => assert.throws(fn, (error) => [400, 409].includes(error.status));
const blankStr = { subjects: "", period: "", activity: "", suspicion: "", explanation: "" };
const completeStr = {
  subjects: "Synthetic Adrian Lam account HK-A001 and the counterparties identified in the cited transfers.",
  period: "1 November 2026, 10:00 to 10:30 HKT.",
  activity: "HKD 500,000 received and HKD 490,000 transferred to two recipients shortly afterwards.",
  suspicion: "The collection mandate and recipient relationships remain uncorroborated despite the enquiry.",
  explanation: "The customer described equipment purchases; the independent contact could not confirm authority.",
};

function newTx(state, id, patch = {}) {
  return {
    id, at: new Date(Date.parse(view(state).asOf) - 10 * 60_000).toISOString(),
    fromAccount: "HK-X001", toAccount: "HK-A001", amount: 250000,
    currency: "HKD", hkdAmount: 250000, channel: "CHATS", reference: "Synthetic test payment", status: "executed",
    ...patch,
  };
}
function add(state, id, patch) { return act(state, { type: "add_transaction", transaction: newTx(state, id, patch) }); }
function openCase(state = fresh(), alertId = view(state).alerts[0].id) {
  state = act(state, { type: "claim_alert", alertId });
  state = act(state, { type: "create_case", alertId, title: "Review of new-account settlement activity" });
  return state;
}
function addFinding(state, caseId = view(state).cases[0].id) {
  return act(state, { type: "add_finding", caseId, text: "The receiving account's declared salary activity does not explain the project receipt. Independent checks remain material.", transactionIds: [view(state).cases[0].transactionIds[0]], evidenceIds: ["HK-EV001"] });
}
function save(state, recommendation = "close", strDraft = blankStr) {
  return act(state, { type: "save_case", caseId: view(state).cases[0].id, narrative: "Compared the declared activity, transfer sequence and supporting records; the recommendation reflects the evidence currently available.", recommendation, strDraft });
}

test("initial alerts are generated from executed payments with immutable trigger evidence and legitimate lookalikes", () => {
  const state = fresh();
  const result = view(state);
  assert.equal(result.alerts.length, 3);
  assert.equal(result.runs.length, 1);
  assert.deepEqual(result.alerts.map((a) => a.accountId).sort(), ["HK-A001", "HK-A002", "HK-A003"]);
  const individual = result.alerts.find((a) => a.accountId === "HK-A001");
  assert.equal(individual.creditHkd, 500000);
  assert.equal(individual.debitHkd, 490000);
  assert.equal(individual.fanOutPercent, 98);
  assert.deepEqual([...individual.transactionIds].sort(), ["HK-T001", "HK-T002", "HK-T003"]);
  assert.equal(individual.rule.version, 1);
  assert.equal(result.alerts.find((a) => a.accountId === "HK-A003").creditHkd, 624000);
  assert(result.evidence.find((e) => e.id === "HK-EV003").body.includes("confirmed"));
  assert(result.alerts.some((a) => a.entityId === "HK-C002"), "a supported project-payment lookalike must still trigger the same numeric rule");
  assert(result.alerts.every((a) => !a.transactionIds.includes("HK-T004")), "pending payment is excluded");
  assert.equal(result.role, "analyst");
});

test("monitoring reruns deduplicate, parameter changes alter matches and preserve historical alerts", () => {
  let state = admin(fresh());
  const originalAlerts = structuredClone(view(state).alerts);
  state = scan(state);
  assert.equal(view(state).alerts.length, 3);
  assert.equal(lastRun(state).matchedAlertIds.length, 3);
  assert.equal(lastRun(state).newAlertIds.length, 0);
  state = act(state, { type: "configure_rule", rule: { ...view(state).rule, minCreditHkd: 10000000 } });
  state = scan(state);
  assert.equal(lastRun(state).matchedAlertIds.length, 0);
  assert.deepEqual(view(state).alerts, originalAlerts);
  assert.equal(view(state).rule.version, 2);
  state = act(state, { type: "configure_rule", rule: { ...view(state).rule, minCreditHkd: 100000 } });
  state = scan(state);
  assert.equal(lastRun(state).matchedAlertIds.length, 3);
  assert.equal(lastRun(state).newAlertIds.length, 3);
  assert.deepEqual(view(state).alerts.slice(0, 3), originalAlerts);
});

test("new executed payments generate a new alert, while an earlier debit and a pending debit do not", () => {
  let state = admin(fresh());
  const asOf = Date.parse(view(state).asOf);
  state = add(state, "TEST-IN");
  state = add(state, "TEST-BEFORE", { at: new Date(asOf - 11 * 60_000).toISOString(), fromAccount: "HK-A001", toAccount: "HK-X002", amount: 240000, hkdAmount: 240000 });
  state = add(state, "TEST-PENDING", { at: new Date(asOf - 9 * 60_000).toISOString(), fromAccount: "HK-A001", toAccount: "HK-X002", amount: 240000, hkdAmount: 240000, status: "pending" });
  state = scan(state);
  assert(!view(state).alerts.some((a) => a.transactionIds.includes("TEST-IN")));
  state = add(state, "TEST-AFTER", { at: new Date(asOf - 8 * 60_000).toISOString(), fromAccount: "HK-A001", toAccount: "HK-X002", amount: 240000, hkdAmount: 240000 });
  state = scan(state);
  const generated = view(state).alerts.find((a) => a.transactionIds.includes("TEST-IN"));
  assert(generated);
  assert.deepEqual([...generated.transactionIds].sort(), ["TEST-AFTER", "TEST-IN"]);
  assert.equal(generated.debitHkd, 240000);
  const count = view(state).alerts.length;
  state = scan(state);
  assert.equal(view(state).alerts.length, count);
  assert.equal(lastRun(state).newAlertIds.length, 0);
});

test("monitoring respects account age and the configured forward time window", () => {
  let state = admin(fresh());
  state = act(state, { type: "configure_rule", rule: { ...view(state).rule, windowMinutes: 7 } });
  state = scan(state);
  assert.equal(lastRun(state).matchedAlertIds.length, 0);
  state = act(state, { type: "configure_rule", rule: { ...view(state).rule, windowMinutes: 30, newAccountDays: 1 } });
  state = scan(state);
  assert.equal(lastRun(state).matchedAlertIds.length, 0);
});

test("server role checks, stale revisions and malformed input reject without changing state", () => {
  let state = fresh();
  const initial = JSON.stringify(state);
  rejection(() => act(state, { type: "run_monitoring" }));
  rejection(() => act(state, { type: "review_case", caseId: "missing", decision: "return", reason: "Further checks" }));
  rejection(() => applyAmlAction(state, parseAmlAction({ type: "claim_alert", alertId: view(state).alerts[0].id, revision: state.revision + 1 })));
  for (const input of [null, [], { type: "unknown", revision: 0 }, { type: "switch_role", revision: -1, role: "reviewer" }, { type: "switch_role", revision: 0, role: "owner" }]) {
    rejection(() => parseAmlAction(input));
  }
  assert.equal(JSON.stringify(state), initial);
  state = admin(state);
  rejection(() => act(state, { type: "claim_alert", alertId: view(state).alerts[0].id }));
  rejection(() => act(state, { type: "configure_rule", rule: { ...view(state).rule, minCreditHkd: -1 } }));
  rejection(() => act(state, { type: "configure_rule", rule: { ...view(state).rule, minFanOutPercent: 101 } }));
  rejection(() => act(state, { type: "configure_rule", rule: { ...view(state).rule, windowMinutes: 0 } }));
});

test("added ledger rows validate references, IDs, time, amounts, FX and FPS settlement state", () => {
  const state = admin(fresh());
  const snapshot = JSON.stringify(state);
  for (const patch of [
    { fromAccount: "missing" }, { toAccount: "missing" }, { fromAccount: "HK-A001", toAccount: "HK-A001" },
    { id: "HK-T001" }, { amount: -1 }, { amount: 1.5 }, { hkdAmount: 1 },
    { currency: "EUR" }, { channel: "unknown" }, { at: "invalid" },
    { at: new Date(Date.parse(view(state).asOf) + 60000).toISOString() },
    { currency: "USD", amount: 1000, hkdAmount: 1000 }, { channel: "FPS", status: "pending" },
    { currency: "USD", amount: 1000, hkdAmount: 7800, channel: "FPS" },
  ]) rejection(() => add(state, "TEST-INVALID", patch));
  assert.equal(JSON.stringify(state), snapshot);
  const updated = add(state, "TEST-USD", { currency: "USD", amount: 1000, hkdAmount: 7800, channel: "SWIFT" });
  assert.equal(view(updated).transactions.at(-1).hkdAmount, 7800);
});

test("alerts require a claim before disposition and a reason before closure", () => {
  let state = fresh();
  const alertId = view(state).alerts[0].id;
  rejection(() => act(state, { type: "create_case", alertId, title: "An investigation" }));
  rejection(() => act(state, { type: "close_alert", alertId, reason: "Records reconciled" }));
  state = act(state, { type: "claim_alert", alertId });
  state = act(state, { type: "release_alert", alertId });
  assert.equal(view(state).alerts[0].owner, "");
  state = act(state, { type: "claim_alert", alertId });
  rejection(() => act(state, { type: "close_alert", alertId, reason: "  " }));
  state = act(state, { type: "close_alert", alertId, reason: "Declared project activity reconciles to independently checked records." });
  assert.equal(view(state).alerts[0].status, "closed");
  assert(view(state).alerts[0].transactionIds.length > 0);
  rejection(() => act(state, { type: "claim_alert", alertId }));
});

test("an investigation case is distinct from alerts and can attach several claimed alerts", () => {
  let state = openCase();
  const first = view(state).cases[0];
  const secondId = view(state).alerts.find((a) => !first.alertIds.includes(a.id)).id;
  state = act(state, { type: "claim_alert", alertId: secondId });
  state = act(state, { type: "attach_alert", alertId: secondId, caseId: first.id });
  assert.equal(view(state).cases.length, 1);
  assert.equal(view(state).cases[0].alertIds.length, 2);
  assert.equal(view(state).cases[0].entityIds.length, 2);
  assert.equal(view(state).alerts.find((a) => a.id === secondId).caseId, first.id);
  rejection(() => act(state, { type: "create_case", alertId: secondId, title: "Duplicate investigation" }));
  rejection(() => act(state, { type: "close_alert", alertId: secondId, reason: "Cannot bypass the case review" }));
});

test("case findings validate source citations and submission requires findings and a narrative", () => {
  let state = openCase();
  const caseId = view(state).cases[0].id;
  rejection(() => act(state, { type: "submit_case", caseId }));
  for (const citations of [
    { transactionIds: [], evidenceIds: [] },
    { transactionIds: ["missing"], evidenceIds: [] },
    { transactionIds: ["HK-T012"], evidenceIds: [] },
    { transactionIds: [], evidenceIds: ["missing"] },
    { transactionIds: [], evidenceIds: ["HK-EV006"] },
  ]) rejection(() => act(state, { type: "add_finding", caseId, text: "Evidence needs to relate to this investigation.", ...citations }));
  state = addFinding(state);
  rejection(() => act(state, { type: "submit_case", caseId }));
  state = save(state);
  state = act(state, { type: "submit_case", caseId });
  assert.equal(view(state).cases[0].status, "pending_review");
  rejection(() => save(state));
  rejection(() => addFinding(state));
});

test("review return preserves findings and supports revision followed by approved closure", () => {
  let state = save(addFinding(openCase()));
  const caseId = view(state).cases[0].id;
  state = act(state, { type: "submit_case", caseId });
  state = role(state, "reviewer");
  rejection(() => act(state, { type: "review_case", caseId, decision: "return", reason: " " }));
  state = act(state, { type: "review_case", caseId, decision: "return", reason: "Explain the independent contact result before recommending closure." });
  assert.equal(view(state).cases[0].status, "returned");
  state = role(state, "analyst");
  state = addFinding(state);
  state = save(state);
  state = act(state, { type: "submit_case", caseId });
  state = role(state, "reviewer");
  rejection(() => act(state, { type: "review_case", caseId, decision: "approve_str", reason: "Cannot approve a different recommendation" }));
  state = act(state, { type: "review_case", caseId, decision: "approve_close", reason: "The revised note explains the available corroboration and remaining limits." });
  assert.equal(view(state).cases[0].status, "closed");
  assert.equal(view(state).cases[0].findings.length, 2);
  assert.equal(view(state).cases[0].reviews.length, 2);
  assert(view(state).cases[0].alertIds.every((id) => view(state).alerts.find((a) => a.id === id).status === "closed"));
  state = role(state, "analyst");
  rejection(() => save(state));
  assert.deepEqual(view(state).events.map((e) => e.seq), Array.from({ length: view(state).events.length }, (_, i) => i + 1));
});

test("STR submission requires structured content and approval remains a training draft", () => {
  let state = save(addFinding(openCase()), "str");
  const caseId = view(state).cases[0].id;
  rejection(() => act(state, { type: "submit_case", caseId }));
  state = save(state, "str", completeStr);
  state = act(state, { type: "submit_case", caseId });
  state = role(state, "reviewer");
  rejection(() => act(state, { type: "review_case", caseId, decision: "approve_close", reason: "Mismatched recommendation" }));
  state = act(state, { type: "review_case", caseId, decision: "approve_str", reason: "The draft explains the subjects, activity, reasons and unresolved explanation for training review." });
  assert.equal(view(state).cases[0].status, "str_approved");
  assert.deepEqual(view(state).cases[0].strDraft, completeStr);
  assert(!view(state).events.some((e) => /submitted_to_jfiu|account_frozen|payment_reversed/.test(e.type)));
  assert.equal(view(state).transactions.find((tx) => tx.id === "HK-T002").status, "executed");
});

const benchmarkRule = { minCreditHkd: 100000, minFanOutPercent: 80, windowMinutes: 30, newAccountDays: 30 };
const compare = (state, baseline = benchmarkRule, candidate = { ...benchmarkRule, windowMinutes: 60 }) => act(state, { type: "compare_rules", baseline, candidate });
const detectionMap = (arm) => Object.fromEntries(arm.scenarioMatches.map((match) => [match.scenarioId, match.alertIds.length > 0]));

test("five-episode comparison uses repeatable independent inputs and preserves the active investigation", () => {
  let state = admin(addFinding(openCase()));
  const active = structuredClone(view(state));
  state = compare(state);
  const result = view(state).comparisons[0];
  assert.equal(result.id, "CMP0001");
  assert(result.datasetVersion);
  assert.equal(result.dataset.scenarios.length, 5);
  assert.equal(result.baseline.alerts.length, 2);
  assert.equal(result.candidate.alerts.length, 4);
  assert.equal(result.baseline.transactionCount, result.candidate.transactionCount);
  assert.deepEqual(detectionMap(result.baseline), { BM01: true, BM02: true, BM03: false, BM04: false, BM05: false });
  assert.deepEqual(detectionMap(result.candidate), { BM01: true, BM02: true, BM03: true, BM04: true, BM05: false });
  for (const key of ["rule", "entities", "accounts", "transactions", "relationships", "evidence", "alerts", "cases", "runs"]) {
    assert.deepEqual(view(state)[key], active[key], `comparison must preserve active ${key}`);
  }
  for (const scenario of result.dataset.scenarios) {
    assert(result.dataset.accounts.some((account) => account.id === scenario.accountId));
    assert(scenario.transactionIds.every((id) => result.dataset.transactions.some((transaction) => transaction.id === id)));
    assert(scenario.evidenceIds.length > 0 && scenario.evidenceIds.every((id) => result.dataset.evidence.some((evidence) => evidence.id === id)));
  }
  const original = structuredClone(result);
  state = add(state, "UNRELATED-BENCHMARK-TX");
  state = compare(state);
  assert.deepEqual(view(state).comparisons[0], original, "saved comparison remains an immutable experiment snapshot");
  const repeated = view(state).comparisons[1];
  for (const key of ["datasetVersion", "asOf", "dataset", "baseline", "candidate"]) assert.deepEqual(repeated[key], original[key]);
  const reversed = view(compare(admin(fresh()), { ...benchmarkRule, windowMinutes: 60 }, benchmarkRule)).comparisons[0];
  assert.deepEqual(detectionMap(reversed.baseline), detectionMap(result.candidate));
  assert.deepEqual(detectionMap(reversed.candidate), detectionMap(result.baseline));
  assert.equal(reversed.baseline.alerts.length, 4);
  assert.equal(reversed.candidate.alerts.length, 2, "candidate must not inherit baseline alerts");
});

test("benchmark truth and quality scores are absent until explicit debrief, then report the intended tradeoff", () => {
  let state = admin(fresh());
  const eventStart = state.events.length;
  state = compare(state);
  const hidden = view(state).comparisons[0];
  assert(!Object.hasOwn(hidden, "debrief"));
  assert(!/"(?:answers|category|rationale|truePositives|falsePositives|falseNegatives|trueNegatives|precision|recall)"/.test(JSON.stringify(hidden)));
  assert(!/"(?:answers|category|rationale|truePositives|falsePositives|falseNegatives|trueNegatives|precision|recall)"/.test(JSON.stringify(state.events.slice(eventStart))));
  const snapshot = structuredClone(hidden);
  state = role(state, "analyst");
  state = act(state, { type: "reveal_comparison", comparisonId: hidden.id });
  const revealed = view(state).comparisons[0];
  const { debrief, ...experiment } = revealed;
  assert.deepEqual(experiment, snapshot);
  assert.equal(debrief.answers.length, 5);
  assert.deepEqual(Object.fromEntries(debrief.answers.map((answer) => [answer.scenarioId, answer.category])), {
    BM01: "suspicious", BM02: "legitimate", BM03: "suspicious", BM04: "legitimate", BM05: "legitimate",
  });
  assert(debrief.answers.every((answer) => answer.rationale.trim().length > 20));
  assert.deepEqual(debrief.baseline, { truePositives: 1, falsePositives: 1, falseNegatives: 1, trueNegatives: 2, precision: 0.5, recall: 0.5 });
  assert.deepEqual(debrief.candidate, { truePositives: 2, falsePositives: 2, falseNegatives: 0, trueNegatives: 1, precision: 0.5, recall: 1 });
  assert(Number.isFinite(Date.parse(debrief.revealedAt)));
  const freshComparison = view(compare(admin(state))).comparisons.at(-1);
  assert(!Object.hasOwn(freshComparison, "debrief"), "revealing one comparison does not reveal future comparisons");
});

test("a zero-alert comparison reports undefined precision as null and counts missed scenarios", () => {
  const noMatch = { ...benchmarkRule, minCreditHkd: 1000000000 };
  let state = compare(admin(fresh()), noMatch, noMatch);
  const comparison = view(state).comparisons[0];
  assert.equal(comparison.baseline.alerts.length, 0);
  assert.equal(comparison.candidate.alerts.length, 0);
  state = act(state, { type: "reveal_comparison", comparisonId: comparison.id });
  const expected = { truePositives: 0, falsePositives: 0, falseNegatives: 2, trueNegatives: 3, precision: null, recall: 0 };
  assert.deepEqual(view(state).comparisons[0].debrief.baseline, expected);
  assert.deepEqual(view(state).comparisons[0].debrief.candidate, expected);
});

test("comparison validation, revisions and run limits reject without partial changes", () => {
  const learner = fresh();
  rejection(() => compare(learner));
  let state = admin(learner);
  const original = JSON.stringify(state);
  for (const patch of [{ minCreditHkd: -1 }, { minFanOutPercent: 101 }, { windowMinutes: 0 }, { windowMinutes: 60.5 }, { newAccountDays: 366 }]) {
    rejection(() => compare(state, { ...benchmarkRule, ...patch }));
    rejection(() => compare(state, benchmarkRule, { ...benchmarkRule, ...patch }));
  }
  rejection(() => applyAmlAction(state, { type: "compare_rules", revision: state.revision - 1, baseline: benchmarkRule, candidate: benchmarkRule }));
  rejection(() => act(state, { type: "reveal_comparison", comparisonId: "CMP9999" }));
  assert.equal(JSON.stringify(state), original);
  for (let i = 0; i < 20; i++) state = compare(state);
  assert.equal(view(state).comparisons.length, 20);
  const full = JSON.stringify(state);
  rejection(() => compare(state));
  assert.equal(JSON.stringify(state), full);
});

test("pre-comparison saved sessions normalize missing comparison history without losing data", () => {
  const legacy = fresh();
  delete legacy.comparisons;
  assert.deepEqual(view(legacy).comparisons, []);
  const updated = compare(admin(legacy));
  assert.equal(view(updated).comparisons.length, 1);
  assert.deepEqual(view(updated).transactions, view(legacy).transactions);
});

const challengeRule = { ...benchmarkRule, windowMinutes: 60 };
const startChallenge = (state = fresh(), rule = challengeRule) => act(state, { type: "start_challenge", rule });
const challenge = (state) => state.challenges.at(-1);
const challengePublic = (state) => view(state).challenges.at(-1);
const checkChallenge = (state, scenarioId) => act(state, { type: "request_challenge_check", challengeId: challenge(state).id, scenarioId });
const decideChallenge = (state, scenarioId, decision) => act(state, { type: "decide_challenge", challengeId: challenge(state).id, scenarioId, decision, reason: "Reviewed the declared activity and supplied payment records before committing this disposition." });
const correctDecision = (state, scenarioId) => challenge(state).answers.find((answer) => answer.scenarioId === scenarioId).category === "suspicious" ? "escalate" : "clear";

test("challenge keeps answers and unrequested checks server-side without changing the active investigation", () => {
  let state = openCase();
  const active = view(state);
  state = startChallenge(state);
  const initial = challengePublic(state);
  assert.equal(initial.id, "CH0001");
  assert.equal(initial.status, "active");
  assert.equal(initial.elapsedMinutes, 0);
  assert.deepEqual(initial.limits, { shiftMinutes: 12, verificationMinutes: 2, decisionMinutes: 1, escalationCapacity: 2 });
  assert.equal(initial.dataset.scenarios.length, 5);
  assert.equal(initial.monitoring.alerts.length, 4);
  assert.deepEqual(initial.dataset.scenarios.map((row) => row.id).sort(), ["GS01", "GS02", "GS03", "GS04", "GS05"]);
  assert(initial.dataset.scenarios.every((row) => row.evidenceIds.length === 0));
  assert.equal(initial.dataset.evidence.length, 0);
  assert(!/"(?:answers|category|rationale|result|score|missedSuspicious|unnecessaryEscalations)"/.test(JSON.stringify(initial)));
  assert(!JSON.stringify(initial.dataset).includes("BM-"), "source fixture IDs must not disclose the answer mapping");
  for (const key of ["rule", "entities", "accounts", "transactions", "relationships", "evidence", "alerts", "cases", "runs", "comparisons"]) {
    assert.deepEqual(view(state)[key], active[key], `starting a challenge must preserve active ${key}`);
  }
  const scenarioId = initial.dataset.scenarios[0].id;
  state = checkChallenge(state, scenarioId);
  const checked = challengePublic(state);
  assert.equal(checked.elapsedMinutes, 2);
  assert.deepEqual(checked.verifiedScenarioIds, [scenarioId]);
  assert.equal(checked.dataset.evidence.length, 1);
  assert.deepEqual(checked.dataset.scenarios.find((row) => row.id === scenarioId).evidenceIds, [checked.dataset.evidence[0].id]);
  assert(checked.dataset.scenarios.filter((row) => row.id !== scenarioId).every((row) => row.evidenceIds.length === 0));
  assert(!/"(?:answers|category|rationale|result|score)"/.test(JSON.stringify(checked)));
  const snapshot = JSON.stringify(state);
  checked.dataset.evidence[0].body = "Client-side mutation must not alter authoritative evidence.";
  view(state);
  assert.equal(JSON.stringify(state), snapshot, "reading or editing a returned view cannot spend time or change evidence");
});

test("a fully reviewed challenge can win without treating detector matches as the scenario answer", () => {
  let state = startChallenge(fresh(), { ...challengeRule, minCreditHkd: 1000000000 });
  assert.equal(challengePublic(state).monitoring.alerts.length, 0);
  const ids = challenge(state).dataset.scenarios.map((row) => row.id);
  state = checkChallenge(state, ids[0]);
  state = checkChallenge(state, ids[1]);
  for (const id of ids) state = decideChallenge(state, id, correctDecision(state, id));
  const result = challengePublic(state);
  assert.equal(result.status, "won");
  assert.equal(result.elapsedMinutes, 9);
  assert.equal(result.decisions.length, 5);
  assert.equal(result.result.score, 100);
  assert.equal(result.result.missedSuspicious, 0);
  assert.equal(result.result.unnecessaryEscalations, 0);
  assert.equal(result.result.unresolved, 0);
  assert.equal(result.result.answers.length, 5);
  assert.equal(result.dataset.evidence.length, 5);
  assert(!Object.hasOwn(result, "answers"), "the private answer field is never serialized directly");
  assert(result.dataset.transactions.every((row) => row.status === "executed"), "game referrals must not pretend to reverse historical payments");
  const finished = JSON.stringify(state);
  rejection(() => checkChallenge(state, ids[2]));
  rejection(() => decideChallenge(state, ids[0], "clear"));
  rejection(() => act(state, { type: "end_challenge", challengeId: result.id }));
  assert.equal(JSON.stringify(state), finished);
  const savedAttempt = structuredClone(state.challenges[0]);
  state = startChallenge(state);
  assert.equal(state.challenges.length, 2);
  assert.deepEqual(state.challenges[0], savedAttempt, "starting a new shift retains the completed attempt on the server");
  assert.equal(view(state).challenges.length, 1, "prior attempts stay hidden while a new shift is active");
  assert.equal(challengePublic(state).status, "active");
  assert(!Object.hasOwn(challengePublic(state), "result"));
  state = act(state, { type: "end_challenge", challengeId: challenge(state).id });
  assert.deepEqual(view(state).challenges[0], result, "completed history returns after the active shift ends");
});

test("an active shift cannot read prior study answers, completed-game decisions or their audit trail", () => {
  let state = compare(admin(fresh()));
  state = act(state, { type: "reveal_comparison", comparisonId: view(state).comparisons[0].id });
  state = compare(state);
  const savedComparisons = structuredClone(state.comparisons);
  const unrevealedComparisonId = savedComparisons[1].id;
  state = startChallenge(state);
  for (const { id } of challenge(state).dataset.scenarios) state = decideChallenge(state, id, correctDecision(state, id));
  const completed = challengePublic(state);
  assert.equal(completed.status, "won");
  const savedAttempt = structuredClone(state.challenges[0]);
  const pastRefIds = new Set([completed.id, ...savedComparisons.map((row) => row.id)]);
  const savedPastEvents = structuredClone(state.events.filter((event) => pastRefIds.has(event.refId)));
  assert(savedPastEvents.some((event) => event.type === "decide_challenge"));
  state = startChallenge(state);
  const publicState = view(state);
  assert.equal(publicState.challenges.length, 1);
  assert.equal(publicState.challenges[0].id, challenge(state).id);
  assert.deepEqual(publicState.comparisons, []);
  assert(!publicState.events.some((event) => pastRefIds.has(event.refId)), "a prior perfect-game decision trace would disclose the hidden answer mapping");
  assert(!/"(?:answers|category|rationale|score|missedSuspicious|unnecessaryEscalations)"/.test(JSON.stringify(publicState.challenges)));
  assert.deepEqual(state.comparisons, savedComparisons);
  assert.deepEqual(state.challenges[0], savedAttempt);
  const playingSnapshot = JSON.stringify(state);
  rejection(() => compare(state));
  rejection(() => act(state, { type: "reveal_comparison", comparisonId: unrevealedComparisonId }));
  assert.equal(JSON.stringify(state), playingSnapshot);
  state = act(state, { type: "end_challenge", challengeId: challenge(state).id });
  assert.deepEqual(view(state).comparisons, savedComparisons);
  assert.deepEqual(view(state).challenges[0], completed);
  assert.deepEqual(view(state).events.filter((event) => pastRefIds.has(event.refId)), savedPastEvents);
  state = act(state, { type: "reveal_comparison", comparisonId: unrevealedComparisonId });
  assert.equal(view(state).comparisons[1].debrief.answers.length, 5);
});

test("clearing every episode genuinely fails the shift for missed suspicious activity", () => {
  let state = startChallenge();
  for (const { id } of challenge(state).dataset.scenarios) state = decideChallenge(state, id, "clear");
  const result = challengePublic(state);
  assert.equal(result.status, "lost");
  assert.equal(result.elapsedMinutes, 5);
  assert.equal(result.result.missedSuspicious, 2);
  assert.equal(result.result.unnecessaryEscalations, 0);
  assert.equal(result.result.unresolved, 0);
  assert(result.result.score < 100);
  assert(result.result.reasons.length > 0);
});

test("a third referral overloads capacity and ends the shift immediately", () => {
  let state = startChallenge();
  for (const { id } of challenge(state).dataset.scenarios.slice(0, 3)) state = decideChallenge(state, id, "escalate");
  const result = challengePublic(state);
  assert.equal(result.status, "lost");
  assert.equal(result.decisions.filter((row) => row.decision === "escalate").length, 3);
  assert.equal(result.elapsedMinutes, 3);
  assert.equal(result.result.unresolved, 2);
  assert(result.result.unnecessaryEscalations >= 1);
  assert(result.result.score < 100);
});

test("checking every source can exhaust the action clock before the backlog is resolved", () => {
  let state = startChallenge();
  const ids = challenge(state).dataset.scenarios.map((row) => row.id);
  for (const id of ids) state = checkChallenge(state, id);
  assert.equal(challengePublic(state).elapsedMinutes, 10);
  for (const id of ids.slice(0, 2)) state = decideChallenge(state, id, correctDecision(state, id));
  const result = challengePublic(state);
  assert.equal(result.status, "lost");
  assert.equal(result.elapsedMinutes, 12);
  assert.equal(result.result.unresolved, 3);
  assert(result.result.score < 100);
});

test("a check that cannot finish before the deadline does not count as completed", () => {
  let state = startChallenge();
  const ids = challenge(state).dataset.scenarios.map((row) => row.id);
  for (const id of ids.slice(0, 4)) state = checkChallenge(state, id);
  for (const id of ids.slice(0, 3)) state = decideChallenge(state, id, "clear");
  assert.equal(challengePublic(state).elapsedMinutes, 11);
  state = checkChallenge(state, ids[4]);
  const result = challengePublic(state);
  assert.equal(result.status, "lost");
  assert.equal(result.elapsedMinutes, 12);
  assert(!result.verifiedScenarioIds.includes(ids[4]));
  assert.equal(result.decisions.length, 3);
});

test("challenge actions reject invalid or repeated decisions and stale revisions atomically", () => {
  let state = startChallenge();
  const id = challenge(state).dataset.scenarios[0].id;
  const challengeId = challenge(state).id;
  const original = JSON.stringify(state);
  for (const input of [
    { type: "start_challenge", rule: challengeRule },
    { type: "request_challenge_check", challengeId, scenarioId: "missing" },
    { type: "end_challenge", challengeId: "missing" },
    { type: "decide_challenge", challengeId, scenarioId: id, decision: "freeze", reason: "A sufficiently long reason for this invalid decision." },
    { type: "decide_challenge", challengeId, scenarioId: id, decision: "clear", reason: "Too short" },
    { type: "decide_challenge", challengeId, scenarioId: id, decision: "clear", reason: "x".repeat(4001) },
  ]) rejection(() => act(state, input));
  rejection(() => applyAmlAction(state, { type: "end_challenge", challengeId, revision: state.revision - 1 }));
  assert.equal(JSON.stringify(state), original);
  state = checkChallenge(state, id);
  const checked = JSON.stringify(state);
  rejection(() => checkChallenge(state, id));
  assert.equal(JSON.stringify(state), checked);
  state = decideChallenge(state, id, "clear");
  const committed = JSON.stringify(state);
  rejection(() => decideChallenge(state, id, "escalate"));
  rejection(() => checkChallenge(state, id));
  assert.equal(JSON.stringify(state), committed);
  state = act(state, { type: "end_challenge", challengeId });
  assert.equal(challengePublic(state).status, "lost");
  assert.equal(challengePublic(state).result.unresolved, 4);
});

test("legacy saves can start challenges and twenty completed attempts remain bounded history", () => {
  let state = fresh();
  delete state.challenges;
  assert.deepEqual(view(state).challenges, []);
  const activeLedger = structuredClone(view(state).transactions);
  for (let i = 0; i < 20; i++) {
    state = startChallenge(state);
    state = act(state, { type: "end_challenge", challengeId: challenge(state).id });
  }
  assert.equal(view(state).challenges.length, 20);
  assert(view(state).challenges.every((row) => row.status === "lost"));
  assert.deepEqual(view(state).transactions, activeLedger);
  const full = JSON.stringify(state);
  rejection(() => startChallenge(state));
  assert.equal(JSON.stringify(state), full);
});
