from adconv.fixtures import FIXTURES_PATH, build_fixtures, read
import json


def test_fixtures_are_up_to_date():
    # Model yeniden eğitilip fixtures.json güncellenmezse JS testleri eski değerlerle çalışır
    saved = json.loads(FIXTURES_PATH.read_text(encoding="utf-8"))
    assert saved == build_fixtures(read("grid.json"), read("data.json")), "Run: python -m adconv.fixtures"
