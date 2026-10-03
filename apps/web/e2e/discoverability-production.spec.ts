import { readFileSync } from "node:fs";

import { expect, test } from "@playwright/test";

const routes = JSON.parse(readFileSync(new URL("../src/lib/routes.json", import.meta.url), "utf8")) as string[];

/**
 * Found by search engines, correctly (Phase 7 Slice 5, progress.md D199), on the production server
 * (the `offline` project): `robots.txt` keeps crawlers off the API and the E2E hook and names the
 * sitemap; the sitemap lists every route in both locales, each answering 200 and each naming its
 * twin; and every page's head carries its canonical and `hreflang` links and an Open Graph title.
 * The origin is the build's (`siteUrlFrom`), so a URL is fetched here by its path.
 */

const pathOf = (url: string): string => new URL(url).pathname;

test("robots.txt allows the site, keeps out the API and the hook, and names the sitemap", async ({ request }) => {
  const response = await request.get("/robots.txt");
  expect(response.status()).toBe(200);
  const text = await response.text();

  expect(text).toMatch(/^User-Agent: \*$/m);
  expect(text).toMatch(/^Allow: \/$/m);
  expect(text).toMatch(/^Disallow: \/api\/$/m);
  expect(text).toMatch(/^Disallow: \/en\/hermetic\/$/m);
  expect(text).toMatch(/^Sitemap: https?:\/\/[^\s]+\/sitemap\.xml$/m);
});

test("the sitemap lists every route in both locales, each answering 200 and naming its twin", async ({ request }) => {
  test.setTimeout(120_000);
  const xml = await (await request.get("/sitemap.xml")).text();
  const locs = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => pathOf(m[1] ?? ""));

  const expected = routes.flatMap((route) => ["en", "fr"].map((locale) => (route === "" ? `/${locale}` : `/${locale}/${route}`)));
  expect(locs).toEqual(expected);
  expect(xml).toContain('hreflang="fr"');
  expect(xml).toContain('hreflang="x-default"');

  for (const path of locs) {
    expect((await request.get(path)).status(), path).toBe(200);
  }
});

test("a page's head names its canonical, its twin in the other language, and an Open Graph title", async ({ page }) => {
  await page.goto("/fr/library/agreement");
  const head = page.locator("head");

  await expect(head.locator('link[rel="canonical"]')).toHaveAttribute("href", /\/fr\/library\/agreement$/);
  await expect(head.locator('link[rel="alternate"][hreflang="en"]')).toHaveAttribute("href", /\/en\/library\/agreement$/);
  await expect(head.locator('link[rel="alternate"][hreflang="fr"]')).toHaveAttribute("href", /\/fr\/library\/agreement$/);
  await expect(head.locator('link[rel="alternate"][hreflang="x-default"]')).toHaveAttribute("href", /\/en\/library\/agreement$/);
  await expect(head.locator('meta[property="og:title"]')).toHaveAttribute("content", "Palier");
  await expect(head.locator('meta[property="og:description"]')).toHaveAttribute("content", /Évaluation de langue seconde/);
});

test("an unknown path answers 404 and names no alternates", async ({ page }) => {
  const response = await page.goto("/en/no-such-page");

  expect(response?.status()).toBe(404);
  await expect(page.locator('head link[rel="alternate"]')).toHaveCount(0);
  await expect(page.locator('head link[rel="canonical"]')).toHaveCount(0);
});
