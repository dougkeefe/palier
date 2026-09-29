import { expect, test } from "@playwright/test";

import { axeClean, BANK_MANIFEST, onboard } from "./helpers";

/**
 * Journeys that need the **production** graph — real IndexedDB, the served bank, and
 * the real clock — because the hermetic container's clock is fixed. Runs in the
 * `offline` project, on `next start`.
 */

/**
 * Journey 4 (§6.2): the review queue emptying and the empty state appearing. A wrong
 * answer is due at the profile's first interval, so the browser clock is moved two days
 * on to bring it due.
 */
test("journey 4: wrong answers come due, the queue empties, and the empty state appears", async ({ page }) => {
  // Pin the date only. `setFixedTime` fixes what `Date` reports and leaves every timer
  // running, which Dexie and React need; installing fake timers stalls them.
  const START = Date.parse("2026-09-24T09:00:00.000Z");
  await page.clock.setFixedTime(START);
  await onboard(page, "skip");
  await page.getByRole("link", { name: /^Start, \d+ min$/ }).click();

  // Answer every item with its first option. The clock is pinned and the selection seed
  // is per day (D58), so the plan, and so which answers are wrong, is the same every run.
  const line = page.locator(".app-session__count");
  await expect(line).toHaveText(/Item 1 of \d+/);
  const total = Number(/of (\d+)/.exec((await line.textContent()) ?? "")?.[1]);
  for (let i = 1; i <= total; i++) {
    await expect(line).toHaveText(`Item ${i} of ${total}`);
    await page.keyboard.press("1");
    await page.keyboard.press("Enter");
    await expect(page.getByRole("region", { name: /Correct|Not quite/ })).toBeVisible();
    await page.keyboard.press("Enter");
  }
  await expect(page.getByRole("heading", { name: "Set complete" })).toBeVisible();
  const summary = (await page.getByText(/^\d+ of \d+ correct\.$/).textContent()) ?? "";
  const wrong = total - Number(/^(\d+)/.exec(summary)?.[1]);
  // Without a wrong answer there is nothing to bring due, and the test would prove nothing.
  expect(wrong).toBeGreaterThan(0);

  // Today, nothing is due yet: a wrong answer waits for the first interval.
  await page.getByRole("link", { name: "Review", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Nothing due" })).toBeVisible();

  // Two days on, every wrong answer is due. Leave the review screen and come back, so
  // it mounts afresh and asks for the queue at the new time. Today must have landed
  // before Review is clicked: `click()` resolves once the click is dispatched, not once
  // the client-side navigation commits, and a Review click that overtakes the pending
  // one to Today is a navigation to the route already on screen. The router keeps that
  // tree, the review screen never remounts, and it still shows the "Nothing due" it
  // read two days earlier.
  await page.clock.setFixedTime(START + 2 * 24 * 60 * 60 * 1000);
  await page.getByRole("link", { name: "Today", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Review queue" })).toBeVisible();
  await page.getByRole("link", { name: "Review", exact: true }).click();
  await expect(page.getByText(new RegExp(`^${wrong} items? due`))).toBeVisible();
  await expect(page.locator(".app-session__count")).toHaveText(`Item 1 of ${wrong}`);

  for (let i = 1; i <= wrong; i++) {
    await expect(page.locator(".app-session__count")).toHaveText(`Item ${i} of ${wrong}`);
    await page.keyboard.press("1");
    await page.keyboard.press("Enter");
    await expect(page.getByRole("region", { name: /Correct|Not quite/ })).toBeVisible();
    await page.keyboard.press("Enter");
  }
  await expect(page.getByRole("heading", { name: "Set complete" })).toBeVisible();

  // The set is done; what was answered right has left the queue for now.
  await page.getByRole("link", { name: "Back to today" }).click();
  await expect(page.getByRole("heading", { name: "Review queue" })).toBeVisible();
  await axeClean(page);
});

/**
 * architecture.md §12's baseline headers, on the production server, on a page and on a
 * bank file alike (progress.md D78).
 */
const SECURITY_HEADERS = {
  "strict-transport-security": "max-age=63072000; includeSubDomains",
  "x-content-type-options": "nosniff",
  "referrer-policy": "no-referrer",
  "permissions-policy": "microphone=(self), camera=(), geolocation=()",
};

test("sends the baseline security headers with a page", async ({ page }) => {
  const response = await page.goto("/en");

  expect(response?.headers()).toMatchObject(SECURITY_HEADERS);
});

test("sends the baseline security headers with a bank file", async ({ request }) => {
  const response = await request.get(BANK_MANIFEST);

  expect(response.headers()).toMatchObject(SECURITY_HEADERS);
});

/**
 * `GET /api/health` on the built server (architecture.md §10, progress.md D140): the build and
 * the bank it serves, uncached. This server has no `DATABASE_URL`, which is a working
 * deployment (ADR 21), so it answers 200 and says so.
 */
test("GET /api/health names the build and the bank, and that no database is configured", async ({ request }) => {
  const response = await request.get("/api/health");

  expect(response.status()).toBe(200);
  expect(response.headers()["cache-control"]).toBe("no-store");
  const body = (await response.json()) as { build: string; bank: number; database: string };
  expect(body).toEqual({ build: expect.stringMatching(/^(local|[0-9a-f]{7})$/) as unknown, bank: Number(/v(\d+)/.exec(BANK_MANIFEST)?.[1]), database: "not-configured" });
});

/** The error states' E2E hook is inert on a real build: the 404, unindexed, and nothing thrown (D142). */
test("the hermetic error hook is only the 404 on a production build", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/en/hermetic/route?leak=x");

  await expect(page.getByRole("heading", { level: 1, name: "Page not found" })).toBeVisible();
  await expect(page).toHaveTitle("Page not found · Palier");
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", /noindex/);
  expect(errors).toEqual([]);
});
