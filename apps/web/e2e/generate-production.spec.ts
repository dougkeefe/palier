import { expect, test } from "@playwright/test";

import { axeClean } from "./helpers";
import { SENTINEL, stubOpenAi } from "./leak-guard";

/**
 * Fresh practice items against the production server (the `offline` project), where the key vault is
 * real IndexedDB, shared by every tab of the origin. That makes one failure reachable that the
 * hermetic lane cannot stage: the key removed in another tab while this one is at the pre-flight.
 * The run fails as "no key", PRD §14's inline card takes the form's place, and focus lands on its
 * heading rather than falling back to the page (WCAG 2.4.3, progress.md D111).
 */

test("a key removed in another tab mid-run: the no-key card replaces the form and takes focus", async ({ page, context }) => {
  await stubOpenAi(context);
  await page.goto("/en/settings/key");
  await page.getByLabel("OpenAI API key").fill(SENTINEL);
  await page.getByRole("button", { name: "Save the key" }).click();
  await expect(page.getByText(/^Saved on this device/)).toBeVisible();

  await page.goto("/en/practice/writing/generate");
  await page.getByRole("button", { name: "Generate a fresh set" }).click();
  await expect(page.getByRole("heading", { name: "Before generating" })).toBeFocused();

  // Another tab removes the key from the shared vault.
  const other = await context.newPage();
  await other.goto("/en/settings/key");
  await other.getByRole("button", { name: "Remove the key" }).click();
  await expect(other.getByLabel("OpenAI API key")).toBeVisible();
  await other.close();

  await page.getByRole("button", { name: "Generate the set" }).click();
  await expect(page.getByRole("heading", { name: "Fresh items need an OpenAI key" })).toBeFocused();
  await axeClean(page);
});
