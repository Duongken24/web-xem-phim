# NiePhim Kaggle AI Recommendation Service

Service này dùng Kaggle The Movies Dataset để train content-based recommendation bằng TF-IDF + cosine similarity. Không dùng CSV ở frontend và không train lại mỗi lần user search.

## Data

Đặt các file Kaggle vào `ai/data/`:

- `movies_metadata.csv`
- `keywords.csv`
- `credits.csv`
- `links.csv` hoặc `links_small.csv` nếu cần mapping thêm

Pipeline đọc các cột:

- `movies_metadata.csv`: `id`, `title`, `original_title`, `overview`, `genres`, `original_language`, `production_countries`, `release_date`, `runtime`, `popularity`, `vote_average`, `vote_count`, `poster_path`
- `keywords.csv`: `id`, `keywords`
- `credits.csv`: `id`, `cast`, `crew`

## Prepare Data

```bash
cd ai
pip install -r requirements.txt
python prepare_kaggle_data.py
```

Output:

- `data/processed_movies.parquet`
- fallback `data/processed_movies.csv` nếu không ghi được parquet

## Train Model

```bash
python train_kaggle_model.py
```

Model lưu tại:

- `models/tfidf_vectorizer.joblib`
- `models/movie_vectors.joblib`
- `models/movie_metadata.joblib`

## Run Service

```bash
python ai_service.py
```

Health check:

```bash
curl http://127.0.0.1:8001/health
```

Recommend:

```bash
curl -X POST http://127.0.0.1:8001/recommend \
  -H "Content-Type: application/json" \
  -d '{"query":"phim tình cảm buồn","top_n":5,"only_database_movies":false}'
```

Reload chỉ load lại model joblib đã train, không train lại:

```bash
curl -X POST http://127.0.0.1:8001/reload
```

## Gemini

`GEMINI_API_KEY` là optional và chỉ đọc ở backend/Python. Nếu không có key, service dùng nguyên câu user nhập.

## Database Matching

Nếu có `SUPABASE_URL` và `SUPABASE_SERVICE_ROLE_KEY`, service sẽ match kết quả Kaggle với bảng `movies`:

1. `movies.tmdb_id = kaggle.tmdb_id` nếu DB có cột `tmdb_id`.
2. Fallback: `lower(title)` + `release_year`.

Kết quả match có `source = "database_matched"`. Kết quả chưa match có `source = "kaggle_only"` và chỉ dùng cho demo/tham khảo.
