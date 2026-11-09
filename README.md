# TwinAML

## What it is?

**Open Simulation at `/simulation` for an AML investigation exercise.** The server assigns a hidden evidence variant, advances a 60-minute discrete-event clock, releases requested checks on schedule and processes pending transfers. Analyst control recommendations require a separate simulated reviewer approval and operational delay. Assessments retain citations, alternatives, missing information and the evidence available when submitted. Reports include practice reviews, payment consequences and a blind review packet for external discussion. See [`docs/aml-simulation.md`](docs/aml-simulation.md). The source data and calibration assumptions are versioned and explicitly unvalidated; independent practitioner review remains pending.

The default page is the **TwinAML AML Training Portal**, based on the English Figma UI drafts: a progress dashboard, topic library, staged scenario player, training reports, help and appearance settings. Start at `/`, choose **My Training**, and open a topic. Project Meridian follows an urgent executive email, a meeting transcript and a payment decision; the mule/mixer exercise follows bank activity and on-chain evidence. Decisions and outcomes use the existing server-side case engine. Reports show actual saved outcomes rather than the illustrative metrics in the draft. See [`docs/training-portal.md`](docs/training-portal.md) for routes and the verification exercise.

The **Hong Kong AML operations workbench** is at `/operations`: generated alerts, alert details, entity exploration, investigation cases and reviewer decisions. It follows documented SAS-style operations with its own interface and synthetic data. It is not a SAS product or a live bank system. The API runs a versioned monitoring rule over the synthetic ledger and retains the contributing transactions. Instructor/administrator mode can change the parameters, add a synthetic transaction and rerun detection. See [`docs/aml-workflow.md`](docs/aml-workflow.md) for its rule contract and an end-to-end exercise.

The earlier **Second Ledger** exercise remains at `/investigation`, with its existing saved sessions. `/cases` is an alias for the portal's topic library at `/training`. These are separate training runs; one Node API and SQLite database own their authoritative state. Existing script IDs and saved decisions are preserved.

The Node application now supports **Clerk accounts with Google sign-in** and **My progress** across all three training areas. New runs are private to the signed-in account; saved actions can be resumed from another device. Existing runs can be explicitly added to an account. The owner's existing Clerk development application is connected locally, and its Google sign-in controls have been verified. For a new checkout, follow [`docs/accounts.md`](docs/accounts.md); `.env.example` files are included in `frontend/` and `workers/api/`. Production Clerk setup and deployment remain pending. The separate [development environments](docs/development.md) use explicit anonymous mode with synthetic test data.

TwinAML is a COMP3424 course demo of a digital twin for AML simulation training. The platform idea is proprietary: this tree is a classroom demo, not a bank production system and not an open-source release. The case library has **13** synthetic scripts across **11** topic workflows under [`data/cases/`](data/cases/README.md): the original eleven scripts plus `project-meridian-001` and `mule-mixer-001` from the portal design. `deepfake-001` is the original course example (video-KYC deepfake). Ten scripts are `public_record_inspired`. Every customer, account, and amount in them is synthetic. The full index and disclaimer are in [`data/cases/README.md`](data/cases/README.md). The twin is backend state plus the events that change it. The web app renders that state.

| case_id | Theme |
| --- | --- |
| `deepfake-001` | Original course example: video-KYC deepfake |
| `daybreak-tbml-001` | TBML / shell / fake jewellery-diamond exports |
| `mule-rent-001` | Account rental |
| `wiseword-amlmonth-001` | One mule, several typologies |
| `justicegate-crypto-001` | Cash + crypto OTC |
| `greythunder-mule-001` | Mule cluster |
| `crossborder-tel-001` | Cross-border phone-fraud corridor |
| `kol-mgmt-001` | KOL / influencer front |
| `triad-cashflow-001` | Organised-crime cashflow indicators |
| `insurer-controls-001` | Insurer controls (synthetic insurer) |
| `bank-cdd-001` | Bank CDD / monitoring / STR (synthetic bank) |

