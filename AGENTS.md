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
   - one Node API in `workers/api`, with file-backed SQLite, serving the built web client on a VPS (sessions, decisions, twin state machine)
   - one React + Vite + TypeScript client in `frontend/` (investigation desk and later scenario player)
   - the existing Cloudflare Worker/Pages adapters remain optional; they share the investigation engine and use separate session storage
   - optional FastAPI in `backend/` as a local/dev alternative only. It is a health-only stub, not the investigation runtime.
   - case scripts in `data/cases/`
   - notes in `docs/`
3. Do not add Docker, Kubernetes, Neo4j, Kafka, a microservice split, a Unity project, or other enterprise pieces unless the owner explicitly asks in that session. Docker is not a supported way to run or deploy this demo. Do not reintroduce `docker-compose.yml` or a container cluster as a requirement.
4. Prefer the web client over Unity. Unity is an optional later face for the same twin, not a second platform.
5. TwinAML ships English only: docs, UI copy and case content, including every string in `data/cases/`. `node scripts/validate-cases.mjs` enforces it for scripts. Keep course terms in English when they are the lecture vocabulary: mirroring, shadowing, threading, Chan Level 1, Chan Level 2, rules-before-AI. Do not switch docs or the placeholder UI back to Traditional Chinese.
6. Never commit secrets, API keys, `.env` files, Cloudflare account identifiers, or large media. `data/media/` stays empty aside from `.gitkeep`. Scripts may reference media paths; the binaries stay local.
7. Do not invent a second state model. The twin is backend state plus events. The web app renders that state. It does not own a private copy of the case world.
8. Rules decide compliance outcomes. Do not let a language model become the system of record. Any later model may explain a decision only after rules have fired, and a human override must be stored as an event.
9. The owner's current deployment preference is a VPS. See `docs/vps.md` for the Node run path. Optional Cloudflare Pages/Workers hosting remains in `docs/cloudflare.md`. Do not purchase or deploy infrastructure without an explicit request.

## Where to read first

- `README.md` — what TwinAML is, the folder map, how to run the investigation pilot.
- `docs/architecture.md` — case → script → decision → twin → events → dashboard.
- `docs/effects.md` — how `twin_patch` and `choices[].effects` apply (schema 0.1).
- `docs/comp3424-mapping.md` — Chan Level 1/2, mirroring / shadowing / threading, rules-before-AI.
- `docs/vps.md` — default Node hosting; `docs/cloudflare.md` — optional Pages/Worker hosting.
- `data/cases/01-deepfake-hk-001.example.json` — the Level 1 example script.
- `packages/schemas/script.schema.json` — the minimal script contract.

## Definition of done

A vibe-coding session is done when all of these are true:

- The change matches the request and stays inside the simplified stack above.
- `workers/api` still answers `GET /health` if that tree was touched. `frontend/` still builds if that tree was touched. `backend/` still imports as one optional local app if that tree was touched.
- If the script shape changed, `data/cases/01-deepfake-hk-001.example.json` still validates against `packages/schemas/script.schema.json`, and the schema or docs say what changed.
- New behaviour is described in the relevant README or `docs/` file. Undocumented folder contracts are not done.
- No secrets, credentials, or large binaries are staged.
- The commit message says what a trainee or reviewer can now see or run.
