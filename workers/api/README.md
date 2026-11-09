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

Configure Clerk before creating new Node runs: see [accounts, Google sign-in and environment setup](../../docs/accounts.md) and `.env.example`. For a local environment file, launch with `node --env-file=.env dist/server.mjs` from this directory; `npm run start:node` otherwise uses the process environment. Google is enabled in the owner's Clerk application, not through local password endpoints.

For an explicitly anonymous local or hosted development environment, set both `NODE_ENV=development` and `TWINAML_DEV_MODE=1`, with a separate absolute `TWINAML_DB` path such as the root `data/local/development.sqlite`. For example, from this directory after building:

```bash
NODE_ENV=development TWINAML_DEV_MODE=1 TWINAML_DB="$PWD/../../data/local/development.sqlite" node dist/server.mjs
```

This administrative mode disables the account/authentication API bindings; `/api/account` returns `{ "enabled": false, "configured": false, "user": null }`, and the existing frontend opens anonymous training runs. Build the matching frontend with `VITE_CLERK_PUBLISHABLE_KEY` and `VITE_API_URL` empty for same-origin development. The server refuses this mode unless `NODE_ENV` is exactly `development`, and refuses a database containing account-owned runs. It never infers anonymous access from missing Clerk keys. Keep production settings and data separate; development runs are accessible by their opaque IDs and have no account progress list.

The production bundle `dist/server.mjs` includes Hono, the engine, and server-only evidence. It runs with Node alone and does not require esbuild or Wrangler on the VPS. Keep it at `workers/api/dist/server.mjs` alongside the built `frontend/dist/` tree. Native SQLite is experimental on Node 22 and may print a startup warning.

| Environment | Default | Purpose |
| --- | --- | --- |
| `PORT` | `8787` | HTTP listen port. |
| `HOST` | `127.0.0.1` | Listen address; suitable behind a VPS reverse proxy. |
| `TWINAML_DB` | root `data/local/investigation.sqlite` | Persistent database path. Relative paths resolve from the working directory. |
| `TWINAML_FRONTEND_ORIGIN` | empty | Exact public frontend origin, such as `https://aml.example.com`. Separate several origins with commas. |
| `TWINAML_DEV_MODE` | unset | Only `1` enables anonymous development; requires `NODE_ENV=development` and a database without account-owned runs. |
| `NODE_ENV` | unset | Must be exactly `development` when anonymous development mode is requested. |
| `CLERK_ISSUER` | empty | Exact Clerk Frontend API origin used as the session-token issuer. Required for accounts. |
| `CLERK_SECRET_KEY` | empty | Server-only Clerk key for signature-key lookup. Set this or `CLERK_JWT_KEY`. |
| `CLERK_JWT_KEY` | empty | Optional PEM JWT public key for offline verification; supports escaped newlines. |

On a VPS, run the process under the host's service manager and put the existing reverse proxy with HTTPS in front of port 8787. Back up the database using SQLite's backup mechanism or stop the server before copying the database and its WAL files. No hosting purchase, server provisioning, or deployment is performed by the build commands.

## Session API

The Hong Kong AML workflow uses its own authoritative snapshots in the additive `aml_sessions` SQLite table. Existing pilot and case-library tables are unchanged. The optional Worker adapter uses an `aml_session` table in the same per-run Durable Object class and calls the same engine. The shared workflow types are in `packages/aml/types.ts`; the generated alerts, cases, rule runs and audit events are persisted together. All mutations require the observed revision and are transactional. Role switching is an audited classroom action, not authentication.

AML action bodies are bounded to 128 KiB to accommodate the structured narrative and STR fields, with field-level limits enforced by the engine. The original exercise and case-library body limits remain 16 KiB.

| AML workflow route | Result |
| --- | --- |
| `POST /api/aml-sessions` | Create a synthetic Hong Kong training session, run monitoring and return `AmlView` (201). |
| `GET /api/aml-sessions/:id` | Read the authoritative workflow snapshot; unknown runs return 404. |
| `POST /api/aml-sessions/:id/actions` | Validate and apply an `AmlActionInput`, returning the updated view. |

