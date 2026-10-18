// Hesaplayıcı: girdiyi doğrular, olasılığı haritadan okur, eşik panelini günceller.
import { formatNumber, getLang, t } from "./i18n.js";
import { createMap, drawRoc } from "./map.js";
import { confusionAt, rocCurve } from "./metrics.js";
import { $, initPage, loadJson } from "./page.js";
import { HARD_LIMITS, interpolate, outsideData, parseAge, parseSalary } from "./predict.js";

const ERROR_KEYS = { empty: "errEmpty", notNumber: "errNotNumber", tooSmall: "errTooSmall", tooLarge: "errTooLarge" };
// Türkçede yüzde işareti önde (%73), İngilizcede sonda (73%)
const percent = (v) => (getLang() === "en" ? `${formatNumber(v * 100)}%` : `%${formatNumber(v * 100)}`);

async function main() {
  initPage();

  let grid, data, metrics;
  try {
    [grid, data, metrics] = await Promise.all(["grid.json", "data.json", "metrics.json"].map(loadJson));
  } catch {
    $("age-error").textContent = t("loadError");
    return;
  }

  const labels = data.points.map((p) => p[2]);
  const order = metrics.models.filter((m) => m.name !== "baseline").map((m) => m.name);
  const state = { model: metrics.selected, threshold: 0.5, you: null };
  const range = metrics.dataset.range;

  const map = createMap($("map"), {
    grid,
    points: data.points,
    format: (v) => formatNumber(v),
    labels: () => ({ age: t("axisAge"), salary: t("axisSalary") }),
  });

  // Model seçici: seçilen model önce, sonra basitlik sırası
  const picker = $("model-picker");
  for (const name of [metrics.selected, ...order.filter((n) => n !== metrics.selected)]) {
    const id = `model-${name}`;
    const input = Object.assign(document.createElement("input"), { type: "radio", name: "model", id, value: name, checked: name === state.model });
    const label = Object.assign(document.createElement("label"), { htmlFor: id, textContent: t(`model_${name}`) });
    picker.append(input, label);
  }
  picker.addEventListener("change", (event) => {
    state.model = event.target.value;
    map.setModel(state.model);
    refresh();
  });

  const chosen = metrics.models.find((m) => m.name === metrics.selected);
  $("how1").textContent = t("how1", { chosen: t(`model_${metrics.selected}`), auc: formatNumber(chosen.roc_auc, 3) });

  function readInputs() {
    const age = parseAge($("age").value);
    const salary = parseSalary($("salary").value);
    for (const [field, result] of [["age", age], ["salary", salary]]) {
      const limits = HARD_LIMITS[field];
      $(`${field}-error`).textContent = result.error
        ? t(ERROR_KEYS[result.error], { min: formatNumber(limits.min), max: formatNumber(limits.max) })
        : "";
      $(field).toggleAttribute("aria-invalid", Boolean(result.error));
    }
    return age.error || salary.error ? null : { age: age.value, salary: salary.value };
  }

  function refresh() {
    state.you = readInputs();
    map.setYou(state.you);
    const warning = $("result-warning");
    if (state.you) {
      const p = interpolate(grid, grid.models[state.model], state.you.age, state.you.salary);
      // Yuvarlanınca %0 ya da %100 kesinlik gibi okunur; model asla bu kadar emin değil
      $("result-value").textContent = p < 0.005 ? t("below1") : p > 0.995 ? t("above99") : percent(p);
      $("result-decision").textContent = t(p >= state.threshold ? "decisionShow" : "decisionSkip");
      warning.textContent = t("outsideData", {
        ageMin: formatNumber(range.age[0]),
        ageMax: formatNumber(range.age[1]),
        salaryMin: formatNumber(range.salary[0]),
        salaryMax: formatNumber(range.salary[1]),
      });
      warning.hidden = !outsideData(range, state.you.age, state.you.salary);
    } else {
      $("result-value").textContent = "–";
      $("result-decision").textContent = "";
      warning.hidden = true;
    }

    // Eşik paneli: seçili modelin katlama dışı tahminleri
    const oof = data.oof[state.model];
    const c = confusionAt(oof, labels, state.threshold);
    for (const key of ["tp", "fp", "fn", "tn"]) $(`cell-${key}`).textContent = formatNumber(c[key]);
    $("stat-precision").textContent = percent(c.precision);
    $("stat-recall").textContent = percent(c.recall);
    $("stat-f1").textContent = formatNumber(c.f1, 2);
    $("summary").textContent = t("summary", { shown: formatNumber(c.tp + c.fp), bought: formatNumber(c.tp), missed: formatNumber(c.fn) });
    $("threshold-value").textContent = percent(state.threshold);

    const roc = rocCurve(oof, labels);
    const negatives = c.fp + c.tn;
    const positives = c.tp + c.fn;
    $("roc-auc").textContent = `(${t("rocAuc", { auc: formatNumber(roc.auc, 3) })})`;
    drawRoc($("roc"), {
      curves: [roc],
      point: [c.fp / negatives, c.tp / positives],
      labels: { x: t("rocX"), y: t("rocY") },
      format: (v) => formatNumber(v, 1),
    });
  }

  map.setModel(state.model);
  $("age").addEventListener("input", refresh);
  $("salary").addEventListener("input", refresh);
  $("threshold").addEventListener("input", (event) => {
    state.threshold = Number(event.target.value);
    map.setThreshold(state.threshold);
    refresh();
  });
  refresh();
}

main();
