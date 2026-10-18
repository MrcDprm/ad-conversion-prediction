// İki sayfanın ortak parçaları: tema düğmesi ve JSON yükleme.
import { t } from "./i18n.js";
import { currentTheme, initTheme, toggleTheme } from "./theme.js";

export const $ = (id) => document.getElementById(id);

export async function loadJson(name) {
  // Mutlak yol: /en/ altındaki sayfalar da aynı dosyaları okur
  const response = await fetch(`/${name}`);
  if (!response.ok) throw new Error(`${name}: ${response.status}`);
  return response.json();
}

function updateThemeButton() {
  $("theme-toggle").setAttribute("aria-label", t(currentTheme() === "dark" ? "themeToLight" : "themeToDark"));
}

export function initPage() {
  initTheme(updateThemeButton);
  updateThemeButton();
  $("theme-toggle").addEventListener("click", () => {
    toggleTheme();
    updateThemeButton();
  });
}
