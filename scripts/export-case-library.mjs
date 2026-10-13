#!/usr/bin/env node
/**
 * Package the eleven case-flow pages and the eleven case scripts for the API case library.
 *
 * From the repo root:
 *   node scripts/export-case-library.mjs          # writes workers/api/src/case-library.json
 *   node scripts/export-case-library.mjs --check  # compares only; writes nothing
 *
 * The output is server-only: it holds every choice rationale, rule note and teaching flow.
 */
import { existsSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const OUT = join(root, "workers/api/src/case-library.json");
const NOT_ENGLISH = /[\u3000-\u30ff\u3400-\u9fff\uff00-\uffef]/;
// Mermaid node definitions: id["label"] is a step, id{"label"} is a decision.
const NODE = /^\s*\w+(?:\["([^"]+)"\]|\{"([^"]+)"\})\s*$/;

function fail(message) {
  console.error(message);
  process.exit(1);
}

function plain(text) {
  return text.trim().replace(/\s*\n\s*/g, " ").replace(/\[([^\]]+)\]\([^)]+\)/g, "$1").replaceAll("`", "").replaceAll("**", "");
}

function paragraphs(text) {
  return text.split(/\n\s*\n/).map(plain).filter((p) => p && !p.startsWith("|"));
}

function readSection(text, page, name) {
  const fence = text?.match(/```mermaid\n([\s\S]*?)```/);
  if (!fence) fail(`${page}: "## ${name}" is missing or has no Mermaid diagram`);
  const steps = fence[1].split("\n").map((line) => line.match(NODE)).filter(Boolean)
    .map((match) => ({ label: match[1] ?? match[2], decision: match[2] !== undefined }));
  if (steps.length < 2) fail(`${page}: "## ${name}" diagram has fewer than two steps`);
  return { steps, before: paragraphs(text.slice(0, fence.index)), after: paragraphs(text.slice(fence.index + fence[0].length)) };
}

function field(list, prefix, page) {
  const found = list.find((p) => p.startsWith(prefix));
  if (!found) fail(`${page}: missing "${prefix}"`);
  const value = found.slice(prefix.length).trim();
  return value[0].toUpperCase() + value.slice(1);
}

const scriptFiles = readdirSync(join(root, "data/cases")).filter((file) => file.endsWith(".example.json")).sort();
const scripts = scriptFiles.map((file) => JSON.parse(readFileSync(join(root, "data/cases", file), "utf8")));
const caseIdByFile = new Map(scriptFiles.map((file, index) => [file, scripts[index].case_id]));

const pages = readdirSync(join(root, "data/case-flow")).filter((file) => file.endsWith(".en.md")).sort();
const workflows = pages.map((page) => {
  const markdown = readFileSync(join(root, "data/case-flow", page), "utf8");
  const heading = markdown.match(/^# (\d+)\. (.+)$/m);
  if (!heading || Number(heading[1]) !== Number(page.slice(0, 2))) fail(`${page}: first heading must be "# <number>. <title>" matching the file number`);
  const parts = Object.fromEntries(markdown.split(/^## /m).slice(1).map((part) => {
    const newline = part.indexOf("\n");
    return [part.slice(0, newline).trim(), part.slice(newline + 1)];
  }));
  const intro = markdown.split(/^## /m)[0];
  const caseIds = [...intro.matchAll(/\]\(\.\.\/cases\/([^)]+\.json)\)/g)].map((match) => {
    if (!caseIdByFile.has(match[1])) fail(`${page}: links to unknown script ${match[1]}`);
    return caseIdByFile.get(match[1]);
  });
  const real = readSection(parts["Real-world flow"], page, "Real-world flow");
  const teaching = readSection(parts["Platform teaching flow"], page, "Platform teaching flow");
  const method = real.before.find((p) => p.startsWith("Method and logic:")) ?? real.before[0];
  if (!method) fail(`${page}: the real-world flow needs an opening paragraph`);
  return {
    number: Number(heading[1]),
    title: heading[2].trim(),
    method: method.replace(/^Method and logic:\s*/, "").replace(/^./, (c) => c.toUpperCase()),
    realWorld: real.steps,
    role: field(teaching.before, "Trainee role:", page),
    goal: field(teaching.before, "Training goal:", page),
    teaching: teaching.steps,
    teachingNotes: teaching.after,
    caseIds,
  };
});

if (workflows.length !== 11) fail(`expected 11 case-flow pages, found ${workflows.length}`);
const linked = workflows.flatMap((workflow) => workflow.caseIds);
for (const script of scripts) {
  const count = linked.filter((id) => id === script.case_id).length;
  if (count !== 1) fail(`${script.case_id} is linked from ${count} case-flow pages; expected exactly one`);
}

const output = `${JSON.stringify({ workflows, scripts }, null, 2)}\n`;
if (NOT_ENGLISH.test(output)) fail("case library contains CJK text; TwinAML ships English only. Translate the source first.");

if (process.argv.includes("--check")) {
  if (!existsSync(OUT) || readFileSync(OUT, "utf8") !== output) fail("workers/api/src/case-library.json is stale. Run node scripts/export-case-library.mjs");
  console.log(`case-library.json is current: ${workflows.length} workflows, ${scripts.length} scripts.`);
} else {
  writeFileSync(OUT, output);
  console.log(`Wrote workers/api/src/case-library.json: ${workflows.length} workflows, ${scripts.length} scripts.`);
}
