import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import { buildAll } from "../../scripts/build-pages.mjs";

const files = buildAll();

test("generated pages are up to date (run: npm run build:pages)", () => {
  for (const [path, content] of Object.entries(files)) {
    const saved = readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
    assert.equal(saved, content, path);
  }
});

test("every page has its language, canonical address and both alternates", () => {
  for (const [path, html] of Object.entries(files)) {
    if (!path.endsWith(".html")) continue;
    const lang = path.startsWith("en/") ? "en" : "tr";
    assert.match(html, new RegExp(`<html lang="${lang}">`), path);
    assert.match(html, /<link rel="canonical" href="https:\/\/ads\.miracdeprem\.com\//, path);
    assert.match(html, /hreflang="tr"/, path);
    assert.match(html, /hreflang="en"/, path);
    assert.equal(html.match(/<h1[ >]/g)?.length, 1, `${path}: one h1`);
    assert.doesNotMatch(html, /\{\{/, `${path}: no placeholders left`);
  }
});

test("structured data is valid JSON", () => {
  for (const [path, html] of Object.entries(files)) {
    if (!path.endsWith(".html")) continue;
    const json = html.match(/<script type="application\/ld\+json">(.*?)<\/script>/s)[1];
    const data = JSON.parse(json);
    assert.equal(data["@context"], "https://schema.org", path);
  }
});

test("sitemap lists all four pages", () => {
  assert.equal(files["sitemap.xml"].match(/<loc>/g).length, 4);
  assert.match(files["robots.txt"], /Sitemap: https:\/\/ads\.miracdeprem\.com\/sitemap\.xml/);
});
