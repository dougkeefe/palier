import { expect, test } from "@playwright/test";

import { axeClean, drillThroughByKeyboard, expectStatementInMain, onboard, setSize } from "./helpers";

/**
 * The E2E journeys Slice 1 owns (implementation-plan.md §6.2 tier 6), against the
 * hermetic container: in-memory stores and the fixture bank, so every run is the same
 * run. Accessibility is asserted on *states* — the feedback panel open, the diagnostic
 * result — not only on first render (tier 7, R9).
 */

test("journey 1: onboarding through the diagnostic to accuracy per band, with its interval", async ({ page }) => {
  await onboard(page, "diagnostic");
  await expect(page).toHaveURL(/\/en\/diagnostic$/);

  await page.getByRole("radio", { name: "Reading" }).check();
  await page.getByRole("button", { name: "Start the Reading diagnostic" }).click();

  const total = await setSize(page);
  expect(total).toBeGreaterThan(0);
  for (let i = 1; i <= total; i++) {
    await expect(page.locator(".app-session__count")).toHaveText(`Item ${i} of ${total}`);
    // Keyboard only: 1 chooses the first option, Enter confirms (§8.3).
    await page.keyboard.press("1");
    await page.keyboard.press("Enter");
  }

  // A diagnostic gives no feedback per item; the readout comes at the end.
  await expect(page.getByRole("heading", { name: "Your Reading diagnostic" })).toBeVisible();
  for (const band of ["A", "B", "C"]) {
    await expect(page.getByText(`${band}-level items`)).toBeVisible();
  }
  // R10: a figure only with enough evidence; otherwise it says how much more is needed.
  await expect(page.getByText(/more (is|are) needed|% correct, likely between/).first()).toBeVisible();
  // Beside the readout, the statement that it is not official (R5, D145).
  await expectStatementInMain(page);
  await axeClean(page);
});

test("journey 2: a daily session end to end, feedback panel included, then back to today", async ({ page }) => {
  await onboard(page, "skip");
  await expect(page).toHaveURL(/\/en\/home$/);
  await expect(page.getByRole("heading", { name: "Today’s plan" })).toBeVisible();
  await axeClean(page);

  await page.getByRole("link", { name: /^Start, \d+ min$/ }).click();
  await expect(page).toHaveURL(/\/en\/practice\/reading$/);

  const total = await setSize(page);
  for (let i = 1; i <= total; i++) {
    await expect(page.locator(".app-session__count")).toHaveText(`Item ${i} of ${total}`);
    await page.keyboard.press("1");
    await page.getByRole("button", { name: "Confirm" }).click();

    // The feedback panel opens and focus lands on its heading (§11).
    const feedback = page.getByRole("region", { name: /Correct|Not quite/ });
    await expect(feedback).toBeVisible();
    await expect(feedback.getByRole("heading", { level: 2 })).toBeFocused();
    await expect(feedback.getByText(/^The answer: /)).toBeVisible();
    await expect(feedback.getByText(/^Why this matters at level [ABC]: /)).toBeVisible();
    if (i === 1) await axeClean(page);

    // Enter advances from the feedback panel.
    await page.keyboard.press("Enter");
  }

  await expect(page.getByRole("heading", { name: "Set complete" })).toBeVisible();
  await expect(page.getByText(new RegExp(`^\\d+ of ${total} correct\\.$`))).toBeVisible();
  await page.getByRole("link", { name: "Back to today" }).click();
  await expect(page).toHaveURL(/\/en\/home$/);
  await expect(page.getByRole("heading", { name: "Review queue" })).toBeVisible();
});

test("the drill keeps focus on the next item's options after advancing (§11)", async ({ page }) => {
  await onboard(page, "skip");
  await page.getByRole("link", { name: /^Start, \d+ min$/ }).click();
  await setSize(page);

  await page.keyboard.press("2");
  await page.keyboard.press("Enter");
  await expect(page.getByRole("region", { name: /Correct|Not quite/ })).toBeVisible();
  await page.getByRole("button", { name: /^(Next|See results)$/ }).click();

  await expect(page.getByRole("radio").first()).toBeFocused();
});

test("today asks a first-time user to set up, rather than showing an empty chart (§14)", async ({ page }) => {
  await page.goto("/en/home");
  await expect(page.getByRole("heading", { name: "Set up your practice first" })).toBeVisible();
  await axeClean(page);
});

test("onboarding and today render in French too, at parity", async ({ page }) => {
  await page.goto("/fr/start");
  await expect(page.locator("html")).toHaveAttribute("lang", "fr");
  await expect(page.getByRole("heading", { name: "Préparons votre pratique" })).toBeVisible();
  await axeClean(page);
});

/**
 * Journey 6 (§6.2): export to JSON, wipe everything, import, and confirm the state
 * matches. The hermetic container lives for one page load, so everything here moves by
 * in-app links, never `page.goto`, or the progress would vanish with the page.
 */
