/**
 * Play every terminal path in deepfake-001 and check the twin
 * docs/effects.md says the machine should produce.
 *
 * From the repo root:
 *   node scripts/deepfake-paths.test.mjs
 *
 * scripts/validate-cases.mjs runs this after the static checks.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { applyPatch, play } from "./apply-effects.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const casePath = join(root, "data/cases/01-deepfake-hk-001.example.json");

const paths = [
  {
    choices: ["reject_onboarding"],
    outcome: "n_outcome_reject",
    disposition: "onboarding_rejected",
    status: "rejected",
    liveness: 0,
    opened: false,
    score: 20,
    flags: ["ONBOARDING_REJECTED"],
    transactions: 0,
  },
  {
    choices: ["redo_liveness", "follow_r1"],
    outcome: "n_outcome_blocked",
    disposition: "blocked_by_rule",
    status: "blocked_by_rule",
    liveness: 2,
    opened: false,
    score: 20,
    flags: ["R1_BLOCK"],
    transactions: 0,
  },
  {
    choices: ["pass_video", "file_str"],
    outcome: "n_outcome_str",
    disposition: "str_drafted",
    status: "passed",
    liveness: 0,
    opened: true,
    score: 45,
    flags: ["KYC_SIGNALS_WAIVED", "THIRD_PARTY_BURST", "STR_DRAFTED"],
    transactions: 3,
  },
  {
    choices: ["pass_video", "edd_hold"],
    outcome: "n_outcome_edd",
    disposition: "edd_hold",
    status: "passed",
    liveness: 0,
    opened: true,
    score: 45,
    flags: ["KYC_SIGNALS_WAIVED", "THIRD_PARTY_BURST", "EDD_HOLD"],
    holds: ["outbound"],
    transactions: 3,
  },
  {
    choices: ["pass_video", "clear_alert"],
    outcome: "n_outcome_miss",
    disposition: "false_positive_cleared",
    status: "passed",
    liveness: 0,
    opened: true,
    score: 45,
    flags: ["KYC_SIGNALS_WAIVED", "THIRD_PARTY_BURST", "R2_IGNORED"],
    transactions: 3,
  },
  {
    choices: ["redo_liveness", "override_r1", "file_str"],
    outcome: "n_outcome_str",
    disposition: "str_drafted",
    status: "passed_by_override",
    liveness: 2,
    opened: true,
    score: 60,
    flags: ["R1_OVERRIDDEN", "THIRD_PARTY_BURST", "STR_DRAFTED"],
    transactions: 3,
  },
  {
    choices: ["redo_liveness", "override_r1", "edd_hold"],
    outcome: "n_outcome_edd",
    disposition: "edd_hold",
    status: "passed_by_override",
    liveness: 2,
    opened: true,
    score: 60,
    flags: ["R1_OVERRIDDEN", "THIRD_PARTY_BURST", "EDD_HOLD"],
    holds: ["outbound"],
    transactions: 3,
  },
  {
    choices: ["redo_liveness", "override_r1", "clear_alert"],
    outcome: "n_outcome_miss",
    disposition: "false_positive_cleared",
    status: "passed_by_override",
    liveness: 2,
    opened: true,
    score: 60,
    flags: ["R1_OVERRIDDEN", "THIRD_PARTY_BURST", "R2_IGNORED"],
    transactions: 3,
  },
];

export function runDeepfakePathTests() {
  const script = JSON.parse(readFileSync(casePath, "utf8"));
  const initial = JSON.stringify(script.initial_twin_state);
  const burst = script.nodes.find((node) => node.id === "n_burst");

  for (const path of paths) {
    const { twin, nodeId } = play(script, path.choices);
    assert.equal(nodeId, path.outcome, path.choices.join(" → "));
    assert.equal(twin.phase, "closed", path.choices.join(" → "));
    assert.equal(twin.disposition, path.disposition, path.choices.join(" → "));
    assert.equal(twin.kyc.status, path.status, path.choices.join(" → "));
    assert.equal(twin.kyc.liveness_failures, path.liveness, path.choices.join(" → "));
    assert.equal(twin.account.opened, path.opened, path.choices.join(" → "));
    assert.equal(twin.risk.score, path.score, path.choices.join(" → "));
    assert.deepEqual(twin.risk.flags, path.flags, path.choices.join(" → "));
    assert.equal(twin.transactions.length, path.transactions, path.choices.join(" → "));
    if (path.holds) {
      assert.deepEqual(twin.account.holds, path.holds, path.choices.join(" → "));
    } else {
      assert.equal(Object.hasOwn(twin.account, "holds"), false, path.choices.join(" → "));
    }
    if (path.transactions > 0) {
      assert.notEqual(twin.transactions, burst.twin_patch.transactions);
      assert.deepEqual(twin.transactions.map((transaction) => transaction.amount), [480000, 230000, 240000]);
    }
    assert.deepEqual(twin.kyc.signals, ["blink_interval_irregular", "lighting_inconsistent"]);
  }

  assert.equal(JSON.stringify(script.initial_twin_state), initial);

  const grammar = { risk: { score: 20, flags: ["A"] }, account: { opened: false } };
  applyPatch(grammar, {
    "risk.flags_add": ["A", "B"],
    "risk.score_delta": 1000,
    "account.holds": ["outbound"],
  });
  assert.deepEqual(grammar.risk.flags, ["A", "B"]);
  assert.equal(grammar.risk.score, 1020);
  applyPatch(grammar, { "account.holds": [] });
  assert.deepEqual(grammar.account.holds, []);
  assert.throws(
    () => applyPatch({ risk: { score: 1, flags: [] } }, { "risk.total_delta": 1 }),
    /undefined suffix/,
  );
  assert.throws(() => applyPatch({ account: { opened: false } }, { "missing.leaf": true }), /no parent/);

  const sample = play(script, ["pass_video", "file_str"]);
  return {
    assertedTerminalPaths: paths.length,
    sample: {
      score: sample.twin.risk.score,
      disposition: sample.twin.disposition,
      flags: sample.twin.risk.flags,
      phase: sample.twin.phase,
    },
  };
}

function main() {
  const played = runDeepfakePathTests();
  console.log(`Played ${played.assertedTerminalPaths} deepfake-001 terminal paths.`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main();
}
