# TwinAML

## What it is?

TwinAML is a COMP3424 course demo of a digital twin for AML simulation training. The platform idea is proprietary: this tree is a classroom demo, not a bank production system and not an open-source release. The Phase 1 case library is **11** synthetic scripts under [`data/cases/`](data/cases/README.md). `deepfake-hk-001` is the original course example (video-KYC deepfake). The other ten are `public_record_inspired`. The same folder also holds two Editor-room scripts: Topic 3 company onboarding (`hk-starlight-onboard-001`) and Topic 4 alert triage (`alert-triage-shift-001`). Every customer, account, and amount in them is synthetic. The full index and disclaimer are in [`data/cases/README.md`](data/cases/README.md). The twin is backend state plus the events that change it. The web app is the face that will render that state.

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
| `hk-starlight-onboard-001` | Topic 3: company onboarding, hidden beneficial owner |
| `alert-triage-shift-001` | Topic 4: one monitoring shift, six synthetic alerts |

A trainee is meant to choose one of those scripts by `case_id` and decide inside it. Rules in the script decide compliance outcomes (rules-before-AI). A language model, if one is added later, may explain a decision only after those rules have fired, and a human override must be stored as an event.

Case flows for human review are in [`data/case-flow/`](data/case-flow/). Each case is two Markdown files, Traditional Chinese and English, and each flow is a Mermaid diagram. The playable scripts stay in `data/cases/`, numbered `01`–`13`. `12` is the fictional company-onboarding lesson used by the Editor branch. `13` is the English alert-triage shift. `case_id` is unchanged.

| Case | Traditional Chinese | English | Playable script |
| --- | --- | --- | --- |
| Deepfake executive impersonation | [zh-Hant](data/case-flow/01-deepfake-executive-impersonation.zh-Hant.md) | [English](data/case-flow/01-deepfake-executive-impersonation.en.md) | `deepfake-hk-001` |
| Mule accounts and a crypto mixer | [zh-Hant](data/case-flow/02-crypto-mixers-mule-accounts.zh-Hant.md) | [English](data/case-flow/02-crypto-mixers-mule-accounts.en.md) | Nearby mule and crypto scripts. See the flow page. |
| Synthetic identity fraud | [zh-Hant](data/case-flow/03-synthetic-identity-fraud.zh-Hant.md) | [English](data/case-flow/03-synthetic-identity-fraud.en.md) | No playable script in the eleven. |
| Trade-based money laundering | [zh-Hant](data/case-flow/04-trade-based-money-laundering.zh-Hant.md) | [English](data/case-flow/04-trade-based-money-laundering.en.md) | `hk-daybreak-tbml-001` |
| Cross-border phone-fraud corridor | [zh-Hant](data/case-flow/05-crossborder-phone-fraud.zh-Hant.md) | [English](data/case-flow/05-crossborder-phone-fraud.en.md) | `hk-crossborder-tel-001` |
| Account rental and mule clusters | [zh-Hant](data/case-flow/06-account-rental-mule-clusters.zh-Hant.md) | [English](data/case-flow/06-account-rental-mule-clusters.en.md) | `hk-mule-rent-001`, `hk-greythunder-mule-001` |
| Cash and crypto OTC cashing-out | [zh-Hant](data/case-flow/07-cash-crypto-otc.zh-Hant.md) | [English](data/case-flow/07-cash-crypto-otc.en.md) | `hk-justicegate-crypto-001` |
| KOL management front company | [zh-Hant](data/case-flow/08-kol-management-front.zh-Hant.md) | [English](data/case-flow/08-kol-management-front.en.md) | `hk-kol-mgmt-001` |
| Multi-typology mule account | [zh-Hant](data/case-flow/09-multi-typology-mule.zh-Hant.md) | [English](data/case-flow/09-multi-typology-mule.en.md) | `hk-wiseword-amlmonth-001` |
| Organised-crime cashflow | [zh-Hant](data/case-flow/10-organised-crime-cashflow.zh-Hant.md) | [English](data/case-flow/10-organised-crime-cashflow.en.md) | `hk-triad-cashflow-001` |
| Insurer and bank control gaps | [zh-Hant](data/case-flow/11-control-gaps.zh-Hant.md) | [English](data/case-flow/11-control-gaps.en.md) | `hk-ia-fwd-controls-001`, `hk-hkma-cdd-001` |

