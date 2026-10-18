import json

import pandas as pd
import pytest

from adconv.data import load_dataset
from adconv.export import (
    GRID,
    SCALE,
    axis,
    data_document,
    fit_all,
    grid_document,
    interpolate,
    out_of_fold,
    write_json,
)
from adconv.models import CANDIDATES, FEATURES


@pytest.fixture(scope="module")
def df():
    return load_dataset()


@pytest.fixture(scope="module")
def models(df):
    return fit_all(df)


@pytest.fixture(scope="module")
def grid(models):
    return grid_document(models)


def test_grid_has_every_model_and_full_size(grid):
    cells = GRID["age"]["steps"] * GRID["salary"]["steps"]
    assert set(grid["models"]) == {c.name for c in CANDIDATES}
    for values in grid["models"].values():
        assert len(values) == cells
        assert all(0 <= v <= SCALE for v in values)


def test_grid_corners_follow_row_age_column_salary_order(grid, models):
    values = grid["models"]["logistic"]
    n = GRID["salary"]["steps"]
    young_poor = pd.DataFrame({"age": [axis("age")[0]], "salary": [axis("salary")[0]]})
    old_rich = pd.DataFrame({"age": [axis("age")[-1]], "salary": [axis("salary")[-1]]})
    model = models["logistic"]
    assert values[0] == round(model.predict_proba(young_poor[FEATURES])[0, 1] * SCALE)
    assert values[-1] == round(model.predict_proba(old_rich[FEATURES])[0, 1] * SCALE)
    assert values[n - 1] != values[-n]  # bir satır = bir yaş


@pytest.mark.parametrize("name", [c.name for c in CANDIDATES if c.name != "random_forest"])
def test_interpolation_is_close_to_the_model(grid, models, name):
    # Düzgün yüzeyli modellerde ızgaradan okunan değer gerçeğe çok yakın
    for age, salary in [(30, 50_000), (45, 90_000), (52.3, 33_333), (27, 140_000)]:
        exact = models[name].predict_proba(pd.DataFrame({"age": [age], "salary": [salary]}))[0, 1]
        assert interpolate(grid["models"][name], age, salary) == pytest.approx(exact, abs=0.03)


def test_interpolation_hits_grid_points_exactly(grid):
    values = grid["models"]["logistic_poly"]
    n = GRID["salary"]["steps"]
    age, salary = axis("age")[40], axis("salary")[70]
    assert interpolate(values, age, salary) == values[40 * n + 70] / SCALE


def test_values_outside_the_grid_stick_to_the_edge(grid):
    values = grid["models"]["logistic"]
    assert interpolate(values, 200, 1e9) == interpolate(values, 65, 160_000)


def test_out_of_fold_probabilities_cover_everyone(df):
    oof = out_of_fold(df)
    assert set(oof) == {c.name for c in CANDIDATES}
    assert all(len(v) == len(df) and all(0 <= p <= 1 for p in v) for v in oof.values())


def test_data_document_keeps_only_age_salary_and_target(df):
    doc = data_document(df, {"logistic": [0.5] * len(df)})
    assert len(doc["points"]) == 400
    assert all(len(p) == 3 for p in doc["points"])


def test_compact_json_round_trip(tmp_path, grid):
    path = tmp_path / "out" / "grid.json"
    write_json(path, grid, compact=True)
    text = path.read_text(encoding="utf-8")
    assert "\n" not in text.rstrip("\n")
    assert json.loads(text) == grid
