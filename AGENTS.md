# AGENTS.md

This file is the working agreement for AI agents in **TwinAML**, a COMP3424 demo: a digital twin for AML simulation training.

`AGENT.md` only points here.

## Who this repo is for

- Course: PolyU COMP3424 Digital Twins: Simulation and Case Studies.
- Product: TwinAML. The platform idea is proprietary. This tree is a course demo, not an enterprise build and not an open-source release.
- Readers: the owner, classmates, and coding agents extending the demo in small steps.

## How to work

1. Change one small slice at a time. A session should leave the tree clearer than it found it.
2. Keep the simplified architecture:
   - one demo API for the rented Linux VPS: FastAPI in `backend/` (cases, sessions, decisions, twin state machine, SQLite session store). Do not add a second API.
   - one React + Vite + TypeScript client in `frontend/`, built to static files and served on that VPS (scenario player + simple dashboard). The live Learning Center also has an in-browser Three.js Simulation Center (`SceneViewport`) and a `TwinPlatform` client. Those sources are not in `frontend/src/` on this branch. Do not pretend they are.
   - `workers/` may remain as a legacy scaffold. It is not the COMP3424 demo path.
   - case scripts in `data/cases/` (13 synthetic scripts on this branch)
   - the Behavioral Sandbox in `demo/neo4j/` (Streamlit, bundled CSV, Cypher, Bloom notes). It does not write the Learning Center session store.
   - notes in `docs/`
   - the Unity Editor project stays on branch `unity` only. It is outside the current demo path. Do not check that branch out to extend this demo, and do not describe Unity, Unreal, Omniverse, or FlexSim as the current 3D or simulation path.
3. Do not add Docker, Kubernetes, Kafka, FlexSim, PostgreSQL, Redis, MySQL, a microservice split, or a second Unity project unless the owner explicitly asks in that session. Docker is not a supported way to run or deploy this demo. Do not reintroduce `docker-compose.yml` or a container cluster as a requirement. FlexSim is out of scope for the demo. Neo4j in `demo/neo4j/` is the Behavioral Sandbox graph view on the presenter's machine. Do not add a second graph database to the Learning Center API.
4. Prefer the web client for the VPS demo. The live 3D is Three.js inside that client, on the current VPS deploy, and it is not in `frontend/src/` on this branch. The Unity Editor project is not the immersive face of the current demo.
5. English is the primary language for docs and UI copy. Keep course terms in English when they are the lecture vocabulary: mirroring, shadowing, threading, DT Level 1, DT Level 2, rules-before-AI. Do not switch docs or the placeholder UI back to Traditional Chinese. The product name is Behavioral Sandbox.
6. Never commit secrets, API keys, `.env` files, TLS private keys, or large media. `data/media/` stays empty aside from `.gitkeep`. Scripts may reference media paths; the binaries stay local. Do not commit Cloudflare account identifiers into the legacy scaffold.
7. Do not invent a second state model. The twin for a Learning Center run is backend state plus events. The web app renders that state. It does not own a private copy of the case world. The Behavioral Sandbox ledger is a separate twin and does not write the session store. Do not invent another script format.
8. Rules decide compliance outcomes. Do not let a language model become the system of record. An LLM must not set the case outcome at runtime. A human override must be stored as an event.
9. Deploy docs stay on a rented Linux VPS: static `frontend/` plus the API behind nginx or Caddy, with HTTPS. See `docs/deploy-vps.md`. Do not call that host self-hosted. `docs/cloudflare.md` only points at that page. Do not describe Workers as the demo path.

## Where to read first

- `README.md` — what TwinAML is, the folder map, how to run the stubs.
- `docs/architecture.md` — case → script → decision → twin → events → dashboard.
- `docs/effects.md` — how `twin_patch` and `choices[].effects` apply (schema 0.1).
- `docs/comp3424-mapping.md` — DT Level 1/2, mirroring / shadowing / threading, rules-before-AI.
- `docs/deploy-vps.md` — Linux VPS: static site, API, nginx or Caddy, HTTPS.
- `docs/cloudflare.md` — pointer only. The legacy scaffold is not the demo path.
- `data/cases/01-deepfake-hk-001.example.json` — the Level 1 example script.
- `packages/schemas/script.schema.json` — the minimal script contract.
- `demo/neo4j/README.md` — Behavioral Sandbox. Branch `unity` is outside the current demo path. Do not treat it as the 3D client.

## Cursor Cloud specific instructions

Node 22 matches CI. Do not add Docker. The default image needs `python3-venv` before `python3 -m venv backend/.venv` (no `ensurepip`).

After boot, these are already up when healthy:

- `http://127.0.0.1:8000/health` — demo API (FastAPI), `{"status":"ok","service":"twinaml-api"}`
- `http://127.0.0.1:5173` — Vite dev server for the web client in this tree
- `http://127.0.0.1:8787/health` — legacy Worker scaffold, same JSON, when that process is started. Not the demo deploy.

How to run them by hand is in `README.md`. Case check: `node scripts/validate-cases.mjs` (first run installs `ajv@8` in the OS temp directory).

## Definition of done

A vibe-coding session is done when all of these are true:

- The change matches the request and stays inside the simplified stack above.
- `backend/` still answers `GET /health` if that tree was touched. `frontend/` still builds if that tree was touched. `workers/api` still answers `GET /health` if that legacy scaffold was touched.
- If the script shape changed, `data/cases/01-deepfake-hk-001.example.json` still validates against `packages/schemas/script.schema.json`, and the schema or docs say what changed.
- New behaviour is described in the relevant README or `docs/` file. Undocumented folder contracts are not done.
- No secrets, credentials, or large binaries are staged.
- The commit message says what a trainee or reviewer can now see or run.
