import os
from typing import Any

import uvicorn
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field

from db_loader import save_ai_history, save_ai_recommendations
from recommender import RecommendEngine


app = FastAPI(title="Thèm PHim AI Recommendation Service")
engine = RecommendEngine()


class RecommendRequest(BaseModel):
    query: str = Field(..., min_length=1)
    top_n: int = Field(default=10, ge=1, le=50)
    only_database_movies: bool = True
    user_id: str | None = None


@app.get("/health")
def health() -> dict[str, Any]:
    model_state = engine.health()
    return {
        "status": "ok",
        **model_state,
    }


@app.post("/reload")
def reload_model() -> dict[str, Any]:
    try:
        count = engine.reload_model()
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc

    return {
        "status": "ok",
        "movies_loaded": count,
        "model_loaded": True,
    }


@app.post("/recommend")
def recommend(payload: RecommendRequest) -> dict[str, Any]:
    query = payload.query.strip()
    if not query:
        raise HTTPException(status_code=400, detail="Query is required.")

    try:
        result = engine.recommend(query, payload.top_n, payload.only_database_movies)
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc

    movie_ids = [
        movie.get("movie_id")
        for movie in result.get("recommended_movies", [])
        if movie.get("movie_id") is not None
    ]
    save_ai_history(payload.user_id, query, result.get("normalized_query", ""), movie_ids)
    save_ai_recommendations(payload.user_id, result.get("recommended_movies", []))

    return result


if __name__ == "__main__":
    host = os.getenv("AI_HOST", "127.0.0.1")
    port = int(os.getenv("AI_PORT", "8001"))
    uvicorn.run("ai_service:app", host=host, port=port, reload=False)
