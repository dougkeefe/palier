import { readFileSync } from "node:fs";

import { expect, test } from "@playwright/test";

import { axeClean } from "./helpers";
import { SENTINEL } from "./leak-guard";

/**
 * The error states (architecture.md §16, progress.md D141–D142), in both locales: the 404
 * every unknown path reaches, a route that threw, and the global screen's view. Each is
 * axe-clean, and the diagnostic bundle is proven to carry the build and the bank and never
 * the key, in what the screen shows, what Copy puts on the clipboard, and the prefilled
 * issue. The route error comes from the hermetic lane's hook, `[locale]/hermetic/[view]`.
 */

/** A locale's `errors` string, or a failure naming the key a spec asked for and the file lacks. */
const copy = (locale: "en" | "fr") => {
  const errors = (JSON.parse(readFileSync(new URL(`../messages/${locale}.json`, import.meta.url), "utf8")) as { errors: Record<string, string> }).errors;
  return (key: string): string => {
    const value = errors[key];
    if (value === undefined) throw new Error(`messages/${locale}.json has no errors.${key}`);
    return value;
  };
};

for (const locale of ["en", "fr"] as const) {
  const t = copy(locale);

  test(`${locale}: an unknown path is the localised 404, titled, unindexed, axe-clean, with the way home`, async ({ page }) => {
    // A 404, rendered inside the layout: the proxy rewrites an unknown path to itself with the status (D199).
    // D141's 200 is gone; `notFound()`, which Next serves blank here, is still never used.
    const response = await page.goto(`/${locale}/no-such-page/at-all`);

    expect(response?.status()).toBe(404);
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", /noindex/);
    await expect(page.locator("html")).toHaveAttribute("lang", locale);
    await expect(page.getByRole("heading", { level: 1, name: t("notFoundTitle") })).toBeVisible();
    await expect(page).toHaveTitle(`${t("notFoundTitle")} · Palier`);
    await expect(page.getByRole("link", { name: t("home") })).toHaveAttribute("href", `/${locale}/home`);
    await axeClean(page);
  });

  test(`${locale}: a route that throws shows the error state, and its report never carries the key`, async ({ page, context }) => {
    await context.grantPermissions(["clipboard-read", "clipboard-write"]);
    await page.goto(`/${locale}/hermetic/route?leak=${SENTINEL}`);

    const heading = page.getByRole("heading", { level: 1, name: t("routeTitle") });
    await expect(heading).toBeVisible();
    await expect(heading).toBeFocused();
    await expect(page).toHaveTitle(`${t("routeTitle")} · Palier`);
    await axeClean(page);

    // The bundle, opened: the build, the bank, no key, and no query.
    await page.getByText(t("details")).click();
    const shown = page.getByTestId("diagnostic-bundle");
    await expect(shown).toBeVisible();
    const bundle = (await shown.textContent()) ?? "";
    expect(bundle).toMatch(/^Palier diagnostic bundle\nBuild: \S+\nBank: v\d+\n/);
    expect(bundle).toContain(`Page: /${locale}/hermetic/route\n`);
    expect(bundle).toContain("/_next/static/chunks/0e2e1hermetic._.js:1:1");
    expect(bundle).not.toContain(SENTINEL);
    await axeClean(page);

    // Copy puts exactly what was shown on the clipboard, and says so.
    await page.getByRole("button", { name: t("copy") }).click();
    await expect(page.locator(".app-error [role=status]")).toHaveText(t("copied"));
    expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(bundle);

    // The prefilled issue carries the same bundle, and nothing else of the page.
    const href = (await page.getByRole("link", { name: t("openIssue") }).getAttribute("href")) ?? "";
    const issue = new URL(href);
    expect(`${issue.origin}${issue.pathname}`).toBe("https://github.com/dougkeefe/palier/issues/new");
    expect(issue.searchParams.get("body")).toContain(bundle);
    expect(href).not.toContain(SENTINEL);
    expect(decodeURIComponent(href)).not.toContain(SENTINEL);

    // Try again re-renders the route, which recovers once the hook stops throwing.
    await page.evaluate(() => {
      window.location.hash = "recover";
    });
    await page.getByRole("button", { name: t("retry") }).click();
    await expect(page.getByTestId("recovered")).toBeVisible();
    // …and gives the page its title back.
    await expect(page).toHaveTitle("Palier");
  });

  test(`${locale}: the global error screen's view is axe-clean, and says it in the page's language`, async ({ page }) => {
    await page.goto(`/${locale}/hermetic/global?leak=${SENTINEL}`);

    await expect(page.getByRole("heading", { level: 1, name: t("globalTitle") })).toBeVisible();
    await expect(page.getByTestId("diagnostic-bundle")).not.toContainText(SENTINEL);
    await axeClean(page);
  });
}

test("the hook is the 404 for any view it does not know", async ({ page }) => {
  await page.goto("/en/hermetic/nothing");
  await expect(page.getByRole("heading", { level: 1, name: copy("en")("notFoundTitle") })).toBeVisible();
});
