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
   - one Cloudflare Worker in `workers/api` (the demo API: cases, sessions, decisions, twin state machine)
   - one React + Vite + TypeScript client in `frontend/`, deployed to Cloudflare Pages (scenario player + simple dashboard)
   - optional FastAPI in `backend/` as a local/dev alternative only. The production demo uses the Worker. Do not treat FastAPI as the required runtime.
   - case scripts in `data/cases/`
   - notes in `docs/`
   - one Unity Editor room in `unity/TwinAML` (see `unity/UNITY.md`). It plays pre-authored scripts locally. It is not a second API.
3. Do not add Docker, Kubernetes, Neo4j, Kafka, a microservice split, a second Unity project, or other enterprise pieces unless the owner explicitly asks in that session. Docker is not a supported way to run or deploy this demo. Do not reintroduce `docker-compose.yml` or a container cluster as a requirement.
4. Prefer the web client for the Pages demo. The Editor room is the immersive face. It is not a second platform and it does not replace the Worker.
5. English is the primary language for docs and UI copy. Keep course terms in English when they are the lecture vocabulary: mirroring, shadowing, threading, Chan Level 1, Chan Level 2, rules-before-AI. Do not switch docs or the placeholder UI back to Traditional Chinese.
6. Never commit secrets, API keys, `.env` files, Cloudflare account identifiers, or large media. `data/media/` stays empty aside from `.gitkeep`. Scripts may reference media paths; the binaries stay local.
7. Do not invent a second state model. The twin is backend state plus events. The web app renders that state. It does not own a private copy of the case world. The Editor room applies the same schema 0.1 mirror locally until the Worker state machine exists. It does not invent another script format.
8. Rules decide compliance outcomes. Do not let a language model become the system of record. Any later model may explain a decision only after rules have fired, and a human override must be stored as an event.
9. Deploy docs stay on Cloudflare Pages (web) and Cloudflare Workers (API). See `docs/cloudflare.md`. A custom domain is attached in the Cloudflare dashboard or in Wrangler config, not by standing up another host.

## Where to read first

- `README.md` — what TwinAML is, the folder map, how to run the stubs.
- `docs/architecture.md` — case → script → decision → twin → events → dashboard.
- `docs/effects.md` — how `twin_patch` and `choices[].effects` apply (schema 0.1).
- `docs/comp3424-mapping.md` — Chan Level 1/2, mirroring / shadowing / threading, rules-before-AI.
- `docs/cloudflare.md` — Pages, the Worker, and a custom domain.
- `data/cases/01-deepfake-hk-001.example.json` — the Level 1 example script.
- `packages/schemas/script.schema.json` — the minimal script contract.
- `unity/UNITY.md` — Editor training room: `Scn_Boot`, Topic 1, Topic 2.

## Definition of done

A vibe-coding session is done when all of these are true:

- The change matches the request and stays inside the simplified stack above.
- `workers/api` still answers `GET /health` if that tree was touched. `frontend/` still builds if that tree was touched. `backend/` still imports as one optional local app if that tree was touched.
- If the script shape changed, `data/cases/01-deepfake-hk-001.example.json` still validates against `packages/schemas/script.schema.json`, and the schema or docs say what changed.
- New behaviour is described in the relevant README or `docs/` file. Undocumented folder contracts are not done.
- No secrets, credentials, or large binaries are staged.
- The commit message says what a trainee or reviewer can now see or run.
