# TwinAML implementation phases

These documents are **plans for coding agents**. They define scope, slices, acceptance criteria, and what is out of scope. **Do not implement code from this folder until the owner asks to start a named phase and a named slice.**

| Doc | Chan level | Goal |
| --- | --- | --- |
| [PHASE1.md](./PHASE1.md) | Level 1 (scripted mirror) | All 11 synthetic cases end-to-end on a Linux VPS (static web + API) |
| [PHASE2.md](./PHASE2.md) | Level 2 (near-realtime bidirectional) | Configurable rules, case families beyond the 11, realtime twin updates, audit export |
| [PHASE3.md](./PHASE3.md) | Level 3 (vision) | ML assist + live connectors — **not** for the COMP3424 demo |

## How an agent should use these files

1. Read `AGENTS.md` and this README first.
2. Work **one slice** from the active phase doc (see “Implementation slices”).
3. Stay on the stack in root `README.md`: FastAPI (`backend/`) + React Vite static files (`frontend/`) on a Linux VPS. See [`docs/deploy-vps.md`](../deploy-vps.md). `workers/api` may remain as a legacy scaffold. FlexSim stays out. The Unity Editor room stays in scope and is not a second API.
4. **Rules-before-AI**: rules and the state machine decide outcomes. A language model may explain after the fact; it must never silently change disposition.
5. Commit **directly to `main`** unless the owner says otherwise. Do not open a feature branch or PR by default.
6. Do not reintroduce Docker, Kubernetes, Neo4j, Kafka, FlexSim, a second Unity project, or a live bank connection unless the active phase slice explicitly allows it. The Editor room under `unity/` is already in the demo.

## Current repo baseline (before Phase 1 slices)

Matches root `README.md` on main:

- Demo API: FastAPI in `backend/`, `GET /health` only.
- Frontend: placeholder page that builds to static files.
- Legacy scaffold: Cloudflare Worker in `workers/api`, same health JSON. Not the deploy path.
- Cases: `data/cases/*.example.json` (`deepfake-hk-001` and ten `hk-*` scripts) + `packages/schemas/script.schema.json`. Effect keys: [`docs/effects.md`](../effects.md) (P1-S1).
- Docs: `docs/architecture.md`, `docs/comp3424-mapping.md`, `docs/deploy-vps.md`. `docs/cloudflare.md` is a pointer only.

## Suggested order

Complete Phase 1 slices P1-S1 → P1-S8 before any Phase 2 work. Phase 3 is documentation / roadmap only for COMP3424.
