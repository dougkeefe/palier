import { expect, type Page, test } from "@playwright/test";

import { axeClean, drillThroughByKeyboard, expectStatementInMain, onboard } from "./helpers";

/**
 * Phase 7 Slice 3 (progress.md D145): the about page and the privacy notice, the statement
 * in onboarding, the shortcut sheet at `?`, and the progress page printed as its one-page
 * summary. The statement beside each band is held in the specs that reach those screens.
 */

test("the about page says what Palier is and is not, and links the privacy notice, in both languages", async ({ page }) => {
  await page.goto("/en/about");
  await expect(page.getByRole("heading", { level: 2, name: "What it is not" })).toBeVisible();
  await expect(page.getByRole("heading", { level: 2, name: "Where the questions come from" })).toBeVisible();
  await expect(page.getByText("No person reads every item before it is published.", { exact: false })).toBeVisible();
  await expectStatementInMain(page);
  await axeClean(page);

  await page.getByRole("main").getByRole("link", { name: "How Palier handles your data" }).click();
  await expect(page).toHaveURL(/\/en\/privacy$/);
  await expect(page.getByRole("heading", { level: 1, name: "Privacy" })).toBeVisible();

  await page.goto("/fr/about");
  await expect(page.getByRole("heading", { level: 2, name: "Ce que ce n’est pas" })).toBeVisible();
  await expectStatementInMain(page, "n'est ni affilié");
  await axeClean(page);
});

test("the privacy notice lists what is held, what never is, and the 180 days, in both languages", async ({ page }) => {
  await page.goto("/en/privacy");
  await expect(page).toHaveTitle("Privacy · Palier");
  await expect(page.getByText(/No name, no email, no department/)).toBeVisible();
  // The never-synced list, in the settings' own words (architecture.md §9.4).
  for (const never of ["Your OpenAI API key", "Session audio", "Oral transcripts", "Writing workshop submissions", "The cost ledger", "Your diagnostics’ written results"]) {
    await expect(page.getByRole("listitem").filter({ hasText: never })).toBeVisible();
  }
  await expect(page.getByText(/no activity for 180 days is deleted/)).toBeVisible();
  await axeClean(page);

  await page.goto("/fr/privacy");
  await expect(page).toHaveTitle("Confidentialité · Palier");
  await expect(page.getByText(/inactif depuis 180 jours/)).toBeVisible();
  await axeClean(page);
});

test("the footer reaches the about page and the privacy notice from every page", async ({ page }) => {
  await page.goto("/en/review");
  const footer = page.getByRole("contentinfo");
  await footer.getByRole("link", { name: "Privacy" }).click();
  await expect(page).toHaveURL(/\/en\/privacy$/);
  await page.getByRole("contentinfo").getByRole("link", { name: "About" }).click();
  await expect(page).toHaveURL(/\/en\/about$/);
});

test("onboarding carries the statement on every step, not only the first (R5)", async ({ page }) => {
  await page.goto("/en/start");
  await expectStatementInMain(page);
  await page.getByRole("button", { name: "Continue" }).click();
  await expect(page.getByRole("radio", { name: /Level C/ })).toBeVisible();
  await expectStatementInMain(page);
  await axeClean(page);
});

const sheet = (page: Page) => page.getByRole("dialog", { name: "Keyboard shortcuts" });

/** Press ? until the sheet opens: the key's listener exists only once the page has hydrated. */
const pressForSheet = async (page: Page, dialog = sheet(page)) => {
  await expect(async () => {
    await page.keyboard.press("?");
    await expect(dialog).toBeVisible({ timeout: 500 });
  }).toPass();
};

test("? opens the shortcut sheet from anywhere, Escape closes it, and focus goes back (PRD §11)", async ({ page }) => {
  await page.goto("/en");
  await page.getByRole("link", { name: "Français" }).focus();
  await pressForSheet(page);
  await expect(sheet(page).getByRole("heading", { name: "In a mock exam" })).toBeVisible();
  await expect(sheet(page).getByText("Flag the item to come back to")).toBeVisible();
  await axeClean(page);

  await page.keyboard.press("Escape");
  await expect(sheet(page)).toBeHidden();
  await expect(page.getByRole("link", { name: "Français" })).toBeFocused();

  // The footer's button opens it too, for anyone who does not know the key.
  const opener = page.getByRole("button", { name: "Keyboard shortcuts" });
  await opener.click();
  await expect(sheet(page)).toBeVisible();
  await sheet(page).getByRole("button", { name: "Close" }).click();
  await expect(sheet(page)).toBeHidden();
  await expect(opener).toBeFocused();
});

test("a ? typed into a field stays in the field", async ({ page }) => {
  await onboard(page, "skip");
  await page.getByRole("link", { name: "Sync", exact: true }).click();
  await page.getByLabel("Code").fill("");
  await page.getByLabel("Code").press("?");
  await expect(page.getByLabel("Code")).toHaveValue("?");
  await expect(sheet(page)).toBeHidden();
});

