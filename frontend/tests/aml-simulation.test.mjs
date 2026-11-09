import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { pathToFileURL } from "node:url";
import { test } from "node:test";
import { build } from "esbuild";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";

const require = createRequire(import.meta.url);
const built = await build({
  entryPoints: [new URL("../src/AmlSimulation.tsx", import.meta.url).pathname],
  bundle: true, write: false, platform: "node", format: "esm", jsx: "automatic",
  loader: { ".css": "empty" }, define: { "import.meta.env.VITE_API_URL": '""' },
  plugins: [{ name: "react-imports", setup(builder) {
    builder.onResolve({ filter: /^react(?:\/.+)?$/ }, (args) => ({ path: pathToFileURL(require.resolve(args.path)).href, external: true }));
  } }],
});
const { SimulationRunSummary, SimulationEvidenceList, SimulationDebrief, buildBlindReviewPacket } = await import(`data:text/javascript;base64,${Buffer.from(built.outputFiles[0].text).toString("base64")}`);
const render = (Component, props) => renderToStaticMarkup(React.createElement(Component, props));
const simulation = {
  datasetVersion: "sim-v1", policyVersion: "policy-v1", rubricVersion: "rubric-v1", validationStatus: "unvalidated",
  elapsedMinutes: 7, endMinute: 60, ended: false, briefing: "Review the account records.", balanceHkd: 190000, held: false,
  requests: [], evidence: [], controls: [], decisions: [], reviews: [],
  payments: [{ id: "P1", fromAccount: "A1", toAccount: "A2", amountHkd: 30000, dueMinute: 12, status: "pending", executedMinute: null }],
  debrief: { scenarioContext: "Hidden scenario context", outcome: "Final consequence", observations: ["Hidden observation"], procedure: [{ label: "Cited available records", complete: true }], limitations: ["Authored synthetic assumptions"] },
};

test("the debrief stays hidden until the server marks the simulation ended", () => {
  const html = render(SimulationDebrief, { view: { simulation } });
  assert.match(html, /available after you end/);
  assert.doesNotMatch(html, /Hidden scenario context|Final consequence|Hidden observation/);
  const completed = render(SimulationDebrief, { view: { simulation: { ...simulation, ended: true } } });
  assert.match(completed, /Hidden scenario context/);
  assert.match(completed, /Practitioner validation pending/);
  assert.match(completed, /Reasoning quality requires human review/);
});

test("the run summary reflects the server balance, deadline and operational hold status", () => {
  const html = render(SimulationRunSummary, { view: { simulation } });
  assert.match(html, /Account remains unrestricted/);
  assert.match(html, /Due at minute 12 · 5 min remaining/);
  assert.match(html, /value="7"/);
  const held = render(SimulationRunSummary, { view: { simulation: { ...simulation, held: true, payments: [{ ...simulation.payments[0], status: "held" }] } } });
  assert.match(held, /Outbound restriction applied/);
  assert.match(held, /No pending unrestricted payment/);
});

test("source records carry provenance, release time and explicit citation controls", () => {
  const html = render(SimulationEvidenceList, { evidence: [{ id: "EV1", title: "Customer response", source: "Recorded customer call", body: "The explanation is uncorroborated.", availableMinute: 6, reliability: "Customer statement; independent check outstanding" }], citations: ["EV1"], onToggle() {}, disabled: false });
  assert.match(html, /Available from minute 6/);
  assert.match(html, /Recorded customer call/);
  assert.match(html, /independent check outstanding/);
  assert.match(html, /type="checkbox"[^>]*checked/);
  assert.match(html, /Read source record/);
});

test("blind review packets exclude later records, outcomes and previous ratings", () => {
  const start = Date.parse("2026-06-18T02:00:00Z");
  const decision = { id: "D1", disposition: "continue_review", reason: "The available information remains unresolved.", evidenceIds: ["EV1"], availableEvidenceIds: ["EV1"], alternativeExplanation: "A supported supplier payment remains possible.", missingInformation: "An independent supplier confirmation is outstanding.", minute: 5 };
  const view = { id: "review-run", asOf: new Date(start + 20 * 60000).toISOString(), entities: [], accounts: [], rule: { version: 1 },
    transactions: [
      { id: "T1", at: new Date(start - 60000).toISOString(), status: "executed" },
      { id: "P1", at: new Date(start + 4 * 60000).toISOString(), status: "executed" },
      { id: "T2", at: new Date(start + 12 * 60000).toISOString(), status: "executed" },
    ],
    simulation: { ...simulation, elapsedMinutes: 20, ended: true, decisions: [decision],
      payments: [{ ...simulation.payments[0], dueMinute: 4, executedMinute: 14, status: "executed" }],
      evidence: [{ id: "EV1", title: "Initial record", body: "Available source", availableMinute: 0 }, { id: "EV2", title: "Later response", body: "Later corroboration", availableMinute: 9 }],
      reviews: [{ reason: "Earlier reviewer judgment", rubric: { evidence: 4 } }],
    },
  };
  const packet = buildBlindReviewPacket(view);
  assert.equal(packet.submissions[0].at, "2026-06-18T02:05:00.000Z");
  assert.deepEqual(packet.submissions[0].evidence.map((record) => record.id), ["EV1"]);
  assert.deepEqual(packet.submissions[0].transactions.map((row) => row.id), ["T1", "P1"]);
  assert.equal(packet.submissions[0].transactions[1].status, "not_executed_as_of_decision");
  assert.doesNotMatch(JSON.stringify(packet), /Later corroboration|Hidden scenario context|Final consequence|Earlier reviewer judgment/);
  assert.equal(packet.validationStatus, "unvalidated");
});
