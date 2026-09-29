import { expect, test } from "@playwright/test";

import { BANK_MANIFEST, drillThroughByKeyboard, onboard, waitForOfflineReady } from "./helpers";

/**
 * [R4]: "must work with no API key and no network after first load." Runs against a
 * production server (the `offline` project), because the service worker registers
 * only in production builds.
 *
 * One online load is the whole setup: the worker precaches every route in both
 * locales and the whole served bank on install, so the assertions below include a
 * route and bank shards this page never requested.
 */

test("after one online load, the shell reloads with the network off", async ({ page, context }) => {
  await page.goto("/en");
  await waitForOfflineReady(page);

  await context.setOffline(true);
  await page.reload();

  await expect(page.locator("html")).toHaveAttribute("lang", "en");
  await expect(page.locator(".app-footer__disclaimer")).toContainText("not affiliated");
});

test("a route never visited online still opens offline, in the other locale", async ({ page, context }) => {
  await page.goto("/en");
  await waitForOfflineReady(page);

  await context.setOffline(true);
  await page.goto("/fr/about");

  await expect(page.locator("html")).toHaveAttribute("lang", "fr");
  await expect(page.locator("main")).not.toBeEmpty();

  // A library article too: a dynamic route, precached by name from the content (D159).
  await page.goto("/fr/library/pronouns");
  await expect(page.getByRole("heading", { level: 1, name: "Les pronoms" })).toBeVisible();
});

test("the three self-hosted faces are precached, the passage serif too, which no page preloads (D159)", async ({
  page,
}) => {
  await page.goto("/en");
  await waitForOfflineReady(page);

  const fonts = await page.evaluate(async () => {
    const urls: string[] = [];
    for (const name of await caches.keys()) {
      for (const request of await (await caches.open(name)).keys()) urls.push(new URL(request.url).pathname);
    }
    return urls.filter((url) => url.endsWith(".woff2")).map((url) => url.split("/").pop() ?? "");
  });
  for (const family of ["inter", "figtree", "source_serif_4"]) {
    expect(fonts.some((file) => file.startsWith(family)), `${family} in ${fonts.join(", ")}`).toBe(true);
  }
});

test("every shard and form of the served bank is readable offline, not only the ones fetched online", async ({
  page,
  context,
}) => {
  await page.goto("/en");
  await waitForOfflineReady(page);
  await context.setOffline(true);

  const result = await page.evaluate(async (manifestUrl) => {
    const manifest = (await (await fetch(manifestUrl)).json()) as {
      shards: { path: string }[];
      passageShards: { path: string }[];
      forms: { path: string }[];
    };
    const paths = [...manifest.shards, ...manifest.passageShards, ...manifest.forms].map(
      (entry) => `/content/${entry.path}`,
    );
    const responses = await Promise.all(paths.map((path) => fetch(path)));
    const items = (await responses[0]!.json()) as unknown[];
    return {
      files: paths.length,
      forms: manifest.forms.length,
      allOk: responses.every((r) => r.ok),
      firstShardItems: items.length,
    };
  }, BANK_MANIFEST);

  expect(result.files).toBeGreaterThan(0);
  expect(result.forms).toBeGreaterThan(0);
  expect(result.allOk).toBe(true);
  expect(result.firstShardItems).toBeGreaterThan(0);
});

/**
 * Journey 2 with the network off — the case that makes [R4] true rather than only the
 * shell. Onboarding happens online, so the profile is in IndexedDB. Then, offline, a
 * full page load of a drill comes from the worker's cache, the bank from its cached
 * shards and the progress from IndexedDB, and a whole session runs to its end.
 */
test("journey 2 offline: after one online load, a whole daily session runs with the network off", async ({
  page,
  context,
}) => {
  await onboard(page, "skip");
  await expect(page).toHaveURL(/\/en\/home$/);
  await waitForOfflineReady(page);

  await context.setOffline(true);
  await page.goto("/en/practice/reading");
  const total = await drillThroughByKeyboard(page);
  expect(total).toBeGreaterThan(0);
  await expect(page.getByRole("heading", { name: "Set complete" })).toBeVisible();

  // Today still opens offline, reading the session just finished back from IndexedDB.
  await page.goto("/en/home");
  await expect(page.getByRole("heading", { name: "Today’s plan" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Review queue" })).toBeVisible();
});

/**
 * Journey 7's single-device half (§6.2): the network drops in the middle of a session,
 * and the session still finishes. The "sync catches up" half needs sync, which is
 * Slice 2.
 */
test("journey 7: the network drops mid-session, and the session still finishes", async ({ page, context }) => {
  await onboard(page, "skip");
  await expect(page).toHaveURL(/\/en\/home$/);
  await waitForOfflineReady(page);

  await page.getByRole("link", { name: /^Start, \d+ min$/ }).click();
  await expect(page.locator(".app-session__count")).toHaveText(/Item 1 of \d+/);
  await page.keyboard.press("1");
  await page.keyboard.press("Enter");
  await expect(page.getByRole("region", { name: /Correct|Not quite/ })).toBeVisible();

  await context.setOffline(true);
  await page.keyboard.press("Enter");
  const total = Number(/of (\d+)/.exec((await page.locator(".app-session__count").textContent()) ?? "")?.[1]);
  for (let i = 2; i <= total; i++) {
    await expect(page.locator(".app-session__count")).toHaveText(`Item ${i} of ${total}`);
    await page.keyboard.press("1");
    await page.keyboard.press("Enter");
    await expect(page.getByRole("region", { name: /Correct|Not quite/ })).toBeVisible();
    await page.keyboard.press("Enter");
  }
  await expect(page.getByRole("heading", { name: "Set complete" })).toBeVisible();

  await context.setOffline(false);
  await page.getByRole("link", { name: "Back to today" }).click();
  await expect(page.getByRole("heading", { name: "Today’s plan" })).toBeVisible();
});
