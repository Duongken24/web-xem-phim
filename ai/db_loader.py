import os
from collections import Counter, defaultdict
from pathlib import Path
from typing import Any

import requests

try:
    from dotenv import load_dotenv

    ROOT_DIR = Path(__file__).resolve().parents[1]
    load_dotenv(ROOT_DIR / ".env")
    load_dotenv(ROOT_DIR / "backend" / ".env")
    load_dotenv(Path(__file__).resolve().parent / ".env")
except Exception:
    pass


PAGE_SIZE = 1000


def _env(name: str) -> str:
    value = os.getenv(name, "").strip()
    if not value:
        raise RuntimeError(f"Missing required environment variable: {name}")
    return value


def _supabase_headers() -> dict[str, str]:
    service_key = _env("SUPABASE_SERVICE_ROLE_KEY")
    return {
        "apikey": service_key,
        "Authorization": f"Bearer {service_key}",
        "Content-Type": "application/json",
    }


def _supabase_url(table: str) -> str:
    return f"{_env('SUPABASE_URL').rstrip('/')}/rest/v1/{table}"


def _fetch_table(table: str, select: str = "*", optional: bool = False) -> list[dict[str, Any]]:
    rows: list[dict[str, Any]] = []
    start = 0

    while True:
        end = start + PAGE_SIZE - 1
        try:
            response = requests.get(
                _supabase_url(table),
                headers={**_supabase_headers(), "Range": f"{start}-{end}"},
                params={"select": select},
                timeout=30,
            )
        except requests.RequestException as exc:
            if optional:
                print(f"[db_loader] Optional table fetch failed: {table}: {exc}")
                return []
            raise RuntimeError(f"Failed to fetch {table}: {exc}") from exc

        if not response.ok:
            if optional:
                print(f"[db_loader] Optional table fetch failed: {table}: {response.status_code} {response.text}")
                return []
            raise RuntimeError(f"Failed to fetch {table}: {response.status_code} {response.text}")

        page = response.json()
        if not isinstance(page, list):
            if optional:
                return []
            raise RuntimeError(f"Unexpected response for table {table}")

        rows.extend(page)
        if len(page) < PAGE_SIZE:
            return rows

        start += PAGE_SIZE


def supabase_insert(table: str, payload: dict[str, Any] | list[dict[str, Any]], optional: bool = True) -> bool:
    try:
        response = requests.post(
            _supabase_url(table),
            headers={**_supabase_headers(), "Prefer": "return=minimal"},
            json=payload,
            timeout=30,
        )
    except requests.RequestException as exc:
        if optional:
            print(f"[db_loader] Optional insert failed: {table}: {exc}")
            return False
        raise

    if not response.ok:
        if optional:
            print(f"[db_loader] Optional insert failed: {table}: {response.status_code} {response.text}")
            return False
        raise RuntimeError(f"Failed to insert {table}: {response.status_code} {response.text}")

    return True


def _text(value: Any) -> str:
    if value is None:
        return ""
    return str(value).strip()


def _int(value: Any, default: int = 0) -> int:
    try:
        if value is None or value == "":
            return default
        return int(float(value))
    except (TypeError, ValueError):
        return default


def _float(value: Any, default: float = 0.0) -> float:
    try:
        if value is None or value == "":
            return default
        return float(value)
    except (TypeError, ValueError):
        return default


def _bool(value: Any) -> bool:
    if isinstance(value, bool):
        return value
    if isinstance(value, str):
        return value.strip().lower() in {"true", "1", "yes", "y"}
    return bool(value)


def _key(value: Any) -> str:
    return _text(value)


def _active_status(value: Any) -> bool:
    status = _text(value).lower()
    return status in {"", "active"}


def _first_non_empty(*values: Any) -> str:
    for value in values:
        text = _text(value)
        if text:
            return text
    return ""


