import ast
import math
from pathlib import Path
from typing import Any

import pandas as pd


BASE_DIR = Path(__file__).resolve().parent
DATA_DIR = BASE_DIR / "data"
MOVIES_PATH = DATA_DIR / "movies_metadata.csv"
KEYWORDS_PATH = DATA_DIR / "keywords.csv"
CREDITS_PATH = DATA_DIR / "credits.csv"
PROCESSED_PARQUET_PATH = DATA_DIR / "processed_movies.parquet"
PROCESSED_CSV_PATH = DATA_DIR / "processed_movies.csv"


def _text(value: Any) -> str:
    if value is None:
        return ""
    if isinstance(value, float) and math.isnan(value):
        return ""
    return str(value).strip()


def _number(value: Any, default: float = 0.0) -> float:
    try:
        if value is None or value == "":
            return default
        if isinstance(value, float) and math.isnan(value):
            return default
        return float(value)
    except (TypeError, ValueError):
        return default


def _parse_json_list(value: Any) -> list[dict[str, Any]]:
    text = _text(value)
    if not text or text == "[]":
        return []
    try:
        parsed = ast.literal_eval(text)
    except (ValueError, SyntaxError):
        return []
    return parsed if isinstance(parsed, list) else []


def _extract_names(value: Any, limit: int | None = None) -> list[str]:
    rows = value if isinstance(value, list) else _parse_json_list(value)
    names = []
    for item in rows:
        if not isinstance(item, dict):
            continue
        name = _text(item.get("name"))
        if name:
            names.append(name)
        if limit and len(names) >= limit:
            break
    return names


def _extract_director(value: Any) -> str:
    rows = value if isinstance(value, list) else _parse_json_list(value)
    for item in rows:
        if isinstance(item, dict) and _text(item.get("job")).lower() == "director":
            return _text(item.get("name"))
    return ""


def _release_year(value: Any) -> int | None:
    date = pd.to_datetime(value, errors="coerce")
    if pd.isna(date):
        return None
    return int(date.year)


def _decade(year: int | None) -> str:
    if not year:
        return ""
    return f"{year // 10 * 10}s"


def _runtime_bucket(runtime: float) -> str:
    if runtime <= 0:
        return ""
    if runtime < 80:
        return "short movie"
    if runtime <= 140:
        return "standard movie"
    return "long movie"


def _rating_bucket(vote_average: float) -> str:
    if vote_average >= 8:
        return "high rating"
    if vote_average >= 7:
        return "good rating"
    if 0 < vote_average < 5:
        return "low rating"
    return ""


def _popularity_bucket(popularity: float, popularity_threshold: float) -> str:
    return "popular" if popularity_threshold > 0 and popularity >= popularity_threshold else ""


def _vote_count_bucket(vote_count: float, vote_count_threshold: float) -> str:
    return "well known" if vote_count_threshold > 0 and vote_count >= vote_count_threshold else ""


def _join_tokens(*values: Any) -> str:
    tokens: list[str] = []
    for value in values:
        if isinstance(value, list):
            tokens.extend(_text(item) for item in value if _text(item))
        else:
            text = _text(value)
            if text:
                tokens.append(text)
    return " ".join(tokens)


def build_feature_text(row: pd.Series, popularity_threshold: float = 0, vote_count_threshold: float = 0) -> str:
    runtime = _number(row.get("runtime"))
    vote_average = _number(row.get("vote_average"))
    popularity = _number(row.get("popularity"))
    vote_count = _number(row.get("vote_count"))

    return _join_tokens(
        row.get("title"),
        row.get("original_title"),
        row.get("overview"),
        row.get("genres"),
        row.get("keywords"),
        row.get("cast_names"),
        row.get("director"),
        row.get("countries"),
        row.get("original_language"),
        row.get("release_year"),
        row.get("decade"),
        _runtime_bucket(runtime),
        _rating_bucket(vote_average),
        _popularity_bucket(popularity, popularity_threshold),
        _vote_count_bucket(vote_count, vote_count_threshold),
    )


