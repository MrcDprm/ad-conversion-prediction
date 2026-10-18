"""Modelleri sitenin tarayıcıda kullanacağı JSON dosyalarına aktarır.

Site her modelin olasılığını hesaplamaz; yaş × maaş ızgarasında önceden hesaplanmış
değerleri okur ve arasını doğrusal olarak doldurur (bilinear interpolasyon).
"""

import json
from dataclasses import asdict
from pathlib import Path

import numpy as np
import pandas as pd
from sklearn.model_selection import StratifiedKFold, cross_val_predict

from .models import CANDIDATES, FEATURES, TARGET, Score, build_pipeline

SCHEMA_VERSION = 1

# Verideki aralığın biraz dışına taşan ızgara: yaş 18-60, maaş 15.000-150.000
GRID = {
    "age": {"min": 15.0, "max": 65.0, "steps": 101},
    "salary": {"min": 0.0, "max": 160_000.0, "steps": 101},
}
# Olasılıklar binde bir hassasiyetle tamsayı olarak yazılır (dosya küçük kalır)
SCALE = 1000


def axis(name: str) -> np.ndarray:
    spec = GRID[name]
    return np.linspace(spec["min"], spec["max"], spec["steps"])


def fit_all(df: pd.DataFrame) -> dict:
    """Her adayı bütün veriyle eğitir: {ad: pipeline}."""
    return {c.name: build_pipeline(c, FEATURES).fit(df[FEATURES], df[TARGET]) for c in CANDIDATES}


def probability_grid(model) -> list[int]:
    """Izgaradaki her nokta için "alır" olasılığı; satır = yaş, sütun = maaş (satır satır düz liste)."""
    ages, salaries = np.meshgrid(axis("age"), axis("salary"), indexing="ij")
    points = pd.DataFrame({"age": ages.ravel(), "salary": salaries.ravel()})
    probabilities = model.predict_proba(points[FEATURES])[:, 1]
    return [int(v) for v in np.rint(probabilities * SCALE)]


def interpolate(values: list[int], age: float, salary: float) -> float:
    """Izgaradan olasılık okur; web/src/predict.js aynı hesabı yapar."""
    def position(name, value):
        spec = GRID[name]
        # Izgara dışındaki değerler kenara yapışır; site bunu ayrıca uyarı olarak gösterir
        t = (min(max(value, spec["min"]), spec["max"]) - spec["min"]) / (spec["max"] - spec["min"])
        exact = t * (spec["steps"] - 1)
        low = min(int(exact), spec["steps"] - 2)
        return low, exact - low

    i, fi = position("age", age)
    j, fj = position("salary", salary)
    n = GRID["salary"]["steps"]
    at = lambda a, b: values[a * n + b] / SCALE  # noqa: E731
    top = at(i, j) * (1 - fj) + at(i, j + 1) * fj
    bottom = at(i + 1, j) * (1 - fj) + at(i + 1, j + 1) * fj
    return top * (1 - fi) + bottom * fi


def out_of_fold(df: pd.DataFrame, seed: int = 0) -> dict:
    """Her kişi için, onu eğitimde görmemiş modelin verdiği olasılık (eşik ekranı için)."""
    cv = StratifiedKFold(n_splits=10, shuffle=True, random_state=seed)
    result = {}
    for candidate in CANDIDATES:
        probabilities = cross_val_predict(
            build_pipeline(candidate, FEATURES), df[FEATURES], df[TARGET], cv=cv, method="predict_proba"
        )[:, 1]
        result[candidate.name] = [round(float(p), 3) for p in probabilities]
    return result


def grid_document(models: dict) -> dict:
    return {
        "schema": SCHEMA_VERSION,
        "scale": SCALE,
        "grid": GRID,
        "models": {name: probability_grid(model) for name, model in models.items()},
    }


def data_document(df: pd.DataFrame, oof: dict) -> dict:
    points = df[["age", "salary", TARGET]].to_numpy().tolist()
    return {
        "schema": SCHEMA_VERSION,
        "dataset": "Social Network Ads (teaching dataset)",
        "points": [[int(a), int(s), int(y)] for a, s, y in points],
        "oof": oof,
    }


def metrics_document(
    scores: list[Score], with_gender: list[Score], chosen: Score, reason: str, cv: dict, df: pd.DataFrame
) -> dict:
    return {
        "schema": SCHEMA_VERSION,
        "dataset": {
            "name": "Social Network Ads (teaching dataset)",
            "rows": len(df),
            "positives": int(df[TARGET].sum()),
            "range": {f: [float(df[f].min()), float(df[f].max())] for f in FEATURES},
        },
        "cv": cv,
        "selected": chosen.name,
        "reason": reason,
        "models": [asdict(s) for s in scores],
        "with_gender": [asdict(s) for s in with_gender],
    }


def write_json(path: Path, data: dict, compact: bool = False) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    if compact:
        text = json.dumps(data, ensure_ascii=False, separators=(",", ":"))
    else:
        text = json.dumps(data, indent=2, ensure_ascii=False)
    path.write_text(text + "\n", encoding="utf-8", newline="\n")
