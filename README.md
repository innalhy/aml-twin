# TwinAML

Repository: [github.com/innalhy/aml-twin](https://github.com/innalhy/aml-twin)

## What it is

TwinAML is a COMP3424 course demo of a digital twin for AML simulation training. The platform idea is proprietary: this tree is a classroom demo, not a bank production system and not an open-source release. The worked example is one synthetic Hong Kong deepfake video-onboarding case, `deepfake-hk-001`; every record in it is synthetic. The twin is backend state plus the events that change it. The web app is the face that will render that state.

A trainee is meant to decide inside that one case. Rules in the script decide compliance outcomes (rules-before-AI). A language model, if one is added later, may explain a decision only after those rules have fired, and a human override must be stored as an event.

What runs today is a scaffold. The Worker and the optional FastAPI app answer `GET /health`. The Pages app is a placeholder. The example script and its JSON Schema are in the repo. Session routes, the scenario player, and the dashboard are not built.

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
| Cases | One JSON script, `data/cases/deepfake-hk-001.example.json`. | Stay on `packages/schemas/script.schema.json`. A rule’s `when` text is for a person to read until a state machine exists. |
| Media | `data/media/.gitkeep` only. Large video is gitignored. | Scripts may set `media_ref` to a local path. Binaries stay out of git. |
| Contract | `packages/schemas/script.schema.json` (schema `0.1`). | One script format. |
| Docs | `docs/architecture.md`, `docs/comp3424-mapping.md`, `docs/cloudflare.md`. | `docs/phases/` next. See [Implementation phases](#implementation-phases). |
| Deploy | Wrangler config for Pages (`frontend/wrangler.jsonc`) and the Worker (`workers/api/wrangler.jsonc`). | Pages serves the Vite build. The Worker serves the API. |

Out of scope unless the owner asks in that session: Docker, Kubernetes, Neo4j, Kafka, a microservice split, a Unity project, and a live bank connection.

## Repo layout

```
.
├── README.md
├── AGENTS.md
├── .gitignore
├── Mindmap.png                  # course sketch for reference; not the build contract
├── docs/
│   ├── architecture.md          # case → script → decision → twin → events
│   ├── cloudflare.md            # Pages, Worker, custom domain
│   └── comp3424-mapping.md      # Chan Level 1/2, mirroring, shadowing, threading
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
│   ├── cases/
│   │   └── deepfake-hk-001.example.json
│   └── media/
│       └── .gitkeep
├── packages/
│   └── schemas/
│       └── script.schema.json
└── scripts/
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

## Deploy

The demo target is Cloudflare. Pages serves the Vite build. The Worker in `workers/api` is the API. Account ids, API tokens, and a real hostname are not stored in this repo.

Steps for Pages, the Worker, and a custom domain already on your Cloudflare account are in [`docs/cloudflare.md`](docs/cloudflare.md).

## Implementation phases

### Planned phases

`docs/phases/` is not in this tree yet. Those notes land next. Until then:

**Phase 1 — MVP (Chan Level 1).** A readable mirror of one synthetic case. `deepfake-hk-001.example.json` and `packages/schemas/script.schema.json` are in the repo. The Worker and the Pages app are health and placeholder stubs. Session routes, the scenario player, and the dashboard are not built.

**Phase 2 — Chan Level 2.** Still the same Worker. A training session shadows the trainee: a choice becomes an event, the event updates twin state, and the dashboard reads that state. Two paths through the example case must show different dispositions, and the ordered events must be replayable. Not built. See [`docs/comp3424-mapping.md`](docs/comp3424-mapping.md).

**Phase 3 — vision.** An optional Unity face on the same API, and a model that explains a decision only after rules-before-AI has fired. No live bank control and no second twin. Outside the current demo build.

In this scaffold, mirroring is the example JSON. Shadowing and threading are Level 2 and are not built.

## Agent rules

Short rules for classmates and coding agents. The full agreement is [`AGENTS.md`](AGENTS.md).

1. Change one small slice at a time. After it, say what a trainee or reviewer can now see or run.
2. Keep one Worker (`workers/api`), one Pages client (`frontend/`), and optional local FastAPI (`backend/`). Case scripts live in `data/cases/`. Notes live in `docs/`.
3. Leave Docker, Kubernetes, Neo4j, Kafka, a service split, and Unity out unless the owner asks in that session.
4. English is the primary language for docs and UI copy. Keep course terms in English: mirroring, shadowing, threading, Chan Level 1, Chan Level 2, rules-before-AI.
5. The twin is backend state plus events. The web app renders that state.
6. Rules decide compliance outcomes. A model may explain only after rules have fired. A human override is an event.
7. Do not commit secrets, API keys, `.env` files, Cloudflare account identifiers, or large media.
8. If the script shape changes, `deepfake-hk-001.example.json` must still validate against `packages/schemas/script.schema.json`, and the schema or docs must say what changed.

Read next: [`docs/architecture.md`](docs/architecture.md), [`docs/comp3424-mapping.md`](docs/comp3424-mapping.md), [`docs/cloudflare.md`](docs/cloudflare.md), [`data/cases/deepfake-hk-001.example.json`](data/cases/deepfake-hk-001.example.json), [`packages/schemas/script.schema.json`](packages/schemas/script.schema.json).

## License

The TwinAML platform idea and the contents of this repository are proprietary. All rights reserved.

This repository is a COMP3424 course demo. It does not include an OSI license. Do not redistribute it as an open-source project or turn it into a commercial product. Use and modification follow the owner's permission.