def build_movie_feature_rows() -> list[dict[str, Any]]:
    movies = _fetch_table("movies")
    genres = _fetch_table("genres", optional=True)
    movie_genres = _fetch_table("movie_genres", optional=True)
    movie_sources = _fetch_table("movie_sources", optional=True)
    countries = _fetch_table("countries", optional=True)
    content_controls = _fetch_table("content_controls", optional=True)
    favorites = _fetch_table("favorites", select="movie_id", optional=True)
    watch_history = _fetch_table("watch_history", select="movie_id", optional=True)
    ratings = _fetch_table("ratings", select="movie_id", optional=True)
    ai_recommendations = _fetch_table("ai_recommendations", select="movie_id", optional=True)
    search_logs = _fetch_table("search_logs", select="clicked_movie_id", optional=True)
    movie_click_logs = _fetch_table("movie_click_logs", select="movie_id", optional=True)

    genre_by_id = {_key(row.get("id")): _text(row.get("name")) for row in genres if row.get("id") is not None}
    country_by_id = {
        _key(row.get("id")): {
            "name": _text(row.get("name")),
            "code": _text(row.get("code")),
        }
        for row in countries
        if row.get("id") is not None
    }

    genres_by_movie: dict[str, list[str]] = defaultdict(list)
    for row in movie_genres:
        movie_id = _key(row.get("movie_id"))
        genre_name = genre_by_id.get(_key(row.get("genre_id")), "")
        if movie_id and genre_name and genre_name not in genres_by_movie[movie_id]:
            genres_by_movie[movie_id].append(genre_name)

    favorite_count = Counter(_key(row.get("movie_id")) for row in favorites if row.get("movie_id") is not None)
    watch_count = Counter(_key(row.get("movie_id")) for row in watch_history if row.get("movie_id") is not None)
    rating_count = Counter(_key(row.get("movie_id")) for row in ratings if row.get("movie_id") is not None)
    ai_recommendation_count = Counter(
        _key(row.get("movie_id")) for row in ai_recommendations if row.get("movie_id") is not None
    )
    search_click_count = Counter(
        _key(row.get("clicked_movie_id")) for row in search_logs if row.get("clicked_movie_id") is not None
    )
    movie_click_count = Counter(
        _key(row.get("movie_id")) for row in movie_click_logs if row.get("movie_id") is not None
    )
    active_source_count = Counter(
        _key(row.get("movie_id"))
        for row in movie_sources
        if row.get("movie_id") is not None and _bool(row.get("is_active"))
    )
    content_control_by_movie = {
        _key(row.get("movie_id")): row
        for row in content_controls
        if row.get("movie_id") is not None
    }

    normalized_movies: list[dict[str, Any]] = []

    for movie in movies:
        movie_id = movie.get("id")
        movie_key = _key(movie_id)
        content_control = content_control_by_movie.get(movie_key, {})
        is_hidden = _bool(content_control.get("is_hidden"))
        is_blocked = _bool(content_control.get("is_blocked"))

        has_play_source = bool(
            movie.get("video_url")
            or movie.get("stream_url")
            or active_source_count[movie_key] > 0
        )
        is_available_for_recommendation = (
            _active_status(movie.get("status"))
            and not is_hidden
            and not is_blocked
            and has_play_source
        )

        country = country_by_id.get(_key(movie.get("country_id")), {"name": "", "code": ""})

        normalized_movies.append(
            {
                "movie_id": movie_id,
                "title": _text(movie.get("title")),
                "original_title": _text(movie.get("original_title")),
                "slug": _text(movie.get("slug")),
                "description": _text(movie.get("description")),
                "overview": _text(movie.get("overview")),
                "release_year": _int(movie.get("release_year"), 0),
                "release_date": _text(movie.get("release_date")),
                "duration": _int(movie.get("duration"), 0),
                "runtime_minutes": _int(movie.get("runtime_minutes"), 0),
                "type": _text(movie.get("type")),
                "status": _text(movie.get("status")) or "active",
                "is_active": _bool(movie.get("is_active")) if movie.get("is_active") is not None else True,
                "deleted_at": _text(movie.get("deleted_at")),
                "country_id": _int(movie.get("country_id"), 0),
                "country": country["name"],
                "country_code": country["code"],
                "original_language": _text(movie.get("original_language")),
                "origin_country": _text(movie.get("origin_country")),
                "age_rating": _text(movie.get("age_rating")),
                "genres": genres_by_movie.get(movie_key, []),
                "source_type": _text(movie.get("source_type")),
                "source_count": active_source_count[movie_key],
                "is_premium": _bool(movie.get("is_premium")) or _bool(content_control.get("is_premium")),
                "has_play_source": has_play_source,
                "is_hidden": is_hidden,
                "is_blocked": is_blocked,
                "is_available_for_recommendation": is_available_for_recommendation,
                "view_count": _int(movie.get("view_count"), 0),
                "average_rating": _float(movie.get("average_rating"), 0.0),
                "total_ratings": _int(movie.get("total_ratings"), 0),
                "rating": _float(movie.get("rating"), 0.0),
                "vote_average": _float(movie.get("vote_average"), 0.0),
                "vote_count": _int(movie.get("vote_count"), 0),
                "is_featured": _bool(movie.get("is_featured")),
                "is_trending": _bool(movie.get("is_trending")),
                "poster_url": _text(movie.get("poster_url")),
                "poster_path": _text(movie.get("poster_path")),
                "backdrop_url": _text(movie.get("backdrop_url")),
                "backdrop_path": _text(movie.get("backdrop_path")),
                "image_url": _first_non_empty(movie.get("image_url"), movie.get("poster_url"), movie.get("poster_path")),
                "thumbnail_url": _text(movie.get("thumbnail_url")),
                "tmdb_id": _int(movie.get("tmdb_id"), 0),
                "imdb_id": _text(movie.get("imdb_id")),
                "favorite_count": favorite_count[movie_key],
                "watch_count": watch_count[movie_key],
                "rating_count": rating_count[movie_key],
                "ai_recommendation_count": ai_recommendation_count[movie_key],
                "search_click_count": search_click_count[movie_key],
                "movie_click_count": movie_click_count[movie_key],
            }
        )

    return normalized_movies


def load_movies_from_db() -> list[dict[str, Any]]:
    return [
        movie
        for movie in build_movie_feature_rows()
        if movie.get("is_available_for_recommendation")
    ]


def save_ai_history(
    user_id: str | None,
    query: str,
    normalized_query: str,
    recommended_movie_ids: list[Any],
) -> None:
    if not user_id:
        return

    supabase_insert(
        "ai_chat_history",
        {
            "user_id": user_id,
            "message": query,
            "response": normalized_query,
            "recommended_movies": recommended_movie_ids,
        },
        optional=True,
    )


def save_ai_recommendations(user_id: str | None, recommendations: list[dict[str, Any]]) -> None:
    if not user_id or not recommendations:
        return

    def reason_text(item: dict[str, Any]) -> str:
        reason = item.get("match_reason", "")
        if isinstance(reason, list):
            return ", ".join(_text(value) for value in reason if _text(value))
        return _text(reason)

    rows = [
        {
            "user_id": user_id,
            "movie_id": item.get("movie_id"),
            "reason": reason_text(item),
            "score": item.get("score", 0),
            "source": "ai",
        }
        for item in recommendations
        if item.get("movie_id") is not None
    ]

    if rows:
        supabase_insert("ai_recommendations", rows, optional=True)
