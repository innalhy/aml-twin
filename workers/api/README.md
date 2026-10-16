# TwinAML Worker scaffold (legacy)

Cloudflare Worker (Hono) left in the tree from an earlier deploy sketch. It is **not** the COMP3424 demo target. The demo API is FastAPI in `backend/`, on a Linux VPS. See [`docs/deploy-vps.md`](../../docs/deploy-vps.md) and the pointer in [`docs/cloudflare.md`](../../docs/cloudflare.md).

Implemented now: `GET /health`.

```json
{"status":"ok","service":"twinaml-api"}
```

FastAPI returns the same JSON. Prefer `backend/` when you are checking the path the demo deploys.

## Run the scaffold locally

From `workers/api/`:

```bash
npm install
npm run dev
```

Wrangler serves `http://127.0.0.1:8787/health`.

`npx wrangler deploy` is not the course demo. The `routes` block in `wrangler.jsonc` stays commented. Do not commit account ids, tokens, or hostnames.
