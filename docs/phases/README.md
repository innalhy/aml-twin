# TwinAML implementation phases

These documents are **plans for coding agents**. They define scope, slices, acceptance criteria, and what is out of scope. **Do not implement code from this folder until the owner asks to start a named phase and a named slice.**

| Doc | DT Level | Goal |
| --- | --- | --- |
| [PHASE1.md](./PHASE1.md) | Level 1 (scripted mirror) | 13 synthetic scripts in `data/cases/` on a rented Linux VPS (static web + API). The Phase 1 set was the first 11. |
| [PHASE2.md](./PHASE2.md) | Level 2 | Replaced for this demo by the Streamlit / Neo4j sandbox |
| [PHASE3.md](./PHASE3.md) | Level 3 | Replaced for this demo by the same sandbox |

## How an agent should use these files

1. Read `AGENTS.md` and this README first.
2. Work **one slice** from the active phase doc (see “Implementation slices”).
3. Stay on the stack in root `README.md`: FastAPI (`backend/`) + React Vite static files (`frontend/`) on a Linux VPS, plus the Streamlit / Neo4j sandbox in `demo/neo4j/`. See [`docs/deploy-vps.md`](../deploy-vps.md). `workers/api` may remain as a legacy scaffold. FlexSim stays out. The Unity Editor project lives only on branch `unity` and is not the current demo path.
4. **Rules-before-AI**: rules and the state machine decide outcomes. A language model may explain after the fact; it must never silently change disposition.
5. Commit **directly to `main`** unless the owner says otherwise. Do not open a feature branch or PR by default.
6. Do not reintroduce Docker, Kubernetes, Kafka, FlexSim, a second Unity project, or a live bank connection unless the owner asks. Neo4j in `demo/neo4j/` is part of the classroom demo. The Editor project on branch `unity` is not the current demo path.

## Current repo baseline

Phase 1 slices P1-S1 through P1-S8 are done. See [`PHASE1.md`](./PHASE1.md). For this course demo, Phase 2 and Phase 3 are the Streamlit / Neo4j sandbox in [`demo/neo4j/`](../../demo/neo4j/README.md). The slice lists in [`PHASE2.md`](./PHASE2.md) and [`PHASE3.md`](./PHASE3.md) are earlier engineering notes. They are not the next build.

- Demo API: FastAPI in `backend/`. `GET /health`, `GET /cases`, session routes, and the twin state machine.
- Frontend: scenario player and dashboard. Static build for the VPS. The Vite dev server proxies `/health`, `/cases`, and `/sessions` to port 8000.
- Sandbox: Streamlit app, bundled CSV ledger, Cypher load scripts, and Bloom on the presenter's machine. This is the Phase 2 graph and the Phase 3 classroom face.
- Legacy scaffold: Cloudflare Worker in `workers/api`, health JSON only. Not the deploy path.
- Cases: `data/cases/*.example.json` + `packages/schemas/script.schema.json`. Effect keys: [`docs/effects.md`](../effects.md).
- Docs: `docs/architecture.md`, `docs/comp3424-mapping.md`, `docs/deploy-vps.md`, `docs/audit-evidence.md`. `docs/cloudflare.md` is a pointer only.

## Suggested order

Phase 1 slices P1-S1 → P1-S8 are done. Do not start the old Phase 2 or Phase 3 slices unless the owner names one. The sandbox already covers those two phases for the classroom demo.