test("journey 6: export, delete everything, import, and the same progress is back [R11]", async ({ page }, testInfo) => {
  await onboard(page, "skip");
  await page.getByRole("link", { name: /^Start, \d+ min$/ }).click();
  const answered = await drillThroughByKeyboard(page);
  await page.getByRole("link", { name: "Back to today" }).click();

  await page.getByRole("link", { name: "Progress" }).click();
  const answeredLine = page.getByText(/\d+ items? answered/);
  await expect(answeredLine).toHaveText(`${answered} items answered`);

  // Export.
  await page.getByRole("link", { name: "Your data" }).click();
  const [download] = await Promise.all([
    page.waitForEvent("download"),
    page.getByRole("button", { name: "Download everything (JSON)" }).click(),
  ]);
  expect(download.suggestedFilename()).toMatch(/^palier-export-\d{4}-\d{2}-\d{2}\.json$/);
  const file = testInfo.outputPath("export.json");
  await download.saveAs(file);

  // Delete everything, asked once, in place.
  await page.getByRole("button", { name: "Delete everything" }).click();
  await expect(page.getByRole("heading", { name: "Delete everything on this device?" })).toBeFocused();
  await axeClean(page);
  await page.getByRole("button", { name: "Yes, delete everything" }).click();
  await expect(page.getByText("Everything on this device has been deleted.")).toBeVisible();

  // It really is empty: today asks to set up again.
  await page.getByRole("link", { name: "Today", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Set up your practice first" })).toBeVisible();

  // Import the file, and the same progress is back.
  await page.getByRole("link", { name: "Your data" }).click();
  await page.getByLabel("Choose an export file").setInputFiles(file);
  await page.getByRole("button", { name: "Import" }).click();
  await expect(page.getByRole("status").filter({ hasText: `Imported ${answered} answers` })).toBeVisible();
  await axeClean(page);

  await page.getByRole("link", { name: "Progress" }).click();
  await expect(page.getByText(/\d+ items? answered/)).toHaveText(`${answered} items answered`);
  await page.getByRole("link", { name: "Today", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Today’s plan" })).toBeVisible();
});

test("an import of a file that is not an export changes nothing and says so", async ({ page }, testInfo) => {
  await onboard(page, "skip");
  await page.getByRole("link", { name: "Your data" }).click();
  const bad = testInfo.outputPath("not-an-export.json");
  await (await import("node:fs/promises")).writeFile(bad, '{"hello":"world"}');
  await page.getByLabel("Choose an export file").setInputFiles(bad);
  await page.getByRole("button", { name: "Import" }).click();
  await expect(page.getByRole("status").filter({ hasText: "could not be imported" })).toBeVisible();
  // The profile is untouched: today still has a plan.
  await page.getByRole("link", { name: "Today", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Today’s plan" })).toBeVisible();
});

test("the review queue with nothing due is a reward state, not an error (§14)", async ({ page }) => {
  await onboard(page, "skip");
  await page.getByRole("link", { name: "Review", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Nothing due" })).toBeVisible();
  await expect(page.getByText("Come back tomorrow, or do a set anyway.")).toBeVisible();
  await axeClean(page);
});

test("every feedback panel can report its item, as a prefilled GitHub issue (§13.0)", async ({ page }) => {
  await onboard(page, "skip");
  await page.getByRole("link", { name: /^Start, \d+ min$/ }).click();
  await setSize(page);
  await page.keyboard.press("1");
  await page.keyboard.press("Enter");

  const report = page.getByRole("button", { name: "Report a problem with this item" });
  await expect(report).toHaveAttribute("aria-expanded", "false");
  await report.click();
  await expect(report).toHaveAttribute("aria-expanded", "true");
  await page.getByRole("radio", { name: "More than one answer works" }).check();

  const href = await page.getByRole("link", { name: /Open a GitHub issue/ }).getAttribute("href");
  const url = new URL(href ?? "");
  expect(`${url.origin}${url.pathname}`).toBe("https://github.com/dougkeefe/palier/issues/new");
  expect(url.searchParams.get("title")).toMatch(/^Item report: multiple-answers \(.+\)$/);
  await axeClean(page);
});

test("every page is titled for its purpose, ahead of the product name (WCAG 2.4.2)", async ({ page }) => {
  for (const [path, title] of [
    ["/en/review", "Review · Palier"],
    ["/en/settings/data", "Your data · Palier"],
    ["/fr/progress", "Progrès · Palier"],
    ["/en/practice/writing", "Written expression · Palier"],
    ["/fr/practice/writing/workshop", "Atelier d’écriture · Palier"],
    ["/fr/practice/writing/generate", "Nouvelles questions d’exercice · Palier"],
    ["/en/practice/oral", "Spoken practice · Palier"],
    ["/fr/practice/oral", "Pratique orale · Palier"],
    ["/en/practice/oral/report", "Report on a spoken session · Palier"],
    ["/fr/practice/oral/report", "Bilan d’une séance orale · Palier"],
    ["/en/exam", "Mock exam · Palier"],
    ["/en/privacy", "Privacy · Palier"],
    ["/en/library", "Library · Palier"],
    ["/fr/library/pronouns", "Les pronoms · Palier"],
    ["/fr/about", "Ce qu'est Palier, et ce qu'il n'est pas · Palier"],
    ["/fr/exam/results", "Résultats de l’examen · Palier"],
    ["/en", "Palier"],
  ] as const) {
    await page.goto(path);
    await expect(page).toHaveTitle(title);
  }
});
