# TwinAML Worker API

Minimal Cloudflare Worker for the COMP3424 demo. The twin session API will live here: load a case, open a session, accept a decision, update twin state, and append events.

Implemented now: `GET /health`.

```json
{"status":"ok","service":"twinaml-api"}
```

FastAPI in `backend/` can return the same JSON on your machine. It is not this demo's production runtime. FastAPI does not run on Workers.

## Run

From `workers/api/`:

```bash
npm install
npm run dev
```

Wrangler serves `http://127.0.0.1:8787/health`.

Deploy, once the Cloudflare account is logged in:

```bash
npx wrangler deploy
```

A custom domain is documented in `docs/cloudflare.md`. The `routes` block in `wrangler.jsonc` stays commented until you set a real hostname.
