# The Second Ledger · TwinAML web

React + Vite + TypeScript client with two pages. `/` is the investigation desk for the synthetic `analyst-session-001` pack. `/cases` is the case library (`src/CaseLibrary.tsx`): the eleven AML workflows, each with its trainee role, training goal and real-world steps, and a player for its scripts. The player shows the case file as it unfolds, the live twin state, the rules in force and the event log; after the outcome it shows the rating, every choice's rationale and the model teaching flow. The case library saves its current session ID under `twinaml-case-session` for resume.

On the investigation desk, the player can review six alerts, read available source documents, explore account transfers, request timed checks, place and release provisional outbound holds, and save decisions with evidence citations.

The API owns the clock, account balances, record availability and saved history. Reading stays paused; **Work 6 minutes**, **Next event** and **Finish & debrief** explicitly advance simulation time. The debrief shows saved reasoning and payment outcomes without hidden scenario answers or automatic grading.

The browser saves only the current session ID for resume. Unsaved rationale and citation selections are local drafts and disappear on reload. **New shift** creates a separate session and preserves the old run on the server; export the old history before starting another shift if you need its resume ID. A concurrent revision reloads the latest state and asks the player to review before resubmitting.

Records render as escaped React text with basic Markdown headings, paragraphs, lists and emphasis. Instructor keys and unreleased responses are never frontend assets. All records are fictional, times are UTC and amounts are SCU (scenario currency units).

## Run

From `frontend/`:

```bash
npm install
npm run dev
```

Start the local API in a separate terminal, from `workers/api/`:

```bash
npm install
npm run build:node
npm run start:node
```

The web dev server uses `http://127.0.0.1:5173` and proxies `/api` to the API at `http://127.0.0.1:8787`. The portable Node server is the default local runtime; an edge Worker remains an optional adapter for the same engine.

```bash
npm run build
```

The build typechecks with TypeScript, then writes `dist/`. Do not commit `dist/`.

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
