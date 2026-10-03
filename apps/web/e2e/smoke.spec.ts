import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

/**
 * Accessibility is a build gate, not an audit (ADR 13), so the shell's E2E
 * asserts it on every route and in an interactive state, not just an initial
 * render (implementation-plan.md §6.2 tier 7). WCAG 2.2 AA is the bar [R9].
 */

const WCAG_TAGS = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"];

const axeClean = async (page: import("@playwright/test").Page) => {
  const results = await new AxeBuilder({ page }).withTags(WCAG_TAGS).analyze();
  expect(results.violations).toEqual([]);
};

test("the root path redirects to a locale-prefixed URL", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveURL(/\/(en|fr)$/);
});

test("the English shell has no accessibility violations", async ({ page }) => {
  await page.goto("/en");
  await expect(page.locator("html")).toHaveAttribute("lang", "en");
  await axeClean(page);
});

test("the French shell has no accessibility violations", async ({ page }) => {
  await page.goto("/fr");
  await expect(page.locator("html")).toHaveAttribute("lang", "fr");
  await axeClean(page);
});

test("the about route has no accessibility violations", async ({ page }) => {
  await page.goto("/en/about");
  await axeClean(page);
});

test("the shell stays clean with the language toggle focused", async ({ page }) => {
  await page.goto("/en");
  await page.getByRole("link", { name: "Français" }).focus();
  await axeClean(page);
});

test("header focus order is skip link, brand, then nav", async ({ page }) => {
  // An app page: the landing page has its own header (D201), held to the same order below.
  await page.goto("/en/about");
  await page.keyboard.press("Tab");
  await expect(page.locator(".app-skip-link")).toBeFocused();
  await page.keyboard.press("Tab");
  await expect(page.locator(".app-header__brand")).toBeFocused();
  // Then the nav's first link, whichever it is: the order under test is skip link,
  // brand, nav, and the nav's contents grow as screens land (progress.md, Slice 1).
  await page.keyboard.press("Tab");
  await expect(page.getByRole("navigation", { name: "Primary" }).getByRole("link").first()).toBeFocused();
});

test("the landing page's own header keeps the order: skip link, brand, then its nav (D201)", async ({ page }) => {
  await page.goto("/en");
  await page.keyboard.press("Tab");
  await expect(page.locator(".app-skip-link")).toBeFocused();
  await page.keyboard.press("Tab");
  await expect(page.locator(".landing-header__brand")).toBeFocused();
  await page.keyboard.press("Tab");
  await expect(page.getByRole("navigation", { name: "On this page" }).getByRole("link").first()).toBeFocused();
});

test("the landing page stays clean with an answer open and the sample question answered (D201)", async ({ page }) => {
  await page.goto("/en");
  // The first answer starts open; open another, so two disclosures are expanded.
  await page.getByText("Is my data private?").click();
  await expect(page.getByText("Palier has no server that stores your data.", { exact: false })).toBeVisible();
  // A wrong pick marks it and the right answer, and says so in words.
  await page.getByRole("button", { name: "The agenda has changed" }).click();
  await expect(page.getByRole("button", { name: "The agenda has changed" })).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByText("Not quite. Reread the part after “because”.")).toBeVisible();
  await axeClean(page);
  await page.getByRole("button", { name: "The boardroom is unavailable" }).click();
  await expect(page.getByText("Correct. The reason follows “because”.", { exact: false })).toBeVisible();
  await axeClean(page);
});

test("the landing page's way in leads to the app, with the app's header and footer (D201)", async ({ page }) => {
  await page.goto("/en");
  await expect(page.locator(".app-header")).toHaveCount(0);
  await page.getByRole("link", { name: "Start free" }).click();
  await expect(page).toHaveURL(/\/en\/home$/);
  await expect(page.locator(".app-header")).toBeVisible();
  await expect(page.locator(".app-footer__disclaimer")).toBeVisible();
});

test("activating the skip link moves focus into main", async ({ page }) => {
  await page.goto("/en");
  await page.keyboard.press("Tab");
  await expect(page.locator(".app-skip-link")).toBeFocused();
  await page.keyboard.press("Enter");
  // main carries tabindex="-1" so focus reliably lands there, not on the link.
  await expect(page.locator("#main")).toBeFocused();
});

test("the language toggle switches locale and preserves the route", async ({
  page,
}) => {
  await page.goto("/en/about");
  await page.getByRole("link", { name: "Français" }).click();
  await expect(page).toHaveURL(/\/fr\/about$/);
  await expect(page.locator("html")).toHaveAttribute("lang", "fr");

  await page.getByRole("link", { name: "English" }).click();
  await expect(page).toHaveURL(/\/en\/about$/);
  await expect(page.locator("html")).toHaveAttribute("lang", "en");
});

test("the non-affiliation statement is present in the footer", async ({
  page,
}) => {
  await page.goto("/en");
  await expect(page.locator(".app-footer__disclaimer")).toContainText(
    "not affiliated with, endorsed by, or connected to the Public Service Commission",
  );
});
