import { expect, type Page, test } from "@playwright/test";

import { axeClean, onboard } from "./helpers";

/**
 * The streak and a milestone moment over real IndexedDB (Phase 7 Slice 4, progress.md D159), on the
 * production server (the `offline` project), because "said once" must survive a reload, and a
 * hermetic container lives for one page load. The history is written into v1's tables the way the
 * Dexie adapter writes it, and the page reads it back through the use cases.
 *
 * The clock is pinned and the zone is UTC, so the days are known: drills done on the 26th and 27th,
 * nothing on the 28th, today the 29th still to do. The streak is two days, the 28th was frozen, and
 * one spoken session ended on the 27th, so the first-oral milestone is waiting.
 */

test.use({ timezoneId: "UTC" });

const NOW = new Date("2026-09-29T15:00:00.000Z");
const on = (day: number): string => `2026-09-${String(day)}T12:00:00.000Z`;

const seed = (page: Page) =>
  page.evaluate(
    async ({ sessions, oral }) => {
      const db = await new Promise<IDBDatabase>((resolve, reject) => {
        const open = indexedDB.open("palier");
        open.onsuccess = () => resolve(open.result);
        open.onerror = () => reject(open.error);
      });
      await new Promise<void>((resolve, reject) => {
        const tx = db.transaction(["sessions", "oralSessions"], "readwrite");
        for (const s of sessions) tx.objectStore("sessions").put(s);
        for (const o of oral) tx.objectStore("oralSessions").put(o);
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
      });
      db.close();
    },
    {
      sessions: [26, 27].map((day) => ({ id: `drill-${String(day)}`, type: "drill", startedAt: on(day), completedAt: on(day) })),
      oral: [
        {
          id: "oral-27",
          scenarioId: "scn-anything",
          startedAt: on(27),
          endedAt: on(27),
          endReason: "completed",
          turns: [],
          assessment: null,
        },
      ],
    },
  );

test("a milestone is shown once, full screen, shares only its card, and the kept streak is said once", async ({ page }) => {
  await page.clock.setFixedTime(NOW);
  // No real share sheet in a test: record what would have been shared.
  await page.addInitScript(() => {
    const shared: ShareData[] = [];
    Object.assign(window, { __shared: shared });
    Object.defineProperty(navigator, "share", {
      configurable: true,
      value: (data: ShareData) => {
        shared.push(data);
        return Promise.resolve();
      },
    });
    Object.defineProperty(navigator, "canShare", { configurable: true, value: () => true });
  });

  await onboard(page, "skip");
  await expect(page).toHaveURL(/\/en\/home$/);
  await seed(page);
  await page.reload();

  const moment = page.getByRole("dialog", { name: "Your first spoken session" });
  await expect(moment).toBeVisible();
  await expect(moment.getByText("You answered an examiner out loud.")).toBeVisible();
  await axeClean(page);

  await moment.getByRole("button", { name: "Share" }).click();
  const shared = await page.evaluate(() => (window as unknown as { __shared: ShareData[] }).__shared);
  expect(shared).toEqual([
    {
      text: "I just did my first spoken practice session on Palier, a free, unofficial practice app for the federal Second Language Evaluation.",
      url: new URL("/en", page.url()).toString().replace(/\/$/, ""),
    },
  ]);

  await moment.getByRole("button", { name: "Keep going" }).click();
  await expect(moment).toBeHidden();

  // The streak, with the freeze said once, among the statistics (D219).
  const stats = page.locator(".app-home__stats");
  await expect(stats.locator(".app-home__figure", { hasText: "2" }).first()).toBeVisible();
  await expect(stats.getByText("days in a row")).toBeVisible();
  await expect(stats.getByText("We kept your streak")).toBeVisible();
  await axeClean(page);

  // Both were marked as said: a reload shows neither again, and the streak stays.
  await page.reload();
  await expect(page.locator(".app-home__stats").getByText("days in a row")).toBeVisible();
  await expect(page.getByText("We kept your streak")).toBeHidden();
  await expect(page.getByRole("dialog")).toBeHidden();
});

test("French: the streak and the moment read in French", async ({ page }) => {
  await page.clock.setFixedTime(NOW);
  await onboard(page, "skip");
  await seed(page);
  await page.goto("/fr/home");

  const moment = page.getByRole("dialog", { name: "Votre première séance orale" });
  await expect(moment).toBeVisible();
  await axeClean(page);
  await moment.getByRole("button", { name: "Continuer" }).click();
  await expect(page.locator(".app-home__stats").getByText("jours d’affilée")).toBeVisible();
  await expect(page.getByText("Nous avons gardé votre série")).toBeVisible();
  await axeClean(page);
});
