import { expect, test } from "@playwright/test";

import { axeClean, onboard } from "./helpers";

/**
 * The results a user already holds (progress.md D259, PRD §8.1 step 3's "self-declare a current
 * profile"): declared in onboarding and at `/settings/study`, they shape Today. A skill held at E
 * leaves the plan, with its staircase stamped; one held at its target only keeps sharp. The hermetic
 * container lives for one page load, so everything after onboarding moves by in-app links.
 */

const planTabs = (page: import("@playwright/test").Page) =>
  page.getByRole("tablist", { name: "Practising" }).getByRole("tab");

test("results declared in onboarding take an exempt skill out of today's plan and keep a held one sharp (D259)", async ({
  page,
}) => {
  await page.goto("/en/start");
  await page.getByRole("button", { name: "Continue" }).click();
  await page.getByRole("button", { name: "Continue" }).click();
  await expect(page.getByRole("heading", { name: "Which SLE results do you hold now?" })).toBeFocused();
  await page.getByRole("group", { name: "Reading", exact: true }).getByRole("radio", { name: "E", exact: true }).check();
  // The staircase beside the row says it in words, and the stamp presses on at the exemption.
  await expect(page.getByRole("img", { name: "Reading: you hold E, the exemption. Nothing left to study here." })).toBeVisible();
  await axeClean(page);

  await onboard(page, "skip", { results: { Reading: "E", "Written expression": "C", "Oral expression": "B" } });

  // Reading has left the plan; written expression and oral stay, in that order.
  await expect(planTabs(page)).toHaveText(["Written expression", "Oral expression"]);
  await expect(page.locator(".app-home__skills")).toContainText("Exempt: nothing to practise");

  // Written expression is held at its target, so the plan keeps it sharp, with no new items and no nudge.
  const panel = page.getByRole("tabpanel");
  await expect(panel.getByText(/^You hold C, your target, so today only keeps it sharp/)).toBeVisible();
  await expect(panel.getByText("Targeted practice")).toHaveCount(0);
  await expect(panel.getByRole("heading", { name: /diagnostic/i })).toHaveCount(0);
  await expect(page.getByRole("img", { name: "Written expression: you hold C. Your target is C." })).toBeVisible();
  await axeClean(page);
});

test("the study settings change a result, and today follows it, to the all-exempt celebration (D259)", async ({ page }) => {
  await onboard(page, "skip", { results: { Reading: "E", "Written expression": "E" } });
  await expect(planTabs(page)).toHaveText(["Oral expression"]);

  await page.getByRole("contentinfo").getByRole("link", { name: "Your levels" }).click();
  await expect(page).toHaveURL(/\/en\/settings\/study$/);
  await expect(page.getByRole("heading", { level: 1, name: "Your levels and goals" })).toBeVisible();
  const save = page.getByRole("button", { name: "Save changes" });
  await expect(save).toBeDisabled();
  await page.getByRole("group", { name: "Oral expression", exact: true }).first().getByRole("radio", { name: "E", exact: true }).check();
  await axeClean(page);
  await save.click();
  await expect(page.getByRole("status").filter({ hasText: "Saved." })).toBeVisible();

  await page.getByRole("link", { name: "Back to today" }).click();
  await expect(page.getByRole("heading", { name: "You hold E in all three" })).toBeVisible();
  await expect(page.getByRole("tablist", { name: "Practising" })).toHaveCount(0);
  await axeClean(page);
});

test("the study settings offer onboarding before there is a profile, and render in French (D259)", async ({ page }) => {
  await page.goto("/fr/settings/study");
  await expect(page.getByRole("heading", { level: 1, name: "Vos niveaux et vos objectifs" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Préparer votre pratique" })).toBeVisible();
  await axeClean(page);

  await page.goto("/fr/start");
  await page.getByRole("button", { name: "Continuer" }).click();
  await page.getByRole("button", { name: "Continuer" }).click();
  await expect(page.getByRole("heading", { name: "Quels résultats d’ELS détenez-vous déjà?" })).toBeFocused();
  await axeClean(page);
});
