# TwinAML investigation server

The investigation pilot runs as a standard Node server locally or on a VPS. This folder retains its original `workers/api` name, with Cloudflare available as an optional adapter. Both adapters use the same HTTP routes and engine for clock, evidence, requests, payments, holds, decisions, and event history. FastAPI in `backend/` remains an optional local alternative.

## Run

Use Node 24 LTS, or Node 22.13 or later. From `workers/api/`:

```bash
npm ci
npm --prefix ../../frontend ci
npm --prefix ../../frontend run build
npm run build:node
npm run start:node
```

Open `http://127.0.0.1:8787` for the built frontend and API together. For frontend development, run Vite in `frontend/` alongside the Node server; its existing `/api` proxy points to port 8787. `npm run dev` builds and starts the Node server; rebuild it after changing backend source.

The server persists sessions in `data/local/investigation.sqlite` at the repository root. That directory is ignored by Git. The session's revision check and state update occur in a synchronous SQLite transaction. Sessions survive server restarts; preserving this database preserves the runs.

The production bundle `dist/server.mjs` includes Hono, the engine, and server-only evidence. It runs with Node alone and does not require esbuild or Wrangler on the VPS. Keep it at `workers/api/dist/server.mjs` alongside the built `frontend/dist/` tree. Native SQLite is experimental on Node 22 and may print a startup warning.

| Environment | Default | Purpose |
| --- | --- | --- |
| `PORT` | `8787` | HTTP listen port. |
| `HOST` | `127.0.0.1` | Listen address; suitable behind a VPS reverse proxy. |
| `TWINAML_DB` | root `data/local/investigation.sqlite` | Persistent database path. Relative paths resolve from the working directory. |
| `TWINAML_FRONTEND_ORIGIN` | empty | Exact public frontend origin, such as `https://aml.example.com`. |

On a VPS, run the process under the host's service manager and put the existing reverse proxy with HTTPS in front of port 8787. Back up the database using SQLite's backup mechanism or stop the server before copying the database and its WAL files. No hosting purchase, server provisioning, or deployment is performed by the build commands.

## Session API

| Route | Result |
| --- | --- |
| `GET /health` | `{"status":"ok","service":"twinaml-api"}` |
| `POST /api/sessions` | Create a minute-zero session; HTTP 201 with `SessionView`. No body required. |
| `GET /api/sessions/:id` | Read the session without moving time. An unknown UUID returns 404 without creating a session. |
| `POST /api/sessions/:id/actions` | Apply one JSON `ActionInput`; return the current `SessionView`. |

The shared TypeScript contract is `packages/investigation/types.ts`. Every action includes the last observed `revision`. Two simultaneous mutations with the same revision cannot both apply: the loser receives HTTP 409 `stale_revision` and should refresh before trying again. Decisions can cite only records already released for the same customer. Unknown requests, repeated holds/releases, missing prerequisites, and invalid citations write visible rejection events without changing financial state.

The guided clock is paused while reading. `advance` with `mode: "next"` goes to the next scheduled completion or pending order deadline; `mode: "work"` accepts positive decimal `minutes` up to 30 and caps the target at minute 30. Evidence completions occur before actions at the target. Due-order checks at that target remain deferred until the learner leaves the minute or finishes, so a hold placed at exactly minute 18 blocks its due check. A release immediately rechecks strictly overdue orders for that account; executed/failed orders are terminal. A decision does not place or release a hold. `finish` processes the final minute 30 and prohibits further actions.

`SessionView` contains only released evidence documents; delayed response titles, bodies, sources, and response mappings stay on the server. Request catalog titles and service times are visible. The bundled fixture is generated from the existing evidence pack and includes no answer key. The web event shape is deliberately smaller than FlexSim's CSV trace; this implementation follows its guided ordering and payment rules without claiming full trace-format conformance.

The debrief describes learner-observed state and consistency gaps: missing rationales/citations, checks outstanding at closure, closure with a remaining hold, payments after escalation, outstanding deliveries, and holds at shift end. It does not grade free text or reveal instructor labels.

Errors use `{"error":"code"}`: invalid JSON/fields/UUIDs return 400, oversized bodies return 413, disallowed origins return 403, missing sessions return 404, and stale revisions/finished or incompatible sessions return 409. Action bodies are bounded to 16 KiB, free text to 4,000 characters, citations to 24 IDs, and each run to 1,000 actions (finishing remains available).

## Checks

```bash
npm run typecheck
npm test
npm run test:node
npm run test:api
```

Engine tests use esbuild and Node's built-in test runner. `test:node` launches isolated temporary SQLite servers, checks persistence and safe static serving, and cleans them up. Its frontend-serving check runs when `frontend/dist` is built. `test:api` checks any running adapter at port 8787, or `TWINAML_TEST_API_URL`.

## Hosting scope

The pilot has no login or instructor administration screen. Its unguessable session ID acts as a bearer capability: anyone who receives that ID can read and alter the session. Use only synthetic classroom data. Add access control and resource limits before exposing it as a public service.

Browser API access is restricted to local origins on ports 5173/4173/8787 and the exact configured frontend origin. Set `TWINAML_FRONTEND_ORIGIN` to the HTTPS origin used by the reverse proxy before hosting. It does not reflect arbitrary origins. Static files are restricted to `frontend/dist`; API paths never fall back to the frontend, and traversal or symlink escapes are refused.

## Optional Cloudflare adapter

The Worker uses one SQLite-backed Durable Object per opaque session UUID. Its local state is separate from the Node database and lives in `.wrangler/state`. The adapters share behavior, not live storage; there is no automatic session migration between them.

```bash
npm run types
npm run dev:worker
```

Regenerate Env after changing Wrangler bindings or variables. For browser hosting, set the exact `FRONTEND_ORIGIN` in `wrangler.jsonc`.

Deployment is a separate explicit step once the Cloudflare account is logged in:

```bash
npx wrangler deploy
```

A custom domain is documented in `docs/cloudflare.md`. The `routes` block in `wrangler.jsonc` stays commented until you set a real hostname.
