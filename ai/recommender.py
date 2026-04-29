import os
import re
import unicodedata
import math
from pathlib import Path
from typing import Any

import joblib
from dotenv import load_dotenv
from sklearn.metrics.pairwise import cosine_similarity


BASE_DIR = Path(__file__).resolve().parent
ROOT_DIR = BASE_DIR.parent
BACKEND_DIR = ROOT_DIR / "backend"
MODELS_DIR = BASE_DIR / "models"
VECTORIZER_PATH = MODELS_DIR / "tfidf_vectorizer.joblib"
VECTORS_PATH = MODELS_DIR / "movie_vectors.joblib"
METADATA_PATH = MODELS_DIR / "movie_metadata.joblib"

load_dotenv(ROOT_DIR / ".env")
load_dotenv(BACKEND_DIR / ".env")
load_dotenv(BASE_DIR / ".env")


GENRE_ALIASES = {
    "Action": ["action", "hanh dong", "hành động"],
    "Romance": ["romance", "love", "tinh cam", "tình cảm", "lang man", "lãng mạn"],
    "Horror": ["horror", "kinh di", "kinh dị"],
    "Comedy": ["comedy", "hai", "hài"],
    "Drama": ["drama", "chinh kich", "chính kịch", "tam ly", "tâm lý"],
    "Science Fiction": ["sci-fi", "science fiction", "vien tuong", "viễn tưởng", "khoa hoc vien tuong"],
    "Adventure": ["adventure", "phieu luu", "phiêu lưu"],
    "Animation": ["animation", "anime", "hoat hinh", "hoạt hình"],
    "Mystery": ["mystery", "bi an", "bí ẩn"],
    "Thriller": ["thriller", "giat gan", "giật gân"],
    "Crime": ["crime", "toi pham", "tội phạm"],
    "Documentary": ["documentary", "tai lieu", "tài liệu"],
}

COUNTRY_LANGUAGE_ALIASES = {
    "Korean": {
        "aliases": ["han quoc", "hàn quốc", "korean", "korea", "south korea"],
        "countries": ["south korea", "korea"],
        "languages": ["ko"],
    },
    "Japanese": {
        "aliases": ["nhat", "nhật", "nhat ban", "nhật bản", "japanese", "japan"],
        "countries": ["japan"],
        "languages": ["ja"],
    },
    "Chinese": {
        "aliases": ["trung quoc", "trung quốc", "chinese", "china"],
        "countries": ["china", "hong kong", "taiwan"],
        "languages": ["zh", "cn"],
    },
    "American": {
        "aliases": ["my", "mỹ", "american", "united states", "usa", "us"],
        "countries": ["united states of america", "united states", "usa"],
        "languages": ["en"],
    },
    "British": {
        "aliases": ["anh", "british", "united kingdom", "uk"],
        "countries": ["united kingdom", "uk"],
        "languages": ["en"],
    },
    "French": {
        "aliases": ["phap", "pháp", "french", "france"],
        "countries": ["france"],
        "languages": ["fr"],
    },
    "Indian": {
        "aliases": ["an do", "ấn độ", "indian", "india", "hindi"],
        "countries": ["india"],
        "languages": ["hi"],
    },
}


def strip_accents(value: Any) -> str:
    normalized = unicodedata.normalize("NFD", _text(value))
    return "".join(ch for ch in normalized if unicodedata.category(ch) != "Mn").lower()


def _text(value: Any) -> str:
    if value is None:
        return ""
    return str(value).strip()


def _number(value: Any) -> float:
    try:
        if value is None:
            return 0.0
        if isinstance(value, str) and not value.strip():
            return 0.0
        if not isinstance(value, (str, bytes, bytearray)) and hasattr(value, "tolist"):
            value = value.tolist()
            if isinstance(value, (list, tuple)):
                value = value[0] if value else None
            if value is None:
                return 0.0
        number = float(value)
        return 0.0 if math.isnan(number) else number
    except (TypeError, ValueError):
        return 0.0


def _bool(value: Any) -> bool:
    if isinstance(value, bool):
        return value
    if isinstance(value, str):
        return value.strip().lower() in {"1", "true", "yes", "y", "on"}
    return bool(value)


