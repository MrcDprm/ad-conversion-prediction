import json

import pytest

from adconv.train import main


def test_pipeline_writes_all_files(tmp_path, capsys):
    assert main(["--out", str(tmp_path), "--repeats", "1"]) == 0

    metrics = json.loads((tmp_path / "metrics.json").read_text(encoding="utf-8"))
    grid = json.loads((tmp_path / "grid.json").read_text(encoding="utf-8"))
    data = json.loads((tmp_path / "data.json").read_text(encoding="utf-8"))
    assert metrics["selected"] in grid["models"]
    assert len(metrics["models"]) == len(metrics["with_gender"]) == 6
    assert metrics["dataset"]["positives"] == 143
    assert set(data["oof"]) == set(grid["models"])

    output = capsys.readouterr().out
    assert "Selected:" in output
    assert "With gender" in output


def test_invalid_data_returns_error(tmp_path, capsys):
    bad = tmp_path / "bad.csv"
    bad.write_text("a,b\n1,2\n", encoding="utf-8")
    assert main(["--data", str(bad), "--out", str(tmp_path)]) == 1
    assert "Missing columns" in capsys.readouterr().err
    assert not (tmp_path / "metrics.json").exists()


def test_repeats_must_be_positive(tmp_path):
    with pytest.raises(SystemExit):
        main(["--out", str(tmp_path), "--repeats", "0"])
