# TwinAML API (local FastAPI alternative)

This folder is a local/dev alternative. The production demo uses the Cloudflare Worker in `workers/api`. FastAPI does not run natively on Workers, so do not treat this app as the deploy target.

The Worker will own the same future behaviour:

- load a script (`script_json`) from `data/cases/`
- open a training session
- accept a trainee decision
- update digital-twin state with explicit rules and write events

Right now both sides only implement `GET /health`. There is no database, no case route, and no state machine here.

## Run

From `backend/`:

```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

Then open `http://127.0.0.1:8000/health`.

Expected response: `{"status":"ok","service":"twinaml-api"}`.

The Worker returns the same JSON on `GET /health`. Prefer `workers/api` when you are checking the path the demo will deploy.