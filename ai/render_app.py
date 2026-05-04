from typing import Any

from fastapi import FastAPI

from ai_service import app as ai_app


app = FastAPI(title="Them Phim Render Wrapper")


@app.get("/")
@app.get("/health")
@app.get("/healthz")
def health() -> dict[str, Any]:
    return {
        "status": "ok",
        "service": "ai-wrapper",
    }


app.mount("/", ai_app)
