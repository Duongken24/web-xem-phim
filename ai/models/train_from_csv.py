from __future__ import annotations

import json
from pathlib import Path

import joblib
import pandas as pd
from sklearn.feature_extraction.text import TfidfVectorizer


BASE_DIR = Path(__file__).resolve().parent.parent
DATA_DIR = BASE_DIR / "data"
MODELS_DIR = BASE_DIR / "models"

INPUT_CSV = DATA_DIR / "movies_training.csv"
OUTPUT_VECTORIZER = MODELS_DIR / "tfidf_vectorizer.joblib"
OUTPUT_VECTORS = MODELS_DIR / "movie_vectors.joblib"
OUTPUT_METADATA = MODELS_DIR / "movie_metadata.joblib"
OUTPUT_REPORT = MODELS_DIR / "training_report.json"


BAD_TITLES = {
    "a",
    "abcd",
    "abc",
    "123",
    "test",
    "hay",
    "ori",
    "moi them",
    "mới thêm",
}


def normalize_spaces(text: object) -> str:
    if pd.isna(text):
        return ""
    return " ".join(str(text).strip().split())


def safe_float(value: object, default: float = 0.0) -> float:
    if pd.isna(value) or value == "":
        return default
    try:
        return float(value)
    except Exception:
        return default


def safe_int(value: object, default: int = 0) -> int:
    if pd.isna(value) or value == "":
        return default
    try:
        return int(float(value))
    except Exception:
        return default


def ensure_required_columns(df: pd.DataFrame) -> pd.DataFrame:
    df = df.copy()

    required_text_columns = [
        "title",
        "original_title",
        "overview",
        "description",
        "genres",
        "country",
        "country_code",
        "language",
        "type",
        "source_type",
        "feature_text",
    ]

    for col in required_text_columns:
        if col not in df.columns:
            df[col] = ""

    required_numeric_columns = [
        "tmdb_id",
        "release_year",
        "vote_average",
        "vote_count",
    ]

    for col in required_numeric_columns:
        if col not in df.columns:
            df[col] = None

    required_bool_columns = [
        "is_active",
        "is_premium",
        "has_play_source",
        "is_featured",
        "is_trending",
    ]

    for col in required_bool_columns:
        if col not in df.columns:
            df[col] = False

    for col in required_text_columns:
        df[col] = df[col].apply(normalize_spaces)

    return df


def build_feature_text(row: pd.Series) -> str:
    parts: list[str] = []

    title = normalize_spaces(row.get("title", ""))
    original_title = normalize_spaces(row.get("original_title", ""))
    overview = normalize_spaces(row.get("overview", ""))
    description = normalize_spaces(row.get("description", ""))
    genres = normalize_spaces(row.get("genres", ""))
    country = normalize_spaces(row.get("country", ""))
    language = normalize_spaces(row.get("language", ""))
    release_year = str(row.get("release_year", "")).strip()

    if title:
        parts.extend([title, title])

    if original_title and original_title.lower() != title.lower():
        parts.append(original_title)

    if genres:
        parts.extend([genres, genres, genres])

    if country:
        parts.extend([country, country])

    if language:
        parts.append(language)

    if release_year and release_year != "nan":
        parts.append(release_year)

    if overview:
        parts.append(overview)

    if description and description != overview:
        parts.append(description)

    vote_average = safe_float(row.get("vote_average", 0), 0.0)
    vote_count = safe_int(row.get("vote_count", 0), 0)

    if bool(row.get("is_featured", False)):
        parts.append("featured")

    if bool(row.get("is_trending", False)):
        parts.append("trending")

    if vote_average >= 7:
        parts.append("well_rated")

    if vote_count >= 500:
        parts.append("popular")

    # enrich theo quốc gia / ngôn ngữ
    if country == "Nhật Bản" or language == "ja":
        parts.extend(["anime", "nhat ban", "japan", "japanese"])

    if country == "Hàn Quốc" or language == "ko":
        parts.extend(["han quoc", "korea", "korean"])

    if country == "Mỹ" or language == "en":
        parts.extend(["phim my", "my", "us", "american", "english"])

    if country == "Việt Nam" or language == "vi":
        parts.extend(["viet nam", "vietnam", "vietnamese"])

    # enrich theo genre
    genres_lower = genres.lower()

    if "hoạt hình" in genres_lower:
        parts.extend(["hoat hinh", "animation", "animated"])

    if "hành động" in genres_lower:
        parts.extend(["hanh dong", "action"])

    if "phiêu lưu" in genres_lower:
        parts.extend(["phieu luu", "adventure"])

    if "khoa học viễn tưởng" in genres_lower:
        parts.extend(["sci fi", "science fiction"])

    if "kinh dị" in genres_lower:
        parts.extend(["kinh di", "horror"])

    if "hình sự" in genres_lower:
        parts.extend(["hinh su", "crime"])

    if "tình cảm" in genres_lower:
        parts.extend(["tinh cam", "romance"])

    if "hài hước" in genres_lower:
        parts.extend(["hai huoc", "comedy"])

    if "chính kịch" in genres_lower:
        parts.extend(["chinh kich", "drama"])

    return " ".join(parts).strip()