def _list(value: Any) -> list[str]:
    if value is None:
        return []

    if isinstance(value, (str, bytes, bytearray)):
        text = value.decode() if isinstance(value, (bytes, bytearray)) else value
        text = text.strip()
        if not text or text.lower() in {"nan", "none", "null", "[]"}:
            return []
        try:
            import ast

            parsed = ast.literal_eval(text)
            if parsed is not text:
                return _list(parsed)
        except (ValueError, SyntaxError):
            return [text]
        return [text]

    if not isinstance(value, (list, tuple)) and hasattr(value, "tolist"):
        try:
            return _list(value.tolist())
        except Exception:
            text = _text(value)
            return [text] if text and text.lower() not in {"nan", "none", "null"} else []

    if isinstance(value, (list, tuple)):
        values: list[str] = []
        for item in value:
            if isinstance(item, (list, tuple)) or (
                not isinstance(item, (str, bytes, bytearray)) and hasattr(item, "tolist")
            ):
                values.extend(_list(item))
                continue

            text = _text(item)
            if text and text.lower() not in {"nan", "none", "null"}:
                values.append(text)
        return values

    text = _text(value)
    if text and text.lower() not in {"nan", "none", "null"}:
        return [text]
    try:
        import ast

        parsed = ast.literal_eval(text)
        return _list(parsed)
    except (ValueError, SyntaxError):
        return []


def _contains_any(text: str, values: list[str]) -> bool:
    for value in values:
        normalized = strip_accents(value)
        if not normalized:
            continue
        if len(normalized) <= 3:
            if re.search(rf"(?<!\w){re.escape(normalized)}(?!\w)", text):
                return True
            continue
        if normalized in text:
            return True
    return False


def _safe_top_n(top_n: int) -> int:
    return max(1, min(int(top_n or 10), 50))


def normalize_vi_query(user_text: str) -> str:
    query = user_text.strip()
    gemini_key = os.getenv("GEMINI_API_KEY", "").strip()
    if not gemini_key:
        return query

    prompt = f"""Bạn là hệ thống chuẩn hóa truy vấn phim.
Nhiệm vụ:
- Nhận câu tiếng Việt của người dùng
- Chuyển thành cụm từ khóa tiếng Anh ngắn gọn
- Chỉ trả về đúng 1 dòng tiếng Anh
- Không giải thích
- Ưu tiên: genre, mood, theme, setting, country, actor, director, movie/series, year/decade

Ví dụ:
Input: phim tình cảm buồn
Output: sad romance drama

Input: phim hành động năm 2012
Output: 2012 action movie

Input: phim kinh dị Hàn Quốc
Output: korean horror thriller

Input: phim không gian viễn tưởng
Output: space science fiction adventure

Input: phim của Leonardo DiCaprio
Output: Leonardo DiCaprio movie

Input: phim đạo diễn Christopher Nolan
Output: Christopher Nolan mind bending thriller science fiction

Input: {query}
Output:"""

    try:
        from google import genai

        client = genai.Client(api_key=gemini_key)
        response = client.models.generate_content(
            model=os.getenv("GEMINI_MODEL", "gemini-2.0-flash"),
            contents=prompt,
        )
        normalized = _text(getattr(response, "text", "")).splitlines()[0].strip()
        return normalized or query
    except Exception as exc:
        print(f"[recommender] Gemini normalize fallback: {exc}")
        return query


def detect_rules(original_query: str, normalized_query: str) -> dict[str, Any]:
    combined = strip_accents(f"{original_query} {normalized_query}")
    detected: dict[str, Any] = {
        "year": None,
        "decade": None,
        "genre": None,
        "genres": [],
        "country": None,
        "top_current": False,
        "wants_high_rating": False,
        "person_query": normalized_query.strip(),
    }

    year_match = re.search(r"\b(19\d{2}|20\d{2})\b", combined)
    if year_match:
        detected["year"] = int(year_match.group(1))

    decade_patterns = [
        (r"thap nien\s*90|90s|1990s", "1990s"),
        (r"thap nien\s*80|80s|1980s", "1980s"),
        (r"thap nien\s*2000|2000s", "2000s"),
        (r"2010s|thap nien\s*2010", "2010s"),
        (r"2020s|thap nien\s*2020", "2020s"),
    ]
    for pattern, decade in decade_patterns:
        if re.search(pattern, combined):
            detected["decade"] = decade
            break

    for genre, aliases in GENRE_ALIASES.items():
        if _contains_any(combined, [genre, *aliases]):
            detected["genres"].append(genre)

    if detected["genres"]:
        detected["genre"] = detected["genres"][0]

    for label, config in COUNTRY_LANGUAGE_ALIASES.items():
        if _contains_any(combined, config["aliases"]):
            detected["country"] = label
            break

    detected["top_current"] = _contains_any(
        combined,
        ["top", "hot", "pho bien", "phổ biến", "noi tieng", "nổi tiếng", "hay nhat", "trending", "nhieu nguoi xem"],
    )
    detected["wants_high_rating"] = _contains_any(
        combined,
        ["hay", "best", "danh gia cao", "đánh giá cao", "high rating", "hay nhat"],
    )

    return detected


