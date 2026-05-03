# WEB-XEM-PHIM AI Pipeline

Pipeline AI hiện tại dùng dữ liệu train CSV mới để build model TF-IDF + cosine similarity, sau đó expose qua Python service và để backend Node gọi lại.

## Dữ liệu train hiện tại

Các file train chính đang nằm trong `ai/data/`:

- `movies_training.csv`
- `training_preview.csv`
- `genres_master.csv`

File được dùng để train thật hiện tại là:

- `ai/data/movies_training.csv`

## Lệnh train chuẩn

Từ root project:

```bash
python3 ai/train_from_csv.py
```

`ai/train_from_csv.py` là wrapper an toàn, bên dưới sẽ gọi script train thật đang nằm ở:

- `ai/models/train_from_csv.py`

## Lệnh test local chuẩn

Từ root project:

```bash
python3 ai/test_recommender.py
```

`ai/test_recommender.py` hiện là file test local chính.

File tên cũ vẫn còn để tương thích ngược:

- `ai/test_recomender.py`

## Model output

Sau khi train, model mới được lưu tại:

- `ai/models/tfidf_vectorizer.joblib`
- `ai/models/movie_vectors.joblib`
- `ai/models/movie_metadata.joblib`
- `ai/models/training_report.json`

## Python runtime service

Runtime Python chính là:

- `ai/ai_service.py`

Service này load engine từ:

- `ai/recommender.py`

Chạy service:

```bash
cd ai
python3 ai_service.py
```

Health check:

```bash
curl http://127.0.0.1:8001/health
```

Recommend:

```bash
curl -X POST http://127.0.0.1:8001/recommend \
  -H "Content-Type: application/json" \
  -d '{"query":"phim hàn hành động","top_n":10}'
```

Reload model đã train:

```bash
curl -X POST http://127.0.0.1:8001/reload
```

## Backend route direct-model

Backend Node hiện có route direct-model:

- `POST /api/ai/recommend`

Flow:

Frontend/Client -> Node backend -> Python AI service -> JSON recommendation

## Chạy local/dev đầy đủ

Để SearchPage dùng được flow AI mới, cần chạy **2 service riêng**:

### Terminal 1 - Python AI service

```bash
cd ai
python3 ai_service.py
```

Hoặc từ thư mục `backend/`:

```bash
npm run dev:ai
```

### Terminal 2 - Node backend

```bash
cd backend
npm run dev
```

### Kiểm tra nhanh health

```bash
cd backend
npm run health:ai
```

Nếu `GET /health` không trả `status: ok`, route `POST /api/ai/recommend` sẽ lỗi vì backend không kết nối được Python AI service.

## Ghi chú về file legacy

Một số file pipeline cũ đã được chuyển sang `ai/legacy/` và `backend/legacy/ai/` để giữ codebase gọn hơn nhưng vẫn có thể rollback khi cần.
Project vẫn còn một số file pipeline cũ để tham chiếu và rollback, ví dụ:

- `ai/legacy/prepare_kaggle_data.py`
- `ai/legacy/train_kaggle_model.py`
- `ai/legacy/train_from_db.py`

Các file này chưa bị xóa trong giai đoạn hiện tại. Chúng sẽ được phân loại/dọn tiếp ở phase sau, không xử lý trong bước chuẩn hóa command này.
