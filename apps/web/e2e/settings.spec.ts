import { expect, test } from "@playwright/test";

import { axeClean } from "./helpers";

/**
 * The settings area (progress.md D264): the header's gear and the footer's link both lead to the overview, whose cards
 * open each settings screen, and every screen carries the same menu with the one you are on marked. Neither test holds
 * state, so each may start with `page.goto`.
 */

test("the gear and the footer's link lead to the overview, and its cards and menu move between the screens", async ({ page }) => {
  await page.goto("/en/review");
  const gear = page.locator(".app-header__tools").getByRole("link", { name: "Settings", exact: true });
  await expect(gear).not.toHaveAttribute("aria-current");
  await gear.click();
  await expect(page).toHaveURL(/\/en\/settings$/);
  await expect(page.getByRole("heading", { level: 1, name: "Settings" })).toBeVisible();
  // The cards are the menu here, so the menu is not drawn as well.
  await expect(page.getByRole("navigation", { name: "Settings" })).toHaveCount(0);
  await expect(gear).toHaveAttribute("aria-current", "page");
  await axeClean(page);

  const main = page.getByRole("main");
  for (const [card, path, heading] of [
    ["Your levels", "/en/settings/study", "Your levels and goals"],
    ["Your API key", "/en/settings/key", "Your API key"],
    ["Your data", "/en/settings/data", "Your data"],
    ["Sync", "/en/settings/sync", "Sync"],
  ] as const) {
    await page.getByRole("contentinfo").getByRole("link", { name: "Settings", exact: true }).click();
    await expect(page).toHaveURL(/\/en\/settings$/);
    await main.getByRole("link", { name: card, exact: true }).click();
    await expect(page).toHaveURL(new RegExp(`${path}$`));
    await expect(page.getByRole("heading", { level: 1, name: heading })).toBeVisible();
    const menu = page.getByRole("navigation", { name: "Settings" });
    await expect(menu.getByRole("link", { name: card, exact: true })).toHaveAttribute("aria-current", "page");
    await expect(menu.locator('[aria-current="page"]')).toHaveCount(1);
    await expect(gear).toHaveAttribute("aria-current", "page");
  }

  // The menu moves between screens, and the page it lands on is clean with it.
  await page.getByRole("navigation", { name: "Settings" }).getByRole("link", { name: "Your API key", exact: true }).click();
  await expect(page.getByRole("heading", { level: 1, name: "Your API key" })).toBeVisible();
  await axeClean(page);
});

test("the French settings area is named in French and clean", async ({ page }) => {
  await page.goto("/fr/about");
  await page.locator(".app-header__tools").getByRole("link", { name: "Paramètres", exact: true }).click();
  await expect(page.getByRole("heading", { level: 1, name: "Paramètres" })).toBeVisible();
  await axeClean(page);
  await page.getByRole("main").getByRole("link", { name: "Synchronisation", exact: true }).click();
  await expect(page.getByRole("navigation", { name: "Paramètres" }).getByRole("link", { name: "Synchronisation" })).toHaveAttribute(
    "aria-current",
    "page",
  );
  await axeClean(page);
});