What runs today is the Phase 1 demo. FastAPI in `backend/` answers `GET /health`, lists the case scripts, opens a session, applies a choice, and stores the twin and the events. The Vite app is the scenario player and the dashboard. Both read that session. `workers/api` can answer the same health check only. That Worker is a legacy scaffold, not the demo deploy. One extra card, `GET /sessions/{id}/evidence`, summarises a run for the course note in [`docs/audit-evidence.md`](docs/audit-evidence.md).

## Architecture

One API and one web client on a self-hosted Linux VPS. The Unity Editor room is the immersive face and stays in the demo.

| Piece | Where | Role |
| --- | --- | --- |
| Demo API | `backend/` | FastAPI. Health, case list, sessions, decisions, the twin state machine, and events. A Node/Hono process may serve the same routes later. |
| Web | `frontend/` | React + Vite + TypeScript. Static files on the VPS. Scenario player and dashboard. Both read the same twin. |
| Unity | [`unity/TwinAML`](unity/UNITY.md) | Editor training room, in scope. Plays Topics 1–4 against schema 0.1 scripts. Topic 3 is an English walkable branch. Topic 4 is an English alert-triage room. Does not call the API yet. |
| Legacy scaffold | `workers/api` | Cloudflare Worker (Hono) plus Wrangler config. Left in the tree. Not the COMP3424 demo target. |

The web app does not keep a private copy of the case world. Compliance outcomes come from the rules in the script and from the state machine that will apply them.

The training-run diagram (case → script → decision → twin → events → dashboard) is in [`docs/architecture.md`](docs/architecture.md). The session calls in that diagram are not implemented. Course terms — mirroring, shadowing, threading, Chan Level 1, Chan Level 2, rules-before-AI — are mapped in [`docs/comp3424-mapping.md`](docs/comp3424-mapping.md).

## Tech stack

Classroom demo. One API and one web client.

