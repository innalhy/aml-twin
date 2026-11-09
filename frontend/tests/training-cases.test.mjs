import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { pathToFileURL } from "node:url";
import { test } from "node:test";
import { build } from "esbuild";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";

const require = createRequire(import.meta.url);
const result = await build({
  entryPoints: [new URL("../src/CaseLibrary.tsx", import.meta.url).pathname],
  bundle: true, write: false, platform: "node", format: "esm", jsx: "automatic",
  loader: { ".css": "empty" }, define: { "import.meta.env.VITE_API_URL": '""' },
  plugins: [{ name: "react-imports", setup(builder) {
    builder.onResolve({ filter: /^react(?:\/.+)?$/ }, (args) => ({ path: pathToFileURL(require.resolve(args.path)).href, external: true }));
  } }],
});
const { TrainingTopics, TrainingPlayer } = await import(`data:text/javascript;base64,${Buffer.from(result.outputFiles[0].text).toString("base64")}`);
const workflow = { number: 1, title: "Deepfake executive impersonation", goal: "Review the request.", role: "Finance officer", method: "Unreleased scheme explanation", realWorld: [] };
const node = (id, type, title, prompt) => ({ id, type, title, prompt, mediaRef: "", chosen: "" });
const run = {
  id: "test-run", caseId: "project-meridian-001", revision: 0, title: "Project Meridian",
  summary: "A payment request awaits your review.", workflow,
  story: [node("brief_context", "scene", "Your assignment", "Read your desk file.\n\nCheck the details."), node("brief_decision", "decision", "Project Meridian", "Start with the email.")],
  choices: [{ id: "open_email", label: "Open the email" }], rules: [{ id: "RULE", when: "Verify the source." }],
  twin: { phase: "brief" }, events: [], debrief: null,
};
const render = (Component, props) => renderToStaticMarkup(React.createElement(Component, props));

test("topics retain an active case and offer a read-only topic without a script", () => {
  const library = { workflows: [
    { ...workflow, cases: [{ caseId: "deepfake-001", title: "Original case", summary: "Original case" }, { caseId: "project-meridian-001", title: "Project Meridian", summary: "A payment request" }], walkthrough: null },
    { ...workflow, number: 3, title: "Synthetic identity fraud", cases: [], walkthrough: { teaching: [], teachingNotes: [] } },
  ] };
  const html = render(TrainingTopics, { library, run, busy: false, onStart() {} });
  assert.match(html, /Continue topic/);
  assert.match(html, /View overview/);
  assert.match(html, /More scenarios \(1\)/);
  assert.doesNotMatch(html, /Unreleased scheme explanation/);
});

test("the player renders the current decision and evidence before exposing teaching notes", () => {
  const html = render(TrainingPlayer, { run, busy: false, onChoose() {}, onReplay() {}, onLeave() {} });
  assert.match(html, /aria-current="step"/);
  assert.match(html, /Open the email/);
  assert.match(html, /Read your desk file/);
  assert.doesNotMatch(html, /Unreleased scheme explanation/);
  assert.doesNotMatch(html, /View teaching notes/);
});

test("an outcome shows the server rating and offers a deliberate step into teaching notes", () => {
  const completed = { ...run, story: [...run.story, node("outcome_safe", "outcome", "Payment paused", "The verification prevented a loss.")], choices: [],
    debrief: { rating: "acceptable", disposition: "payment_paused", decisions: [], rules: [], teaching: [], teachingNotes: ["Teaching explanation"] } };
  const html = render(TrainingPlayer, { run: completed, busy: false, onChoose() {}, onReplay() {}, onLeave() {} });
  assert.match(html, /Scenario completed successfully/);
  assert.match(html, /View teaching notes/);
  assert.doesNotMatch(html, /Teaching explanation/);
});
