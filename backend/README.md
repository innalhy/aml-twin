# TwinAML API (FastAPI)

This folder is the COMP3424 demo API. On the Linux VPS it runs behind nginx or Caddy. Deploy steps: [`docs/deploy-vps.md`](../docs/deploy-vps.md).

This process owns the training run:

- load a script from `data/cases/`
- open a session (`POST /sessions` with `case_id`)
- accept a trainee decision (`POST /sessions/{id}/decisions`)
- update the twin with the schema 0.1 patches in [`docs/effects.md`](../docs/effects.md)
- append events on that same session

`rules[].when` stays a sentence. The machine records `rule_flagged` and `override` events. It does not let a model set the disposition.

Sessions live in this process. A restart clears them. There is no database.

A Node/Hono process may serve those same routes in a later slice. `workers/api` is a legacy Cloudflare Worker scaffold, not that process, and not the demo deploy.

## Routes

| Method | Path | Role |
| --- | --- | --- |
| `GET` | `/health` | `{"status":"ok","service":"twinaml-api"}` |
| `GET` | `/cases` | Every `data/cases/*.example.json` script |
| `GET` | `/cases/{case_id}` | Title, summary, and the human-readable rules |
| `POST` | `/sessions` | Body `{"case_id":"..."}`. Returns the waiting node, twin, and events |
| `GET` | `/sessions` | Recent sessions for the dashboard |
| `GET` | `/sessions/{id}` | One session, including ordered events |
| `GET` | `/sessions/{id}/evidence` | Short audit card for that same session |
| `POST` | `/sessions/{id}/decisions` | Body `{"choice_id":"..."}` |

Unknown `case_id` or session is `404`. An unknown choice is `400`. A decision after the outcome is `409`.

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

One deepfake path, after the server is up:

```bash
curl -s -X POST http://127.0.0.1:8000/sessions \
  -H 'content-type: application/json' \
  -d '{"case_id":"deepfake-hk-001"}'
```

Copy `session_id`, then:

```bash
curl -s -X POST http://127.0.0.1:8000/sessions/SESSION_ID/decisions \
  -H 'content-type: application/json' \
  -d '{"choice_id":"reject_onboarding"}'
```

The closed twin has `disposition` `onboarding_rejected`.

## Tests

From `backend/`, with the venv active:

```bash
PYTHONPATH=. python -m unittest discover -s tests -v
```

`tests/test_machine.py` plays every terminal path without HTTP. `tests/test_api.py` uses the FastAPI test client. `httpx` is in `requirements.txt` for that client.