class DatabaseMatcher:
    def __init__(self) -> None:
        self.loaded = False
        self.by_tmdb_id: dict[int, dict[str, Any]] = {}
        self.by_title_year: dict[tuple[str, int], dict[str, Any]] = {}

    def load(self) -> None:
        if self.loaded:
            return
        self.loaded = True

        supabase_url = os.getenv("SUPABASE_URL", "").strip()
        service_key = os.getenv("SUPABASE_SERVICE_ROLE_KEY", "").strip()
        if not supabase_url or not service_key:
            return

        try:
            from supabase import create_client

            client = create_client(supabase_url, service_key)

            def fetch_table_rows(table_name: str) -> list[dict[str, Any]]:
                table_rows: list[dict[str, Any]] = []
                start = 0
                page_size = 1000
                while True:
                    page = (
                        client.table(table_name)
                        .select("*")
                        .range(start, start + page_size - 1)
                        .execute()
                        .data
                        or []
                    )
                    table_rows.extend(page)
                    if len(page) < page_size:
                        break
                    start += page_size
                return table_rows

            rows = []
            for table_name in ["movies", "available_movies"]:
                try:
                    rows.extend(fetch_table_rows(table_name))
                    if rows:
                        break
                except Exception as table_exc:
                    print(f"[recommender] Could not load {table_name}: {table_exc}")

            try:
                movie_source_rows = fetch_table_rows("movie_sources")
            except Exception as source_exc:
                print(f"[recommender] Could not load movie_sources: {source_exc}")
                movie_source_rows = []

            try:
                content_control_rows = fetch_table_rows("content_controls")
            except Exception as content_exc:
                print(f"[recommender] Could not load content_controls: {content_exc}")
                content_control_rows = []
        except Exception as exc:
            print(f"[recommender] DB match disabled: {exc}")
            return

        active_source_count: dict[int, int] = {}
        for row in movie_source_rows:
            movie_id = int(_number(row.get("movie_id")))
            if not movie_id or row.get("is_active") is False:
                continue
            if not (
                row.get("video_url")
                or row.get("public_url")
                or row.get("object_key")
            ):
                continue
            active_source_count[movie_id] = active_source_count.get(movie_id, 0) + 1

        content_control_by_movie = {
            int(_number(row.get("movie_id"))): row
            for row in content_control_rows
            if int(_number(row.get("movie_id")))
        }

        for row in rows:
            status = strip_accents(row.get("status"))
            if status and status != "active":
                continue
            if row.get("is_active") is False:
                continue

            movie_id = int(_number(row.get("id") or row.get("movie_id")))
            content_control = content_control_by_movie.get(movie_id, {})
            if _bool(content_control.get("is_hidden")) or _bool(content_control.get("is_blocked")):
                continue

            has_play_source = bool(
                row.get("has_play_source")
                or row.get("video_url")
                or row.get("stream_url")
                or row.get("public_url")
                or row.get("object_key")
                or active_source_count.get(movie_id, 0) > 0
            )
            if not has_play_source:
                continue

            normalized_row = {
                **row,
                "id": movie_id or row.get("id"),
                "movie_id": movie_id or row.get("movie_id"),
                "has_play_source": True,
                "is_premium": row.get("is_premium") or content_control.get("is_premium"),
            }

            tmdb_id = int(_number(row.get("tmdb_id")))
            if tmdb_id:
                self.by_tmdb_id[tmdb_id] = normalized_row

            title = strip_accents(normalized_row.get("title"))
            release_year = int(_number(normalized_row.get("release_year")))
            if title and release_year:
                self.by_title_year[(title, release_year)] = normalized_row

    def match(self, movie: dict[str, Any]) -> dict[str, Any] | None:
        self.load()
        tmdb_id = int(_number(movie.get("tmdb_id")))
        if tmdb_id and tmdb_id in self.by_tmdb_id:
            return self.by_tmdb_id[tmdb_id]

        release_year = int(_number(movie.get("release_year")))
        for title_key in [strip_accents(movie.get("title")), strip_accents(movie.get("original_title"))]:
            if title_key and release_year and (title_key, release_year) in self.by_title_year:
                return self.by_title_year[(title_key, release_year)]
        return None


