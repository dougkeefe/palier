import { readFileSync } from "node:fs";

import type { ExamForm, Item, ItemId, OptionId } from "@palier/domain";
import { scoreExam } from "@palier/engine";
import { expect, type Page, test } from "@playwright/test";

import { BANK_MANIFEST, axeClean, onboard, waitForOfflineReady } from "./helpers";

/**
 * Journey 3 (implementation-plan.md §6.2, Phase 3 exit criterion 2): a full
 * 90-minute exam survives a reload and a network drop. It runs against the
 * production server (the `offline` project), because a hermetic reload would lose
 * the in-memory run, and the network drop needs the service worker.
 *
 * The expected score is computed here, independently of the app: the committed
 * form and items are read off disk, the answers this test gives are applied, and
 * `scoreExam` maps them through the form's cuts.
 */

const content = (path: string) => new URL(`../../../content/${path}`, import.meta.url);
const manifest = JSON.parse(readFileSync(content(BANK_MANIFEST.replace(/^\/content\//, "")), "utf8")) as {
  shards: { path: string }[];
  forms: { id: string; path: string }[];
};
const formEntry = manifest.forms.find((f) => f.id.includes("reading-supervised"));
if (formEntry === undefined) throw new Error("the committed bank has a supervised reading form");
const FORM = JSON.parse(readFileSync(content(formEntry.path), "utf8")) as ExamForm;
const BANK = manifest.shards.flatMap((s) => JSON.parse(readFileSync(content(s.path), "utf8")) as Item[]);
const ITEMS = FORM.itemIds.map((id) => {
  const item = BANK.find((i) => i.id === id);
  if (item === undefined) throw new Error(`form item ${id} is in the bank`);
  return item;
});

/** The key this test presses for item i: 1 to 4 in turn, so every option is used. */
const keyFor = (i: number) => String((i % 4) + 1);
const optionFor = (i: number): OptionId => {
  const option = ITEMS[i]?.options[i % 4]?.id;
  if (option === undefined) throw new Error(`item ${i} has four options`);
  return option;
};
const FLAGGED = [3, 7];
const HALF = 30;

/** Seconds left on the exam clock, read off its "m:ss" face. */
const secondsLeft = async (page: Page): Promise<number> => {
  const text = (await page.locator(".pl-timer__time").textContent()) ?? "";
  const [m, s] = text.split(":").map(Number);
  return (m ?? 0) * 60 + (s ?? 0);
};

const answerByKeyboard = async (page: Page, from: number, to: number) => {
  for (let i = from; i < to; i++) {
    await expect(page.locator(".app-exam__count")).toContainText(`Item ${i + 1} of ${ITEMS.length}`);
    await page.keyboard.press(keyFor(i));
    if (FLAGGED.includes(i)) await page.keyboard.press("f");
    await page.keyboard.press("Enter");
  }
};

test("journey 3: a full 90-minute reading exam survives a reload and a network drop, and scores as the oracle does", async ({
  page,
  context,
}) => {
  expect(ITEMS).toHaveLength(60);
  expect(FORM.timeLimitMinutes).toBe(90);

  // Onboarding sets the study profile, so home can show the exam half at the end.
  await onboard(page, "skip");
  await expect(page).toHaveURL(/\/en\/home$/);
  await waitForOfflineReady(page);

  // 1. Choose the supervised reading exam and start it, online.
  await page.goto("/en/exam");
  await expect(page.getByRole("radio", { name: /Supervised/ })).toBeChecked();
  await expect(page.getByText("60 items · 90 min")).toBeVisible();
  await axeClean(page);
  await page.getByRole("button", { name: "Start the exam" }).click();
  await expect(page).toHaveURL(/\/en\/exam\/run\?run=/);
  await expect(page.locator(".pl-timer__time")).toHaveText(/^(90:00|89:5\d)$/);
  await axeClean(page);

  // 2. Answer the first half by keyboard, flagging two. Before the last of them, let
  // a few seconds of exam time run, so the answer that stores the clock records it:
  // thirty keyboard answers alone take under a second, and a clock that reads 90:00
  // both before and after a reload proves nothing.
  await answerByKeyboard(page, 0, HALF - 1);
  await expect(page.locator(".pl-timer__time")).toHaveText(/^89:(5[0-6]|[0-4]\d)$/, { timeout: 10_000 });
  await answerByKeyboard(page, HALF - 1, HALF);
  await expect(page.locator(".app-exam__count")).toContainText(`Item ${HALF + 1} of 60 · ${HALF} answered`);
  const before = await secondsLeft(page);

  // 3. Reload mid-run: the answers, the flags and the clock come back from IndexedDB.
  await page.reload();
  await expect(page.locator(".app-exam__count")).toContainText(`Item ${HALF + 1} of 60 · ${HALF} answered`);
  const after = await secondsLeft(page);
  expect(after).toBeLessThanOrEqual(90 * 60 - 4);
  // The clock resumes where it was, give or take the last checkpoint interval (10 s):
  // it never resets, and the time the page was gone is not counted.
  expect(Math.abs(after - before)).toBeLessThanOrEqual(12);
  await page.getByRole("button", { name: "All items" }).click();
  const navigator = page.getByRole("dialog", { name: "All items" });
  await expect(navigator).toBeVisible();
  await expect(navigator.getByRole("button", { name: /flagged/ })).toHaveCount(FLAGGED.length);
  await expect(navigator.getByRole("button", { name: /^Item \d+: answered/ })).toHaveCount(HALF);
  await axeClean(page);
  await navigator.getByRole("button", { name: "Close" }).click();
  await expect(navigator).toBeHidden();
  // Focus is back on the item at once, so the next key answers it (§11).
  await expect(page.getByRole("radio").first()).toBeFocused();

  // 4. The network goes down. Finish and submit offline.
  await context.setOffline(true);
  await answerByKeyboard(page, HALF, ITEMS.length - 1);
  await page.keyboard.press(keyFor(ITEMS.length - 1));
  await expect(page.locator(".app-exam__count")).toContainText("60 answered");
  await page.getByRole("button", { name: "Submit the exam" }).click();
  const dialog = page.getByRole("dialog", { name: "Submit the exam?" });
  await expect(dialog).toContainText("Every item is answered.");
  await expect(dialog).toContainText(`${FLAGGED.length} items are flagged for review.`);
  await axeClean(page);
  await dialog.getByRole("button", { name: "Submit", exact: true }).click();

  // 5. The results, offline, match the oracle's rescore.
  const responses = new Map<ItemId, OptionId>(ITEMS.map((item, i) => [item.id, optionFor(i)]));
  const { outcome } = scoreExam(FORM, ITEMS, responses);
  await expect(page).toHaveURL(/\/en\/exam\/results\?run=/);
  await expect(page.getByText(`Level ${outcome.band}`, { exact: true })).toBeVisible();
  await expect(page.getByText(`${String(outcome.raw)} of ${String(outcome.scored)} correct.`)).toBeVisible();
  // The reload was a pause (D84 ruling 1).
  await expect(page.getByText(/Paused once/)).toBeVisible();
  // The walkthrough holds every item, each closed until opened.
  await expect(page.locator(".app-review-entry")).toHaveCount(60);
  await page.locator(".app-review-entry__summary").first().click();
  await expect(page.locator(".app-review-entry").first().getByRole("radiogroup")).toBeVisible();
  await axeClean(page);

  // The readiness card leads with it, still offline.
  await page.goto("/en/home");
  await expect(page.getByRole("heading", { name: "Your last mock exam" })).toBeVisible();
  await expect(page.getByText(new RegExp(`^${outcome.band}, ${String(outcome.raw)} of 50\\.`))).toBeVisible();
});
