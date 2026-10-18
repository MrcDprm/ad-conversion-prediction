// Sayfanın dili adresten gelir: "/" Türkçe, "/en/" İngilizce (<html lang>).
// Sabit metinler sayfaya üretim sırasında yazılır; burada sadece JS'in değiştirdiği metinler var.
import { MESSAGES } from "./messages.js";

const lang = document.documentElement.lang === "en" ? "en" : "tr";

export const getLang = () => lang;

export function t(key, params = {}) {
  const text = MESSAGES[lang][key] ?? MESSAGES.tr[key] ?? key;
  return text.replace(/\{(\w+)\}/g, (_, name) => String(params[name] ?? ""));
}

export function formatNumber(value, digits = 0) {
  return new Intl.NumberFormat(lang === "tr" ? "tr-TR" : "en-US", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(value);
}
