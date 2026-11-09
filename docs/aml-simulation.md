# AML investigation simulation

Open **Simulation** in the portal at `/simulation`. This is an evolving bank-account investigation with a guided discrete-event clock, evidence requests, pending payments, an analyst assessment and a simulated reviewer handoff. The case library remains available for the older guided scripts.

## One authoritative world

Simulation runs use the existing `aml_sessions` SQLite table, account ownership, revision checks and Node/Worker adapters. The server's `AmlState` owns the ledger, account controls, requested checks, decisions and history. The frontend renders the learner-visible `AmlView`; it does not advance balances or infer a case outcome itself. Creating a simulation uses `POST /api/aml-simulations`; reads and actions use the existing `/api/aml-sessions/:id` routes.

The server assigns one of three authored variants with matching initial records: supporting independent evidence, contradictory independent evidence, or unresolved evidence. The assigned category stays private until the run ends. Clients cannot request a particular answer category. Scenario, classroom policy and rubric versions are pinned in the stored run. Earlier scripted and operations sessions keep their existing format and behavior.

## Investigation exercise

1. Review the customer profile, account history, current alert and queued payment instructions. Select source records as citations.
2. Request customer or independent checks. Each request has a source, response time and, where needed, a prerequisite. The response stays on the server until its due minute. Available records show provenance, reliability and their release time.
3. Advance one or five simulated minutes, or move to the next event. Reading does not consume time. Advancing processes every intervening due event; payment instructions and approved controls have consequences even when the learner is investigating something else.
4. As analyst, recommend a hold or release with a reason and visible evidence citations. The account is unchanged by this recommendation.
5. Switch to the simulated reviewer to approve or reject the request. An approved request takes a further two simulated minutes to apply. Holds affect pending transfers, not transfers already executed. Releasing a hold can execute overdue instructions.
6. Submit an assessment to close, continue investigation or escalate. Include a rationale, an alternative explanation, missing information and evidence citations. The server records the evidence available at that moment. A continued investigation recommendation does not automatically end the scenario.
7. As simulated reviewer, return or approve the assessment with comments and four rubric ratings. The rubric guide supplies behavior anchors for evidence use, alternative explanations, proportionality and documentation; those anchors are included in the blind review export. This is practice role play under the run owner's account; it is not an independently authenticated practitioner assessment.
8. End the simulation to settle the remaining scheduled events and read the authored context, payment outcomes, procedure checklist and review record. Export the public run and activity history for discussion.

## Realism and validation boundary

The mechanism is executable, but the scenario data, check durations, control delay and threshold parameters are authored teaching assumptions. The source and assumption register is [simulation-scenario-sources.md](simulation-scenario-sources.md). All variants are currently **unvalidated**: no practitioner calibration or independent learner-transfer study is claimed.

Automated checks cover mechanics: visible citations, chronological evidence, approval boundaries, balances, revision conflicts and persistence. Rationale length checks demonstrate form completeness only. Reasoning quality is assessed through the reviewer rubric; a high self-assigned practice rating is not evidence of professional competence. External practitioners can inspect exported records, apply the rubric blindly and record disagreements before the content is treated as practitioner-reviewed.

This is bank-analyst training with synthetic records. Chain observations are qualified source reports, not omniscient access to every bank or wallet. A training escalation does not file an STR or establish criminality. Account controls operate only inside the simulation.

## Checks

API: `npm run typecheck`, `npm test`, `npm run test:node` in `workers/api/`. Frontend: `npm run build` and `node --test tests/*.test.mjs` in `frontend/`. The simulation engine and HTTP tests cover delayed release, all three variants, controls, payment consequences, role gates, citations, stale revisions, ownership and restart persistence. Browser verification covers one complete investigation, an approval, an assessment, a debrief and responsive layouts.
