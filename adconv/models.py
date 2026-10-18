"""Aday sınıflandırıcıları tanımlar ve tekrarlı çapraz doğrulamayla karşılaştırır."""

import math
from collections.abc import Callable
from dataclasses import dataclass

import pandas as pd
from sklearn.calibration import CalibratedClassifierCV
from sklearn.compose import ColumnTransformer
from sklearn.dummy import DummyClassifier
from sklearn.ensemble import RandomForestClassifier
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import make_scorer, precision_score
from sklearn.model_selection import GridSearchCV, RepeatedStratifiedKFold, StratifiedKFold, cross_validate
from sklearn.neighbors import KNeighborsClassifier
from sklearn.pipeline import Pipeline, make_pipeline
from sklearn.preprocessing import OneHotEncoder, PolynomialFeatures, StandardScaler
from sklearn.svm import SVC

TARGET = "purchased"
FEATURES = ["age", "salary"]
# Sadece karşılaştırma için: cinsiyet modele katkı veriyor mu?
FEATURES_WITH_GENDER = ["age", "salary", "gender"]

METRICS = ("roc_auc", "f1", "precision", "recall", "accuracy")
# Referans model hiç "alır" demediği için kesinliği tanımsızdır; uyarı yerine 0 sayılır
SCORING = {m: m for m in METRICS} | {"precision": make_scorer(precision_score, zero_division=0)}


def _prepare(features: list[str]) -> ColumnTransformer:
    # Sayılar ölçeklenir; cinsiyet varsa 0/1 sütununa çevrilir (drop="first")
    parts = [("num", StandardScaler(), [f for f in features if f != "gender"])]
    if "gender" in features:
        parts.append(("cat", OneHotEncoder(drop="first"), ["gender"]))
    return ColumnTransformer(parts)


def _knn() -> GridSearchCV:
    # k, her eğitim parçasının içinde ayrıca seçilir (iç içe doğrulama): test parçası seçime karışmaz
    return GridSearchCV(
        KNeighborsClassifier(),
        {"n_neighbors": [5, 11, 15, 21, 31]},
        cv=StratifiedKFold(5, shuffle=True, random_state=0),
        scoring="roc_auc",
    )


@dataclass(frozen=True)
class Candidate:
    name: str
    label: str
    build: Callable[[], object]  # ön işleme hariç model


# Sıra = basitlik sırası; skorlar yakınsa listede önce gelen seçilir
CANDIDATES = [
    Candidate("logistic", "Logistic regression", lambda: LogisticRegression(max_iter=1000)),
    Candidate(
        "logistic_poly",
        "Logistic regression, degree 2 features",
        lambda: make_pipeline(PolynomialFeatures(2), LogisticRegression(max_iter=1000)),
    ),
    Candidate("knn", "K-nearest neighbours (k tuned)", _knn),
    # SVC olasılık vermez; kalibrasyon katmanı skorlarını olasılığa çevirir (harita ve eşik için gerekli)
    Candidate("svm_rbf", "SVM, RBF kernel", lambda: CalibratedClassifierCV(SVC(), ensemble=False)),
    Candidate(
        "random_forest",
        "Random Forest",
        lambda: RandomForestClassifier(n_estimators=300, min_samples_leaf=5, random_state=0),
    ),
]

# Karşılaştırma için referans: herkese "almaz" der
BASELINE = Candidate("baseline", "Baseline (always 'does not buy')", lambda: DummyClassifier(strategy="most_frequent"))


def build_pipeline(candidate: Candidate, features: list[str]) -> Pipeline:
    return Pipeline([("prepare", _prepare(features)), ("model", candidate.build())])


@dataclass(frozen=True)
class Score:
    name: str
    label: str
    roc_auc: float
    roc_auc_std: float
    f1: float
    f1_std: float
    precision: float
    precision_std: float
    recall: float
    recall_std: float
    accuracy: float
    accuracy_std: float
    folds: int


def evaluate(candidate: Candidate, df: pd.DataFrame, cv, features: list[str] = FEATURES) -> Score:
    result = cross_validate(
        build_pipeline(candidate, features), df[features], df[TARGET], cv=cv, scoring=SCORING, n_jobs=-1
    )
    values = {}
    for metric in METRICS:
        scores = result[f"test_{metric}"]
        values[metric] = float(scores.mean())
        values[f"{metric}_std"] = float(scores.std())
    return Score(candidate.name, candidate.label, folds=len(result["test_roc_auc"]), **values)


def make_cv(n_splits: int = 10, n_repeats: int = 5, seed: int = 0) -> RepeatedStratifiedKFold:
    # Stratified: her parçada alanların oranı (%36) korunur; aynı seed = her model aynı bölmeler
    return RepeatedStratifiedKFold(n_splits=n_splits, n_repeats=n_repeats, random_state=seed)


def compare_models(df: pd.DataFrame, features: list[str] = FEATURES, **cv_options) -> list[Score]:
    """Bütün adayları (ve referans modeli) aynı bölmelerle değerlendirir."""
    cv = make_cv(**cv_options)
    return [evaluate(c, df, cv, features) for c in [*CANDIDATES, BASELINE]]


def select_model(scores: list[Score]) -> tuple[Score, str]:
    """Bir standart hata kuralı (ROC AUC): en iyiye yeterince yakın olan en basit modeli seçer."""
    ranked = [s for s in scores if s.name != BASELINE.name]
    best = max(ranked, key=lambda s: s.roc_auc)
    threshold = best.roc_auc - best.roc_auc_std / math.sqrt(best.folds)
    # ranked basitlik sırasında olduğu için eşiği geçen ilk model en basitidir
    chosen = next(s for s in ranked if s.roc_auc >= threshold)
    if chosen is best:
        reason = f"{chosen.label} has the highest cross-validated ROC AUC ({chosen.roc_auc:.3f})."
    else:
        reason = (
            f"{chosen.label} is within one standard error of the best model "
            f"({best.label}, ROC AUC {best.roc_auc:.3f} vs {chosen.roc_auc:.3f}) and is simpler."
        )
    return chosen, reason