The **case library** at `/cases` plays these scripts. A trainee picks one of the eleven workflows, reads how the scheme works in the real world, then makes the decisions inside a script while the twin state and event log update beside it. Rules in the script decide the outcome (rules-before-AI). The debrief shows whether the ending was acceptable, incomplete or poor, the rationale for every choice, the rules, and the model teaching flow. A language model, if one is added later, may explain a decision only after those rules have fired, and a human override must be stored as an event.

Case flows are in [`data/case-flow/`](data/case-flow/). Each case has an English Markdown file with Mermaid flow diagrams. The playable scripts stay in `data/cases/`, numbered `01`–`13`. Original `case_id` values are unchanged. `node scripts/export-case-library.mjs` packages the flow pages and scripts into the server-only `workers/api/src/case-library.json`; the case library reads only that file. Workflow 2 now includes the mule/mixer scenario; workflow 3 shows its teaching flow read-only.

TwinAML ships English only: docs, UI copy and case content. `node scripts/validate-cases.mjs` fails on a script whose `locale` is not `en` or that contains Chinese, Japanese or Korean text, and the library export refuses the same.

| Case | English | Playable script |
| --- | --- | --- |
| Deepfake executive impersonation | [English](data/case-flow/01-deepfake-executive-impersonation.en.md) | `deepfake-001` |
| Mule accounts and a crypto mixer | [English](data/case-flow/02-crypto-mixers-mule-accounts.en.md) | Nearby mule and crypto scripts. See the flow page. |
| Synthetic identity fraud | [English](data/case-flow/03-synthetic-identity-fraud.en.md) | No playable script in the eleven. |
| Trade-based money laundering | [English](data/case-flow/04-trade-based-money-laundering.en.md) | `daybreak-tbml-001` |
| Cross-border phone-fraud corridor | [English](data/case-flow/05-crossborder-phone-fraud.en.md) | `crossborder-tel-001` |
| Account rental and mule clusters | [English](data/case-flow/06-account-rental-mule-clusters.en.md) | `mule-rent-001`, `greythunder-mule-001` |
| Cash and crypto OTC cashing-out | [English](data/case-flow/07-cash-crypto-otc.en.md) | `justicegate-crypto-001` |
| KOL management front company | [English](data/case-flow/08-kol-management-front.en.md) | `kol-mgmt-001` |
| Multi-typology mule account | [English](data/case-flow/09-multi-typology-mule.en.md) | `wiseword-amlmonth-001` |
| Organised-crime cashflow | [English](data/case-flow/10-organised-crime-cashflow.en.md) | `triad-cashflow-001` |
| Insurer and bank control gaps | [English](data/case-flow/11-control-gaps.en.md) | `insurer-controls-001`, `bank-cdd-001` |

The web investigation pilot, **The Second Ledger**, uses the paired evidence pack below. Players explore six alerts, examine source documents and transfers, request timed checks, place or release provisional holds, and record cited decisions. A guided simulation clock drives evidence delivery and pending payments. The Node API owns persistent sessions and the event history in a SQLite file; the browser renders its learner-visible state. The eleven node/choice scripts are played separately in the case library at `/cases`.

The ARG design, content sources, and first playable scope are in [`docs/arg-investigation.md`](docs/arg-investigation.md). All identities, money, policies, and documents in the pilot are fictional. The debrief reports observed consequences rather than an automated compliance grade.

## Analyst investigation content

The [paired evidence pack](data/evidence/analyst-session-001/README.md) adds detailed records for the deepfake case, a legitimate project-payment lookalike, and four background alerts. It contains 6 customer profiles, 24 accounts, 126 transfers, and 24 evidence documents. The [learner briefing](data/evidence/analyst-session-001/learner/START.md) is the starting point for a manual investigation exercise. Instructor answers and responses requiring further checks stay in a separate folder.

This pack is the source of the web investigation pilot alongside the existing eleven scripts. Its lookalike is not a new node/choice script. Hidden responses remain on the API server and reach the browser only after the corresponding check completes; instructor answer keys are not imported. Validate the records with `python3 scripts/validate-evidence.py`, check the web export with `python3 scripts/export-web-investigation.py --check`, and continue checking the existing scripts with `node scripts/validate-cases.mjs`.

### FlexSim edition

