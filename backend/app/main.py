"""COMP3424 demo API (FastAPI).

The VPS serves this app behind nginx or Caddy. See docs/deploy-vps.md.
Sessions and events are rows in data/local/sessions.sqlite on this machine.
"""

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from app.cases import get_script, list_cases
from app.machine import ChoiceError, SessionClosed
from app.sessions import decide, evidence, fetch, fetch_state, list_sessions, open_session

app = FastAPI(
    title="TwinAML",
    version="0.1.0",
    description="COMP3424 demo API. Sessions and events live in data/local/sessions.sqlite.",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://127.0.0.1:5173",
        "http://localhost:5173",
    ],
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["*"],
)


class OpenSession(BaseModel):
    case_id: str = Field(min_length=1)


class Decision(BaseModel):
    choice_id: str = Field(min_length=1)


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok", "service": "twinaml-api"}


@app.get("/cases")
def cases() -> dict[str, list]:
    return {"cases": list_cases()}


@app.get("/cases/{case_id}")
def case_detail(case_id: str) -> dict:
    script = get_script(case_id)
    if script is None:
        raise HTTPException(status_code=404, detail="unknown case_id")
    row = next(item for item in list_cases() if item["case_id"] == case_id)
    teaching = script.get("teaching") or {}
    row["acceptable_dispositions"] = teaching.get("acceptable_dispositions") or []
    row["poor_dispositions"] = teaching.get("poor_dispositions") or []
    row["rules"] = [
        {
            "id": rule["id"],
            "when": rule["when"],
            "then": rule["then"],
            "note": rule.get("note", ""),
        }
        for rule in script.get("rules") or []
    ]
    return row


@app.post("/sessions", status_code=201)
def create_session(body: OpenSession) -> dict:
    try:
        return open_session(body.case_id)
    except KeyError:
        raise HTTPException(status_code=404, detail="unknown case_id") from None


@app.get("/sessions")
def sessions() -> dict[str, list]:
    return {"sessions": list_sessions()}


@app.get("/sessions/{session_id}")
def session_detail(session_id: str) -> dict:
    view = fetch(session_id)
    if view is None:
        raise HTTPException(status_code=404, detail="unknown session")
    return view


@app.get("/sessions/{session_id}/evidence")
def session_evidence(session_id: str) -> dict:
    state = fetch_state(session_id)
    if state is None:
        raise HTTPException(status_code=404, detail="unknown session")
    return evidence(state)


@app.post("/sessions/{session_id}/decisions")
def post_decision(session_id: str, body: Decision) -> dict:
    try:
        return decide(session_id, body.choice_id)
    except KeyError:
        raise HTTPException(status_code=404, detail="unknown session") from None
    except ChoiceError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from None
    except SessionClosed as exc:
        raise HTTPException(status_code=409, detail=str(exc)) from None
