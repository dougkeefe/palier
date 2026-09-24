import { expect, type Page, test } from "@playwright/test";

/**
 * [R4]: "must work with no API key and no network after first load." Runs against a
 * production server (the `offline` project), because the service worker registers
 * only in production builds.
 *
 * One online load is the whole setup: the worker precaches every route in both
 * locales and the whole served bank on install, so the assertions below include a
 * route and bank shards this page never requested.
 */

/** Wait until the worker has installed (so precaching is done) and controls the page. */
const waitForOfflineReady = async (page: Page) => {
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
  });
  await page.waitForFunction(() => navigator.serviceWorker.controller !== null);
};

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
});

test("every shard of the served bank is readable offline, not only the ones fetched online", async ({
  page,
  context,
}) => {
  await page.goto("/en");
  await waitForOfflineReady(page);
  await context.setOffline(true);

  const result = await page.evaluate(async () => {
    const manifest = (await (await fetch("/content/bank/v1/manifest.json")).json()) as {
      shards: { path: string }[];
      passageShards: { path: string }[];
    };
    const paths = [...manifest.shards, ...manifest.passageShards].map((entry) => `/content/${entry.path}`);
    const responses = await Promise.all(paths.map((path) => fetch(path)));
    const items = (await responses[0]!.json()) as unknown[];
    return { files: paths.length, allOk: responses.every((r) => r.ok), firstShardItems: items.length };
  });

  expect(result.files).toBeGreaterThan(0);
  expect(result.allOk).toBe(true);
  expect(result.firstShardItems).toBeGreaterThan(0);
});
