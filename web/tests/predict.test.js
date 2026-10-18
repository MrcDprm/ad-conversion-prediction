import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import { confusionAt, rocCurve } from "../src/metrics.js";
import { interpolate, outsideData, parseAge, parseSalary } from "../src/predict.js";

const read = (name) => JSON.parse(readFileSync(new URL(name, import.meta.url), "utf8"));
const grid = read("../grid.json");
const data = read("../data.json");
const metrics = read("../metrics.json");
const fixtures = read("./fixtures.json");
const labels = data.points.map((p) => p[2]);

const close = (a, b, eps = 1e-9) => Math.abs(a - b) < eps;

for (const [name, expected] of Object.entries(fixtures.models)) {
  test(`${name}: grid reading matches Python`, () => {
    for (const [age, salary, p] of expected.predictions) {
      assert.ok(close(interpolate(grid, grid.models[name], age, salary), p), `${age}, ${salary}`);
    }
  });

  test(`${name}: confusion matrix and AUC match scikit-learn`, () => {
    for (const [threshold, tn, fp, fn, tp] of expected.confusion) {
      const c = confusionAt(data.oof[name], labels, threshold);
      assert.deepEqual([c.tn, c.fp, c.fn, c.tp], [tn, fp, fn, tp], `threshold ${threshold}`);
    }
    assert.ok(close(rocCurve(data.oof[name], labels).auc, expected.auc, 1e-12));
  });
}

test("threshold 0 selects everyone, threshold above 1 selects no one", () => {
  const all = confusionAt(data.oof.logistic, labels, 0);
  assert.equal(all.selected, 1);
  assert.equal(all.recall, 1);
  const none = confusionAt(data.oof.logistic, labels, 1.01);
  assert.equal(none.selected, 0);
  assert.equal(none.precision, 0);
  assert.equal(none.f1, 0);
});

test("ROC curve starts at 0,0 and ends at 1,1", () => {
  const { points } = rocCurve(data.oof.logistic_poly, labels);
  assert.deepEqual(points[0], [0, 0]);
  assert.deepEqual(points.at(-1), [1, 1]);
});

test("values outside the data are flagged", () => {
  const range = metrics.dataset.range;
  assert.equal(outsideData(range, 30, 50000), false);
  assert.equal(outsideData(range, 17, 50000), true);
  assert.equal(outsideData(range, 30, 151000), true);
});

test("age input", () => {
  assert.deepEqual(parseAge(" 35 "), { value: 35 });
  assert.deepEqual(parseAge(""), { error: "empty" });
  for (const text of ["35.5", "abc", "-3", "1e2"]) assert.deepEqual(parseAge(text), { error: "notNumber" }, text);
  assert.deepEqual(parseAge("14"), { error: "tooSmall" });
  assert.deepEqual(parseAge("101"), { error: "tooLarge" });
});

test("salary input with thousands separators", () => {
  for (const text of ["50000", "50.000", "50,000", "50 000", " 50000 "]) {
    assert.deepEqual(parseSalary(text), { value: 50000 }, text);
  }
  assert.deepEqual(parseSalary("1.250.000"), { error: "tooLarge" });
  for (const text of ["50.00", "5,0000", "abc", "-5000", "50000.5"]) {
    assert.deepEqual(parseSalary(text), { error: "notNumber" }, text);
  }
  assert.deepEqual(parseSalary(""), { error: "empty" });
});
