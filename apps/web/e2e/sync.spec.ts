import { type Browser, expect, type Page, test } from "@playwright/test";

import { axeClean, drillThroughByKeyboard, onboard } from "./helpers";

/**
 * Sync, on the hermetic lane: each browser context is its own device (its page load
 * mints a secret and an id stream, progress.md D71), and the dev server's sync routes
 * run the real handlers over an in-process PGlite (D70). As in every hermetic journey,
 * everything moves by in-app links once there is state, never `page.goto`.
 */

const device = async (browser: Browser): Promise<Page> => (await browser.newContext()).newPage();

const openSync = async (page: Page) => {
  await page.getByRole("link", { name: "Sync", exact: true }).click();
  await expect(page.getByRole("heading", { level: 1, name: "Sync" })).toBeVisible();
};

/**
 * Sync on demand, and return only once *this* exchange has landed. The status can
 * already read "Last synced" from an earlier run, and the hermetic clock is fixed, so
 * neither its presence nor its time tells runs apart. So: wait for a pull sent after
 * the click (every earlier write by the other device is on the server by then), then
 * for the status to stop being busy, which it does only once the pull is applied.
 */
const syncNow = async (page: Page) => {
  const pull = page.waitForRequest(
    (request) => request.method() === "GET" && new URL(request.url()).pathname === "/api/sync",
  );
  await page.getByRole("button", { name: "Sync now" }).click();
  await (await pull).response();
  const status = page.getByRole("status").filter({ hasText: /^Last synced/ });
  await expect(status).toBeVisible();
  await expect(status).toHaveAttribute("aria-busy", "false");
};

const answeredOn = (page: Page) => page.getByText(/\d+ items? answered/);

/** Drill today's set from wherever the header's Today link is. */
const drill = async (page: Page): Promise<number> => {
  await page.getByRole("link", { name: "Today", exact: true }).click();
  await page.getByRole("link", { name: /^Start, \d+ min$/ }).click();
  const answered = await drillThroughByKeyboard(page);
  await page.getByRole("link", { name: "Back to today" }).click();
  return answered;
};

/**
 * Journey 8 (implementation-plan.md §6.2): "two browser contexts as two devices,
 * confirming progress converges". The Phase 2 exit criterion's two-device half
 * [R1, R4, R10, R14]: paired by code, progress following both, the same figures on each.
 */
test("journey 8: two devices paired by code converge on the same progress [R14]", async ({ browser }) => {
  test.setTimeout(120_000);
  const laptop = await device(browser);
  const phone = await device(browser);

  // The laptop practises, syncs, and shows a code.
  await onboard(laptop, "skip");
  const first = await drill(laptop);
  await openSync(laptop);
  await syncNow(laptop);
  await laptop.getByRole("button", { name: "Show a code" }).click();
  const code = (await laptop.locator(".app-code").textContent())?.trim() ?? "";
  expect(code).toMatch(/^[A-HJKMNP-Z2-9]{6}$/);
  await axeClean(laptop);

  // The phone links with the code, by keyboard, and the laptop's progress arrives.
  await onboard(phone, "skip");
  await openSync(phone);
  await phone.getByLabel("Code").focus();
  await phone.keyboard.type(code.toLowerCase());
  await phone.keyboard.press("Enter");
  await expect(phone.getByRole("status").filter({ hasText: /^This device is linked\./ })).toBeVisible();
  await axeClean(phone);
  await expect(phone.locator(".app-device")).toHaveCount(2);
  await phone.getByRole("link", { name: "Progress" }).click();
  await expect(answeredOn(phone)).toHaveText(`${String(first)} items answered`);

  // The phone practises too, and the laptop catches up.
  const second = await drill(phone);
  await openSync(phone);
  await syncNow(phone);
  await syncNow(laptop);
  await laptop.getByRole("link", { name: "Progress" }).click();
  await phone.getByRole("link", { name: "Progress" }).click();
  await expect(answeredOn(laptop)).toHaveText(`${String(first + second)} items answered`);
  await expect(answeredOn(phone)).toHaveText(`${String(first + second)} items answered`);

  // Identical figures on both: the whole progress screen reads the same.
  expect(await laptop.locator("main").innerText()).toBe(await phone.locator("main").innerText());
});

/**
 * Journey 7's second half (§6.2: "coming back online, and confirming sync catches up").
 * Its offline half runs against the production build in `offline.spec.ts`; this half
 * needs a sync service, which only the hermetic lane has (D72).
 */
