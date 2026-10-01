# TwinAML

## What it is?

TwinAML is a COMP3424 course demo of a digital twin for AML simulation training. The platform idea is proprietary: this tree is a classroom demo, not a bank production system and not an open-source release. The Phase 1 case library is **11** synthetic scripts under [`data/cases/`](data/cases/README.md). `deepfake-hk-001` is the original course example (video-KYC deepfake). The other ten are `public_record_inspired`. Every customer, account, and amount in them is synthetic. The full index and disclaimer are in [`data/cases/README.md`](data/cases/README.md). The twin is backend state plus the events that change it. The web app is the face that will render that state.

| case_id | Theme |
| --- | --- |
| `deepfake-hk-001` | Original course example: video-KYC deepfake |
| `hk-daybreak-tbml-001` | TBML / shell / fake jewellery-diamond exports |
| `hk-mule-rent-001` | Account rental |
| `hk-wiseword-amlmonth-001` | One mule, several typologies |
| `hk-justicegate-crypto-001` | Cash + crypto OTC |
| `hk-greythunder-mule-001` | Mule cluster |
| `hk-crossborder-tel-001` | Cross-border phone-fraud corridor |
| `hk-kol-mgmt-001` | KOL / influencer front |
| `hk-triad-cashflow-001` | Organised-crime cashflow indicators |
| `hk-ia-fwd-controls-001` | Insurer controls (synthetic insurer) |
| `hk-hkma-cdd-001` | Bank CDD / monitoring / STR (synthetic bank) |

A trainee is meant to choose one of those scripts by `case_id` and decide inside it. Rules in the script decide compliance outcomes (rules-before-AI). A language model, if one is added later, may explain a decision only after those rules have fired, and a human override must be stored as an event.

What runs today is a scaffold. The Worker and the optional FastAPI app answer `GET /health`. The Pages app is a placeholder. The 11 scripts, the effect-key contract, and the JSON Schema are in the repo. Session routes, the scenario player, and the dashboard are not built.

## Architecture

One Worker API and one Pages frontend. FastAPI is an optional local process.

| Piece | Where | Role |
| --- | --- | --- |
| Demo API | `workers/api` | Cloudflare Worker (Hono). Today: `GET /health`. Case load, sessions, decisions, the twin state machine, and events will be added on this Worker. |
| Web | `frontend/` | React + Vite + TypeScript, deployed to Cloudflare Pages. Today: a placeholder page. The scenario player and the dashboard are not built. Both will read the same twin. |
| Local API | `backend/` | Optional FastAPI stand-in for offline Python work. Same health JSON. The course demo deploys the Worker. |
| Unity | — | Optional later face on the same API. This repo has no Unity project. |

The web app does not keep a private copy of the case world. Compliance outcomes come from the rules in the script and from the state machine that will apply them.

The training-run diagram (case → script → decision → twin → events → dashboard) is in [`docs/architecture.md`](docs/architecture.md). The session calls in that diagram are not implemented. Course terms — mirroring, shadowing, threading, Chan Level 1, Chan Level 2, rules-before-AI — are mapped in [`docs/comp3424-mapping.md`](docs/comp3424-mapping.md).

## Tech stack

Classroom demo. One API and one web client.

