from __future__ import annotations

import runpy
from pathlib import Path


BASE_DIR = Path(__file__).resolve().parent
TARGET_SCRIPT = BASE_DIR / "test_recommender.py"


def main() -> None:
    if not TARGET_SCRIPT.exists():
        raise FileNotFoundError(
            f"Không tìm thấy file test chuẩn: {TARGET_SCRIPT}. "
            "Hãy kiểm tra lại entrypoint test local trong thư mục ai/."
        )

    runpy.run_path(str(TARGET_SCRIPT), run_name="__main__")


if __name__ == "__main__":
    main()
