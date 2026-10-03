import { describe, expect, it } from "vitest";

import {
  isKnownRoute,
  languageAlternates,
  localePath,
  robotsFor,
  routeOf,
  sitemapEntries,
} from "./discoverability";

const ORIGIN = "https://palier.example";

describe("localePath and languageAlternates (D199)", () => {
  it("puts the locale first, and the root at the bare locale", () => {
    expect(localePath("fr", "progress")).toBe("/fr/progress");
    expect(localePath("en", "")).toBe("/en");
  });

  it("names each locale's twin and English as the default", () => {
    expect(languageAlternates("library/agreement")).toEqual({
      en: "/en/library/agreement",
      fr: "/fr/library/agreement",
      "x-default": "/en/library/agreement",
    });
  });
});

describe("sitemapEntries", () => {
  it("lists every route in both locales, absolute, each with its alternates", () => {
    const entries = sitemapEntries(["", "about"], ORIGIN);

    expect(entries.map((e) => e.url)).toEqual([
      "https://palier.example/en",
      "https://palier.example/fr",
      "https://palier.example/en/about",
      "https://palier.example/fr/about",
    ]);
    expect(entries[3]?.alternates).toEqual({
      languages: {
        en: "https://palier.example/en/about",
        fr: "https://palier.example/fr/about",
        "x-default": "https://palier.example/en/about",
      },
    });
  });
});

describe("robotsFor", () => {
  it("allows everything but the API and the E2E hook, and names the sitemap", () => {
    expect(robotsFor(ORIGIN)).toEqual({
      rules: [{ userAgent: "*", allow: "/", disallow: ["/api/", "/en/hermetic/", "/fr/hermetic/"] }],
      sitemap: "https://palier.example/sitemap.xml",
    });
  });
});

describe("routeOf and isKnownRoute", () => {
  const routes = ["", "progress", "library/agreement"];

  it("reads the route below the locale, ignoring a trailing slash", () => {
    expect(routeOf("/en/progress/")).toBe("progress");
    expect(routeOf("/fr")).toBe("");
    expect(routeOf("/en/library/agreement")).toBe("library/agreement");
  });

  it("knows the app's routes and nothing else", () => {
    expect(isKnownRoute("progress", routes, false)).toBe(true);
    expect(isKnownRoute("", routes, false)).toBe(true);
    expect(isKnownRoute("no-such-page", routes, false)).toBe(false);
    expect(isKnownRoute("library/no-such-article", routes, false)).toBe(false);
  });

  it("knows the E2E hook only in the hermetic lane, and only one segment deep", () => {
    expect(isKnownRoute("hermetic/route", routes, true)).toBe(true);
    expect(isKnownRoute("hermetic/route", routes, false)).toBe(false);
    expect(isKnownRoute("hermetic/route/deeper", routes, true)).toBe(false);
  });
});
