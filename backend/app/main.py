"""Runnable API placeholder.

The only route is a health check so the scaffold can be started.
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
