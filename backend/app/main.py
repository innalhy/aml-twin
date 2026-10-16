"""COMP3424 demo API (FastAPI).

The VPS serves this app behind nginx or Caddy. See docs/deploy-vps.md.
Today the only route is GET /health.
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
