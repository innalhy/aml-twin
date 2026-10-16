# TwinAML API (FastAPI)

This folder is the COMP3424 demo API. On the Linux VPS it runs behind nginx or Caddy. Deploy steps: [`docs/deploy-vps.md`](../docs/deploy-vps.md).

The same process will own the later behaviour:

- load a script (`script_json`) from `data/cases/`
- open a training session
- accept a trainee decision
- update digital-twin state with explicit rules and write events

Right now the only route is `GET /health`. There is no database, no case route, and no state machine here.

A Node/Hono process may serve those same routes in a later slice. `workers/api` is a legacy Cloudflare Worker scaffold, not that process, and not the demo deploy.

## Run

From `backend/`:

```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

On a VPS, bind localhost and leave reload off:

```bash
uvicorn app.main:app --host 127.0.0.1 --port 8000
```

Then open `http://127.0.0.1:8000/health`.

Expected response: `{"status":"ok","service":"twinaml-api"}`.