class RecommendEngine:
    def __init__(self) -> None:
        self.vectorizer = None
        self.movie_vectors = None
        self.metadata: list[dict[str, Any]] = []
        self.db_matcher = DatabaseMatcher()

    def load_model(self) -> bool:
        if not (VECTORIZER_PATH.exists() and VECTORS_PATH.exists() and METADATA_PATH.exists()):
            return False

        self.vectorizer = joblib.load(VECTORIZER_PATH)
        self.movie_vectors = joblib.load(VECTORS_PATH)
        self.metadata = joblib.load(METADATA_PATH)
        return True

    def reload_model(self) -> int:
        if not self.load_model():
            raise RuntimeError(
                "Kaggle model not found. Run `python prepare_kaggle_data.py` then `python train_kaggle_model.py`."
            )
        self.db_matcher = DatabaseMatcher()
        return len(self.metadata)

    def ensure_model(self) -> None:
        if self.vectorizer is not None and self.movie_vectors is not None and self.metadata:
            return
        self.reload_model()

    def health(self) -> dict[str, Any]:
        model_loaded = self.vectorizer is not None and self.movie_vectors is not None and bool(self.metadata)
        if not model_loaded:
            model_loaded = self.load_model()
        return {
            "movies_loaded": len(self.metadata),
            "model_loaded": bool(model_loaded),
            "model_source": "kaggle",
        }

    def _genre_match(self, movie: dict[str, Any], wanted_genres: list[str]) -> str | None:
        movie_genres = [strip_accents(item) for item in _list(movie.get("genres"))]
        for wanted in wanted_genres:
            aliases = [wanted, *GENRE_ALIASES.get(wanted, [])]
            if any(_contains_any(genre, aliases) or strip_accents(wanted) in genre for genre in movie_genres):
                return wanted
        return None

    def _country_language_match(self, movie: dict[str, Any], wanted_country: str | None) -> bool:
        if not wanted_country:
            return False
        config = COUNTRY_LANGUAGE_ALIASES.get(wanted_country)
        if not config:
            return False
        countries = strip_accents(" ".join(_list(movie.get("countries"))))
        language = strip_accents(movie.get("original_language"))
        return _contains_any(countries, config["countries"]) or language in config["languages"]

    def _person_match(self, movie: dict[str, Any], query_text: str) -> str | None:
        normalized_query = strip_accents(query_text)
        people = [movie.get("director"), *_list(movie.get("cast_names"))]
        for person in people:
            normalized_person = strip_accents(person)
            if normalized_person and len(normalized_person.split()) >= 2 and normalized_person in normalized_query:
                return _text(person)
        return None

    def _format_movie(
        self,
        movie: dict[str, Any],
        score: float,
        reasons: list[str],
        db_movie: dict[str, Any] | None,
    ) -> dict[str, Any]:
        result = {
            "tmdb_id": int(_number(movie.get("tmdb_id"))) or None,
            "title": movie.get("title"),
            "original_title": movie.get("original_title"),
            "release_year": int(_number(movie.get("release_year"))) or None,
            "year": int(_number(movie.get("release_year"))) or None,
            "genres": _list(movie.get("genres")),
            "keywords": _list(movie.get("keywords"))[:10],
            "cast_names": _list(movie.get("cast_names")),
            "director": movie.get("director"),
            "countries": _list(movie.get("countries")),
            "country": ", ".join(_list(movie.get("countries"))),
            "original_language": movie.get("original_language"),
            "poster_path": movie.get("poster_path"),
            "vote_average": _number(movie.get("vote_average")),
            "average_rating": _number(movie.get("vote_average")),
            "vote_count": int(_number(movie.get("vote_count"))),
            "popularity": _number(movie.get("popularity")),
            "score": round(float(score), 4),
            "match_reason": reasons or ["semantic similarity"],
            "source": "kaggle_only",
        }

        if db_movie:
            result.update(
                {
                    "movie_id": db_movie.get("id"),
                    "slug": db_movie.get("slug"),
                    "poster_url": db_movie.get("poster_url"),
                    "image_url": db_movie.get("image_url") or db_movie.get("poster_url") or db_movie.get("poster_path"),
                    "source_type": db_movie.get("source_type"),
                    "is_premium": db_movie.get("is_premium"),
                    "has_play_source": True,
                    "source": "database_matched",
                }
            )

        return result

    def _database_boost(self, db_movie: dict[str, Any]) -> tuple[float, list[str]]:
        boost = 0.0
        reasons: list[str] = []

        engagement = _number(db_movie.get("view_count")) + _number(db_movie.get("watch_count"))
        favorite_count = _number(db_movie.get("favorite_count"))
        average_rating = max(_number(db_movie.get("average_rating")), _number(db_movie.get("vote_average")))
        total_ratings = max(_number(db_movie.get("total_ratings")), _number(db_movie.get("vote_count")))

        if engagement > 0:
            boost += min(engagement / 5000.0, 1.0) * 0.18
            reasons.append("database engagement boost")

        if favorite_count > 0:
            boost += min(favorite_count / 500.0, 1.0) * 0.08
            reasons.append("favorites boost")

        if average_rating >= 7:
            boost += min((average_rating - 6.5) / 2.5, 1.0) * 0.12
            reasons.append("database rating boost")

        if total_ratings > 0:
            boost += min(total_ratings / 1000.0, 1.0) * 0.08
            reasons.append("rating volume boost")

        if _bool(db_movie.get("is_trending")):
            boost += 0.12
            reasons.append("trending boost")

        if _bool(db_movie.get("is_featured")):
            boost += 0.08
            reasons.append("featured boost")

        if _bool(db_movie.get("has_play_source")):
            boost += 0.05
            reasons.append("playable in database")

        return boost, reasons

    def recommend(self, query: str, top_n: int = 10, only_database_movies: bool = True) -> dict[str, Any]:
        self.ensure_model()
        assert self.vectorizer is not None
        assert self.movie_vectors is not None

        normalized_query = normalize_vi_query(query)
        detected = detect_rules(query, normalized_query)
        query_for_vector = f"{normalized_query} {query}".strip()
        query_vector = self.vectorizer.transform([query_for_vector])
        cosine_scores = cosine_similarity(query_vector, self.movie_vectors).flatten()

        max_popularity = max([_number(movie.get("popularity")) for movie in self.metadata] or [1])
        max_vote_count = max([_number(movie.get("vote_count")) for movie in self.metadata] or [1])
        scored_movies = []

        for index, movie in enumerate(self.metadata):
            score = float(cosine_scores[index])
            reasons: list[str] = ["semantic similarity"] if score > 0 else []

            genre_match = self._genre_match(movie, detected.get("genres", []))
            if genre_match:
                score += 0.22
                reasons.append(f"genre match: {genre_match}")

            movie_year = int(_number(movie.get("release_year")))
            if detected.get("year") and movie_year == detected["year"]:
                score += 0.18
                reasons.append(f"year match: {movie_year}")

            if detected.get("decade") and movie.get("decade") == detected["decade"]:
                score += 0.12
                reasons.append(f"decade match: {detected['decade']}")

            if self._country_language_match(movie, detected.get("country")):
                score += 0.16
                reasons.append(f"country/language match: {detected['country']}")

            person_match = self._person_match(movie, normalized_query)
            if person_match:
                score += 0.18
                reasons.append(f"actor/director match: {person_match}")

            popularity = _number(movie.get("popularity"))
            vote_count = _number(movie.get("vote_count"))
            vote_average = _number(movie.get("vote_average"))

            if detected.get("top_current"):
                score += min(popularity / max(max_popularity, 1), 1.0) * 0.12
                score += min(vote_count / max(max_vote_count, 1), 1.0) * 0.12
                reasons.append("popularity boost")

            if detected.get("wants_high_rating") and vote_average >= 7:
                score += 0.1 if vote_average < 8 else 0.15
                reasons.append("high rating boost")

            db_movie = self.db_matcher.match(movie)
            if only_database_movies and not db_movie:
                continue

            if db_movie:
                database_boost, database_reasons = self._database_boost(db_movie)
                score += database_boost
                reasons.extend(database_reasons)

            scored_movies.append({"movie": movie, "score": score, "reasons": reasons, "db_movie": db_movie})

        scored_movies.sort(key=lambda item: item["score"], reverse=True)
        recommended_movies = []
        scan_limit = max(_safe_top_n(top_n) * 20, 100)

        for item in scored_movies[:scan_limit]:
            db_movie = item.get("db_movie")

            recommended_movies.append(
                self._format_movie(item["movie"], item["score"], item["reasons"], db_movie)
            )
            if len(recommended_movies) >= _safe_top_n(top_n):
                break

        public_detected = {key: value for key, value in detected.items() if key != "wants_high_rating"}
        return {
            "query": query,
            "normalized_query": normalized_query,
            "detected_filters": public_detected,
            "only_database_movies": only_database_movies,
            "recommended_movies": recommended_movies,
        }
