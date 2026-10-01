#!/usr/bin/env node
/**
 * Validate data/cases/*.example.json against the script schema and the
 * effect-key grammar in docs/effects.md.
 *
 * From the repo root:
 *   node scripts/validate-cases.mjs
 *
 * Ajv is loaded from the environment when it is already installed. Otherwise
 * the script installs ajv@8 under the OS temp directory (not in this repo).
 */
import { spawnSync } from "node:child_process";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const schemaPath = join(root, "packages/schemas/script.schema.json");
const casesDir = join(root, "data/cases");

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
const ajv = new Ajv2020({ allErrors: true, strict: false });
const validate = ajv.compile(schema);

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

for (const file of files) {
  const data = JSON.parse(readFileSync(join(casesDir, file), "utf8"));
  if (!validate(data)) {
    const detail = (validate.errors || [])
      .map((err) => `${err.instancePath || "/"} ${err.message}`)
      .join("; ");
    fail(file, `schema ${detail}`);
    continue;
  }

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
}

if (errors.length === 0) {
  const { runDeepfakePathTests } = await import("./deepfake-paths.test.mjs");
  const played = runDeepfakePathTests();
  console.log(`Played ${played.assertedTerminalPaths} deepfake-hk-001 terminal paths.`);
}

if (errors.length > 0) {
  for (const line of errors) console.error(line);
  console.error(`${errors.length} error(s) in ${files.length} case file(s).`);
  process.exit(1);
}

console.log(`Validated ${files.length} case file(s) against script schema 0.1 and docs/effects.md.`);
