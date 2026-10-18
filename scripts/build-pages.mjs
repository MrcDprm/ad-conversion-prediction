// web/pages şablonlarından iki dilde HTML sayfaları, sitemap.xml ve robots.txt üretir.
// Kullanım: npm run build:pages  (çıktılar repoya girer; Vercel'de derleme adımı yok)
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { MESSAGES } from "../web/src/messages.js";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const WEB = join(ROOT, "web");
const SITE = "https://ads.miracdeprem.com";
const AUTHOR = { "@type": "Person", name: "Miraç Deprem", url: "https://www.miracdeprem.com" };

// Sayfa: şablon, Türkçe ve İngilizce adresi, başlık/açıklama anahtarları
const PAGES = [
  { template: "index.html", paths: { tr: "/", en: "/en/" }, title: "docTitle", description: "docDescription" },
  {
    template: "model.html",
    paths: { tr: "/model.html", en: "/en/model.html" },
    title: "modelDocTitle",
    description: "modelDocDescription",
  },
];

const escapeHtml = (text) =>
  String(text).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

function jsonLd(page, lang) {
  const m = MESSAGES[lang];
  const url = SITE + page.paths[lang];
  const data =
    page.template === "index.html"
      ? {
          "@context": "https://schema.org",
          "@type": "WebApplication",
          name: m.siteName,
          url,
          description: m[page.description],
          inLanguage: lang,
          applicationCategory: "EducationalApplication",
          operatingSystem: "Any",
          isAccessibleForFree: true,
          offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
          author: AUTHOR,
        }
      : {
          "@context": "https://schema.org",
          "@type": "TechArticle",
          headline: m.modelHeading,
          url,
          description: m[page.description],
          inLanguage: lang,
          author: AUTHOR,
          isPartOf: { "@type": "WebSite", name: m.siteName, url: SITE + page.paths[lang].replace("model.html", "") },
        };
  // </script> kapanışı JSON içinde görünemesin
  return JSON.stringify(data).replace(/</g, "\\u003c");
}

function render(page, lang) {
  const other = lang === "tr" ? "en" : "tr";
  const m = MESSAGES[lang];
  const vars = {
    lang,
    title: escapeHtml(m[page.title]),
    description: escapeHtml(m[page.description]),
    url: SITE + page.paths[lang],
    urlTr: SITE + page.paths.tr,
    urlEn: SITE + page.paths.en,
    home: lang === "tr" ? "/" : "/en/",
    model: lang === "tr" ? "/model.html" : "/en/model.html",
    other: page.paths[other],
    otherLang: other,
    currentCalculator: page.template === "index.html" ? ' aria-current="page"' : "",
    currentModel: page.template === "model.html" ? ' aria-current="page"' : "",
    ogImage: `${SITE}/${lang === "tr" ? "og-image.png" : "og-image-en.png"}`,
    ogLocale: lang === "tr" ? "tr_TR" : "en_US",
    ogLocaleAlt: lang === "tr" ? "en_US" : "tr_TR",
    portfolioUrl: lang === "tr" ? "https://www.miracdeprem.com" : "https://www.miracdeprem.com/en",
    jsonld: jsonLd(page, lang),
  };
  const partial = (name) => readFileSync(join(WEB, "pages", `${name}.html`), "utf8").replace(/\n$/, "");
  let html = readFileSync(join(WEB, "pages", page.template), "utf8").replace(/\{\{> (\w+)\}\}/g, (_, name) => partial(name));
  html = html.replace(/\{\{t:(\w+)\}\}/g, (_, key) => {
    if (!(key in m)) throw new Error(`Missing message "${key}" (${lang})`);
    return escapeHtml(m[key]);
  });
  html = html.replace(/\{\{(\w+)\}\}/g, (_, name) => {
    if (!(name in vars)) throw new Error(`Unknown placeholder "${name}"`);
    return vars[name];
  });
  return html;
}

function sitemap() {
  const urls = PAGES.flatMap((page) =>
    ["tr", "en"].map(
      (lang) => `  <url>
    <loc>${SITE}${page.paths[lang]}</loc>
    <xhtml:link rel="alternate" hreflang="tr" href="${SITE}${page.paths.tr}"/>
    <xhtml:link rel="alternate" hreflang="en" href="${SITE}${page.paths.en}"/>
    <xhtml:link rel="alternate" hreflang="x-default" href="${SITE}${page.paths.tr}"/>
  </url>`,
    ),
  );
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">
${urls.join("\n")}
</urlset>
`;
}

/** Üretilecek bütün dosyalar: { "web/... yolu": içerik } */
export function buildAll() {
  const files = {};
  for (const page of PAGES) {
    for (const lang of ["tr", "en"]) {
      const path = page.paths[lang].endsWith("/") ? `${page.paths[lang]}index.html` : page.paths[lang];
      files[path.slice(1)] = render(page, lang);
    }
  }
  files["sitemap.xml"] = sitemap();
  files["robots.txt"] = `User-agent: *\nAllow: /\n\nSitemap: ${SITE}/sitemap.xml\n`;
  return files;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  for (const [path, content] of Object.entries(buildAll())) {
    const target = join(WEB, path);
    mkdirSync(dirname(target), { recursive: true });
    writeFileSync(target, content);
    console.log(`wrote web/${path}`);
  }
}
