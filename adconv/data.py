"""Reklam veri setini okur, doğrular ve okunur sütun adlarına çevirir."""

from pathlib import Path

import pandas as pd

DATA_PATH = Path(__file__).resolve().parent.parent / "data" / "social-network-ads.csv"

# Ham dosyadaki sütun adı -> kodda kullanılan ad. "User ID" bilgi taşımadığı için alınmaz.
RAW_COLUMNS = {
    "Gender": "gender",
    "Age": "age",
    "EstimatedSalary": "salary",
    "Purchased": "purchased",
}

GENDERS = {"Male": "male", "Female": "female"}

# Fiziksel olarak makul aralıklar; dışındaki değer büyük ihtimalle veri hatasıdır
VALID_RANGES = {
    "age": (15, 100),
    "salary": (0, 1_000_000),
}


class DataValidationError(ValueError):
    """Veri dosyası beklenen biçimde değilse fırlatılır."""


def _rows(mask: pd.Series) -> str:
    # Hata mesajında dosyadaki satır numarasını göster (başlık 1. satır)
    numbers = [str(i + 2) for i in mask[mask].index[:5]]
    more = " ..." if mask.sum() > 5 else ""
    return ", ".join(numbers) + more


def validate(raw: pd.DataFrame) -> pd.DataFrame:
    """Ham tabloyu doğrular ve temiz bir kopya döndürür."""
    missing = [c for c in RAW_COLUMNS if c not in raw.columns]
    if missing:
        raise DataValidationError(f"Missing columns: {', '.join(missing)}")

    df = raw[list(RAW_COLUMNS)].rename(columns=RAW_COLUMNS)
    if df.empty:
        raise DataValidationError("Dataset is empty")

    gender = df["gender"].astype("string").str.strip()
    bad = ~gender.isin(GENDERS.keys())
    if bad.any():
        raise DataValidationError(f"Column 'gender' has unknown values (rows {_rows(bad)})")
    df["gender"] = gender.map(GENDERS).astype(str)

    for column in ("age", "salary", "purchased"):
        values = pd.to_numeric(df[column], errors="coerce")
        bad = values.isna()
        if bad.any():
            raise DataValidationError(
                f"Column '{column}' has missing or non-numeric values (rows {_rows(bad)})"
            )
        df[column] = values

    bad = ~df["purchased"].isin([0, 1])
    if bad.any():
        raise DataValidationError(f"Column 'purchased' must be 0 or 1 (rows {_rows(bad)})")
    df["purchased"] = df["purchased"].astype(int)

    for column, (low, high) in VALID_RANGES.items():
        bad = ~df[column].between(low, high)
        if bad.any():
            raise DataValidationError(
                f"Column '{column}' is outside {low:g}-{high:g} (rows {_rows(bad)})"
            )
        df[column] = df[column].astype(float)

    # Her iki sınıf da olmalı; yoksa sınıflandırma anlamsız
    if df["purchased"].nunique() < 2:
        raise DataValidationError("Column 'purchased' needs both 0 and 1")

    return df.reset_index(drop=True)


def load_dataset(path: Path = DATA_PATH) -> pd.DataFrame:
    """CSV dosyasını okuyup doğrulanmış tabloyu döndürür."""
    try:
        raw = pd.read_csv(path)
    except FileNotFoundError:
        raise DataValidationError(f"Dataset not found: {path}") from None
    except pd.errors.EmptyDataError:
        raise DataValidationError("Dataset is empty") from None
    return validate(raw)