[`simulation/flexsim/`](simulation/flexsim/README.md) is a standalone FlexSim edition of the same investigation exercise, built on this evidence pack. It is not an adapter to the web API: FlexSim owns run-time state in that edition only, and nothing there reads or changes the web twin. It was authored on macOS, where the Python reference harness (contract tests, golden traces, trace comparer) is Mac-tested; nothing has run in FlexSim yet, and no model file exists. The Windows build and validation steps are in [`simulation/flexsim/windows/`](simulation/flexsim/windows/ASSEMBLY-STEPS.md).

## Architecture

The primary run path is one Node API with file-backed SQLite, serving the React frontend on a VPS. The package retains its existing `workers/api` directory name. Cloudflare is optional; both adapters use the same investigation engine. FastAPI remains a health-only stub.

| Piece | Where | Role |
| --- | --- | --- |
| Demo API | `workers/api` | Node server with shared Hono routes and investigation engine. A file-backed SQLite database persists sessions and event history. |
| Web | `frontend/` | React + Vite + TypeScript. The Node server serves its built investigation desk alongside `/api` on the same origin. |
| Optional Worker adapter | `workers/api/src/index.ts` | Uses the same routes and engine, with one SQLite-backed Durable Object per run. Optional Pages hosting serves the frontend separately. |
| Local Python stub | `backend/` | Optional FastAPI health endpoint for offline Python work; it cannot run investigation sessions. |
| Unity | — | Optional later face on the same API. This repo has no Unity project. |

The web app does not keep a private copy of the case world. The investigation engine applies evidence-release, timing, and payment rules on the API server. Case-library sessions store only their events; the server replays the decisions through the same patch rules the validator uses (`scripts/apply-effects.mjs`) to rebuild the twin.

The training-run diagram and the distinction between the investigation pilot and the planned node/choice player are in [`docs/architecture.md`](docs/architecture.md). Course terms — mirroring, shadowing, threading, Chan Level 1, Chan Level 2, rules-before-AI — are mapped in [`docs/comp3424-mapping.md`](docs/comp3424-mapping.md).

## Tech stack

Classroom demo. One API and one web client.

