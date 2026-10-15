# Phase 1 — MVP (Chan Level 1)

**Status:** P1-S1 (script contract freeze) is done. Later slices stay unstarted until the owner names one.  
**Audience:** coding agents.  
**Chan level:** Level 1 — scripted cases, offline-style mirror of `initial_twin_state`, not a live bank.

## Goal

Play the Phase 1 case library end-to-end on Cloudflare. The library is the **11** synthetic scripts in [`data/cases/`](../../data/cases/README.md):

case script → training session → trainee decision → rules + state machine → twin update → event log → web player + simple dashboard.

A session starts with a `case_id`. The Worker, the scenario player, and the dashboard load whichever of the 11 that id names. `deepfake-hk-001` is the original course example (video-KYC deepfake). The ten `hk-*` scripts are `public_record_inspired`. Names, amounts, and parties are synthetic. The index and disclaimer are in [`data/cases/README.md`](../../data/cases/README.md).

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

Deploy path: **Cloudflare Pages** (`frontend/`) + **Cloudflare Worker** (`workers/api`). FastAPI in `backend/` stays optional local only, as in the root `README.md`.

## In scope

- Load any of the 11 `data/cases/*.example.json` scripts (or a non-`.example` copy of the same `case_id`) against `packages/schemas/script.schema.json`.
- Session API on the Worker: start a session with `case_id`, get the current node, submit a decision, get twin + events. `case_id` selects one script from the library above.
- Deterministic twin state machine applying `twin_patch` and `choices[].effects` (including `risk.flags_add`, `risk.score_delta`, dotted keys as agreed in [`docs/effects.md`](../effects.md)). P1-S1 already inventories those keys across all 11 scripts.
- Soft rule checks for each script’s teaching rules (human-readable `when` may stay non-executable; outcomes must still match that script’s teaching dispositions). The original example uses `R1_LIVENESS_TWICE` and `R2_SIGNALS_PLUS_BURST`. The other scripts use their own R1/R2 ids.
- React scenario player + minimal compliance dashboard reading the same twin/events. The case list offers all 11 ids.
- Persist session + events (Worker-friendly store: e.g. Durable Object or D1 — pick one and document; no Postgres cluster required for MVP).
- English UI chrome; case content may stay Traditional Chinese.
- Missing `media_ref` file → show missing-media state, do not crash the case.

## Out of scope (Phase 1)

- Docker, Kubernetes, Neo4j, Kafka, microservices.
- Unity client on the Worker. An Editor room under [`unity/`](../../unity/UNITY.md) already plays two scripts locally. That room is not one of the slices below, and it does not implement P1-S2.
- New case families beyond the 11 scripts. Phase 2 adds mixer / peel-chain and synthetic-ID cases.
- Live LLM judging disposition.
- Real bank / HKMA / STR filing integration.
- Multi-tenant billing.
- Session-time long video synthesis (HeyGen etc.).

## Success criteria (phase done)

1. Trainee can open the web app, start any of the 11 by `case_id`, walk the branches of that script, and see its terminal dispositions.
2. Every decision appends an event; override paths store an override event.
3. Dashboard shows the session: `case_id`, disposition, flags, and whether a teaching poor path was taken.
4. `GET /health` still works; frontend builds; `wrangler` configs remain valid.
5. Docs updated: architecture / cloudflare / this file’s “Done slices” checklist.

## Implementation slices (do one at a time)

### P1-S1 — Script contract freeze
- Confirm schema + the 11 example cases stay valid.
- Document effect key conventions in `docs/architecture.md` or a short `docs/effects.md`.
- **Done when:** agent can list every effect key used across the 11 scripts and how the future machine should apply them.
- **Done:** [`docs/effects.md`](../effects.md) lists every effect key in `deepfake-hk-001` and the ten `hk-*.example.json` scripts, and the apply order (clone `initial_twin_state`, apply `twin_patch`, then apply choice `effects`). `node scripts/validate-cases.mjs` checks the files and plays the eight `deepfake-hk-001` terminal paths in [`scripts/deepfake-paths.test.mjs`](../../scripts/deepfake-paths.test.mjs).

### P1-S2 — Twin state machine (library)
- Pure TypeScript module under `workers/api` (or `packages/`) that: clone initial state → apply node patch → apply choice effects → advance node.
- Unit tests for the original example’s accept / redo liveness / reject / R1 override / STR / EDD / false-positive paths, and for each other script’s terminal dispositions.
- **Done when:** tests cover terminal dispositions for all 11 scripts without HTTP.

### P1-S3 — Session store + Worker routes
- Routes (suggested):
  - `POST /sessions` `{ case_id }` → `{ session_id, node, twin, events }` — `case_id` is any id in the library
  - `GET /sessions/:id`
  - `POST /sessions/:id/decisions` `{ choice_id }` → next node, twin, new events
  - Keep `GET /health`
- CORS for local Vite + Pages origin.
- **Done when:** `curl` / local `wrangler dev` can complete one full path to a terminal outcome for a chosen `case_id`.

### P1-S4 — Scenario player (frontend)
- Case picker for the 11 `case_id` values. Load session, render scene/decision/outcome, submit choices, show twin summary sidebar.
- Handle missing media gracefully.
- **Done when:** browser playthrough matches API tests for at least two branches of a selected case, and the picker lists every library id.

### P1-S5 — Event log + teaching score
- Events: `session_started`, `node_entered`, `decision_made`, `rule_flagged`, `override`, `session_closed`.
- Mark that script’s `teaching.poor_dispositions` for the dashboard (`false_positive_cleared` on the original example; other scripts may also use `exit_without_str` or `monitoring_backdated`).
- **Done when:** GET session returns ordered events for replay.

### P1-S6 — Simple dashboard
- List recent sessions; detail: `case_id`, disposition, flags, event timeline, rule-follow yes/no.
- **Done when:** after one playthrough of any library case, dashboard shows that session without a second store of truth.

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
- Case library: the 11 `case_id` values in the table above. `POST /sessions` selects one of them.
- Dispositions are per script: `teaching.acceptable_dispositions` and `teaching.poor_dispositions`. The list is in [`data/cases/README.md`](../../data/cases/README.md). `deepfake-hk-001` keeps `onboarding_rejected`, `blocked_by_rule`, `str_drafted`, `edd_hold`, and poor `false_positive_cleared`.

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
