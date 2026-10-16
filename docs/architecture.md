# TwinAML architecture (simplified)

TwinAML is a digital twin for training. It is not a bank production system. The twin lives in the backend: one case state, plus the events that change it. The web app is the face. The Unity Editor room is the immersive face and is in scope for the demo. Neither face gets a second copy of the state.

This demo stays one API and one web client on purpose. It does not split into microservices, and it does not use Neo4j, Kafka, Docker, Kubernetes, or FlexSim.

The COMP3424 demo runs on a self-hosted Linux VPS. FastAPI in `backend/` is the API process. The Vite build in `frontend/` is the static site. nginx or Caddy terminates HTTPS. See [`deploy-vps.md`](deploy-vps.md). A Node/Hono process may serve the same routes later. `workers/api` is a legacy Cloudflare Worker scaffold and is not the deployed demo.

## How one training run moves

```mermaid
flowchart LR
  caseFile["data/cases script_json"] --> session["Training session"]
  session --> decision["Analyst decision"]
  decision --> rules["Rules then state machine"]
  rules --> twin["Twin state"]
  twin --> events["Event log"]
  events --> dashboard["Web dashboard"]
  twin --> player["Web scenario player"]
```

1. **Case** — `data/cases/*.json` loads one synthetic case.
2. **Script** — `nodes` are the scenario: scenes, decisions, and outcomes. `start_node_id` is the entry.
3. **Decision** — the trainee picks one `choice` on a decision node.
4. **Twin** — the state machine applies that choice's `effects` and the node's `twin_patch` to the twin state. Rules judge first. A model may explain only after that.
5. **Events** — each choice, override, and outcome is an event. The event sequence is the thread of that session.
6. **Dashboard** — the web app reads the same state and events for the player and a simple dashboard. The player does not keep a second source of truth.

```mermaid
sequenceDiagram
  participant Script as Case script
  participant API as VPS API
  participant Twin as Twin state
  participant Web as Web client
  Script->>API: load script and initial state
  API->>Twin: mirror initial_twin_state
  Web->>API: start session
  Web->>API: submit decision
  API->>API: apply rule
  API->>Twin: patch state
  API-->>Web: events and next node
  Note over Web: Player and dashboard read the same twin
```

The session routes in that diagram are not implemented yet. FastAPI currently exposes `GET /health` only. Those routes will be added on that VPS API process, not in a second service. The legacy Worker exposes the same health check and is not where those routes go for this demo.

## What exists now

| Piece | Status |
| --- | --- |
| Script JSON and JSON Schema | Present. Eleven example cases. Effect keys are frozen in [`effects.md`](effects.md). |
| FastAPI | `GET /health` in `backend/`. This is the demo API. |
| Legacy Cloudflare Worker | `GET /health` in `workers/api`. Scaffold only. Not the demo deploy. |
| State machine, sessions, event log | Not built. P1-S2 is still unstarted. |
| Web player and dashboard | Not built. `frontend/` is a placeholder that builds to static files for the VPS. |
| `data/media/` | Only `.gitkeep` is tracked. `media_ref` values in a script point at local files. |

A rule's `when` text is a sentence for a person to read. The schema does not execute it. When the state machine exists, decide then whether to replace those sentences with executable conditions. Until then, do not invent a second script format beside this one.

## Where state lives

The session twin starts as a deep clone of `initial_twin_state`. Patches then accumulate on that clone. Full key rules, including every key used in the example cases, are in [`effects.md`](effects.md).

- **Initial mirror**: `initial_twin_state`.
- **Node patch**: on entry, apply `twin_patch` (for example, `phase` becomes `alert_triage`).
- **Decision effects**: after that patch, apply the chosen `choices[].effects`. Dotted keys write nested fields (`kyc.status`). `risk.flags_add` appends onto `risk.flags`. `risk.score_delta` adds to `risk.score`. Any other key replaces the value at that path.
- **Outcome**: `type: outcome` and `terminal: true`. The outcome `twin_patch` writes `disposition`, and the session ends.

Media is not in git. The `media_ref` on `n_intake` is `data/media/deepfake-hk-001/kyc-clip.mp4`, and that file is excluded by `.gitignore`. When the clip is missing, the player should later show a missing-file state. It should not abort the whole case.

## Clients

- **Now**: `frontend/`, React + Vite + TypeScript, static files on the Linux VPS. The target UI is a scenario player plus a simple dashboard that reads twin state.
- **Editor room**: [`unity/UNITY.md`](../unity/UNITY.md). In scope. Unity 2022.3 LTS, first scene `Scn_Boot`. It applies the schema 0.1 patches locally while you play Topic 1 and Topic 2. That mirror is the training-room twin for the Editor dashboard. It is not a second case format, and it is not the API state machine (P1-S2 is still unstarted). A later Unity build can call the VPS API when those routes exist.

## Explicitly out of scope

Neo4j, Kafka, Docker, Kubernetes, FlexSim, a multi-service split, a live core-banking connection, a language model that issues the compliance result directly, and committing large mp4 files to git. The Unity Editor room stays in the demo. A second Unity project does not.
