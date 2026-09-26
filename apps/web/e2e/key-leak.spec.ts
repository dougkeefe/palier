import { type Browser, expect, type Page, test } from "@playwright/test";

import { drillThroughByKeyboard, onboard, setSize } from "./helpers";
import { SENTINEL, downloadedText, stubOpenAi, watchForLeaks } from "./leak-guard";

/**
 * The key-leak test, tier 11 (implementation-plan.md §6.2; Phase 4 exit criterion 1; [R12]),
 * on the hermetic lane. "The single most important test in the repo."
 *
 * A sentinel key is entered through the UI, checked against a stubbed OpenAI, and then
 * everything else the app does is driven with it held: the diagnostic, a drill, the review
 * queue, a mock exam with telemetry shared (through the real route and PGlite), an export,
 * and a pairing with a second device so real sync pushes and pulls cross the wire. The
 * guard then asserts the sentinel reached nowhere but OpenAI: no request or response of our
 * own, no console line, no error, no storage, no DOM, no field and no export file.
 *
 * The hermetic container lives for one page load, so this moves by in-app links only. The
 * at-rest half on real IndexedDB is `key-leak-production.spec.ts`.
 */

const openSettings = async (page: Page, name: string, heading: string) => {
  await page.getByRole("link", { name, exact: true }).click();
  await expect(page.getByRole("heading", { level: 1, name: heading })).toBeVisible();
};

const syncNow = async (page: Page) => {
  const pull = page.waitForRequest((r) => r.method() === "GET" && new URL(r.url()).pathname === "/api/sync");
  await page.getByRole("button", { name: "Sync now" }).click();
  await (await pull).response();
  const status = page.getByRole("status").filter({ hasText: /^Last synced/ });
  await expect(status).toHaveAttribute("aria-busy", "false");
};

const device = async (browser: Browser) => {
  const context = await browser.newContext();
  const watch = watchForLeaks(context);
  await stubOpenAi(context);
  return { page: await context.newPage(), watch };
};

test("the sentinel key never leaves for anywhere but OpenAI, across every journey [R12]", async ({ browser }) => {
  test.setTimeout(240_000);
  const laptop = await device(browser);
  const page = laptop.page;

  // 1. Onboarding, then the diagnostic. The key step comes after it, never before (§8.1).
  await onboard(page, "diagnostic");
  await page.getByRole("radio", { name: "Reading" }).check();
  await page.getByRole("button", { name: "Start the Reading diagnostic" }).click();
  const total = await setSize(page);
  for (let i = 1; i <= total; i++) {
    await expect(page.locator(".app-session__count")).toHaveText(`Item ${String(i)} of ${String(total)}`);
    await page.keyboard.press("1");
    await page.keyboard.press("Enter");
  }
  await expect(page.getByRole("heading", { name: "Your Reading diagnostic" })).toBeVisible();

  // 2. Step 5, on the readout: add the key.
  await page.getByRole("link", { name: "Add a key now" }).click();
  await expect(page.getByRole("heading", { level: 1, name: "Your API key" })).toBeVisible();
  await page.getByLabel("OpenAI API key").fill(SENTINEL);
  await page.getByRole("button", { name: "Save the key" }).click();
  await expect(page.getByText(`Saved on this device: the key ending in ${SENTINEL.slice(-4)}.`)).toBeVisible();
  // After entry the field is gone, and the key is described by its last four only (§6.2).
  await expect(page.getByLabel("OpenAI API key")).toHaveCount(0);
  await page.getByRole("button", { name: "Check the key" }).click();
  await expect(page.getByRole("status").filter({ hasText: "This key works." })).toBeVisible();
  // The positive control: the key really was in play, and it went to OpenAI, as a bearer token.
  expect(laptop.watch.openAiAuthorizations()).toEqual([`Bearer ${SENTINEL}`]);

  // 3. A drill, then the review queue. The diagnostic used up the fixture bank's reading
  // items, so the drill is written expression.
  await page.getByRole("link", { name: "Today", exact: true }).click();
  await page.getByRole("radio", { name: "Written expression" }).check();
  await page.getByRole("link", { name: /^Start, \d+ min$/ }).click();
  await drillThroughByKeyboard(page);
  await page.getByRole("link", { name: "Back to today" }).click();
  await page.getByRole("link", { name: "Review", exact: true }).click();
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();

  // 4. A mock exam, submitted, with its answers shared (the real telemetry route, on PGlite).
  await page.getByRole("link", { name: "Today", exact: true }).click();
  await page.getByRole("link", { name: "Take a mock exam" }).first().click();
  await page.getByRole("radio", { name: /Unsupervised/ }).check();
  await page.getByRole("button", { name: "Start the exam" }).click();
  for (let i = 0; i < 3; i++) {
    await expect(page.locator(".app-exam__count")).toContainText(`Item ${String(i + 1)} of`);
    await page.keyboard.press("1");
    await page.keyboard.press("Enter");
  }
  await expect(page.locator(".app-exam__count")).toContainText("3 answered");
  await page.getByRole("button", { name: "Submit the exam" }).click();
  await page.getByRole("dialog", { name: "Submit the exam?" }).getByRole("button", { name: "Submit", exact: true }).click();
  const telemetry = page.waitForResponse((r) => new URL(r.url()).pathname === "/api/telemetry");
  await page.getByRole("region", { name: "Help make these items better" }).getByRole("button", { name: "Share my answers" }).click();
  expect((await telemetry).status()).toBe(202);

  // 5. An export: the file holds everything this device has, and never the key.
  await openSettings(page, "Your data", "Your data");
  const [download] = await Promise.all([
    page.waitForEvent("download"),
    page.getByRole("button", { name: "Download everything (JSON)" }).click(),
  ]);
  const exported = await downloadedText(download);
  expect(exported).toContain("attempts");
  expect(exported).not.toContain(SENTINEL);

  // 6. Sync, and a second device paired by code: real pushes and pulls through the routes.
  await openSettings(page, "Sync", "Sync");
  await syncNow(page);
  await page.getByRole("button", { name: "Show a code" }).click();
  const code = (await page.locator(".app-code").textContent())?.trim() ?? "";
  const phone = await device(browser);
  await onboard(phone.page, "skip");
  await openSettings(phone.page, "Sync", "Sync");
  await phone.page.getByLabel("Code").fill(code);
  await phone.page.getByRole("button", { name: "Link this device" }).click();
  await expect(phone.page.getByRole("status").filter({ hasText: /^This device is linked\./ })).toBeVisible();
  await syncNow(phone.page);
  await syncNow(page);

  // 7. The key is still held, and still only masked.
  await openSettings(page, "Your API key", "Your API key");
  await expect(page.getByText(`Saved on this device: the key ending in ${SENTINEL.slice(-4)}.`)).toBeVisible();

  await laptop.watch.assertNoLeak([page]);
  await phone.watch.assertNoLeak([phone.page]);
});
