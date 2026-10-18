// Karar haritası: yaş × maaş düzleminde yarım ton noktalar. Noktanın alanı satın alma
// olasılığıyla orantılı; eşiğin üstündekiler pembe (reklam gösterilir), altındakiler mavi.
import { interpolate } from "./predict.js";

const SVG = "http://www.w3.org/2000/svg";
const M = { top: 12, right: 14, bottom: 50, left: 74 };
const COLS = 41;
const ROWS = 33;

export function el(tag, attrs = {}, parent) {
  const node = document.createElementNS(SVG, tag);
  for (const [name, value] of Object.entries(attrs)) node.setAttribute(name, value);
  parent?.append(node);
  return node;
}

export function createMap(svg, { grid, points, format, labels }) {
  const spec = grid.grid;
  let W = 640;
  let H = 480;
  let dots = [];
  let state = { model: null, threshold: 0.5, you: null };
  const layers = {};
  for (const name of ["frame", "dots", "data", "axes", "you"]) layers[name] = el("g", { class: `map-${name}` }, svg);

  const sx = (age) => M.left + ((age - spec.age.min) / (spec.age.max - spec.age.min)) * (W - M.left - M.right);
  const sy = (salary) => H - M.bottom - ((salary - spec.salary.min) / (spec.salary.max - spec.salary.min)) * (H - M.top - M.bottom);

  function layout() {
    W = Math.max(300, Math.round(svg.getBoundingClientRect().width) || 640);
    H = Math.round(Math.min(Math.max(W * 0.72, 300), 520));
    svg.setAttribute("viewBox", `0 0 ${W} ${H}`);
    for (const name of Object.keys(layers)) layers[name].replaceChildren();

    const left = sx(spec.age.min);
    const right = sx(spec.age.max);
    const top = sy(spec.salary.max);
    const bottom = sy(spec.salary.min);
    el("rect", { x: left, y: top, width: right - left, height: bottom - top, class: "plate" }, layers.frame);

    // Yarım ton: düzenli ızgarada noktalar; yarıçap sonra modele göre ayarlanır
    const cell = Math.min((right - left) / COLS, (bottom - top) / ROWS);
    dots = [];
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        const age = spec.age.min + ((c + 0.5) / COLS) * (spec.age.max - spec.age.min);
        const salary = spec.salary.min + ((r + 0.5) / ROWS) * (spec.salary.max - spec.salary.min);
        dots.push({ age, salary, node: el("circle", { cx: sx(age), cy: sy(salary), r: 0 }, layers.dots) });
      }
    }
    dots.maxR = cell * 0.48;

    // Verideki 400 kişi: alanlar pembe halka, almayanlar küçük gri nokta
    for (const [age, salary, bought] of points) {
      el("circle", { cx: sx(age), cy: sy(salary), r: bought ? 3.2 : 1.8, class: bought ? "person bought" : "person" }, layers.data);
    }

    for (let age = 20; age <= 60; age += 10) {
      el("text", { x: sx(age), y: bottom + 18, class: "tick", "text-anchor": "middle" }, layers.axes).textContent = format(age);
    }
    for (let salary = 0; salary <= 160000; salary += 40000) {
      el("text", { x: left - 8, y: sy(salary) + 4, class: "tick", "text-anchor": "end" }, layers.axes).textContent = format(salary);
    }
    el("text", { x: right, y: H - 8, class: "axis-title", "text-anchor": "end" }, layers.axes).textContent = labels().age;
    el("text", { x: -top, y: 16, class: "axis-title", "text-anchor": "end", transform: "rotate(-90)" }, layers.axes).textContent =
      labels().salary;

    state.youGroup = el("g", { class: "you", hidden: "" }, layers.you);
    el("circle", { r: 11, class: "you-ring" }, state.youGroup);
    el("path", { d: "M-17 0H-6M6 0H17M0 -17V-6M0 6V17", class: "you-cross" }, state.youGroup);
    paint(false);
  }

  function paint(animate = true) {
    if (!state.model) return;
    const values = grid.models[state.model];
    for (const dot of dots) {
      const p = interpolate(grid, values, dot.age, dot.salary);
      dot.node.classList.toggle("dot-show", p >= state.threshold);
      dot.node.classList.toggle("dot-skip", p < state.threshold);
      dot.node.classList.toggle("instant", !animate);
      // Alan olasılıkla orantılı: yarıçap = karekök
      dot.node.style.r = `${(dots.maxR * Math.sqrt(p)).toFixed(2)}px`;
    }
    if (state.you) {
      state.youGroup.removeAttribute("hidden");
      const age = Math.min(Math.max(state.you.age, spec.age.min), spec.age.max);
      const salary = Math.min(Math.max(state.you.salary, spec.salary.min), spec.salary.max);
      state.youGroup.setAttribute("transform", `translate(${sx(age)} ${sy(salary)})`);
    } else {
      state.youGroup.setAttribute("hidden", "");
    }
  }

  layout();
  let width = W;
  new ResizeObserver(() => {
    const next = Math.round(svg.getBoundingClientRect().width);
    if (next && next !== width) {
      width = next;
      layout();
    }
  }).observe(svg);

  return {
    setModel(model) {
      state.model = model;
      paint();
    },
    setThreshold(threshold) {
      state.threshold = threshold;
      paint(false);
    },
    setYou(you) {
      state.you = you;
      paint(false);
    },
  };
}

/** Küçük ROC grafiği: eğri(ler) ve isteğe bağlı nokta. */
export function drawRoc(svg, { curves, point, labels, format }) {
  const W = 320;
  const H = 300;
  const m = { top: 10, right: 12, bottom: 44, left: 50 };
  svg.setAttribute("viewBox", `0 0 ${W} ${H}`);
  svg.replaceChildren();
  const x = (v) => m.left + v * (W - m.left - m.right);
  const y = (v) => H - m.bottom - v * (H - m.top - m.bottom);
  el("rect", { x: x(0), y: y(1), width: x(1) - x(0), height: y(0) - y(1), class: "plate" }, svg);
  el("line", { x1: x(0), y1: y(0), x2: x(1), y2: y(1), class: "chance" }, svg);
  for (const curve of curves) {
    el("polyline", { points: curve.points.map(([a, b]) => `${x(a)},${y(b)}`).join(" "), class: `roc ${curve.className ?? ""}` }, svg);
  }
  if (point) el("circle", { cx: x(point[0]), cy: y(point[1]), r: 5, class: "roc-point" }, svg);
  for (const v of [0, 0.5, 1]) {
    el("text", { x: x(v), y: y(0) + 16, class: "tick", "text-anchor": "middle" }, svg).textContent = format(v);
    el("text", { x: x(0) - 6, y: y(v) + 4, class: "tick", "text-anchor": "end" }, svg).textContent = format(v);
  }
  el("text", { x: x(1), y: H - 6, class: "axis-title", "text-anchor": "end" }, svg).textContent = labels.x;
  el("text", { x: -y(1), y: 14, class: "axis-title", "text-anchor": "end", transform: "rotate(-90)" }, svg).textContent = labels.y;
}