def clean_dataframe(df: pd.DataFrame) -> pd.DataFrame:
    df = df.copy()

    # chuẩn hóa text cơ bản
    text_cols = [
        "title",
        "original_title",
        "overview",
        "description",
        "genres",
        "country",
        "country_code",
        "language",
        "type",
        "source_type",
        "feature_text",
    ]
    for col in text_cols:
        df[col] = df[col].apply(normalize_spaces)

    # lọc title rác
    df = df[df["title"].str.strip() != ""].copy()
    df = df[~df["title"].str.strip().str.lower().isin(BAD_TITLES)].copy()
    df = df[df["title"].str.strip().str.len() > 2].copy()

    # overview/description
    has_overview = df["overview"].fillna("").astype(str).str.strip() != ""
    has_description = df["description"].fillna("").astype(str).str.strip() != ""
    df = df[has_overview | has_description].copy()

    # genres không rỗng
    df = df[df["genres"].fillna("").astype(str).str.strip() != ""].copy()

    # build lại feature_text nếu thiếu
    missing_mask = df["feature_text"].fillna("").astype(str).str.strip() == ""
    if missing_mask.any():
        df.loc[missing_mask, "feature_text"] = df[missing_mask].apply(build_feature_text, axis=1)

    df["feature_text"] = df["feature_text"].apply(normalize_spaces)
    df = df[df["feature_text"].str.strip() != ""].copy()

    # dedupe ưu tiên tmdb_id, nếu không có thì theo title
    if "tmdb_id" in df.columns:
        has_tmdb = df["tmdb_id"].notna()
        df_tmdb = df[has_tmdb].drop_duplicates(subset=["tmdb_id"], keep="first")
        df_no_tmdb = df[~has_tmdb].drop_duplicates(subset=["title"], keep="first")
        df = pd.concat([df_tmdb, df_no_tmdb], ignore_index=True)
    else:
        df = df.drop_duplicates(subset=["title"], keep="first")

    df = df.reset_index(drop=True)
    return df


def main() -> None:
    if not INPUT_CSV.exists():
        raise FileNotFoundError(f"Không tìm thấy file: {INPUT_CSV}")

    MODELS_DIR.mkdir(parents=True, exist_ok=True)

    df = pd.read_csv(INPUT_CSV)
    print(f"Đã đọc {len(df)} dòng từ {INPUT_CSV}")

    df = ensure_required_columns(df)

    before_rows = len(df)
    df = clean_dataframe(df)
    after_rows = len(df)

    print(f"Số dòng trước lọc: {before_rows}")
    print(f"Số dòng sau lọc:   {after_rows}")

    vectorizer = TfidfVectorizer(
        max_features=30000,
        ngram_range=(1, 2),
        min_df=1,
        max_df=0.90,
        sublinear_tf=True,
    )

    movie_vectors = vectorizer.fit_transform(df["feature_text"])

    joblib.dump(vectorizer, OUTPUT_VECTORIZER)
    joblib.dump(movie_vectors, OUTPUT_VECTORS)
    joblib.dump(df, OUTPUT_METADATA)

    report = {
        "input_csv": str(INPUT_CSV),
        "num_movies": int(len(df)),
        "num_features": int(movie_vectors.shape[1]),
        "vector_shape": [int(movie_vectors.shape[0]), int(movie_vectors.shape[1])],
        "columns": list(df.columns),
    }

    with open(OUTPUT_REPORT, "w", encoding="utf-8") as f:
        json.dump(report, f, ensure_ascii=False, indent=2)

    print("\nĐã lưu:")
    print(OUTPUT_VECTORIZER)
    print(OUTPUT_VECTORS)
    print(OUTPUT_METADATA)
    print(OUTPUT_REPORT)


if __name__ == "__main__":
    main()