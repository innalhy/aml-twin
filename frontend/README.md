# The Second Ledger · TwinAML web

The portal now includes **Simulation** at `/simulation` in `src/AmlSimulation.tsx`. The interactive monitoring room opens evidence, assessment and reviewer panels backed by the existing AML session engine, with timed evidence, scheduled payments, analyst recommendations, reviewer approval and delayed controls. The dashboard and Topic 02 link to this runtime; the earlier guided scripts remain playable. It has a separate account-scoped resume key, uses the same account ownership and revision checks, and exports a blind review packet. See [`../docs/aml-simulation.md`](../docs/aml-simulation.md).

The default `/` page is the navy-and-white, role-based TwinAML learning dashboard in `src/TrainingPortal.tsx` and `src/LearningCenter.tsx`. Five professional roles personalize existing course recommendations. `/simulations` launches two interactive 3D guided cases and the timed AML investigation in their banking environments; `/tools` groups the compliance workspaces. `/training` (also `/cases`) contains eleven topic cards and the staged case player in `src/CaseLibrary.tsx`. `/reports` shows saved outcomes and exports CSV; `/help`, `/intro` and `/settings` provide guidance, theme selection and existing Clerk account controls. The two portal scenarios are `project-meridian-001` and `mule-mixer-001`; the original eleven scripts remain accessible as related cases. All case decisions still use `/api/case-sessions`, account-scoped resume IDs and server revision checks. See [`../docs/training-portal.md`](../docs/training-portal.md).

The Hong Kong AML workflow in `src/AmlWorkflow.tsx` is now at `/operations` (also `/aml`): Alerts, Alert details, Entities, Cases and Review, with an administrator panel for rule parameters, monitoring runs and synthetic transactions. It talks to `/api/aml-sessions` and keeps only its resume ID in browser storage. See [`../docs/aml-workflow.md`](../docs/aml-workflow.md) for the workflow and role boundaries. Times are displayed in HKT and amounts carry their currency. The switchable roles are for classroom practice; they are not authenticated accounts.

The original investigation page described below is now at `/investigation`; `/cases` remains the case library. Clerk sign-in wraps all three applications on Node. Set `VITE_CLERK_PUBLISHABLE_KEY` in `.env.local` (see `.env.example`) and configure the API using [account setup](../docs/accounts.md). Enable Google in your Clerk application. My progress lists and resumes your account's saved runs across browsers; the training role selector remains a separate classroom control.

React + Vite + TypeScript client with three training applications. `/investigation` is the original investigation desk for the synthetic `analyst-session-001` pack. `/cases` is the case library (`src/CaseLibrary.tsx`): the eleven AML workflows, each with its trainee role, training goal and real-world steps, and a player for its scripts. The player shows the case file as it unfolds, the live twin state, the rules in force and the event log; after the outcome it shows the rating, every choice's rationale and the model teaching flow. The case library saves its current session ID under `twinaml-case-session` for resume.

On the investigation desk, the player can review six alerts, read available source documents, explore account transfers, request timed checks, place and release provisional outbound holds, and save decisions with evidence citations.

The API owns the clock, account balances, record availability and saved history. Reading stays paused; **Work 6 minutes**, **Next event** and **Finish & debrief** explicitly advance simulation time. The debrief shows saved reasoning and payment outcomes without hidden scenario answers or automatic grading.

The browser saves only the current session ID for resume, scoped by Clerk user ID. Unsaved rationale and citation selections are local drafts and disappear on reload. **New shift** creates a separate session and preserves the old run in **My progress**. Earlier anonymous runs can be explicitly added from My progress using the old browser shortcut or a full run ID. A concurrent revision reloads the latest state and asks the player to review before resubmitting.

If browser storage is unavailable, a newly created run keeps its ID in the `?run=` URL so reloading can resume it. A temporary case-library resume failure preserves the saved shortcut and shows **Try again**; invalid or missing run IDs clear the shortcut. Case navigation stays disabled while a decision is saving.

Records render as escaped React text with basic Markdown headings, paragraphs, lists and emphasis. Instructor keys and unreleased responses are never frontend assets. All records are fictional, times are UTC and amounts are SCU (scenario currency units).

## Run

For the complete isolated development environment, run from the repository root:

```bash
npm run setup
npm run dev
```

The web dev server uses `http://127.0.0.1:5173` and proxies `/api` to the API at `http://127.0.0.1:8787`. Both servers update after source edits and stop with Ctrl-C. This launcher uses anonymous synthetic runs, a development banner and a separate local database; it forces browser API and Clerk keys empty so development cannot pick up a production API URL. See [development environments](../docs/development.md). To test Clerk, use the separate commands in [account setup](../docs/accounts.md).

For a normal frontend build, from `frontend/`:

```bash
npm run build
```

The build typechecks with TypeScript, then writes `dist/`. Do not commit `dist/`.

Run the resume regression checks from `frontend/` with `node --test tests/account-api.test.mjs tests/training-cases.test.mjs`.

## Hosting

The Node server can serve the built frontend and API from the same origin on a VPS. Build this client first, then follow the server deployment instructions in the repository's `docs/`. Keep the persistent session database outside the public web directory. This change does not deploy anything.

If the frontend and API use different origins, set `VITE_API_URL` to the API origin at build time and configure the server's allowed web origin. Leave it empty for same-origin hosting or the local proxy. It is a public URL, never a secret.

### Optional Cloudflare Pages

Dashboard build settings: root directory `frontend`, build command `npm run build`, output directory `dist`.

From this directory, after a build, a logged-in Wrangler can upload the site:

```bash
npx wrangler pages deploy dist --project-name twinaml-web
```

`wrangler.jsonc` names the Pages project `twinaml-web` and points at `./dist`. Attach your domain with the steps in `docs/cloudflare.md`.