test("the shortcut sheet in French names the keys in French", async ({ page }) => {
  await page.goto("/fr");
  const dialog = page.getByRole("dialog", { name: "Raccourcis clavier" });
  await pressForSheet(page, dialog);
  await expect(dialog.getByText("Entrée").first()).toBeVisible();
  await axeClean(page);
});

/** The number of pages in a PDF: its page objects, not the `/Pages` tree node. */
const pageCount = (pdf: Buffer): number => pdf.toString("latin1").match(/\/Type\s*\/Page(?!s)/g)?.length ?? 0;

test("progress prints as a one-page summary of both skills, with the statement (PRD §8.9)", async ({ page }) => {
  test.setTimeout(90_000);
  await onboard(page, "skip");
  await page.getByRole("link", { name: /^Start, \d+ min$/ }).click();
  await drillThroughByKeyboard(page);
  await page.getByRole("link", { name: "Back to today" }).click();
  await page.getByRole("link", { name: "Progress" }).click();
  await expect(page.getByRole("button", { name: "Print or save as PDF" })).toBeVisible();
  // On screen, one skill at a time, and no print-only line.
  await expect(page.getByText("Progress summary,", { exact: false })).toBeHidden();
  await axeClean(page);

  await page.emulateMedia({ media: "print" });
  await expect(page.getByRole("heading", { name: "Practice trend — Reading" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Practice trend — Written expression" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Oral practice" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "What this does and does not tell you" })).toBeVisible();
  await expectStatementInMain(page);
  await expect(page.getByRole("button", { name: "Print or save as PDF" })).toBeHidden();
  await expect(page.getByRole("banner")).toBeHidden();

  expect(pageCount(await page.pdf({ format: "Letter" }))).toBe(1);
  expect(pageCount(await page.pdf({ format: "A4" }))).toBe(1);
  // Still both skills after an export: Chromium's PDF fires `afterprint` while print still applies.
  await expect(page.getByRole("heading", { name: "Practice trend — Written expression" })).toBeVisible();
});

test("the library lists ten articles, and an article reads its examples in French, in both languages (D162)", async ({ page }) => {
  await page.goto("/en/library");
  await expect(page.getByRole("heading", { level: 1, name: "Library" })).toBeVisible();
  await expect(page.locator(".app-library__entry")).toHaveCount(10);
  await axeClean(page);

  await page.getByRole("link", { name: "Agreement", exact: true }).click();
  await expect(page).toHaveURL(/\/en\/library\/agreement$/);
  await expect(page).toHaveTitle("Agreement · Palier");
  await expect(page.getByRole("heading", { level: 2, name: "The past participle" })).toBeVisible();
  // The examples, and each French phrase cited in the English prose, carry French's lang.
  await expect(page.getByText("Les documents que j’ai reçus hier sont incomplets.")).toHaveAttribute("lang", "fr");
  await expect(page.locator("main i[lang='fr']").first()).toBeVisible();
  expect(await page.locator("main i:not([lang='fr'])").count()).toBe(0);
  await axeClean(page);

  await page.getByRole("link", { name: "Pronouns" }).click();
  await expect(page.getByRole("heading", { level: 1, name: "Pronouns" })).toBeVisible();

  await page.goto("/fr/library/agreement");
  await expect(page.getByRole("heading", { level: 1, name: "Les accords" })).toBeVisible();
  await expect(page.getByText("Au lieu de").first()).toBeVisible();
  await axeClean(page);

  // A segment that is not a written-expression sub-skill is the 404, in place.
  await page.goto("/en/library/main-idea");
  await expect(page.getByRole("heading", { level: 1, name: "Page not found" })).toBeVisible();
});

test("a written-expression item's feedback reaches its library article, in a new tab (D162)", async ({ page, context }) => {
  await onboard(page, "skip");
  await expect(page).toHaveURL(/\/en\/home$/);
  await page.getByRole("radio", { name: "Written expression" }).check();
  await page.getByRole("link", { name: /^Start/ }).click();
  await expect(page.locator(".app-session__count")).toBeVisible();
  await page.keyboard.press("1");
  await page.keyboard.press("Enter");
  const feedback = page.getByRole("region", { name: /Correct|Not quite/ });
  await expect(feedback).toBeVisible();

  const link = feedback.getByRole("link", { name: /Read about .+ in the library/ });
  await expect(link).toHaveAttribute("target", "_blank");
  await axeClean(page);
  const [article] = await Promise.all([context.waitForEvent("page"), link.click()]);
  await expect(article).toHaveURL(/\/en\/library\/[a-z-]+$/);
  await expect(article.getByRole("heading", { level: 1 })).toBeVisible();
  // The drill is still where it was.
  await expect(feedback).toBeVisible();
});