test("journey 7: a session finished offline syncs when the network returns", async ({ browser }) => {
  test.setTimeout(120_000);
  const laptop = await device(browser);
  const phone = await device(browser);
  await onboard(laptop, "skip");
  await drill(laptop);
  await openSync(laptop);
  await syncNow(laptop);
  await laptop.getByRole("button", { name: "Show a code" }).click();
  const code = (await laptop.locator(".app-code").textContent())?.trim() ?? "";
  await onboard(phone, "skip");
  await openSync(phone);
  await phone.getByLabel("Code").fill(code);
  await phone.getByRole("button", { name: "Link this device" }).click();
  await expect(phone.getByRole("status").filter({ hasText: /^This device is linked\./ })).toBeVisible();
  await phone.getByRole("link", { name: "Progress" }).click();
  const before = Number(/\d+/.exec((await answeredOn(phone).textContent()) ?? "")?.[0]);

  // The laptop starts a session, loses the network mid-way, and finishes anyway.
  await laptop.getByRole("link", { name: "Today", exact: true }).click();
  await laptop.getByRole("link", { name: /^Start, \d+ min$/ }).click();
  await expect(laptop.locator(".app-session__count")).toHaveText(/Item 1 of \d+/);
  await laptop.context().setOffline(true);
  const offline = await drillThroughByKeyboard(laptop);
  await expect(laptop.getByRole("link", { name: "Offline" })).toBeVisible();

  // Back online: the reconnect trigger syncs without being asked (§9.4).
  await laptop.context().setOffline(false);
  await expect(laptop.getByRole("link", { name: "Synced" })).toBeVisible({ timeout: 15_000 });

  await openSync(phone);
  await syncNow(phone);
  await phone.getByRole("link", { name: "Progress" }).click();
  await expect(answeredOn(phone)).toHaveText(`${String(before + offline)} items answered`);
});

test("the sync settings are keyboard-reachable and axe-clean in every state [R9]", async ({ page }) => {
  await onboard(page, "skip");
  await openSync(page);
  await expect(page.getByRole("status").filter({ hasText: /^Not synced yet/ })).toBeVisible();
  await axeClean(page);

  // A code that cannot be one is caught before a request is spent on it.
  await page.getByLabel("Code").fill("0O1");
  await page.getByRole("button", { name: "Link this device" }).click();
  await expect(page.getByRole("status").filter({ hasText: "does not look like a code" })).toBeVisible();
  // A well-formed code the server never issued is rejected, and says what to do.
  await page.getByLabel("Code").fill("ZZZZZZ");
  await page.getByRole("button", { name: "Link this device" }).click();
  await expect(page.getByRole("status").filter({ hasText: "That code did not work" })).toBeVisible();
  await axeClean(page);

  // Showing a code registers this device; it then lists itself.
  await page.getByRole("button", { name: "Show a code" }).click();
  await expect(page.locator(".app-code")).toHaveText(/^[A-HJKMNP-Z2-9]{6}$/);
  await expect(page.getByText("This device", { exact: true })).toBeVisible();
  await axeClean(page);

  // Off, by keyboard: the offer to delete the server copy takes focus.
  const toggle = page.getByRole("switch", { name: "Sync my progress across my devices" });
  await toggle.focus();
  await page.keyboard.press("Space");
  await expect(toggle).not.toBeChecked();
  await expect(page.getByRole("heading", { name: /Delete the copy on our server too\?/ })).toBeFocused();
  await expect(page.getByRole("link", { name: "Sync off" })).toBeVisible();
  await axeClean(page);
  await page.getByRole("button", { name: "Delete the server copy" }).click();
  await expect(page.getByRole("status").filter({ hasText: "has been deleted" })).toBeVisible();

  // The danger zone asks once, in place.
  await page.getByRole("button", { name: "Delete everything everywhere" }).click();
  await expect(page.getByRole("heading", { name: "Delete everything, everywhere?" })).toBeFocused();
  await axeClean(page);
  await page.getByRole("button", { name: "Cancel" }).click();
});

/**
 * Removing a device (product-requirements.md §8.11; progress.md D145's Slice 3): it asks first,
 * in place, and Cancel goes back to the button; the code says how long it has left. The removed
 * device notices on its next exchange, says why sync stopped, and turns its own switch off.
 */
test("removing a device asks first, and the removed device notices and says so", async ({ browser }) => {
  test.setTimeout(120_000);
  const laptop = await device(browser);
  const phone = await device(browser);
  await onboard(laptop, "skip");
  await drill(laptop);
  await openSync(laptop);
  await syncNow(laptop);
  await laptop.getByRole("button", { name: "Show a code" }).click();
  await expect(laptop.getByText(/^Valid for 10 more minutes, until /)).toBeVisible();
  const code = (await laptop.locator(".app-code").textContent())?.trim() ?? "";
  await onboard(phone, "skip");
  await openSync(phone);
  await phone.getByLabel("Code").fill(code);
  await phone.getByRole("button", { name: "Link this device" }).click();
  await expect(phone.getByRole("status").filter({ hasText: /^This device is linked\./ })).toBeVisible();
  await expect(phone.locator(".app-device")).toHaveCount(2);

  // The phone removes the laptop, and asks first; Cancel goes back to the button.
  const remove = phone.getByRole("button", { name: /^Remove (?!this device)/ });
  await remove.click();
  await expect(phone.getByRole("heading", { name: /^Remove .+\?$/ })).toBeFocused();
  await axeClean(phone);
  await phone.getByRole("button", { name: "Cancel" }).click();
  await expect(remove).toBeFocused();
  await remove.click();
  await phone.getByRole("button", { name: "Remove", exact: true }).click();
  await expect(phone.locator(".app-device")).toHaveCount(1);

  // The laptop's next exchange is refused: it says it was removed, and its switch is off.
  await laptop.getByRole("button", { name: "Sync now" }).click();
  await expect(laptop.getByRole("status").filter({ hasText: /^This device was removed from sync/ })).toBeVisible();
  await expect(laptop.getByRole("switch", { name: "Sync my progress across my devices" })).not.toBeChecked();
  await axeClean(laptop);
});
