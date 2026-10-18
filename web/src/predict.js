// Tarayıcıda tahmin: grid.json'daki olasılık ızgarasından okuma ve girdi doğrulama.
// Saf fonksiyonlar; DOM'a dokunmaz, Node ile test edilir.

// Bu aralıkların dışı yazım hatası sayılır ve reddedilir
export const HARD_LIMITS = {
  age: { min: 15, max: 100 },
  salary: { min: 0, max: 1_000_000 },
};

/** Izgaradan "alır" olasılığı (0-1); adconv/export.py'deki interpolate ile aynı hesap. */
export function interpolate(grid, values, age, salary) {
  const position = (spec, value) => {
    // Izgara dışı değerler kenara yapışır; arayüz bunu ayrıca uyarı olarak gösterir
    const clamped = Math.min(Math.max(value, spec.min), spec.max);
    const exact = ((clamped - spec.min) / (spec.max - spec.min)) * (spec.steps - 1);
    const low = Math.min(Math.floor(exact), spec.steps - 2);
    return [low, exact - low];
  };
  const [i, fi] = position(grid.grid.age, age);
  const [j, fj] = position(grid.grid.salary, salary);
  const n = grid.grid.salary.steps;
  const at = (a, b) => values[a * n + b] / grid.scale;
  const top = at(i, j) * (1 - fj) + at(i, j + 1) * fj;
  const bottom = at(i + 1, j) * (1 - fj) + at(i + 1, j + 1) * fj;
  return top * (1 - fi) + bottom * fi;
}

/** Değer verideki aralığın dışında mı (metrics.json'daki dataset.range)? */
export function outsideData(range, age, salary) {
  return age < range.age[0] || age > range.age[1] || salary < range.salary[0] || salary > range.salary[1];
}

function check(value, limits) {
  if (value < limits.min) return { error: "tooSmall" };
  if (value > limits.max) return { error: "tooLarge" };
  return { value };
}

/** Yaş: tam sayı. Sonuç { value } ya da { error }. */
export function parseAge(text) {
  const trimmed = String(text ?? "").trim();
  if (trimmed === "") return { error: "empty" };
  if (!/^\d{1,3}$/.test(trimmed)) return { error: "notNumber" };
  return check(Number(trimmed), HARD_LIMITS.age);
}

/** Maaş: tam sayı; "50.000", "50,000" ve "50 000" binlik ayıracıyla da kabul edilir. */
export function parseSalary(text) {
  const trimmed = String(text ?? "").trim();
  if (trimmed === "") return { error: "empty" };
  let digits;
  if (/^\d+$/.test(trimmed)) digits = trimmed;
  else if (/^\d{1,3}([., ]\d{3})+$/.test(trimmed)) digits = trimmed.replace(/[., ]/g, "");
  else return { error: "notNumber" };
  return check(Number(digits), HARD_LIMITS.salary);
}