See [`../../docs/aml-workflow.md`](../../docs/aml-workflow.md) for the monitoring rule, source validation, case lifecycle and simulated reviewer/STR boundaries. The original APIs follow.

| Route | Result |
| --- | --- |
| `GET /health` | `{"status":"ok","service":"twinaml-api"}` |
| `POST /api/sessions` | Create a minute-zero session; HTTP 201 with `SessionView`. No body required. |
| `GET /api/sessions/:id` | Read the session without moving time. An unknown UUID returns 404 without creating a session. |
| `POST /api/sessions/:id/actions` | Apply one JSON `ActionInput`; return the current `SessionView`. |
| `GET /api/cases` | The eleven workflows (`CaseLibraryView`): brief, real-world steps and playable scripts. Workflows without a script include their teaching flow. |
| `POST /api/case-sessions` | Body `{"caseId":"mule-rent-001"}`. HTTP 201 with `CaseSessionView`; an unknown case returns 400 `unknown_case`. |
| `GET /api/case-sessions/:id` | Read a case session. |
| `POST /api/case-sessions/:id/decisions` | Body `{"revision":0,"choiceId":"interview"}`. Returns the next `CaseSessionView`. A stale revision or a closed case returns 409; a choice not on the current node returns 400 `invalid_choice`. |

The shared TypeScript contract is `packages/investigation/types.ts`. Every action includes the last observed `revision`. Two simultaneous mutations with the same revision cannot both apply: the loser receives HTTP 409 `stale_revision` and should refresh before trying again. Decisions can cite only records already released for the same customer. Unknown requests, repeated holds/releases, missing prerequisites, and invalid citations write visible rejection events without changing financial state.

Case sessions live in the `case_sessions` table and store only their events. Each read rebuilds the twin by replaying the decisions through `scripts/apply-effects.mjs`; `debrief` stays `null`, and choice rationales stay on the server, until the case reaches an outcome. `src/case-library.json` is generated by `node scripts/export-case-library.mjs` from `data/case-flow/` and `data/cases/`; regenerate it after editing either, and check it with `--check`.

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

Engine tests use esbuild and Node's built-in test runner. `npm test` also walks every path in all eleven case scripts. `test:node` launches isolated temporary SQLite servers, checks Clerk JWT verification, ownership, persistence, legacy adoption, explicit development-mode boundaries and safe static serving, and cleans them up. Its frontend-serving check runs when `frontend/dist` is built. `test:api` checks any running adapter at port 8787, or `TWINAML_TEST_API_URL`; for account-enabled Node, supply a valid short-lived `TWINAML_TEST_CLERK_TOKEN` from the connected instance.

## Hosting scope

On Node, Clerk authenticates learners and new runs are assigned to their verified Clerk user ID. All owned-run reads and writes check that owner, returning 404 to other users and guests. `GET /api/account/runs` lists only the caller's progress. `POST /api/account/claim` explicitly adopts an unowned legacy run by its original opaque ID; until claimed, that ID remains its bearer capability. Missing Clerk configuration fails closed for new runs. The switchable analyst/reviewer/administrator selector still simulates classroom roles inside the learner's own run; it does not grant institutional or instructor access. See [account API and migration](../../docs/accounts.md).

Browser API access is restricted to local origins on ports 5173/4173/8787 and the exact configured frontend origin. Set `TWINAML_FRONTEND_ORIGIN` to the HTTPS origin used by the reverse proxy before hosting. It does not reflect arbitrary origins. Static files are restricted to `frontend/dist`; API paths never fall back to the frontend, and traversal or symlink escapes are refused.

## Optional Cloudflare adapter

The Worker uses one SQLite-backed Durable Object per opaque session UUID. Its local state is separate from the Node database and lives in `.wrangler/state`. The adapters share behavior, not live storage; there is no automatic session migration between them.

Accounts and My progress are implemented for Node/VPS. The optional Worker returns `enabled: false` from `/api/account` and retains anonymous bearer-ID sessions.

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
