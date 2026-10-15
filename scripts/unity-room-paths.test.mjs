#!/usr/bin/env node
/**
 * The Unity room plays these choice lists through the frozen schema 0.1 applier.
 * From the repo root:
 *   node scripts/unity-room-paths.test.mjs
 *
 * Keep the lists aligned with unity/TwinAML/Assets/Scripts/Flow/RoomPaths.cs.
 */
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { play } from "./apply-effects.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

function load(file) {
  return JSON.parse(readFileSync(join(root, "data/cases", file), "utf8"));
}

function flags(twin) {
  return twin.risk.flags;
}

function has(twin, flag) {
  return flags(twin).includes(flag);
}

const deepfake = load("01-deepfake-hk-001.example.json");
const mule = load("06-greythunder-mule-001.example.json");

const cases = [
  {
    name: "T01 confirm_pay trap",
    script: deepfake,
    choices: ["pass_video", "clear_alert"],
    disposition: "false_positive_cleared",
    poor: true,
    requireFlags: ["KYC_SIGNALS_WAIVED", "THIRD_PARTY_BURST", "R2_IGNORED"],
    forbidFlags: ["STR_DRAFTED", "R1_BLOCK"],
    opened: true,
  },
  {
    name: "T01 hold_and_report pass",
    script: deepfake,
    choices: ["redo_liveness", "follow_r1"],
    disposition: "blocked_by_rule",
    poor: false,
    requireFlags: ["R1_BLOCK"],
    forbidFlags: ["R2_IGNORED", "STR_DRAFTED", "KYC_SIGNALS_WAIVED"],
    opened: false,
    liveness: 2,
  },
  {
    name: "T02 A_clear trap",
    script: mule,
    choices: ["release_friend", "clear_friend"],
    disposition: "false_positive_cleared",
    poor: true,
    requireFlags: ["MULE_CLUSTER", "CLUSTER_WAIVED", "FRAUD_PROCEEDS", "R2_IGNORED"],
    forbidFlags: ["STR_DRAFTED", "EDD_ORDERED"],
  },
  {
    name: "T02 B_edd pass",
    script: mule,
    choices: ["edd_cluster", "hold", "exit_rel"],
    disposition: "account_exit",
    poor: false,
    requireFlags: ["MULE_CLUSTER", "EDD_ORDERED", "EDD_HOLD", "UNKNOWN_PAYERS", "FRAUD_PROCEEDS", "RELATIONSHIP_EXIT"],
    forbidFlags: ["STR_DRAFTED", "R2_IGNORED"],
    hold: true,
  },
  {
    name: "T02 C_hold pass",
    script: mule,
    choices: ["restrict", "hold", "exit_rel"],
    disposition: "account_exit",
    poor: false,
    requireFlags: ["MULE_CLUSTER", "EDD_HOLD", "UNKNOWN_PAYERS", "FRAUD_PROCEEDS", "RELATIONSHIP_EXIT"],
    forbidFlags: ["STR_DRAFTED", "EDD_ORDERED", "R2_IGNORED"],
    hold: true,
  },
  {
    name: "T02 D_str pass",
    script: mule,
    choices: ["edd_cluster", "hold", "str_freeze"],
    disposition: "freeze_recommended",
    poor: false,
    requireFlags: ["MULE_CLUSTER", "EDD_ORDERED", "EDD_HOLD", "FRAUD_PROCEEDS", "STR_DRAFTED", "FREEZE_RECOMMENDED"],
    forbidFlags: ["R2_IGNORED"],
    hold: true,
  },
];

let failed = 0;
for (const item of cases) {
  const { twin, nodeId } = play(item.script, item.choices);
  const problems = [];
  if (twin.disposition !== item.disposition) {
    problems.push(`disposition ${twin.disposition} != ${item.disposition}`);
  }
  const poor = item.script.teaching.poor_dispositions.includes(twin.disposition);
  const acceptable = item.script.teaching.acceptable_dispositions.includes(twin.disposition);
  if (item.poor !== poor) problems.push(`poor flag ${poor} != ${item.poor}`);
  if (item.poor && acceptable) problems.push("poor disposition is also listed as acceptable");
  if (!item.poor && !acceptable) problems.push(`${twin.disposition} is not an acceptable disposition`);
  for (const flag of item.requireFlags) {
    if (!has(twin, flag)) problems.push(`missing flag ${flag}`);
  }
  for (const flag of item.forbidFlags) {
    if (has(twin, flag)) problems.push(`unexpected flag ${flag}`);
  }
  if (item.opened !== undefined && twin.account.opened !== item.opened) {
    problems.push(`account.opened ${twin.account.opened}`);
  }
  if (item.liveness !== undefined && twin.kyc.liveness_failures !== item.liveness) {
    problems.push(`liveness_failures ${twin.kyc.liveness_failures}`);
  }
  if (item.hold) {
    const holds = twin.account.holds || [];
    if (!holds.includes("outbound")) problems.push("expected outbound hold");
  }
  if (!nodeId) problems.push("no terminal node");
  if (problems.length > 0) {
    failed += 1;
    console.error(`FAIL ${item.name} (${nodeId})`);
    for (const problem of problems) console.error(`  ${problem}`);
  } else {
    console.log(`ok ${item.name} -> ${twin.disposition} [${flags(twin).join(", ")}]`);
  }
}

if (deepfake.case_id !== "deepfake-hk-001") {
  failed += 1;
  console.error("FAIL deepfake case_id");
}
if (mule.case_id !== "hk-greythunder-mule-001") {
  failed += 1;
  console.error("FAIL greythunder case_id");
}

if (failed > 0) {
  console.error(`${failed} unity room path(s) failed`);
  process.exit(1);
}
console.log("unity room paths match schema 0.1");
