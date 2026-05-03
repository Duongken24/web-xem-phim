from __future__ import annotations

from recommender import RecommendEngine


def print_results(query: str, items: list[dict]) -> None:
    print("\nKết quả:")
    if not items:
        print("Khong tim thay goi y phu hop.")
        return

    for index, item in enumerate(items, start=1):
        genres = item.get("genres") or []
        genres_text = ", ".join(str(value) for value in genres if value)
        country = item.get("country") or ", ".join(item.get("countries") or [])
        release_year = item.get("release_year") or item.get("year") or "?"
        vote_average = item.get("vote_average") or item.get("average_rating") or 0
        score = float(item.get("score") or 0.0)

        print(
            f"{index}. {item.get('title') or 'Khong ro tieu de'} | "
            f"{genres_text or 'Khong ro the loai'} | "
            f"{country or 'Khong ro quoc gia'} | "
            f"{release_year} | rating={vote_average} | score={score:.4f}"
        )


def interactive_loop() -> None:
    engine = RecommendEngine()
    engine.ensure_model()

    while True:
        query = input("\nNhập nhu cầu xem phim (gõ exit để thoát): ").strip()
        if query.lower() == "exit":
            break

        result = engine.recommend(query, top_n=10, only_database_movies=False)
        print_results(query, result.get("recommended_movies") or [])


def main() -> None:
    interactive_loop()


if __name__ == "__main__":
    main()
