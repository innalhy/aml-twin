#!/usr/bin/env node
/**
 * Validate data/cases/*.example.json against the script schema and the
 * effect-key grammar in docs/effects.md. Validate *.alerts.json against the
 * alert dossier schema. When the files pass, write data/cases/index.json.
 *
 * From the repo root:
 *   node scripts/validate-cases.mjs
 *
 * Ajv is loaded from the environment when it is already installed. Otherwise
 * the script installs ajv@8 under the OS temp directory (not in this repo).
 */
import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { existsSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const schemaPath = join(root, "packages/schemas/script.schema.json");
const alertsSchemaPath = join(root, "packages/schemas/alerts.schema.json");
const casesDir = join(root, "data/cases");
const maxScriptBytes = 24 * 1024;

async function loadAjv() {
  try {
    const mod = await import("ajv/dist/2020.js");
    return mod.default;
  } catch (err) {
    if (err?.code !== "ERR_MODULE_NOT_FOUND") throw err;
  }
  const prefix = join(tmpdir(), "twinaml-validate-ajv");
  const entry = join(prefix, "node_modules/ajv/dist/2020.js");
  if (!existsSync(entry)) {
    const install = spawnSync("npm", ["install", "--silent", "--prefix", prefix, "ajv@8"], {
      stdio: "inherit",
    });
    if (install.status !== 0) {
      console.error("Install ajv@8, then re-run this script.");
      process.exit(install.status || 1);
    }
  }
  const mod = await import(pathToFileURL(entry).href);
  return mod.default;
}

const Ajv2020 = await loadAjv();
const schema = JSON.parse(readFileSync(schemaPath, "utf8"));
const alertsSchema = JSON.parse(readFileSync(alertsSchemaPath, "utf8"));
const ajv = new Ajv2020({ allErrors: true, strict: false });
const validate = ajv.compile(schema);
const validateAlerts = ajv.compile(alertsSchema);

const files = readdirSync(casesDir)
  .filter((name) => name.endsWith(".example.json"))
  .sort();

if (files.length === 0) {
  console.error("No data/cases/*.example.json files found.");
  process.exit(1);
}

const errors = [];

function fail(file, message) {
  errors.push(`${file}: ${message}`);
}

function sha256(raw) {
  return createHash("sha256").update(raw).digest("hex");
}

function collectFlags(patch, into) {
  if (patch === undefined || patch === null || typeof patch !== "object" || Array.isArray(patch)) return;
  for (const [key, value] of Object.entries(patch)) {
    if (key.endsWith("flags_add") && Array.isArray(value)) {
      for (const item of value) {
        if (typeof item === "string") into.add(item);
      }
    }
  }
}

function parentOf(state, parts) {
  let current = state;
  for (let i = 0; i < parts.length - 1; i += 1) {
    const key = parts[i];
    if (current === null || typeof current !== "object" || Array.isArray(current) || !(key in current)) {
      return null;
    }
    current = current[key];
  }
  if (current === null || typeof current !== "object" || Array.isArray(current)) return null;
  return current;
}

function checkPatch(file, state, patch, where) {
  if (patch === undefined) return;
  if (patch === null || typeof patch !== "object" || Array.isArray(patch)) {
    fail(file, `${where} patch is not an object`);
    return;
  }
  for (const [key, value] of Object.entries(patch)) {
    if (key.length === 0 || key.startsWith(".") || key.endsWith(".") || key.includes("..")) {
      fail(file, `${where} has an empty path segment in "${key}"`);
      continue;
    }
    const parts = key.split(".");
    const last = parts[parts.length - 1];
    if (last === "flags_add") {
      if (!Array.isArray(value) || value.some((item) => typeof item !== "string")) {
        fail(file, `${where} ${key} must be an array of strings`);
      }
      const targetParts = parts.slice(0, -1).concat("flags");
      const parent = parentOf(state, targetParts);
      const leaf = targetParts[targetParts.length - 1];
      if (!parent || !Array.isArray(parent[leaf])) {
        fail(file, `${where} ${key} needs an existing array at ${targetParts.join(".")}`);
      }
      continue;
    }
    if (last === "score_delta") {
      if (typeof value !== "number" || !Number.isFinite(value)) {
        fail(file, `${where} ${key} must be a finite number`);
      }
      const targetParts = parts.slice(0, -1).concat("score");
      const parent = parentOf(state, targetParts);
      const leaf = targetParts[targetParts.length - 1];
      if (!parent || typeof parent[leaf] !== "number") {
        fail(file, `${where} ${key} needs an existing number at ${targetParts.join(".")}`);
      }
      continue;
    }
    if (last.endsWith("_add") || last.endsWith("_delta")) {
      fail(file, `${where} ${key} uses an undefined suffix. Defined suffixes are flags_add and score_delta.`);
      continue;
    }
    const parent = parentOf(state, parts);
    if (!parent) {
      fail(file, `${where} ${key} has no parent object on initial_twin_state`);
    }
  }
}

const parsed = [];

for (const file of files) {
  const raw = readFileSync(join(casesDir, file));
  const data = JSON.parse(raw.toString("utf8"));
  if (!validate(data)) {
    const detail = (validate.errors || [])
      .map((err) => `${err.instancePath || "/"} ${err.message}`)
      .join("; ");
    fail(file, `schema ${detail}`);
    continue;
  }

  const before = errors.length;
  const ids = data.nodes.map((node) => node.id);
  const seen = new Set();
  for (const id of ids) {
    if (seen.has(id)) fail(file, `duplicate node id ${id}`);
    seen.add(id);
  }
  if (!seen.has(data.start_node_id)) {
    fail(file, `start_node_id ${data.start_node_id} is missing`);
  }

  for (const node of data.nodes) {
    if (node.type === "scene" && !node.next) {
      fail(file, `scene ${node.id} has no next`);
    }
    if (node.type === "outcome" && node.terminal !== true) {
      fail(file, `outcome ${node.id} is not terminal`);
    }
    if (node.next && !seen.has(node.next)) {
      fail(file, `node ${node.id} next ${node.next} is missing`);
    }
    if (node.twin_patch && Object.prototype.hasOwnProperty.call(node.twin_patch, "disposition") && node.type !== "outcome") {
      fail(file, `node ${node.id} writes disposition outside an outcome`);
    }
    checkPatch(file, data.initial_twin_state, node.twin_patch, `node ${node.id} twin_patch`);
    for (const choice of node.choices || []) {
      if (!seen.has(choice.next)) {
        fail(file, `choice ${choice.id} next ${choice.next} is missing`);
      }
      checkPatch(file, data.initial_twin_state, choice.effects, `choice ${node.id}/${choice.id} effects`);
    }
  }

  if (raw.length > maxScriptBytes) {
    fail(file, `script is ${raw.length} bytes; the limit is ${maxScriptBytes} (24 KiB)`);
  }
  const added = new Set();
  for (const node of data.nodes) {
    collectFlags(node.twin_patch, added);
    for (const choice of node.choices || []) collectFlags(choice.effects, added);
  }
  const listed = new Set();
  for (const rule of data.rules || []) {
    for (const flag of rule.flags || []) {
      listed.add(flag);
      if (!added.has(flag)) {
        fail(file, `rule ${rule.id} flag ${flag} is not written by flags_add`);
      }
    }
  }
  for (const flag of added) {
    if (/^R\d+_/.test(flag) && !listed.has(flag)) {
      fail(file, `flag ${flag} is a rule flag and is not listed on rules[].flags`);
    }
  }
  if (errors.length === before) {
    parsed.push({ file, data, bytes: raw.length, sha256: sha256(raw) });
  }
}

const alertsByCase = new Map();
const byCase = new Map(parsed.map((row) => [row.data.case_id, row]));
const alertFiles = readdirSync(casesDir)
  .filter((name) => name.endsWith(".alerts.json"))
  .sort();

for (const file of alertFiles) {
  const raw = readFileSync(join(casesDir, file));
  let data;
  try {
    data = JSON.parse(raw.toString("utf8"));
  } catch (err) {
    fail(file, `JSON ${err.message}`);
    continue;
  }
  if (!validateAlerts(data)) {
    const detail = (validateAlerts.errors || [])
      .map((err) => `${err.instancePath || "/"} ${err.message}`)
      .join("; ");
    fail(file, `schema ${detail}`);
    continue;
  }
  const script = byCase.get(data.case_id);
  if (!script) {
    fail(file, `case_id ${data.case_id} does not match a script`);
    continue;
  }
  if (alertsByCase.has(data.case_id)) {
    fail(file, `duplicate alerts for ${data.case_id}`);
    continue;
  }
  const choiceIds = new Set();
  for (const node of script.data.nodes) {
    for (const choice of node.choices || []) choiceIds.add(choice.id);
  }
  const seenAlert = new Set();
  for (const alert of data.alerts) {
    if (seenAlert.has(alert.id)) fail(file, `duplicate alert id ${alert.id}`);
    seenAlert.add(alert.id);
    const correct = new Set(alert.correct);
    for (const key of alert.acceptable) {
      if (correct.has(key)) fail(file, `${alert.id} lists ${key} as both correct and acceptable`);
    }
    for (const [key, choiceId] of Object.entries(alert.script_choice)) {
      if (!choiceIds.has(choiceId)) {
        fail(file, `${alert.id} script_choice.${key} ${choiceId} is not a choice on ${data.case_id}`);
      }
    }
  }
  if (!errors.some((line) => line.startsWith(`${file}:`))) {
    alertsByCase.set(data.case_id, { file, bytes: raw.length, sha256: sha256(raw) });
  }
}

if (errors.length === 0) {
  const { runDeepfakePathTests } = await import("./deepfake-paths.test.mjs");
  const played = runDeepfakePathTests();
  console.log(`Played ${played.assertedTerminalPaths} deepfake-hk-001 terminal paths.`);
  const index = {
    schema_version: "0.1",
    cases: parsed
      .sort((a, b) => a.file.localeCompare(b.file))
      .map((row) => {
        const item = {
          case_id: row.data.case_id,
          file: row.file,
          sha256: row.sha256,
          bytes: row.bytes,
          locale: row.data.locale || "",
          case_kind: row.data.teaching?.case_kind ?? null,
        };
        const alerts = alertsByCase.get(row.data.case_id);
        if (alerts) {
          item.alerts_file = alerts.file;
          item.alerts_sha256 = alerts.sha256;
          item.alerts_bytes = alerts.bytes;
        }
        return item;
      }),
  };
  writeFileSync(join(casesDir, "index.json"), `${JSON.stringify(index, null, 2)}\n`);
}

if (errors.length > 0) {
  for (const line of errors) console.error(line);
  console.error(`${errors.length} error(s) in ${files.length} case file(s).`);
  process.exit(1);
}

console.log(
  `Validated ${files.length} case file(s) and ${alertFiles.length} alert file(s). Wrote data/cases/index.json.`,
);
