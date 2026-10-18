// Model sayfası: karşılaştırma tablosu, seçim gerekçesi, ROC eğrileri, cinsiyet tablosu ve model kartı.
import { formatNumber, t } from "./i18n.js";
import { drawRoc } from "./map.js";
import { rocCurve } from "./metrics.js";
import { $, initPage, loadJson } from "./page.js";

const BASELINE = "baseline";
const name = (key) => t(`model_${key}`);

function row(cells, className) {
  const tr = document.createElement("tr");
  if (className) tr.className = className;
  cells.forEach(([text, cls], i) => {
    const cell = document.createElement(i === 0 ? "th" : "td");
    if (i === 0) cell.scope = "row";
    if (cls) cell.className = cls;
    if (text instanceof Node) cell.append(text);
    else cell.textContent = text;
    tr.append(cell);
  });
  return tr;
}

function nameCell(m, selected) {
  const fragment = document.createDocumentFragment();
  fragment.append(name(m.name));
  if (m.name === selected) {
    const tag = Object.assign(document.createElement("span"), { className: "tag", textContent: t("selectedTag") });
    fragment.append(" ", tag);
  }
  return fragment;
}

function fillResults(metrics) {
  const rows = metrics.models.map((m) =>
    row(
      [
        [nameCell(m, metrics.selected)],
        [`${formatNumber(m.roc_auc, 3)} ± ${formatNumber(m.roc_auc_std, 3)}`, "num"],
        [formatNumber(m.f1, 3), "num"],
        [formatNumber(m.precision, 3), "num wide"],
        [formatNumber(m.recall, 3), "num wide"],
        [formatNumber(m.accuracy, 3), "num"],
      ],
      m.name === metrics.selected ? "selected" : m.name === BASELINE ? "baseline" : "",
    ),
  );
  $("results-body").replaceChildren(...rows);
}

function fillTexts(metrics) {
  const candidates = metrics.models.filter((m) => m.name !== BASELINE);
  const best = candidates.reduce((a, b) => (b.roc_auc > a.roc_auc ? b : a));
  const chosen = metrics.models.find((m) => m.name === metrics.selected);
  $("reason").textContent =
    best.name === chosen.name
      ? t("reasonBest", { chosen: name(chosen.name), auc: formatNumber(chosen.roc_auc, 3) })
      : t("reasonSimpler", {
          best: name(best.name),
          bestAuc: formatNumber(best.roc_auc, 3),
          chosen: name(chosen.name),
          auc: formatNumber(chosen.roc_auc, 3),
        });
  const baseline = metrics.models.find((m) => m.name === BASELINE);
  $("accuracy-text").textContent = t("accuracyText", { baseline: formatNumber(baseline.accuracy * 100) });

  const withGender = new Map(metrics.with_gender.map((m) => [m.name, m]));
  $("gender-body").replaceChildren(
    ...candidates.map((m) => {
      const other = withGender.get(m.name);
      // Üç basamakta sıfırsa işaretsiz "0,000" (−0,000 kafa karıştırır)
      const diff = Math.round((other.roc_auc - m.roc_auc) * 1000) / 1000;
      return row([
        [name(m.name)],
        [formatNumber(m.roc_auc, 3), "num"],
        [formatNumber(other.roc_auc, 3), "num"],
        [`${diff > 0 ? "+" : diff < 0 ? "−" : ""}${formatNumber(Math.abs(diff), 3)}`, "num"],
      ]);
    }),
  );

  const range = metrics.dataset.range;
  const entries = [
    ["cardUseTerm", t("cardUse")],
    ["cardDataTerm", t("cardData")],
    ["cardMethodTerm", t("cardMethod")],
    ["cardPerfTerm", t("cardPerf", { auc: formatNumber(chosen.roc_auc, 3), f1: formatNumber(chosen.f1, 3), accuracy: formatNumber(chosen.accuracy, 3) })],
    [
      "cardLimitsTerm",
      t("cardLimits", {
        ageMin: formatNumber(range.age[0]),
        ageMax: formatNumber(range.age[1]),
        salaryMin: formatNumber(range.salary[0]),
        salaryMax: formatNumber(range.salary[1]),
      }),
    ],
  ];
  $("model-card").replaceChildren(
    ...entries.flatMap(([term, text]) => [
      Object.assign(document.createElement("dt"), { textContent: t(term) }),
      Object.assign(document.createElement("dd"), { textContent: text }),
    ]),
  );
}

function fillRoc(metrics, data) {
  const labels = data.points.map((p) => p[2]);
  const order = metrics.models.filter((m) => m.name !== BASELINE).map((m) => m.name);
  const curves = order.map((key, i) => ({ ...rocCurve(data.oof[key], labels), key, className: key === metrics.selected ? "roc-selected" : `roc-other roc-${i}` }));
  drawRoc($("roc-all"), {
    curves: [...curves.filter((c) => c.key !== metrics.selected), ...curves.filter((c) => c.key === metrics.selected)],
    labels: { x: t("rocX"), y: t("rocY") },
    format: (v) => formatNumber(v, 1),
  });
  $("roc-legend").replaceChildren(
    ...curves.map((c) => {
      const li = document.createElement("li");
      li.className = c.className;
      li.append(Object.assign(document.createElement("span"), { className: "swatch", ariaHidden: "true" }), `${name(c.key)} (${formatNumber(c.auc, 3)})`);
      return li;
    }),
  );
}

async function main() {
  initPage();
  let metrics, data;
  try {
    [metrics, data] = await Promise.all(["metrics.json", "data.json"].map(loadJson));
  } catch {
    $("load-error").textContent = t("loadError");
    return;
  }
  fillResults(metrics);
  fillTexts(metrics);
  fillRoc(metrics, data);
}

main();
