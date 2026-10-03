import { readFileSync, readdirSync } from "node:fs";

import { expect, type Page, test } from "@playwright/test";

import { bankVersionFrom } from "../scripts/prepare-public.mjs";
import { axeClean, onboard } from "./helpers";

/**
 * The band trend over time on `/progress` (product-requirements.md §8.9, Phase 7 Slice 5, progress.md D198),
 * over real IndexedDB on the production server (the `offline` project), with twelve weeks of history written
 * into v1's `attempts` table the way the Dexie adapter writes it.
 *
 * The clock is pinned and the zone is UTC, so the weeks are known: they end on Saturdays, the last today,
 * 3 October. From the fourth week on, each week adds ten answers at C-level items in each skill, so the
 * first five weeks are short of the thirty a figure needs and are drawn as a gap, and the rest are drawn.
 * Both skills carry history, so the printout is checked at its fullest.
 */

test.use({ timezoneId: "UTC" });

const NOW = new Date("2026-10-03T15:00:00.000Z");
const DAY = 86_400_000;
const WEEKS = 12;
const BANK = bankVersionFrom(readFileSync(new URL("../src/lib/bank-version.ts", import.meta.url), "utf8"));

/** The committed bank's C-level item ids for a skill, read off its shards. */
const cItems = (skill: "reading" | "writing"): string[] => {
  const dir = new URL(`../../../content/bank/v${String(BANK)}/fr/${skill}/`, import.meta.url);
  return readdirSync(dir)
    .filter((name) => name.endsWith(".json"))
    .flatMap((name) => JSON.parse(readFileSync(new URL(name, dir), "utf8")) as { id: string; targetBand: string }[])
    .filter((item) => item.targetBand === "C")
    .map((item) => item.id);
};

const history = () =>
  (["reading", "writing"] as const).flatMap((skill) => {
    const ids = cItems(skill);
    return Array.from({ length: WEEKS }, (_, week) => week)
      .filter((week) => week >= 3)
      .flatMap((week) =>
        Array.from({ length: 10 }, (_, i) => {
          const n = week * 10 + i;
          // Two days before the week's end; more of them right as the weeks go on.
          const ts = new Date(NOW.getTime() - (7 * (WEEKS - 1 - week) + 2) * DAY).toISOString();
          return {
            id: `01HSEED${skill.slice(0, 1).toUpperCase()}${String(n).padStart(18, "0")}`,
            itemId: ids[n % ids.length],
            bankVersion: BANK,
            skill,
            sessionId: `seed-${skill}-${String(week)}`,
            chosen: "a",
            correct: i < 4 + Math.floor(week / 2),
            msToFirstSelect: 4_000,
            msToConfirm: 6_000,
            changedAnswer: false,
            mode: "drill",
            ts,
          };
        }),
      );
  });

const seed = (page: Page) =>
  page.evaluate(async (attempts) => {
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      const open = indexedDB.open("palier");
      open.onsuccess = () => resolve(open.result);
      open.onerror = () => reject(open.error);
    });
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(["attempts"], "readwrite");
      for (const a of attempts) tx.objectStore("attempts").put(a);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
    db.close();
  }, history());

/** The number of pages in a PDF: its page objects, not the `/Pages` tree node. */
const pageCount = (pdf: Buffer): number => pdf.toString("latin1").match(/\/Type\s*\/Page(?!s)/g)?.length ?? 0;

test("progress draws twelve weeks at the target band, a gap where evidence is short, its figures a table, and prints on one page", async ({
  page,
}) => {
  test.setTimeout(90_000);
  await page.clock.setFixedTime(NOW);
  await onboard(page, "skip");
  await expect(page).toHaveURL(/\/en\/home$/);
  await seed(page);
  await page.goto("/en/progress");

  await expect(page.getByRole("heading", { name: "Week by week, C-level items" })).toBeVisible();
  // Weeks 1–5 are short of evidence, 6–12 drawn: one unbroken run, seven dots.
  const chart = page.locator(".pl-trend-chart");
  await expect(chart).toHaveAttribute("aria-hidden", "true");
  await expect(chart.locator("polyline")).toHaveCount(1);
  await expect(chart.locator("circle")).toHaveCount(7);
  await expect(chart).toContainText("Jul 18");
  await expect(chart).toContainText("Oct 3");

  // The figures are a table, behind a disclosure on screen.
  await expect(page.getByRole("table")).toBeHidden();
  await page.getByText("Show the figures").click();
  const table = page.getByRole("table", { name: "Week by week, C-level items" });
  await expect(table.getByRole("columnheader", { name: "Week ending" })).toBeVisible();
  await expect(table.locator("tbody tr")).toHaveCount(WEEKS);
  await expect(table.getByRole("row", { name: /Aug 15 Not enough answers/ })).toBeVisible();
  // Week 12: ninety answers, 9 of 10 right in the last week and fewer before it.
  await expect(table.getByRole("row", { name: /Oct 3 \d+%, likely \d+–\d+%/ })).toBeVisible();
  await axeClean(page);

  // Printed: both skills, each table shown with no disclosure, and still one page.
  await page.emulateMedia({ media: "print" });
  await expect(page.getByRole("table")).toHaveCount(2);
  await expect(page.getByText("Show the figures")).toHaveCount(0);
  expect(pageCount(await page.pdf({ format: "Letter" }))).toBe(1);
  expect(pageCount(await page.pdf({ format: "A4" }))).toBe(1);

  // French runs longer; it still fits.
  await page.goto("/fr/progress");
  await expect(page.getByRole("heading", { name: "Semaine après semaine, items de niveau C" }).first()).toBeVisible();
  await expect(page.getByRole("table")).toHaveCount(2);
  expect(pageCount(await page.pdf({ format: "Letter" }))).toBe(1);
  expect(pageCount(await page.pdf({ format: "A4" }))).toBe(1);
});
