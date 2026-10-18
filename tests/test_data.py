import pandas as pd
import pytest

from adconv.data import DataValidationError, load_dataset, validate

HEADER = "User ID,Gender,Age,EstimatedSalary,Purchased\n"


def write_csv(tmp_path, body):
    path = tmp_path / "data.csv"
    path.write_text(HEADER + body, encoding="utf-8")
    return path


def test_real_dataset_loads():
    df = load_dataset()
    assert len(df) == 400
    assert list(df.columns) == ["gender", "age", "salary", "purchased"]
    assert set(df["gender"]) == {"male", "female"}
    assert df["purchased"].sum() == 143


def test_values_are_converted(tmp_path):
    df = load_dataset(write_csv(tmp_path, "1,Male,19,19000,0\n2, Female ,35,80000,1\n"))
    assert df["gender"].tolist() == ["male", "female"]
    assert df["age"].dtype == float
    assert df["purchased"].tolist() == [0, 1]


def test_user_id_is_not_kept(tmp_path):
    df = load_dataset(write_csv(tmp_path, "1,Male,19,19000,0\n2,Female,35,80000,1\n"))
    assert "User ID" not in df.columns


def test_missing_column_is_rejected():
    raw = pd.DataFrame({"Gender": ["Male"], "Age": [30], "EstimatedSalary": [50000]})
    with pytest.raises(DataValidationError, match="Missing columns: Purchased"):
        validate(raw)


def test_unknown_gender_reports_row(tmp_path):
    with pytest.raises(DataValidationError, match=r"gender.*rows 3"):
        load_dataset(write_csv(tmp_path, "1,Male,19,19000,0\n2,X,35,80000,1\n"))


def test_non_numeric_value_is_rejected(tmp_path):
    with pytest.raises(DataValidationError, match="salary"):
        load_dataset(write_csv(tmp_path, "1,Male,19,abc,0\n2,Female,35,80000,1\n"))


def test_target_must_be_zero_or_one(tmp_path):
    with pytest.raises(DataValidationError, match="0 or 1"):
        load_dataset(write_csv(tmp_path, "1,Male,19,19000,2\n2,Female,35,80000,1\n"))


def test_both_classes_are_needed(tmp_path):
    with pytest.raises(DataValidationError, match="both 0 and 1"):
        load_dataset(write_csv(tmp_path, "1,Male,19,19000,0\n2,Female,35,80000,0\n"))


@pytest.mark.parametrize("row", ["1,Male,5,19000,0\n", "1,Male,30,-5,0\n"])
def test_out_of_range_value_is_rejected(tmp_path, row):
    with pytest.raises(DataValidationError, match="outside"):
        load_dataset(write_csv(tmp_path, row + "2,Female,35,80000,1\n"))


def test_empty_and_missing_files(tmp_path):
    empty = tmp_path / "empty.csv"
    empty.write_text("", encoding="utf-8")
    with pytest.raises(DataValidationError, match="empty"):
        load_dataset(empty)
    with pytest.raises(DataValidationError, match="empty"):
        load_dataset(write_csv(tmp_path, ""))
    with pytest.raises(DataValidationError, match="not found"):
        load_dataset(tmp_path / "nope.csv")