| Layer | Current | Planned |
| --- | --- | --- |
| Demo API | FastAPI (`backend/`). Health, cases, sessions, decisions, twin, events. | A Node/Hono process may serve those same routes later. |
| Web | React + Vite + TypeScript (`frontend/`). Player and dashboard, built to `dist/`. | Static files on the VPS. The dev server proxies the API paths. |
| Legacy scaffold | Hono on a Cloudflare Worker (`workers/api`). `GET /health` only. Wrangler files may remain. | Not the demo path. See [`docs/deploy-vps.md`](docs/deploy-vps.md). |
| Cases | Every `data/cases/*.example.json` script, including the 11 and the two Editor-room scripts. | Stay on `packages/schemas/script.schema.json`. A rule’s `when` text stays human-readable. The machine applies patches and does not parse `when`. |
| Media | `data/media/.gitkeep` only. Large video is gitignored. | Scripts may set `media_ref` to a local path. Binaries stay out of git. |
| Contract | `packages/schemas/script.schema.json` (schema `0.1`). | One script format. Patch keys: [`docs/effects.md`](docs/effects.md). |
| Docs | `docs/architecture.md`, `docs/effects.md`, `docs/comp3424-mapping.md`, `docs/deploy-vps.md`, [`docs/phases/`](docs/phases/README.md). | Slice checklists live in the phase docs. See [Implementation phases](#implementation-phases). |
| Deploy | Linux VPS. nginx or Caddy, HTTPS, static `frontend/dist`, API on localhost. | [`docs/deploy-vps.md`](docs/deploy-vps.md). |

Out of scope unless the owner asks in that session: Docker, Kubernetes, Neo4j, Kafka, FlexSim, a microservice split, and a live bank connection. The Unity training room is the Editor face in [`unity/UNITY.md`](unity/UNITY.md). It stays in the demo. It does not replace the API.

## Repo layout

```
├── README.md
├── AGENTS.md
├── .gitignore
├── Mindmap.png                  # course sketch for reference; not the build contract
├── docs/
│   ├── architecture.md          # case → script → decision → twin → events
│   ├── effects.md               # twin_patch and choice effect keys
│   ├── deploy-vps.md            # Linux VPS: static site, API, HTTPS
│   ├── cloudflare.md            # pointer only; legacy scaffold is not the demo
│   ├── comp3424-mapping.md      # Chan Level 1/2, mirroring, shadowing, threading
│   └── phases/
│       ├── README.md            # how agents use the phase plans
│       ├── PHASE1.md            # Chan Level 1 MVP slices
│       ├── PHASE2.md            # Chan Level 2 slices
│       └── PHASE3.md            # vision only; not the course demo
├── unity/                       # Editor training room. See unity/UNITY.md
│   ├── UNITY.md                 # scene map, T01/T02 paths, how to press Play
│   └── TwinAML/                 # Unity 2022.3 project. First scene: Scn_Boot
├── workers/
│   └── api/                     # legacy Cloudflare Worker scaffold (not the demo API)
│       ├── README.md
│       ├── package.json
│       ├── src/index.ts         # GET /health
│       ├── tsconfig.json
│       └── wrangler.jsonc
├── frontend/                    # Vite, React, TypeScript (static files on the VPS)
│   ├── README.md
│   ├── index.html
│   ├── package.json
│   ├── public/_redirects        # SPA fallback
│   ├── src/                     # case list, player, dashboard
│   ├── tsconfig.json
│   ├── vite.config.ts
│   └── wrangler.jsonc
├── backend/                     # demo API (FastAPI)
│   ├── README.md
│   ├── requirements.txt
│   ├── app/
│   │   ├── __init__.py
│   │   ├── main.py              # /health, /cases, /sessions
│   │   ├── effects.py           # schema 0.1 patch apply
│   │   ├── machine.py           # session walk and events
│   │   ├── cases.py
│   │   └── sessions.py
│   └── tests/
├── data/
│   ├── cases/                   # index: data/cases/README.md
│   │   ├── README.md
│   │   ├── 01-deepfake-hk-001.example.json
│   │   └── 02-…13-*.example.json
│   ├── case-flow/               # human-review flows, zh-Hant and English
│   │   ├── 01-deepfake-executive-impersonation.zh-Hant.md
│   │   ├── 01-deepfake-executive-impersonation.en.md
│   │   └── 02-…11-*.zh-Hant.md and *.en.md
│   └── media/
│       └── .gitkeep
├── packages/
│   └── schemas/
│       └── script.schema.json
└── scripts/
    ├── validate-cases.mjs       # schema + effect-key check, then the path test
    ├── apply-effects.mjs        # schema 0.1 patch apply used by the path test
    ├── deepfake-paths.test.mjs  # eight deepfake-hk-001 terminal paths
    ├── unity-room-paths.test.mjs # six Editor-room paths through the same applier
    └── .gitkeep
```

`frontend/package-lock.json` and `workers/api/package-lock.json` are tracked. `frontend/dist/`, `node_modules/`, `.venv/`, `.env`, and files under `data/media/` other than `.gitkeep` are not.

`Mindmap.png` is a course planning sketch at the repo root. Use it as a picture of topics. The sections in this README, and `AGENTS.md`, are the contract for what this demo runs.

## Run locally

Start the API and the web app in two terminals. Docker is not a run path.

API, from `backend/`:

```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

`http://127.0.0.1:8000/health` returns `{"status":"ok","service":"twinaml-api"}`. `GET /cases` lists the scripts. `POST /sessions` with `{"case_id":"deepfake-hk-001"}` opens a training run. Details: [`backend/README.md`](backend/README.md).

Web, from `frontend/`:

```bash
npm install
npm run dev
```

Open `http://127.0.0.1:5173`. The page lists every case script. Start one, choose a branch, then open Dashboard. The Vite dev server proxies `/health`, `/cases`, and `/sessions` to port 8000, so start the API first. A missing `media_ref` file is shown as missing media. It does not stop the case.

`npm run build` in `frontend/` typechecks, then writes `dist/`. Do not commit `dist/`.

The legacy Worker, from `workers/api/`, is optional and is not the course demo:

```bash
npm install
npm run dev
```

`http://127.0.0.1:8787/health` returns the same JSON. Deploy steps for the VPS are in [`docs/deploy-vps.md`](docs/deploy-vps.md).

Check the case scripts from the repo root:

```bash
node scripts/validate-cases.mjs
```

That checks schema `0.1` and the effect-key grammar, then plays the eight `deepfake-hk-001` endings. The API machine is checked from `backend/`:

```bash
cd backend
source .venv/bin/activate
PYTHONPATH=. python -m unittest discover -s tests -v
```

Details: [`docs/effects.md`](docs/effects.md). The course note for one run is [`docs/audit-evidence.md`](docs/audit-evidence.md).

The Unity room's six choice paths use the same applier:

```bash
node scripts/unity-room-paths.test.mjs
```

## Unity training room

Open [`unity/UNITY.md`](unity/UNITY.md). In Unity 2022.3 LTS, open the project folder `unity/TwinAML`, then open `Scn_Boot` and press Play (or use the menu **TwinAML → Play From Boot**). Topic 1 is `deepfake-hk-001`. Topic 2 is `hk-greythunder-mule-001`. Topic 3 is `hk-starlight-onboard-001`, a walkable branch taught in English. Topic 4 is `alert-triage-shift-001`, an English investigation room with six synthetic alerts. The dashboard in that room is the TwinAML AML Training Portal. It reads the twin written by those choices and still writes `twinaml-dashboard.json`. Docker is not involved.

## Deploy

The demo target is a self-hosted Linux VPS. nginx or Caddy serves the Vite build and reverse-proxies to the API. HTTPS terminates at the proxy. Hostnames, certificates, and private keys are not stored in this repo.

Steps are in [`docs/deploy-vps.md`](docs/deploy-vps.md). [`docs/cloudflare.md`](docs/cloudflare.md) only records that the Worker scaffold is not this path.

## Implementation phases

### Planned phases

Plans for coding agents are in [`docs/phases/`](docs/phases/README.md). Do not implement from that folder until the owner names a phase and a slice. The phase files are the source of truth for slice scope. This section lists each slice so a reader can see the plan here.

Chan levels follow the course: Level 1 is a scripted mirror, Level 2 is a near-realtime session that writes back to the twin, Level 3 is product vision. Course terms are mapped in [`docs/comp3424-mapping.md`](docs/comp3424-mapping.md).

| Doc | Chan level | Goal |
| --- | --- | --- |
| [Phase 1](docs/phases/PHASE1.md) | Level 1 (scripted mirror) | All 11 synthetic cases end-to-end on a Linux VPS (static web + API) |
| [Phase 2](docs/phases/PHASE2.md) | Level 2 (near-realtime bidirectional) | Versioned rules, realtime twin updates, case families beyond the 11, audit export |
| [Phase 3](docs/phases/PHASE3.md) | Level 3 (vision) | ML assist and live connectors. Not the COMP3424 demo |

**Phase 1 — MVP (Chan Level 1).** A readable mirror of the 11 scripts. The trainee starts a session with a `case_id`. The VPS API loads that script, applies the rules and the state machine, and stores events. The web app shows the scenario player and a simple dashboard of the same twin.

In scope: load any of the 11 against `packages/schemas/script.schema.json`; session routes that take `case_id`; deterministic `twin_patch` and choice effects as in [`docs/effects.md`](docs/effects.md); English UI chrome (case prompts may stay Traditional Chinese); a missing `media_ref` file shows a missing-media state.

Out of scope for Phase 1: Docker, Kubernetes, Neo4j, Kafka, FlexSim, a microservice split, wiring the Editor room to the live session API, a live language model that sets disposition, a real bank / HKMA / STR filing connection, multi-tenant billing, and session-time video synthesis. The Editor room in [`unity/UNITY.md`](unity/UNITY.md) stays in the demo and is not one of these slices. New mixer / peel-chain and synthetic-ID families beyond this library wait for Phase 2.

Current status: P1-S1 through P1-S8 are done. The API and the web player run the library, including the two Editor-room scripts. Phase 2 has not started.

| Slice | Done when |
| --- | --- |
| P1-S1 — Script contract freeze | **Done.** [`docs/effects.md`](docs/effects.md). Check with `node scripts/validate-cases.mjs`. |
| P1-S2 — Twin state machine | **Done.** `backend/tests/test_machine.py`. |
| P1-S3 — Session store + API routes | **Done.** `POST /sessions` and `POST /sessions/{id}/decisions`. `GET /health` stays. |
| P1-S4 — Scenario player | **Done.** The case list starts any script in `data/cases/`. Missing media stays on the page. |
| P1-S5 — Event log + teaching score | **Done.** Ordered events, plus `poor_path` when the disposition is a teaching poor path. |
| P1-S6 — Simple dashboard | **Done.** The dashboard reads the same sessions. |
| P1-S7 — Deploy checklist | **Done.** [`docs/deploy-vps.md`](docs/deploy-vps.md) proxies `/health`, `/cases`, and `/sessions`. |
| P1-S8 — Demo polish | **Done.** This README plus [`docs/audit-evidence.md`](docs/audit-evidence.md). |

Slice detail: [`docs/phases/PHASE1.md`](docs/phases/PHASE1.md).

**Phase 2 — Chan Level 2.** Same VPS API, after Phase 1 is done. A training session shadows the trainee: a choice becomes an event, the event updates twin state promptly, and the dashboard reads that state. Rules move into versioned packs. The case library can grow with new families beyond the 11 (mixer / peel-chain, synthetic identity). Two paths through a case must show different dispositions, and the ordered events must be replayable. There is still no live core bank. Not built.

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

**Phase 3 — vision (Chan Level 3).** Planning only. This is not a COMP3424 commitment. After Phases 1–2, a model may assist once rules have fired, optional connectors may seed a twin from fixtures, and a Unity face may call the same API. The Editor room under [`unity/`](unity/UNITY.md) already plays Topics 1–4 on this machine. P3-S4, that room against the VPS session API, is not built. Models do not become the system of record. There is no second twin, and training data stays labeled synthetic.

| Slice | Done when |
| --- | --- |
| P3-S1 — ML assist shadow mode | The UI shows a suggestion separately from the rule decision. The model does not write disposition alone. |
| P3-S2 — Connector adapter | Training can optionally seed the twin from adapter fixtures. The default data stays synthetic. |
| P3-S3 — Retention and legal hold | Org policy for event retention and export hold is documented, and delete/export gates enforce it. |
| P3-S4 — Immersive client (Unity) | One Phase 1 path is playable in Unity against the VPS API, on the same session routes. |
| P3-S5 — Multi-jurisdiction packs | Switching a rule pack is an audited event. Closed sessions keep the pack id they ran under. |

Slice detail: [`docs/phases/PHASE3.md`](docs/phases/PHASE3.md).

Mirroring is the case library played through the API. Shadowing and threading are Level 2 and are not built. `GET /sessions/{id}/evidence` is a short card on top of the same session.

## Agent rules

Short rules for classmates and coding agents. The full agreement is [`AGENTS.md`](AGENTS.md).

1. Change one small slice at a time. After it, say what a trainee or reviewer can now see or run.
2. Keep one web client (`frontend/`), one VPS API (FastAPI in `backend/`, or later a Node/Hono process with the same routes), and the Unity Editor room. `workers/` may stay as a legacy scaffold. Case scripts live in `data/cases/`. Notes live in `docs/`.
3. Leave Docker, Kubernetes, Neo4j, Kafka, FlexSim, a service split, and a second Unity project out unless the owner asks in that session. The Editor room in `unity/TwinAML` stays.
4. English is the primary language for docs and UI copy. Keep course terms in English: mirroring, shadowing, threading, Chan Level 1, Chan Level 2, rules-before-AI.
5. The twin is backend state plus events. The web app renders that state.
6. Rules decide compliance outcomes. A model may explain only after rules have fired. A human override is an event.
7. Do not commit secrets, API keys, `.env` files, TLS private keys, or large media.
8. If the script shape changes, every example case under `data/cases/` must still validate against `packages/schemas/script.schema.json`. Run `node scripts/validate-cases.mjs`. The schema or docs must say what changed.

Read next: [`docs/architecture.md`](docs/architecture.md), [`docs/effects.md`](docs/effects.md), [`docs/comp3424-mapping.md`](docs/comp3424-mapping.md), [`docs/deploy-vps.md`](docs/deploy-vps.md), [`docs/phases/README.md`](docs/phases/README.md), [`data/cases/README.md`](data/cases/README.md), [`data/cases/01-deepfake-hk-001.example.json`](data/cases/01-deepfake-hk-001.example.json), [`data/case-flow/01-deepfake-executive-impersonation.en.md`](data/case-flow/01-deepfake-executive-impersonation.en.md), [`packages/schemas/script.schema.json`](packages/schemas/script.schema.json).

## License

The TwinAML platform idea and the contents of this repository are proprietary. All rights reserved.

This repository is a COMP3424 course demo. It does not include an OSI license. Do not redistribute it as an open-source project or turn it into a commercial product. Use and modification follow the owner's permission.
