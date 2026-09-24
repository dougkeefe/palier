import { expect, test } from "@playwright/test";

import { axeClean, onboard, setSize } from "./helpers";

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
