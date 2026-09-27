import { readFileSync } from "node:fs";

import type { ExamForm } from "@palier/domain";
import { expect, test } from "@playwright/test";

import { BANK_MANIFEST, axeClean, onboard, waitForOfflineReady } from "./helpers";

/**
 * Journey 9 (Phase 3 Slice 4, progress.md D92): a mock exam is submitted offline, the
 * candidate opts in to telemetry on the results screen, still offline, and the batch
 * arrives once the network returns — once, and carrying nothing that identifies anyone.
 *
 * It runs against the production server (the `offline` project), because the results
 * screen offline needs the service worker, and the queue must live in real IndexedDB.
 * That server has no database, so the route is stood in for here: it accepts a batch
 * while the test says the network is up, and fails like a dropped connection otherwise.
 */

const content = (path: string) => new URL(`../../../content/${path}`, import.meta.url);
const manifest = JSON.parse(readFileSync(content(BANK_MANIFEST.replace(/^\/content\//, "")), "utf8")) as {
  version: number;
  forms: { id: string; path: string }[];
};
// The form the picker offers: the highest version for the variant (D85). Since bank v3 a bank also
// carries the forms earlier versions published, so the first match by name is no longer it (D114).
const FORM = manifest.forms
  .filter((f) => f.id.includes("reading-unsupervised-"))
  .map((f) => JSON.parse(readFileSync(content(f.path), "utf8")) as ExamForm)
  .sort((a, b) => b.version - a.version)[0];
if (FORM === undefined) throw new Error("the committed bank has an unsupervised reading form");
const ANSWERED = 5;

type Batch = { readonly events: readonly Record<string, unknown>[] };

test("journey 9: opted in on the results screen offline, the exam's answers arrive once the network returns, with no identity", async ({
  page,
  context,
}) => {
  const batches: { body: Batch; headers: Record<string, string> }[] = [];
  let online = true;
  await context.route("**/api/telemetry", async (route) => {
    if (!online) return route.abort("internetdisconnected");
    batches.push({ body: route.request().postDataJSON() as Batch, headers: await route.request().allHeaders() });
    return route.fulfill({ status: 202, body: "" });
  });

  await onboard(page, "skip");
  await expect(page).toHaveURL(/\/en\/home$/);
  await waitForOfflineReady(page);

  // 1. Start the unsupervised reading exam online, and answer a few items.
  await page.goto("/en/exam");
  await page.getByRole("radio", { name: /Unsupervised/ }).check();
  await expect(page.getByText(`${String(FORM.itemIds.length)} items · ${String(FORM.timeLimitMinutes)} min`)).toBeVisible();
  await page.getByRole("button", { name: "Start the exam" }).click();
  await expect(page).toHaveURL(/\/en\/exam\/run\?run=/);
  for (let i = 0; i < ANSWERED; i++) {
    await expect(page.locator(".app-exam__count")).toContainText(`Item ${String(i + 1)} of ${String(FORM.itemIds.length)}`);
    await page.keyboard.press("1");
    await page.keyboard.press("Enter");
  }
  await expect(page.locator(".app-exam__count")).toContainText(`${String(ANSWERED)} answered`);

  // 2. The network drops. Submit offline.
  await context.setOffline(true);
  online = false;
  await page.getByRole("button", { name: "Submit the exam" }).click();
  await page.getByRole("dialog", { name: "Submit the exam?" }).getByRole("button", { name: "Submit", exact: true }).click();
  await expect(page).toHaveURL(/\/en\/exam\/results\?run=/);
  const resultsUrl = page.url();

  // 3. The prompt, once, above the walkthrough. Nothing has been sent: this device was never asked.
  const prompt = page.getByRole("region", { name: "Help make these items better" });
  await expect(prompt).toBeVisible();
  await expect(prompt).toContainText("What is never sent");
  await axeClean(page);
  expect(batches).toEqual([]);

  // 4. Opt in, still offline. The flush it asks for fails, and the batch stays queued.
  const failed = page.waitForEvent("requestfailed", (r) => new URL(r.url()).pathname === "/api/telemetry");
  await prompt.getByRole("button", { name: "Share my answers" }).click();
  await expect(prompt.getByRole("status")).toContainText("Thank you");
  await expect(prompt.getByRole("status")).toBeFocused();
  await failed;
  await axeClean(page);
  expect(batches).toEqual([]);

  // 5. The network returns: the batch arrives, once.
  online = true;
  await context.setOffline(false);
  await expect.poll(() => batches.length, { timeout: 15_000 }).toBe(1);
  const [batch] = batches;
  expect(batch?.body.events).toHaveLength(ANSWERED);
  for (const [i, event] of (batch?.body.events ?? []).entries()) {
    expect(Object.keys(event).sort()).toEqual(["bankVersion", "correct", "itemId", "responseMs", "restBucket"]);
    expect(event.itemId).toBe(FORM.itemIds[i]);
    expect(event.bankVersion).toBe(manifest.version);
  }
  // No credential and no cookie travel with it.
  expect(batch?.headers.authorization).toBeUndefined();
  expect(batch?.headers.cookie).toBeUndefined();

  // 6. Nothing is sent twice: a reload flushes an empty queue.
  await page.goto(resultsUrl);
  await expect(page.getByRole("heading", { name: "How sure you were" })).toBeVisible();
  // …and the prompt does not come back, whichever way it was answered.
  await expect(page.getByRole("region", { name: "Help make these items better" })).toHaveCount(0);
  await page.waitForLoadState("networkidle");
  expect(batches).toHaveLength(1);

  // 7. The choice shows in the data settings, for this device.
  await page.goto("/en/settings/data");
  await expect(page.getByText("This device shares how you answer mock exams")).toBeVisible();
  await axeClean(page);
});
