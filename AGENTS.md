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
   - one demo API for the Linux VPS: FastAPI in `backend/` (cases, sessions, decisions, twin state machine). A Node/Hono process may serve the same routes in a later slice. Do not add a second API.
   - one React + Vite + TypeScript client in `frontend/`, built to static files and served on that VPS (scenario player + simple dashboard)
   - `workers/api` and the Wrangler config files may remain as a legacy Cloudflare scaffold. They are not the COMP3424 demo target.
   - case scripts in `data/cases/`
   - notes in `docs/`
   - one Unity Editor room on long-lived branch `unity` (`git fetch && git checkout unity`), in `unity/TwinAML` (see `unity/UNITY.md` on that branch). Open it with Unity 6000.6.8f1. It is in scope. It plays pre-authored scripts locally. It is not a second API. Leave that tree on branch `unity`.
3. Do not add Docker, Kubernetes, Neo4j, Kafka, FlexSim, a microservice split, a second Unity project, or other enterprise pieces unless the owner explicitly asks in that session. Docker is not a supported way to run or deploy this demo. Do not reintroduce `docker-compose.yml` or a container cluster as a requirement. FlexSim is out of scope for the demo.
4. Prefer the web client for the VPS demo. The Editor room is the immersive face and stays in the demo on branch `unity` (`git fetch && git checkout unity`). It is not a second platform and it does not replace the API.
5. English is the primary language for docs and UI copy. Keep course terms in English when they are the lecture vocabulary: mirroring, shadowing, threading, Chan Level 1, Chan Level 2, rules-before-AI. Do not switch docs or the placeholder UI back to Traditional Chinese.
6. Never commit secrets, API keys, `.env` files, TLS private keys, or large media. `data/media/` stays empty aside from `.gitkeep`. Scripts may reference media paths; the binaries stay local. Do not commit Cloudflare account identifiers into the legacy scaffold.
7. Do not invent a second state model. The twin is backend state plus events. The web app renders that state. It does not own a private copy of the case world. The Editor room applies the same schema 0.1 mirror locally. It does not call the session API (that wiring is P3-S4). It does not invent another script format.
8. Rules decide compliance outcomes. Do not let a language model become the system of record. Any later model may explain a decision only after rules have fired, and a human override must be stored as an event.
9. Deploy docs stay on a self-hosted Linux VPS: static `frontend/` plus the API behind nginx or Caddy, with HTTPS. See `docs/deploy-vps.md`. `docs/cloudflare.md` only points at that page.

## Where to read first

- `README.md` — what TwinAML is, the folder map, how to run the stubs.
- `docs/architecture.md` — case → script → decision → twin → events → dashboard.
- `docs/effects.md` — how `twin_patch` and `choices[].effects` apply (schema 0.1).
- `docs/comp3424-mapping.md` — Chan Level 1/2, mirroring / shadowing / threading, rules-before-AI.
- `docs/deploy-vps.md` — Linux VPS: static site, API, nginx or Caddy, HTTPS.
- `docs/cloudflare.md` — pointer only. The Worker scaffold is not the demo target.
- `data/cases/01-deepfake-hk-001.example.json` — the Level 1 example script.
- `packages/schemas/script.schema.json` — the minimal script contract.
- Branch `unity` (`git fetch && git checkout unity`), then `unity/UNITY.md` — Editor training room: `Scn_Boot`, Topic 1, Topic 2. https://github.com/innalhy/aml-twin/tree/unity

## Cursor Cloud specific instructions

Node 22 matches CI. Do not add Docker. The default image needs `python3-venv` before `python3 -m venv backend/.venv` (no `ensurepip`).

After boot, these are already up when healthy:

- `http://127.0.0.1:8000/health` — demo API (FastAPI), `{"status":"ok","service":"twinaml-api"}`
- `http://127.0.0.1:5173` — Vite placeholder
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
