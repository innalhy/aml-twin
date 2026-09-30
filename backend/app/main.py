"""Local FastAPI stand-in.

The COMP3424 demo deploys the Worker in workers/api. This app only mirrors
GET /health for offline Python development. FastAPI does not run on Workers.
"""

from fastapi import FastAPI

app = FastAPI(
    title="TwinAML",
    version="0.0.1",
    description="COMP3424 demo scaffold. Twin behaviour is not implemented yet.",
)


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok", "service": "twinaml-api"}
