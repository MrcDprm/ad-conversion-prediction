"""Python ile JavaScript'in aynı sonucu verdiğini sınamak için ortak test verisi üretir.

Kullanım: python -m adconv.fixtures  (web/*.json okunur, web/tests/fixtures.json yazılır)
"""

import json
from pathlib import Path

from sklearn.metrics import confusion_matrix, roc_auc_score

from .export import interpolate, write_json

WEB_DIR = Path(__file__).resolve().parent.parent / "web"
FIXTURES_PATH = WEB_DIR / "tests" / "fixtures.json"

# Verinin içi, kenarları ve dışı
POINTS = [(18, 15_000), (30, 50_000), (45, 90_000), (52.5, 33_333), (60, 150_000), (10, 500_000), (65, 0)]
THRESHOLDS = [0.1, 0.3, 0.5, 0.7, 0.9]


def read(name: str) -> dict:
    return json.loads((WEB_DIR / name).read_text(encoding="utf-8"))


def build_fixtures(grid: dict, data: dict) -> dict:
    labels = [p[2] for p in data["points"]]
    models = {}
    for name, values in grid["models"].items():
        oof = data["oof"][name]
        models[name] = {
            "predictions": [[a, s, interpolate(values, a, s)] for a, s in POINTS],
            "confusion": [
                [t, *(int(v) for v in confusion_matrix(labels, [int(p >= t) for p in oof], labels=[0, 1]).ravel())]
                for t in THRESHOLDS
            ],
            "auc": roc_auc_score(labels, oof),
        }
    return {"models": models}


def main() -> None:
    write_json(FIXTURES_PATH, build_fixtures(read("grid.json"), read("data.json")))
    print(f"Wrote {FIXTURES_PATH}")


if __name__ == "__main__":
    main()
