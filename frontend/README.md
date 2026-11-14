# TwinAML web

React 19 + Vite + TypeScript. In this tree the page is a case list, a scenario player, and a simple dashboard. All three read twin state from the demo API (`backend/`). `package.json` depends on React and Vite only. There is no `three` package, and `src/` does not contain `SceneViewport` or `TwinPlatform`.

The live Learning Center on the rented Linux VPS is ahead of this folder. Its bundle lazy-loads a Three.js Simulation Center (`SceneViewport`) and an AML Process Twin client (`TwinPlatform`). That gap is in the root [README](../README.md).

Deploy target: a **rented Linux VPS**. nginx or Caddy serves the static build and proxies `/health`, `/cases`, and `/sessions`. See [`docs/deploy-vps.md`](../docs/deploy-vps.md). This package is not run in Docker.

`wrangler.jsonc` may remain in this folder. It is a legacy scaffold file, not the course deploy.

## Run

Start the API on port 8000 first. From `frontend/`:

```bash
npm install
npm run dev
```

The dev server defaults to `http://127.0.0.1:5173` and proxies `/health`, `/cases`, and `/sessions` to `http://127.0.0.1:8000`.

The case list starts a session. The player shows the scene text, the waiting decision, and a twin sidebar. A `media_ref` that is not on disk is labelled missing. The dashboard lists sessions from `GET /sessions` and the event timeline from `GET /sessions/{id}`.

```bash
npm run build
```

The build typechecks with TypeScript, then writes `dist/`. Do not commit `dist/`. Copy `dist/` to the directory the VPS proxy serves. On the VPS the page and the API share one hostname, so the same paths work without the Vite proxy.
