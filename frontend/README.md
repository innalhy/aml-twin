# TwinAML web

React + Vite + TypeScript. The target UI is a scenario player and a simple dashboard. Both will read twin state from the demo API (`backend/`, or a later Node/Hono process with the same routes).

The current page only says the scaffold is in place. It does not call the API and it has no fake dashboard data.

Deploy target: a **self-hosted Linux VPS**. nginx or Caddy serves the static build. See [`docs/deploy-vps.md`](../docs/deploy-vps.md). This package is not run in Docker.

`wrangler.jsonc` may remain in this folder. It is a legacy scaffold file, not the course deploy.

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

The build typechecks with TypeScript, then writes `dist/`. Do not commit `dist/`. Copy `dist/` to the directory the VPS proxy serves.
