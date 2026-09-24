import AxeBuilder from "@axe-core/playwright";
import { expect, type Page } from "@playwright/test";

/** Shared by the hermetic journeys and the offline project. Not a spec file. */

const WCAG_TAGS = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"];

/**
 * Audit a settled page. After a client-side navigation Next streams the new metadata
 * in, and for a moment the document has no `<title>`: axe once caught exactly that
 * frame. That is a transient no user rests on, so wait for the title first; the pages
 * do each carry one (see the "titled for its purpose" test).
 */
export const axeClean = async (page: Page) => {
  await expect(page).toHaveTitle(/\S/);
  const results = await new AxeBuilder({ page }).withTags(WCAG_TAGS).analyze();
  expect(results.violations).toEqual([]);
};

/** §8.1 onboarding, placing as asked. Leaves the page wherever onboarding lands. */
export const onboard = async (page: Page, placement: "diagnostic" | "skip") => {
  await page.goto("/en/start");
  const next = page.getByRole("button", { name: "Continue" });
  await expect(next).toBeEnabled();
  await next.click();

  await page.getByRole("radio", { name: /Level C/ }).check();
  await next.click();

  await page
    .getByRole("radio", { name: placement === "diagnostic" ? /Take the diagnostic/ : /Skip for now/ })
    .check();
  await next.click();

  await page.getByRole("radio", { name: "20 minutes a day" }).check();
  await page.getByRole("button", { name: "Start practising" }).click();
};

/** How many items the current set holds, read off its "Item 1 of N" line. */
export const setSize = async (page: Page): Promise<number> => {
  const line = page.locator(".app-session__count");
  await expect(line).toHaveText(/Item 1 of \d+/);
  return Number(/of (\d+)/.exec((await line.textContent()) ?? "")?.[1]);
};

/** Answer every item of the drill on screen by keyboard: 1, Enter to confirm, Enter to go on. */
export const drillThroughByKeyboard = async (page: Page) => {
  const total = await setSize(page);
  for (let i = 1; i <= total; i++) {
    await expect(page.locator(".app-session__count")).toHaveText(`Item ${i} of ${total}`);
    await page.keyboard.press("1");
    await page.keyboard.press("Enter");
    await expect(page.getByRole("region", { name: /Correct|Not quite/ })).toBeVisible();
    await page.keyboard.press("Enter");
  }
  return total;
};
