import pytest
from sklearn.model_selection import StratifiedKFold

from adconv.data import load_dataset
from adconv.models import (
    BASELINE,
    CANDIDATES,
    FEATURES_WITH_GENDER,
    Score,
    compare_models,
    evaluate,
    select_model,
)


@pytest.fixture(scope="module")
def df():
    return load_dataset()


@pytest.fixture(scope="module")
def scores(df):
    return compare_models(df, n_splits=5, n_repeats=1)


def make_score(name, auc, auc_std=0.04, folds=50):
    return Score(name, name, auc, auc_std, 0, 0, 0, 0, 0, 0, 0, 0, folds)


def test_every_candidate_and_baseline_is_scored(scores):
    assert [s.name for s in scores] == [c.name for c in CANDIDATES] + [BASELINE.name]
    assert all(s.folds == 5 for s in scores)


def test_every_candidate_beats_the_baseline(scores):
    baseline = scores[-1]
    assert baseline.roc_auc == pytest.approx(0.5)
    assert baseline.f1 == 0
    for score in scores[:-1]:
        assert score.roc_auc > 0.85
        assert score.f1 > baseline.f1


def test_baseline_accuracy_shows_why_accuracy_misleads(scores):
    # Hiç kimseyi tahmin etmeyen model bile %64 doğru
    assert scores[-1].accuracy == pytest.approx(257 / 400, abs=0.01)


def test_gender_can_be_added_for_the_comparison(df):
    cv = StratifiedKFold(5, shuffle=True, random_state=0)
    score = evaluate(CANDIDATES[0], df, cv, FEATURES_WITH_GENDER)
    assert score.roc_auc > 0.85


def test_evaluation_is_reproducible(df):
    cv = StratifiedKFold(5, shuffle=True, random_state=1)
    assert evaluate(CANDIDATES[1], df, cv) == evaluate(CANDIDATES[1], df, cv)


def test_simpler_model_wins_when_close():
    # Eşik: 0.95 - 0.04 / sqrt(50) ≈ 0.944
    chosen, reason = select_model([make_score("logistic", 0.945), make_score("svm_rbf", 0.95)])
    assert chosen.name == "logistic"
    assert "simpler" in reason


def test_best_model_wins_when_clearly_better():
    chosen, reason = select_model([make_score("logistic", 0.90), make_score("svm_rbf", 0.95)])
    assert chosen.name == "svm_rbf"
    assert "highest" in reason


def test_baseline_is_never_selected():
    chosen, _ = select_model([make_score("logistic", 0.90), make_score(BASELINE.name, 0.99)])
    assert chosen.name == "logistic"