| Layer | Current | Planned |
| --- | --- | --- |
| Demo API | Hono on a Cloudflare Worker (`workers/api`). `GET /health` only. | Load a case, open a session, accept a decision, apply rules, write events. Same Worker. |
| Web | React + Vite + TypeScript (`frontend/`). Placeholder page that builds. Pages project name `twinaml-web`. | Scenario player and a simple dashboard that read the Worker’s twin state. |
| Local API | FastAPI (`backend/`). Optional. `GET /health` with the same JSON. | May mirror the Worker routes for offline use. Stays off the deploy path. |
| Cases | 11 example scripts in [`data/cases/README.md`](data/cases/README.md). | Stay on `packages/schemas/script.schema.json`. A rule’s `when` text is for a person to read until a state machine exists. |
| Media | `data/media/.gitkeep` only. Large video is gitignored. | Scripts may set `media_ref` to a local path. Binaries stay out of git. |
| Contract | `packages/schemas/script.schema.json` (schema `0.1`). | One script format. Patch keys: [`docs/effects.md`](docs/effects.md). |
| Docs | `docs/architecture.md`, `docs/effects.md`, `docs/comp3424-mapping.md`, `docs/cloudflare.md`, [`docs/phases/`](docs/phases/README.md). | Slice checklists live in the phase docs. See [Implementation phases](#implementation-phases). |
| Deploy | Wrangler config for Pages (`frontend/wrangler.jsonc`) and the Worker (`workers/api/wrangler.jsonc`). | Pages serves the Vite build. The Worker serves the API. |

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
│   ├── cloudflare.md            # Pages, Worker, custom domain
│   ├── comp3424-mapping.md      # Chan Level 1/2, mirroring, shadowing, threading
│   └── phases/
│       ├── README.md            # how agents use the phase plans
│       ├── PHASE1.md            # Chan Level 1 MVP slices
│       ├── PHASE2.md            # Chan Level 2 slices
│       └── PHASE3.md            # vision only; not the course demo
├── workers/
│   └── api/                     # demo API (Cloudflare Worker, Hono)
│       ├── README.md
│       ├── package.json
│       ├── src/index.ts         # GET /health
│       ├── tsconfig.json
│       └── wrangler.jsonc
├── frontend/                    # Cloudflare Pages (Vite, React, TypeScript)
│   ├── README.md
│   ├── index.html
│   ├── package.json
│   ├── public/_redirects        # SPA fallback
│   ├── src/                     # placeholder page
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
│   │   ├── deepfake-hk-001.example.json
│   │   └── hk-*.example.json
│   └── media/
│       └── .gitkeep
├── packages/
│   └── schemas/
│       └── script.schema.json
└── scripts/
    ├── validate-cases.mjs       # schema + effect-key check, then the path test
    ├── apply-effects.mjs        # schema 0.1 patch apply used by the path test
    ├── deepfake-paths.test.mjs  # eight deepfake-hk-001 terminal paths
    └── .gitkeep
```

`frontend/package-lock.json` and `workers/api/package-lock.json` are tracked. `frontend/dist/`, `node_modules/`, `.venv/`, `.env`, and files under `data/media/` other than `.gitkeep` are not.

`Mindmap.png` is a course planning sketch at the repo root. Use it as a picture of topics. The sections in this README, and `AGENTS.md`, are the contract for what this demo runs.

## Run locally

Start the Worker and the web app in two terminals. Docker is not a run path.

Worker, from `workers/api/`:

```bash
npm install
npm run dev
```

`http://127.0.0.1:8787/health` returns `{"status":"ok","service":"twinaml-api"}`.

Web, from `frontend/`:

```bash
npm install
npm run dev
```

Open `http://127.0.0.1:5173`. The page shows the TwinAML scaffold. It does not call the API. It is not a case player, and it has no dashboard.

`npm run build` in `frontend/` typechecks, then writes `dist/`. Do not commit `dist/`.

Optional FastAPI stand-in, from `backend/`:

```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

`http://127.0.0.1:8000/health` returns the same JSON. Use it when you want a local Python process. The course demo deploys the Worker. Details: [`backend/README.md`](backend/README.md).

Check the case scripts from the repo root:

```bash
node scripts/validate-cases.mjs
```

That checks schema `0.1` and the effect-key grammar, then plays the eight `deepfake-hk-001` endings. Details: [`docs/effects.md`](docs/effects.md).

## Deploy

The demo target is Cloudflare. Pages serves the Vite build. The Worker in `workers/api` is the API. Account ids, API tokens, and a real hostname are not stored in this repo.

Steps for Pages, the Worker, and a custom domain already on your Cloudflare account are in [`docs/cloudflare.md`](docs/cloudflare.md).

## Implementation phases

### Planned phases

Plans for coding agents are in [`docs/phases/`](docs/phases/README.md). Do not implement from that folder until the owner names a phase and a slice. The phase files are the source of truth for slice scope. This section lists each slice so a reader can see the plan here.

Chan levels follow the course: Level 1 is a scripted mirror, Level 2 is a near-realtime session that writes back to the twin, Level 3 is product vision. Course terms are mapped in [`docs/comp3424-mapping.md`](docs/comp3424-mapping.md).

| Doc | Chan level | Goal |
| --- | --- | --- |
| [Phase 1](docs/phases/PHASE1.md) | Level 1 (scripted mirror) | All 11 synthetic cases end-to-end on Cloudflare (Worker + Pages) |
| [Phase 2](docs/phases/PHASE2.md) | Level 2 (near-realtime bidirectional) | Versioned rules, realtime twin updates, case families beyond the 11, audit export |
| [Phase 3](docs/phases/PHASE3.md) | Level 3 (vision) | ML assist and live connectors. Not the COMP3424 demo |

**Phase 1 — MVP (Chan Level 1).** A readable mirror of the 11 scripts. The trainee starts a session with a `case_id`. The Worker loads that script, applies the rules and the state machine, and stores events. Pages shows the scenario player and a simple dashboard of the same twin. FastAPI stays optional and local.

In scope: load any of the 11 against `packages/schemas/script.schema.json`; session routes that take `case_id`; deterministic `twin_patch` and choice effects as in [`docs/effects.md`](docs/effects.md); English UI chrome (case prompts may stay Traditional Chinese); a missing `media_ref` file shows a missing-media state.

Out of scope for Phase 1: Docker, Kubernetes, Neo4j, Kafka, a microservice split, Unity, a live language model that sets disposition, a real bank / HKMA / STR filing connection, multi-tenant billing, and session-time video synthesis. New mixer / peel-chain and synthetic-ID families beyond this library wait for Phase 2.

Current status: the 11 scripts and the effect-key contract are in the repo. P1-S1 is done. The Worker and the Pages app are still health and placeholder stubs. Session routes, the scenario player, and the dashboard are not built.

| Slice | Done when |
| --- | --- |
| P1-S1 — Script contract freeze | **Done.** [`docs/effects.md`](docs/effects.md) lists every effect key in the 11 scripts and the apply order. Check with `node scripts/validate-cases.mjs`. |
| P1-S2 — Twin state machine | Unit tests cover terminal dispositions for the library without HTTP. |
| P1-S3 — Session store + Worker routes | `curl` or local `wrangler dev` can finish one full path for a chosen `case_id`. `GET /health` stays. |
| P1-S4 — Scenario player | The trainee can start any of the 11. A browser playthrough matches the API for at least two branches of the selected case. Missing media does not crash the case. |
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

In this scaffold, mirroring is the 11 scripts. Shadowing and threading are Level 2 and are not built.

## Agent rules

Short rules for classmates and coding agents. The full agreement is [`AGENTS.md`](AGENTS.md).

1. Change one small slice at a time. After it, say what a trainee or reviewer can now see or run.
2. Keep one Worker (`workers/api`), one Pages client (`frontend/`), and optional local FastAPI (`backend/`). Case scripts live in `data/cases/`. Notes live in `docs/`.
3. Leave Docker, Kubernetes, Neo4j, Kafka, a service split, and Unity out unless the owner asks in that session.
4. English is the primary language for docs and UI copy. Keep course terms in English: mirroring, shadowing, threading, Chan Level 1, Chan Level 2, rules-before-AI.
5. The twin is backend state plus events. The web app renders that state.
6. Rules decide compliance outcomes. A model may explain only after rules have fired. A human override is an event.
7. Do not commit secrets, API keys, `.env` files, Cloudflare account identifiers, or large media.
8. If the script shape changes, every example case under `data/cases/` must still validate against `packages/schemas/script.schema.json`. Run `node scripts/validate-cases.mjs`. The schema or docs must say what changed.

Read next: [`docs/architecture.md`](docs/architecture.md), [`docs/effects.md`](docs/effects.md), [`docs/comp3424-mapping.md`](docs/comp3424-mapping.md), [`docs/cloudflare.md`](docs/cloudflare.md), [`docs/phases/README.md`](docs/phases/README.md), [`data/cases/README.md`](data/cases/README.md), [`data/cases/deepfake-hk-001.example.json`](data/cases/deepfake-hk-001.example.json), [`packages/schemas/script.schema.json`](packages/schemas/script.schema.json).

## License

The TwinAML platform idea and the contents of this repository are proprietary. All rights reserved.

This repository is a COMP3424 course demo. It does not include an OSI license. Do not redistribute it as an open-source project or turn it into a commercial product. Use and modification follow the owner's permission.
