import { expect, test } from "@playwright/test";

import { axeClean, onboard } from "./helpers";
import { SENTINEL, stubOpenAi } from "./leak-guard";

/**
 * Journey 5 (implementation-plan.md §6.2): "adding, validating and wiping an API key", on
 * the hermetic lane, where the container lives for one page load, so everything moves by
 * in-app links. OpenAI is stubbed with `page.route`, scripted per step, so each state the
 * key screen can show is reached for real through the real adapter (PRD §8.10, §14;
 * progress.md D100). Every state is audited by axe [R9].
 */

type Answer = { status: number; body: unknown };
const OK: Answer = { status: 200, body: { object: "list", data: [{ id: "gpt-stub", object: "model" }] } };
const refusal = (status: number, code: string): Answer => ({ status, body: { error: { message: code, code } } });

test("journey 5: onboarding's step 5 leads to the key, which is saved, checked, refused, removed and kept for a tab", async ({
  page,
  context,
}) => {
  let answer = OK;
  await stubOpenAi(context, () => answer);

  // Step 5, the skip path's last step: "Add a key now" saves the profile and opens the key screen.
  await onboard(page, "skip", { addKey: true });
  await expect(page).toHaveURL(/\/en\/settings\/key$/);
  await expect(page.getByRole("heading", { level: 1, name: "Your API key" })).toBeVisible();
  await expect(page.getByText("Where your key is kept")).toBeVisible();
  await axeClean(page);

  // A blank save is caught, and says what to do.
  await page.getByRole("button", { name: "Save the key" }).click();
  await expect(page.getByRole("status").filter({ hasText: "Paste a key first." })).toBeVisible();

  // Save: the field is masked, then emptied, and the key is described by its last four only.
  const field = page.getByLabel("OpenAI API key");
  await expect(field).toHaveAttribute("type", "password");
  await field.fill(SENTINEL);
  await page.getByRole("button", { name: "Save the key" }).click();
  const ending = SENTINEL.slice(-4);
  await expect(page.getByText(`Saved on this device: the key ending in ${ending}.`)).toBeVisible();
  await expect(page.getByRole("heading", { name: "Your key", exact: true })).toBeFocused();
  await axeClean(page);

  // Check: each answer OpenAI can give, in plain words.
  const check = async (next: Answer, says: string) => {
    answer = next;
    await page.getByRole("button", { name: "Check the key" }).click();
    await expect(page.getByRole("status").filter({ hasText: says })).toBeVisible();
    await axeClean(page);
  };
  await check(OK, "This key works. OpenAI accepted it.");
  await check(refusal(401, "invalid_api_key"), "OpenAI did not accept this key.");
  await check(refusal(429, "insufficient_quota"), "has reached its usage limit or has no credit left");
  await check(refusal(500, "server_error"), "OpenAI returned an error (500).");
  await check({ status: 200, body: { object: "list" } }, "was not what Palier expected");

  // Remove: the form comes back, focused, and says so.
  await page.getByRole("button", { name: "Remove the key" }).click();
  await expect(page.getByRole("status").filter({ hasText: "The key has been removed" })).toBeVisible();
  await expect(field).toBeFocused();

  // For this tab only.
  await field.fill(SENTINEL);
  await page.getByRole("checkbox", { name: /for this tab only/ }).check();
  await page.getByRole("button", { name: "Save the key" }).click();
  await expect(page.getByText(`Held for this tab only: the key ending in ${ending}.`)).toBeVisible();
  answer = OK;
  await page.getByRole("button", { name: "Check the key" }).click();
  await expect(page.getByRole("status").filter({ hasText: "This key works." })).toBeVisible();

  // The profile was saved before step 5 left the wizard: today has a plan.
  await page.getByRole("link", { name: "Today", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Today’s plan" })).toBeVisible();

  // A wipe takes the key too.
  await page.getByRole("link", { name: "Your data", exact: true }).click();
  await page.getByRole("button", { name: "Delete everything" }).click();
  await page.getByRole("button", { name: "Yes, delete everything" }).click();
  await expect(page.getByText("Everything on this device has been deleted.")).toBeVisible();
  await page.getByRole("link", { name: "Your API key", exact: true }).click();
  await expect(field).toBeVisible();
  await expect(page.getByText(/the key ending in/)).toHaveCount(0);
});

test("step 5 is the skip path's last step: three lines, the guide, and it can be passed over", async ({ page }) => {
  await page.goto("/en/start");
  const next = page.getByRole("button", { name: "Continue" });
  await expect(next).toBeEnabled();
  for (let i = 0; i < 4; i++) await next.click();
  await expect(page.getByText("Step 5 of 5")).toBeVisible();
  const heading = page.getByRole("heading", { name: "An OpenAI key, if you want one" });
  await expect(heading).toBeFocused();
  await expect(page.getByText("sent only to OpenAI")).toBeVisible();
  await axeClean(page);

  await page.getByRole("link", { name: "How to create a key and set a spend limit" }).click();
  await expect(page.getByRole("heading", { level: 1, name: "Create an OpenAI key" })).toBeVisible();
  await expect(page.getByRole("link", { name: "OpenAI’s limits page" })).toHaveAttribute(
    "href",
    /^https:\/\/platform\.openai\.com\//,
  );
  await axeClean(page);
});

test("step 5 comes after the diagnostic on the diagnostic path, never before it (§8.1)", async ({ page }) => {
  await onboard(page, "diagnostic");
  await expect(page).toHaveURL(/\/en\/diagnostic$/);
  await expect(page.getByRole("heading", { name: "An OpenAI key, if you want one" })).toHaveCount(0);
});

test("the key screen and its guide render in French too, at parity", async ({ page }) => {
  await page.goto("/fr/settings/key");
  await expect(page.getByRole("heading", { level: 1, name: "Votre clé d’API" })).toBeVisible();
  await expect(page.getByLabel("Clé d’API OpenAI")).toBeVisible();
  await axeClean(page);
  await page.goto("/fr/settings/key/guide");
  await expect(page.getByRole("heading", { level: 1, name: "Créer une clé OpenAI" })).toBeVisible();
  await axeClean(page);
});