| Layer | Current | Planned |
| --- | --- | --- |
| Demo API | Node + Hono + built-in SQLite (`workers/api`). Health, persistent investigation sessions and case-library sessions; optional Worker adapter shares the engines. | Versioned rule packs (Phase 2). |
| Web | React + Vite + TypeScript (`frontend/`). Training portal at `/`, Hong Kong AML workflow at `/operations`, paired investigation at `/investigation`, and the eleven-workflow library at `/cases`, served by Node. | Additional training scenarios. |
| Local Python stub | FastAPI (`backend/`). Optional. `GET /health` with the same JSON. | Any investigation support would need an implementation; it stays off the deploy path. |
| Cases | 11 example scripts in [`data/cases/README.md`](data/cases/README.md). | Stay on `packages/schemas/script.schema.json`. A rule’s `when` text is for a person to read; the script's branches and teaching dispositions decide the outcome. |
| Media | `data/media/.gitkeep` only. Large video is gitignored. | Scripts may set `media_ref` to a local path. Binaries stay out of git. |
| Contract | `packages/schemas/script.schema.json` (schema `0.1`). | One script format. Patch keys: [`docs/effects.md`](docs/effects.md). |
| Docs | `docs/architecture.md`, `docs/arg-investigation.md`, `docs/vps.md`, and the historical [`docs/phases/`](docs/phases/README.md). | The eleven-script roadmap remains in the phase docs. See [Implementation phases](#implementation-phases). |
| Deploy | VPS deployment on hosted port 8080, reached through [https://amltwin.spectrumvps.tech](https://amltwin.spectrumvps.tech): built Node server, `frontend/dist/`, and persistent SQLite. Optional Wrangler configs remain for Worker/Pages hosting. | Connect Clerk and release account-enabled build; class-size capacity validation remains future hosting work. |

Out of scope unless the owner asks in that session: Docker, Kubernetes, Neo4j, Kafka, a microservice split, a Unity project, and a live bank connection.

## Repo layout

```
├── README.md
├── AGENTS.md
├── .gitignore
├── Mindmap.png                  # course sketch for reference; not the build contract
├── docs/
│   ├── architecture.md          # case → script → decision → twin → events
│   ├── effects.md               # twin_patch and choice effect keys
│   ├── arg-investigation.md     # playable pilot and source mapping
│   ├── vps.md                   # primary Node + SQLite hosting path
│   ├── cloudflare.md            # optional Pages/Worker hosting
│   ├── comp3424-mapping.md      # Chan Level 1/2, mirroring, shadowing, threading
│   └── phases/
│       ├── README.md            # how agents use the phase plans
│       ├── PHASE1.md            # Chan Level 1 MVP slices
│       ├── PHASE2.md            # Chan Level 2 slices
│       └── PHASE3.md            # vision only; not the course demo
├── workers/
│   └── api/                     # Node API and optional Worker adapter
│       ├── README.md
│       ├── package.json
│       ├── src/node-server.mjs  # Node HTTP server, SQLite and frontend files
│       ├── src/api.ts           # shared health and investigation routes
│       ├── src/engine.ts        # investigation rules and session state
│       ├── src/cases.ts         # case-library sessions replayed from events
│       ├── src/case-library.json # server-only generated flows and scripts
│       ├── src/index.ts         # optional Worker/Durable Object adapter
│       ├── src/investigation-pack.json # server-only generated evidence
│       ├── tests/               # engine and HTTP checks
│       ├── tsconfig.json
│       └── wrangler.jsonc
├── frontend/                    # Vite/React/TypeScript; Node serves dist/
│   ├── README.md
│   ├── index.html
│   ├── package.json
│   ├── public/_redirects        # SPA fallback
│   ├── src/                     # investigation desk and case library (/cases)
│   ├── tsconfig.json
│   ├── vite.config.ts
│   └── wrangler.jsonc
├── backend/                     # optional local FastAPI
│   ├── README.md
│   ├── requirements.txt
│   └── app/
│       ├── __init__.py
│       └── main.py              # GET /health
├── data/
│   ├── cases/                   # index: data/cases/README.md
│   │   ├── README.md
│   │   ├── 01-deepfake-hk-001.example.json
│   │   └── 02-…11-*.example.json
│   ├── case-flow/               # the eleven workflows in English (library briefs)
│   │   ├── 01-deepfake-executive-impersonation.en.md
│   │   └── 02-…11-*.en.md
│   ├── evidence/                # authored paired investigation
│   ├── local/                   # ignored local SQLite session data
│   └── media/
│       └── .gitkeep
├── packages/
│   ├── investigation/types.ts  # shared investigation contract
│   └── schemas/
│       └── script.schema.json
├── scripts/
│   ├── validate-cases.mjs       # schema + effect-key check, then the path test
│   ├── apply-effects.mjs        # schema 0.1 patch apply used by the path test
│   ├── deepfake-paths.test.mjs  # eight deepfake-001 terminal paths
│   ├── export-web-investigation.py # deterministic server content export
│   ├── export-case-library.mjs  # case-flow pages + scripts -> case-library.json
│   └── .gitkeep
└── simulation/
    └── flexsim/                 # standalone FlexSim edition: simulation/flexsim/README.md
```

`frontend/package-lock.json` and `workers/api/package-lock.json` are tracked. Build outputs, `data/local/` session storage, `node_modules/`, `.venv/`, `.env`, and large media are ignored.

`Mindmap.png` is a course planning sketch at the repo root. Use it as a picture of topics. This README and `AGENTS.md` describe the current VPS run path; the shared-engine and single-backend-state rules apply to both hosting adapters.

## Run locally

Use Node 22.13 or later. From the repository root:

```bash
npm run setup
npm run dev
```

This starts Vite and the watched Node API together. API edits rebuild and restart automatically; Ctrl-C stops both. Synthetic runs use a separate ignored `data/local/development.sqlite`, and no Clerk or Cloudflare account is needed. The launcher explicitly enables anonymous development and keeps local requests on the Vite proxy. See [development setup](docs/development.md) for details and [account setup](docs/accounts.md) for separate Clerk sign-in testing. Normal Node launches retain their account requirement.

`http://127.0.0.1:8787/health` returns `{"status":"ok","service":"twinaml-api"}`.

Open `http://127.0.0.1:5173` for the training portal, or `/operations` for the Hong Kong AML workflow. Start a training run to receive rule-generated alerts, claim an alert, create a case, record cited findings and submit it for review. The role selector provides analyst, reviewer and administrator practice. Existing runs resume after refresh, and a new run preserves the previous one on the server. The Vite development server proxies `/api` to the Node API on port 8787.

The original Second Ledger exercise is at `http://127.0.0.1:5173/investigation`; its reading-paused clock, evidence requests and payment deadlines are unchanged. Open `http://127.0.0.1:5173/cases` for the scripted case library.

For a single-server build, run `npm run build` in `frontend/` and open the Node server at `http://127.0.0.1:8787`; it serves the built interface and API together. Local development needs no cross-origin configuration. The current optional FastAPI app cannot serve investigation sessions. See [`docs/vps.md`](docs/vps.md) for hosting notes. Optional Pages/Worker hosting uses `VITE_API_URL` and `FRONTEND_ORIGIN`.

Direct Node launches default to `HOST=127.0.0.1`, `PORT=8787`, and the SQLite file `data/local/investigation.sqlite`; the root development launcher pins its separate `development.sqlite`. Keep the relevant file to resume sessions after a server restart. Set `TWINAML_DB` for a persistent storage location and `TWINAML_FRONTEND_ORIGIN` to the public origin when hosting behind an HTTPS reverse proxy. Runtime settings are documented in [`workers/api/README.md`](workers/api/README.md).

`npm run build` in `frontend/` typechecks, then writes `dist/`. Do not commit `dist/`.

Optional FastAPI stand-in, from `backend/`:

```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

`http://127.0.0.1:8000/health` returns the same JSON. This stub is separate from the Node investigation runtime. Details: [`backend/README.md`](backend/README.md).

Check the case scripts from the repo root:

```bash
node scripts/validate-cases.mjs
```

That checks schema `0.1`, the English-only rule and the effect-key grammar, then plays the eight `deepfake-001` endings. After changing a script or a case-flow page, regenerate the case library with `node scripts/export-case-library.mjs` (`--check` compares without writing). Details: [`docs/effects.md`](docs/effects.md).

## Deploy

The Figma portal changes are local source changes and have not been deployed. The hosting notes below describe the existing release; after a future portal release, `/` becomes the dashboard and the AML workflow moves to `/operations`.

TwinAML is deployed on the owner's **4-vCPU / 8-GB OVH VPS** at [https://amltwin.spectrumvps.tech](https://amltwin.spectrumvps.tech): the Hong Kong AML workflow is at `/`, the earlier pilot is at `/investigation`, and the case library is at [`/cases`](https://amltwin.spectrumvps.tech/cases). A dedicated Cloudflare Tunnel reaches the Node service on `127.0.0.1:8080`; local development keeps port 8787. Use Tailscale and SSH alias `ovh-ca` for direct administration. The current release, migrated SQLite sessions, service commands and update/rollback steps are in [`docs/vps.md`](docs/vps.md). Clerk accounts are implemented in source; connecting the owner's instance and releasing the account-enabled build to production remain pending, as does class-size load testing. The historical phase plans below retain their original Cloudflare targets.

A separate hosted development app is available at [https://dev-amltwin.spectrumvps.tech](https://dev-amltwin.spectrumvps.tech). It uses its own service, releases and test database on OVH port 8081, with a development banner and anonymous synthetic runs. From the repository root, `npm run deploy:dev` builds and releases the current source only to that environment, backing up its SQLite database and checking startup. See [development releases](docs/development.md#hosted-development-on-ovh).

Optional steps for Pages and the Worker remain in [`docs/cloudflare.md`](docs/cloudflare.md). Cloudflare account ids and API tokens are not stored in this repo.

## Implementation phases

### Historical eleven-script roadmap

The original node/choice plans are in [`docs/phases/`](docs/phases/README.md). Their Worker/Pages targets describe the historical plan, not the current VPS run path. Do not implement the remaining slices until the owner names one. The case library implements P1-S2 to P1-S4 on the Node API; the paired-evidence investigation pilot is a separate slice.

Chan levels follow the course: Level 1 is a scripted mirror, Level 2 is a near-realtime session that writes back to the twin, Level 3 is product vision. Course terms are mapped in [`docs/comp3424-mapping.md`](docs/comp3424-mapping.md).

| Doc | Chan level | Goal |
| --- | --- | --- |
| [Phase 1](docs/phases/PHASE1.md) | Level 1 (scripted mirror) | All 11 synthetic cases end-to-end on Cloudflare (Worker + Pages) |
| [Phase 2](docs/phases/PHASE2.md) | Level 2 (near-realtime bidirectional) | Versioned rules, realtime twin updates, case families beyond the 11, audit export |
| [Phase 3](docs/phases/PHASE3.md) | Level 3 (vision) | ML assist and live connectors. Not the COMP3424 demo |

**Phase 1 — MVP (Chan Level 1).** A readable mirror of the 11 scripts. The trainee starts a session with a `case_id`. The Worker loads that script, applies the rules and the state machine, and stores events. Pages shows the scenario player and a simple dashboard of the same twin. FastAPI stays optional and local.

In scope: load any of the 11 against `packages/schemas/script.schema.json`; session routes that take `case_id`; deterministic `twin_patch` and choice effects as in [`docs/effects.md`](docs/effects.md); English only, for UI and case content; a missing `media_ref` file shows a missing-media state.

Out of scope for Phase 1: Docker, Kubernetes, Neo4j, Kafka, a microservice split, Unity, a live language model that sets disposition, a real bank / regulator / STR filing connection, multi-tenant billing, and session-time video synthesis. New mixer / peel-chain and synthetic-ID families beyond this library wait for Phase 2.

Current status for this **node/choice library roadmap**: P1-S1 to P1-S4 are done. The case library at `/cases` starts any of the 11 scripts, persists the session in SQLite, and walks it to a rated outcome. P1-S5 is partial: sessions return ordered `session_started`, `decision_made` and `session_closed` events and mark poor endings, but there are no separate `rule_flagged` or `override` events. Overrides appear as the decision event plus the script's override flag.

| Slice | Done when |
| --- | --- |
| P1-S1 — Script contract freeze | **Done.** [`docs/effects.md`](docs/effects.md) lists every effect key in the 11 scripts and the apply order. Check with `node scripts/validate-cases.mjs`. |
| P1-S2 — Twin state machine | **Done.** `workers/api/tests/cases.test.mjs` walks every path in all 11 scripts. Unit tests cover terminal dispositions for the library without HTTP. |
| P1-S3 — Session store + Worker routes | **Done** on Node and the optional Worker adapter: `/api/case-sessions`. `curl` or local `wrangler dev` can finish one full path for a chosen `case_id`. `GET /health` stays. |
| P1-S4 — Scenario player | **Done** at `/cases`. The trainee can start any of the 11. A browser playthrough matches the API for at least two branches of the selected case. Missing media does not crash the case. |
| P1-S5 — Event log + teaching score | `GET` session returns ordered events for replay, and a teaching poor disposition is marked for the dashboard. |
| P1-S6 — Simple dashboard | After one playthrough, the dashboard shows that session (disposition, flags, timeline) from the Worker twin. |
| P1-S7 — Deploy checklist | The owner can follow the docs to deploy Pages and the Worker. Tokens stay out of git. |
| P1-S8 — Demo polish | A classmate can run the demo from this README alone, including a short audit-evidence note for COMP3424. |

Slice detail: [`docs/phases/PHASE1.md`](docs/phases/PHASE1.md).

**Phase 2 — Chan Level 2.** Same Worker, after Phase 1 is done. A training session shadows the trainee: a choice becomes an event, the event updates twin state promptly, and the dashboard reads that state. Rules move into versioned packs. The case library can grow with new families beyond the 11 (mixer / peel-chain, synthetic identity). Two paths through a case must show different dispositions, and the ordered events must be replayable. There is still no live core bank. Not built.

| Slice | Done when |
| --- | --- |
| P2-S1 — Event sourcing hardening | Replay from events equals the live twin for a Phase 1 case. |
| P2-S2 — Rules engine v1 | Versioned rule packs evaluate named predicates. R1/R2 and the new pack tests pass without a language model. |
| P2-S3 — Realtime gateway | Two browser tabs on the same session stay in sync when a decision is submitted. |
| P2-S4 — Mixer / peel-chain case | A new case beyond the 11 plays one teaching path to an STR- or EDD-style outcome, with mule-account hops in twin state. |
| P2-S5 — Synthetic identity case | The new script validates against the schema, and one full playthrough works. |
| P2-S6 — Graph explorer (optional) | Hops for the mixer case are visible in the web client. A graph database is optional and must not make Docker required for the demo. |
| P2-S7 — Audit export | `GET /sessions/:id/export` includes script id, rule-pack version, events, and the final twin. |
| P2-S8 — Org isolation + RAG authoring | A second org cannot read the first org’s sessions. An authored script still passes the schema and a human review before publish. The model does not set disposition at runtime. |

Slice detail: [`docs/phases/PHASE2.md`](docs/phases/PHASE2.md).

**Phase 3 — vision (Chan Level 3).** Planning only. This is not a COMP3424 commitment. After Phases 1–2, a model may assist once rules have fired, optional connectors may seed a twin from fixtures, and an optional Unity face may call the same API. Models do not become the system of record. There is no second twin, and training data stays labeled synthetic.

| Slice | Done when |
| --- | --- |
| P3-S1 — ML assist shadow mode | The UI shows a suggestion separately from the rule decision. The model does not write disposition alone. |
| P3-S2 — Connector adapter | Training can optionally seed the twin from adapter fixtures. The default data stays synthetic. |
| P3-S3 — Retention and legal hold | Org policy for event retention and export hold is documented, and delete/export gates enforce it. |
| P3-S4 — Immersive client (Unity) | One Phase 1 path is playable in Unity against the Worker, on the same session API. |
| P3-S5 — Multi-jurisdiction packs | Switching a rule pack is an audited event. Closed sessions keep the pack id they ran under. |

Slice detail: [`docs/phases/PHASE3.md`](docs/phases/PHASE3.md).

In this historical roadmap, mirroring refers to the 11 scripts. Its planned Level 2 shadowing and threading features are not implemented by the investigation pilot.

## Agent rules

Short rules for classmates and coding agents. The full agreement is [`AGENTS.md`](AGENTS.md).

1. Change one small slice at a time. After it, say what a trainee or reviewer can now see or run.
2. Keep one API with shared routes and engine (`workers/api`), one React client (`frontend/`), and the optional local FastAPI stub (`backend/`). Node with SQLite is the primary runtime; Worker/Pages remains optional. Case scripts live in `data/cases/`. Notes live in `docs/`.
3. Leave Docker, Kubernetes, Neo4j, Kafka, a service split, and Unity out unless the owner asks in that session.
4. English is the primary language for docs and UI copy. Keep course terms in English: mirroring, shadowing, threading, Chan Level 1, Chan Level 2, rules-before-AI.
5. The twin is backend state plus events. The web app renders that state.
6. Rules decide compliance outcomes. A model may explain only after rules have fired. A human override is an event.
7. Do not commit secrets, API keys, `.env` files, Cloudflare account identifiers, or large media.
8. If the script shape changes, every example case under `data/cases/` must still validate against `packages/schemas/script.schema.json`. Run `node scripts/validate-cases.mjs`. The schema or docs must say what changed.

Read next: [`docs/arg-investigation.md`](docs/arg-investigation.md), [`docs/vps.md`](docs/vps.md), [`docs/architecture.md`](docs/architecture.md), [`docs/effects.md`](docs/effects.md), [`docs/comp3424-mapping.md`](docs/comp3424-mapping.md), [`docs/phases/README.md`](docs/phases/README.md), [`data/cases/README.md`](data/cases/README.md), [`data/case-flow/01-deepfake-executive-impersonation.en.md`](data/case-flow/01-deepfake-executive-impersonation.en.md), [`packages/schemas/script.schema.json`](packages/schemas/script.schema.json).

## License

The TwinAML platform idea and the contents of this repository are proprietary. All rights reserved.

This repository is a COMP3424 course demo. It does not include an OSI license. Do not redistribute it as an open-source project or turn it into a commercial product. Use and modification follow the owner's permission.
