# Phase 1 — MVP (Chan Level 1)

**Status:** P1-S1 (script contract freeze) is done. Later slices stay unstarted until the owner names one.  
**Audience:** coding agents.  
**Chan level:** Level 1 — scripted case, offline-style mirror of `initial_twin_state`, not a live bank.

## Goal

One synthetic Hong Kong deepfake video-onboarding case (`deepfake-hk-001`) end-to-end:

case script → training session → trainee decision → rules + state machine → twin update → event log → web player + simple dashboard.

Deploy path: **Cloudflare Pages** (`frontend/`) + **Cloudflare Worker** (`workers/api`). FastAPI in `backend/` stays optional local only, as in the root `README.md`.

## In scope

- Load `data/cases/deepfake-hk-001.example.json` (or a non-`.example` copy) against `packages/schemas/script.schema.json`.
- Session API on the Worker: start session, get current node, submit decision, get twin + events.
- Deterministic twin state machine applying `twin_patch` and `choices[].effects` (including `risk.flags_add`, `risk.score_delta`, dotted keys as agreed in code).
- Soft rule checks for R1 / R2 teaching flags (human-readable `when` may stay non-executable; outcomes must still match teaching dispositions).
- React scenario player + minimal compliance dashboard reading the same twin/events.
- Persist session + events (Worker-friendly store: e.g. Durable Object or D1 — pick one and document; no Postgres cluster required for MVP).
- English UI chrome; case content may stay Traditional Chinese.
- Missing `media_ref` file → show missing-media state, do not crash the case.

## Out of scope (Phase 1)

- Docker, Kubernetes, Neo4j, Kafka, microservices.
- Unity client.
- Mixer / peel-chain / synthetic-ID cases.
- Live LLM judging disposition.
- Real bank / HKMA / STR filing integration.
- Multi-tenant billing.
- Session-time long video synthesis (HeyGen etc.).

## Success criteria (phase done)

1. Trainee can open the web app, start `deepfake-hk-001`, walk every branch in the example script, and see terminal dispositions.
2. Every decision appends an event; override paths store an override event.
3. Dashboard shows last session: disposition, flags, whether teaching “poor” path was taken.
4. `GET /health` still works; frontend builds; `wrangler` configs remain valid.
5. Docs updated: architecture / cloudflare / this file’s “Done slices” checklist.

## Implementation slices (do one at a time)

### P1-S1 — Script contract freeze
- Confirm schema + example case stay valid.
- Document effect key conventions in `docs/architecture.md` or a short `docs/effects.md`.
- **Done when:** agent can list every effect key used in `deepfake-hk-001` and how the future machine should apply them.
- **Done:** [`docs/effects.md`](../effects.md) lists every effect key in `deepfake-hk-001` and the ten `hk-*.example.json` scripts, and the apply order (clone `initial_twin_state`, apply `twin_patch`, then apply choice `effects`). `node scripts/validate-cases.mjs` checks the files and plays the eight `deepfake-hk-001` terminal paths in [`scripts/deepfake-paths.test.mjs`](../../scripts/deepfake-paths.test.mjs).

### P1-S2 — Twin state machine (library)
- Pure TypeScript module under `workers/api` (or `packages/`) that: clone initial state → apply node patch → apply choice effects → advance node.
- Unit tests for accept / redo liveness / reject / R1 override / STR / EDD / false-positive paths.
- **Done when:** tests cover all terminal dispositions in the example case without HTTP.

### P1-S3 — Session store + Worker routes
- Routes (suggested):
  - `POST /sessions` `{ case_id }` → `{ session_id, node, twin, events }`
  - `GET /sessions/:id`
  - `POST /sessions/:id/decisions` `{ choice_id }` → next node, twin, new events
  - Keep `GET /health`
- CORS for local Vite + Pages origin.
- **Done when:** `curl` / local `wrangler dev` can complete one full path to a terminal outcome.

### P1-S4 — Scenario player (frontend)
- Load session, render scene/decision/outcome, submit choices, show twin summary sidebar.
- Handle missing media gracefully.
- **Done when:** browser playthrough matches API tests for at least two branches.

### P1-S5 — Event log + teaching score
- Events: `session_started`, `node_entered`, `decision_made`, `rule_flagged`, `override`, `session_closed`.
- Mark poor disposition `false_positive_cleared` for dashboard.
- **Done when:** GET session returns ordered events for replay.

### P1-S6 — Simple dashboard
- List recent sessions; detail: disposition, flags, event timeline, rule-follow yes/no.
- **Done when:** after one playthrough, dashboard shows that session without a second store of truth.

### P1-S7 — Deploy checklist
- Document Pages + Worker deploy and custom domain (extend `docs/cloudflare.md` if needed).
- Env vars only in Wrangler secrets / dashboard — never commit tokens.
- **Done when:** owner can follow docs to deploy (agent need not deploy without token).

### P1-S8 — Demo polish
- One-page “audit evidence” note in `docs/` for COMP3424: what was mirrored, what events prove the run.
- README “what works now” updated.
- **Done when:** classmate can run demo from README alone.

## Data & API notes

- Single source of truth: Worker twin + events. Frontend does not invent disposition.
- Case id: `deepfake-hk-001`.
- Acceptable dispositions: `onboarding_rejected`, `blocked_by_rule`, `str_drafted`, `edd_hold`. Poor: `false_positive_cleared`.

## Rough timeline (optional)

~6 weeks if part-time: S1–S2 week 1–2, S3 week 2–3, S4–S5 week 3–4, S6–S7 week 5, S8 week 6.

## Done slices

- [x] P1-S1
- [ ] P1-S2
- [ ] P1-S3
- [ ] P1-S4
- [ ] P1-S5
- [ ] P1-S6
- [ ] P1-S7
- [ ] P1-S8
