# Phase 2 — Near-realtime twin (Chan Level 2)

**Status:** plan only. Start only after Phase 1 success criteria are met.  
**Chan level:** Level 2 — near-realtime bidirectional session↔twin updates; configurable rules; still no live core bank.

## Goal

Extend TwinAML so training decisions write back promptly to twin state (WebSocket or equivalent), rules are versioned and configurable, and the case library grows beyond deepfake onboarding (mixer / peel-chain + mule accounts, synthetic identity). Keep Cloudflare as deploy home unless the owner changes it.

## In scope

- Versioned **rules engine** (rules-before-AI remains mandatory).
- **Realtime** twin push to the web client (prefer Worker + Durable Object WebSocket / Hibernation API, or documented alternative).
- Additional cases: crypto mixer / peel-chain + mule; synthetic ID onboarding.
- Optional **graph** view of accounts/hops (Neo4j or a lighter graph store — only if a slice says so; default stay minimal).
- Lightweight multi-org isolation (org_id on sessions).
- Audit **export pack** (JSON/ZIP of session + twin snapshots + events + rule versions).
- RAG-assisted **case authoring** (scripts still validated by schema; LLM does not set disposition at runtime).

## Out of scope (Phase 2)

- Multi-jurisdiction hot-swap regulators.
- Production billing / SaaS metering.
- Live core-banking or regulator STR submission.
- Long-form video synthesis inside a live session.
- Chan Level 3 ML as system of record.
- Docker/K8s as required path (still discouraged unless owner asks).

## Success criteria (phase done)

1. At least two case families playable (deepfake + one of mixer or synthetic ID).
2. Rule pack version visible on every closed session; changing a pack does not rewrite old sessions’ stored version id.
3. Client receives twin updates without full page reload during a session.
4. Export pack opens offline and reconstructs the event thread.
5. Phase 1 deepfake path still passes regression.

## Implementation slices

### P2-S1 — Event sourcing hardening
- Append-only event store; twin rebuilt by fold (or snapshot + fold).
- **Done when:** replay from events equals live twin for Phase 1 case.

### P2-S2 — Rules engine v1
- Versioned rule packs under `packages/rules-packs/default/` (or equivalent).
- Evaluate named predicates (replace Phase 1 soft strings where needed).
- **Done when:** R1/R2 and new pack tests pass without LLM.

### P2-S3 — Realtime gateway
- WebSocket (or SSE if WS blocked) `twin_update` / `event` messages.
- **Done when:** two browser tabs on same session stay in sync on decision.

### P2-S4 — Mixer / peel-chain case
- New case JSON + media placeholders; mule account hops in twin state.
- **Done when:** trainee can complete one teaching path with STR/EDD-style outcomes.

### P2-S5 — Synthetic identity case
- Case focusing on inconsistent KYC graph signals (still synthetic).
- **Done when:** schema validates; one full playthrough works.

### P2-S6 — Graph explorer (optional)
- Read-only graph of entities for the active session.
- Prefer embedding a small viz in `frontend/` before standing up Neo4j.
- **Done when:** hops for mixer case are visible; if Neo4j is chosen, document why and how to run without making Docker mandatory for the whole demo.

### P2-S7 — Audit export
- `GET /sessions/:id/export` → zip/json.
- **Done when:** export includes script id, rule pack version, events, final twin.

### P2-S8 — Org isolation + RAG authoring (thin)
- `org_id` on sessions; no cross-org list leakage.
- Offline/batch script draft via RAG over judgment notes — **authoring only**.
- **Done when:** second org cannot read first org’s sessions; authored script still passes schema and human review before publish.

## Dependencies

- Phase 1 slices P1-S1–P1-S8 complete.
- AGENTS.md still forbids expanding into enterprise sprawl without owner ask.

## Done slices

- [ ] P2-S1
- [ ] P2-S2
- [ ] P2-S3
- [ ] P2-S4
- [ ] P2-S5
- [ ] P2-S6
- [ ] P2-S7
- [ ] P2-S8
