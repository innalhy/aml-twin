# TwinAML web (Cloudflare Pages)

React + Vite + TypeScript. The target UI is a scenario player and a simple dashboard. Both will read twin state from the Worker in `workers/api`.

The current page only says the scaffold is in place. It does not call the API and it has no fake dashboard data.

Deploy target: **Cloudflare Pages**. See `docs/cloudflare.md`. This package is not run in Docker.

## Run

From `frontend/`:

```bash
npm install
npm run dev
```

The dev server defaults to `http://127.0.0.1:5173`.

```bash
npm run build
```

The build typechecks with TypeScript, then writes `dist/`. Do not commit `dist/`.

## Deploy

Dashboard build settings: root directory `frontend`, build command `npm run build`, output directory `dist`.

From this directory, after a build, a logged-in Wrangler can upload the site:

```bash
npx wrangler pages deploy dist --project-name twinaml-web
```

`wrangler.jsonc` names the Pages project `twinaml-web` and points at `./dist`. Attach your domain with the steps in `docs/cloudflare.md`.
