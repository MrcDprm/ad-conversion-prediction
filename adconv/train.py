"""Bütün eğitim hattını çalıştırır: yükle → karşılaştır → seç → dışa aktar.

Kullanım: python -m adconv.train [--data CSV] [--out KLASÖR] [--repeats N]
"""

import argparse
import sys
from pathlib import Path

from . import __version__
from .data import DATA_PATH, DataValidationError, load_dataset
from .export import data_document, fit_all, grid_document, metrics_document, out_of_fold, write_json
from .models import FEATURES_WITH_GENDER, Score, compare_models, select_model

WEB_DIR = Path(__file__).resolve().parent.parent / "web"
N_SPLITS = 10
SEED = 0


def format_table(scores: list[Score], chosen: Score) -> str:
    lines = [f"{'Model':<42} {'ROC AUC':>14} {'F1':>7} {'Prec.':>7} {'Recall':>7} {'Acc.':>7}"]
    for s in scores:
        mark = " *" if s.name == chosen.name else ""
        lines.append(
            f"{s.label + mark:<42} {s.roc_auc:>7.3f} ± {s.roc_auc_std:.3f} "
            f"{s.f1:>7.3f} {s.precision:>7.3f} {s.recall:>7.3f} {s.accuracy:>7.3f}"
        )
    return "\n".join(lines)


def run(data_path: Path, out_dir: Path, repeats: int) -> None:
    df = load_dataset(data_path)
    print(f"adconv {__version__}: {len(df)} rows, stratified {N_SPLITS}-fold CV × {repeats}")

    options = {"n_splits": N_SPLITS, "n_repeats": repeats, "seed": SEED}
    scores = compare_models(df, **options)
    with_gender = compare_models(df, FEATURES_WITH_GENDER, **options)
    chosen, reason = select_model(scores)
    cv = {"method": "RepeatedStratifiedKFold", **options}

    write_json(out_dir / "metrics.json", metrics_document(scores, with_gender, chosen, reason, cv, df))
    write_json(out_dir / "grid.json", grid_document(fit_all(df)), compact=True)
    write_json(out_dir / "data.json", data_document(df, out_of_fold(df, SEED)), compact=True)

    print()
    print(format_table(scores, chosen))
    print("\nWith gender (comparison only):")
    print(format_table(with_gender, chosen))
    print(f"\nSelected: {reason}")
    print(f"Wrote metrics.json, grid.json and data.json to {out_dir}")


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="Train, compare and export the ad conversion models.")
    parser.add_argument("--data", type=Path, default=DATA_PATH, help="dataset CSV file")
    parser.add_argument("--out", type=Path, default=WEB_DIR, help="output folder for the JSON files")
    parser.add_argument("--repeats", type=int, default=5, help="cross-validation repeats (default 5)")
    args = parser.parse_args(argv)

    if args.repeats < 1:
        parser.error("--repeats must be at least 1")
    try:
        run(args.data, args.out, args.repeats)
    except DataValidationError as error:
        print(f"Error: {error}", file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
