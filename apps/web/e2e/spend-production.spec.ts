import { expect, type Page, test } from "@playwright/test";

import { axeClean, onboard, waitForOfflineReady } from "./helpers";

/**
 * The spend meter over the real cost ledger (Phase 4 Slice 2, progress.md D101–D104), on the
 * production server (the `offline` project): Dexie over real IndexedDB, in v1's `costLedger`
 * table. No screen spends yet (writing feedback is Slice 3), so the rows are written into the
 * table the way the adapter writes them, and the page reads them back through the ledger,
 * the meter and the cap. The unit and container tests prove a real call writes such a row.
 */

type Row = { ts: string; feature: string; model: string; inputTokens: number; outputTokens: number; costUsd: number | null };

/** Append rows to the device's cost ledger, as `dexieCostLedger.append` does. */
const seedLedger = (page: Page, rows: readonly Omit<Row, "ts">[]) =>
  page.evaluate(async (rows) => {
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      const open = indexedDB.open("palier");
      open.onsuccess = () => resolve(open.result);
      open.onerror = () => reject(open.error);
    });
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction("costLedger", "readwrite");
      for (const row of rows) tx.objectStore("costLedger").add({ ...row, ts: new Date().toISOString() });
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
    db.close();
  }, rows);

const aCall = (costUsd: number | null) => ({
  feature: "writing-feedback",
  model: "gpt-6-sol",
  inputTokens: 2_500,
  outputTokens: 2_000,
  costUsd,
});

const figure = (page: Page, window: string) =>
  page.locator(".app-meter__figure").filter({ hasText: window }).locator("dd");

test("the meter reads the device's ledger, warns near the cap and past it, and a wipe clears it", async ({ page }) => {
  await onboard(page, "skip");
  await expect(page).toHaveURL(/\/en\/home$/);
  await waitForOfflineReady(page);

  await page.goto("/en/settings/key");
  await expect(figure(page, "This month")).toHaveText("US$0.00");
  await page.getByLabel("Monthly cap, in US dollars").fill("5");
  await page.getByRole("button", { name: "Set the cap" }).click();
  await expect(page.getByText("Your cap is US$5.00 a month. This month is at 0 percent of it.")).toBeVisible();

  // Past 80 percent: 4.20 of 5.00, one call of it unpriced.
  await seedLedger(page, [aCall(4), aCall(0.2), aCall(null)]);
  await page.reload();
  await expect(figure(page, "This month")).toHaveText("US$4.20");
  await expect(figure(page, "This week")).toHaveText("US$4.20");
  // The rows predate this tab, so this session has spent nothing.
  await expect(figure(page, "This session")).toHaveText("US$0.00");
  await expect(page.getByText("This month is at 84 percent of it.")).toBeVisible();
  await expect(page.getByText("This month is past 80 percent of your cap.")).toBeVisible();
  await expect(page.getByText("1 call this month used a model Palier has no price for")).toBeVisible();
  await axeClean(page);

  // At the cap: still a warning, never a block.
  await seedLedger(page, [aCall(0.8)]);
  await page.reload();
  await expect(figure(page, "This month")).toHaveText("US$5.00");
  await expect(page.getByText("This month has reached your cap.")).toBeVisible();
  await axeClean(page);

  // A wipe takes the ledger and the cap with everything else [R11].
  await page.goto("/en/settings/data");
  await page.getByRole("button", { name: "Delete everything" }).click();
  await page.getByRole("button", { name: "Yes, delete everything" }).click();
  await expect(page.getByText("Everything on this device has been deleted.")).toBeVisible();
  await page.goto("/en/settings/key");
  await expect(figure(page, "This month")).toHaveText("US$0.00");
  await expect(page.getByText("No cap is set.")).toBeVisible();

  // A spend too small to round to a cent is not shown as free.
  await seedLedger(page, [aCall(0.0012)]);
  await page.reload();
  await expect(figure(page, "This month")).toHaveText("under US$0.01");
});
