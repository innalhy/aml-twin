# TwinAML API (FastAPI)

This folder is the COMP3424 demo API. On the Linux VPS it runs behind nginx or Caddy. Deploy steps: [`docs/deploy-vps.md`](../docs/deploy-vps.md).

This process owns the training run:

- load a script named by `data/cases/index.json`
- open a session (`POST /sessions` with `case_id`)
- accept a trainee decision (`POST /sessions/{id}/decisions`)
- update the twin with the schema 0.1 patches in [`docs/effects.md`](../docs/effects.md)
- append events on that same session

`rules[].when` stays a sentence. `rules[].flags` is the list of mirror flags that stand for that rule. The machine records `rule_flagged` from that list. It does not let a model set the disposition.

Sessions and events are rows in `data/local/sessions.sqlite` (gitignored). A restart of this process keeps them. Workers on this same machine share that file. Do not copy the file to a second host and expect the two hosts to stay in sync.

Closed sessions are deleted once `updated_at` is older than 7 days. The file keeps at most 2000 sessions. Past that cap, the oldest closed rows go first, then the oldest open rows. `GET /sessions` applies those same rules before it returns the list.

Override the file, the cap, or the closed-session lifetime with `TWINAML_SESSIONS_DB`, `TWINAML_SESSION_CAP`, and `TWINAML_SESSION_TTL_HOURS`.

Each request loads its own copy of a row. The player route (`GET /sessions/{id}` and the decision response) builds the node, the passed scenes, and the media check. The dashboard list and the evidence card read the twin, the teaching mark, and the event types from that copy. They do not stat media files.

`workers/` is a legacy scaffold, not this process, and not the demo deploy.

The current VPS Learning Center also answers routes this process does not declare: `POST /api/aml-simulations`, `/api/aml-sessions/{id}` (and `/actions`), and `GET /api/twin`. Those handlers are not in `backend/app/` on this branch. This page does not name source files for them. The live case list is `GET /api/cases`. The routes in the table below are the ones this process declares, without an `/api` prefix.

The session store is SQLite through Python stdlib `sqlite3`. It is not PostgreSQL, Redis, or MySQL. `requirements.txt` has no driver for those.

## Routes

| Method | Path | Role |
| --- | --- | --- |
| `GET` | `/health` | `{"status":"ok","service":"twinaml-api"}` |
| `GET` | `/cases` | Every script named by `data/cases/index.json` |
| `GET` | `/cases/{case_id}` | Title, summary, and the human-readable rules, including each rule's `flags` |
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

On a VPS, bind localhost, leave reload off, and start one process:

```bash
uvicorn app.main:app --host 127.0.0.1 --port 8000
```

Extra workers on this same machine share `data/local/sessions.sqlite`. One process is enough for the class.

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
