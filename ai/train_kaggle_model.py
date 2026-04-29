from pathlib import Path
from typing import Any

import joblib
import pandas as pd
from sklearn.feature_extraction.text import TfidfVectorizer


BASE_DIR = Path(__file__).resolve().parent
DATA_DIR = BASE_DIR / "data"
MODELS_DIR = BASE_DIR / "models"
PROCESSED_PARQUET_PATH = DATA_DIR / "processed_movies.parquet"
PROCESSED_CSV_PATH = DATA_DIR / "processed_movies.csv"
VECTORIZER_PATH = MODELS_DIR / "tfidf_vectorizer.joblib"
VECTORS_PATH = MODELS_DIR / "movie_vectors.joblib"
METADATA_PATH = MODELS_DIR / "movie_metadata.joblib"


LIST_COLUMNS = ["genres", "keywords", "cast_names", "countries"]


def _load_processed_movies() -> pd.DataFrame:
    if PROCESSED_PARQUET_PATH.exists():
        return pd.read_parquet(PROCESSED_PARQUET_PATH)
    if PROCESSED_CSV_PATH.exists():
        data = pd.read_csv(PROCESSED_CSV_PATH)
        for column in LIST_COLUMNS:
            if column in data.columns:
                data[column] = data[column].apply(_parse_list_cell)
        return data
    raise FileNotFoundError(
        "Processed Kaggle data not found. Run `python prepare_kaggle_data.py` first."
    )


def _parse_list_cell(value: Any) -> list[str]:
    if isinstance(value, list):
        return [str(item) for item in value if str(item).strip()]
    if value is None or value == "":
        return []
    try:
        import ast

        parsed = ast.literal_eval(str(value))
        if isinstance(parsed, list):
            return [str(item) for item in parsed if str(item).strip()]
    except (ValueError, SyntaxError):
        return []
    return []


def train_kaggle_model() -> int:
    data = _load_processed_movies()
    data["feature_text"] = data["feature_text"].fillna("").astype(str)
    data = data[data["feature_text"].str.strip() != ""].copy()

    if data.empty:
        raise RuntimeError("No processed movies with feature_text found.")

    vectorizer = TfidfVectorizer(
        stop_words="english",
        max_features=30000,
        ngram_range=(1, 2),
        min_df=2,
        sublinear_tf=True,
    )

    movie_vectors = vectorizer.fit_transform(data["feature_text"].tolist())
    metadata = data.to_dict(orient="records")

    MODELS_DIR.mkdir(parents=True, exist_ok=True)
    joblib.dump(vectorizer, VECTORIZER_PATH)
    joblib.dump(movie_vectors, VECTORS_PATH)
    joblib.dump(metadata, METADATA_PATH)

    print(f"Saved TF-IDF model to {MODELS_DIR}")
    return len(metadata)


if __name__ == "__main__":
    count = train_kaggle_model()
    print(f"Trained Kaggle TF-IDF model with {count} movies.")
