# Phase 3 — Vision (DT Level 3)

**Status:** For this course demo, the Streamlit / Neo4j sandbox in [`demo/neo4j/`](../../demo/neo4j/README.md) stands in for this phase. The slices below are earlier vision notes, not the next build. **Not** part of the COMP3424 MVP commitment.  
**DT Level:** Level 3 — near-realtime twin plus ML assist; possible live system links. Treat as product vision.

## Goal

Describe what a production-minded TwinAML could become after Phases 1–2: ML that **assists** investigators, optional connectors to bank/core or case-management systems, and regulator-ready evidence packages — without letting models become the system of record.

## In scope (vision statements)

- Supervised models for alert prioritization / narrative assist **after** rules fire.
- Optional connectors: core banking read models, case management, STR gateways (jurisdiction-specific).
- Stronger digital thread across training → production playbooks.
- Multi-jurisdiction rule packs with change control.
- Enterprise tenancy, SSO, audit retention policies.
- Optional Unity (or other) immersive client on the **same** twin API.

## Explicit non-goals for course demo

- Do not implement Phase 3 in the COMP3424 repository unless the owner opens a funded product track.
- Do not connect real customer data.
- Do not auto-file regulatory reports from a training twin.

## Principles (carry forward)

1. **Rules-before-AI** — model suggestions are events; disposition changes need human + rule context.
2. **One twin** — no second state in the client.
3. **Evidence** — every override and model suggestion is replayable.
4. **Safety** — synthetic training data stays labeled synthetic forever.

## Suggested future slices (do not start yet)

### P3-S1 — ML assist shadow mode
- Rank or explain; never write disposition alone.
- **Done when:** UI shows “suggestion” vs “rule decision” distinctly.

### P3-S2 — Connector adapter interface
- Read-only account/txn adapter with fixtures first.
- **Done when:** training can optionally seed twin from adapter fixtures, still synthetic by default.

### P3-S3 — Retention & legal hold
- Org policies for event retention and export legal hold.
- **Done when:** documented policy + enforced delete/export gates.

### P3-S4 — Immersive client (Unity)
- Same session API; no forked twin.
- **Done when:** one Phase 1 path playable in Unity against the VPS session API.

### P3-S5 — Multi-jurisdiction packs
- Hot-swappable packs with approval workflow.
- **Done when:** switching pack is an audited event; old sessions keep old pack id.

## Success criteria (product, not course)

- Pilot bank can run synthetic training with SSO, export packs acceptable to internal audit, and ML assist in shadow mode only.
- COMP3424 mapping docs still mark Level 3 as aspirational.

## Done slices

- [ ] P3-S1 (not started)
- [ ] P3-S2 (not started)
- [ ] P3-S3 (not started)
- [ ] P3-S4 (not started)
- [ ] P3-S5 (not started)