def _require_file(path: Path) -> None:
    if not path.exists():
        raise FileNotFoundError(
            f"Missing {path.name}. Download Kaggle The Movies Dataset and place it in {DATA_DIR}."
        )


def prepare_kaggle_data() -> int:
    _require_file(MOVIES_PATH)
    _require_file(KEYWORDS_PATH)
    _require_file(CREDITS_PATH)

    DATA_DIR.mkdir(parents=True, exist_ok=True)

    movies = pd.read_csv(MOVIES_PATH, low_memory=False)
    keywords = pd.read_csv(KEYWORDS_PATH)
    credits = pd.read_csv(CREDITS_PATH)

    movies["tmdb_id"] = pd.to_numeric(movies["id"], errors="coerce")
    movies = movies.dropna(subset=["tmdb_id"]).copy()
    movies["tmdb_id"] = movies["tmdb_id"].astype(int)

    keywords["tmdb_id"] = pd.to_numeric(keywords["id"], errors="coerce")
    credits["tmdb_id"] = pd.to_numeric(credits["id"], errors="coerce")
    keywords = keywords.dropna(subset=["tmdb_id"]).copy()
    credits = credits.dropna(subset=["tmdb_id"]).copy()
    keywords["tmdb_id"] = keywords["tmdb_id"].astype(int)
    credits["tmdb_id"] = credits["tmdb_id"].astype(int)

    data = movies.merge(keywords[["tmdb_id", "keywords"]], on="tmdb_id", how="left")
    data = data.merge(credits[["tmdb_id", "cast", "crew"]], on="tmdb_id", how="left")

    data["title"] = data["title"].map(_text)
    data["original_title"] = data["original_title"].map(_text)
    data["overview"] = data["overview"].map(_text)
    data = data[(data["title"] != "") & (data["overview"].str.len() >= 20)].copy()

    data["genres"] = data["genres"].apply(lambda value: _extract_names(value))
    data["keywords"] = data["keywords"].apply(lambda value: _extract_names(value))
    data["countries"] = data["production_countries"].apply(lambda value: _extract_names(value))
    data["cast_names"] = data["cast"].apply(lambda value: _extract_names(value, limit=3))
    data["director"] = data["crew"].apply(_extract_director)
    data["release_year"] = data["release_date"].apply(_release_year)
    data["decade"] = data["release_year"].apply(_decade)
    data["runtime"] = pd.to_numeric(data["runtime"], errors="coerce").fillna(0)
    data["popularity"] = pd.to_numeric(data["popularity"], errors="coerce").fillna(0)
    data["vote_average"] = pd.to_numeric(data["vote_average"], errors="coerce").fillna(0)
    data["vote_count"] = pd.to_numeric(data["vote_count"], errors="coerce").fillna(0)
    data["poster_path"] = data["poster_path"].map(_text)
    data["original_language"] = data["original_language"].map(_text)

    popularity_threshold = float(data.loc[data["popularity"] > 0, "popularity"].quantile(0.75) or 0)
    vote_count_threshold = float(data.loc[data["vote_count"] > 0, "vote_count"].quantile(0.75) or 0)

    data["feature_text"] = data.apply(
        lambda row: build_feature_text(row, popularity_threshold, vote_count_threshold),
        axis=1,
    )

    output_columns = [
        "tmdb_id",
        "title",
        "original_title",
        "overview",
        "genres",
        "keywords",
        "cast_names",
        "director",
        "countries",
        "original_language",
        "release_year",
        "decade",
        "runtime",
        "popularity",
        "vote_average",
        "vote_count",
        "poster_path",
        "feature_text",
    ]
    processed = data[output_columns].copy()

    try:
        processed.to_parquet(PROCESSED_PARQUET_PATH, index=False)
        print(f"Saved {len(processed)} movies to {PROCESSED_PARQUET_PATH}")
    except Exception as exc:
        processed.to_csv(PROCESSED_CSV_PATH, index=False)
        print(f"Parquet save failed ({exc}). Saved CSV to {PROCESSED_CSV_PATH}")

    return len(processed)


if __name__ == "__main__":
    count = prepare_kaggle_data()
    print(f"Prepared {count} Kaggle movies.")
