import { expect, type Page, test } from "@playwright/test";

import { onboard, waitForOfflineReady, writeAndGetFeedback } from "./helpers";
import { SENTINEL, SUBMISSION_SENTINEL, downloadedText, idsAtRest, stubOpenAi, watchForLeaks } from "./leak-guard";

/**
 * The key-leak test's at-rest half (tier 11; Phase 4 exit criterion 1; [R12]), against the
 * production server (the `offline` project): real IndexedDB through Dexie, the service
 * worker and its caches. `key-leak.spec.ts` is the hermetic half, with real sync.
 *
 * It asserts what only a real browser store can show. A remembered key is at rest as
 * ciphertext in the vault's `api-key` row and nowhere else, across a reload. A key kept
 * "for this tab only" is never written at all, and a reload forgets it. And through a writing
 * workshop submission, an exam with telemetry shared and an export, the sentinel reaches
 * nothing but OpenAI. The submission is at rest in `writingSubmissions` and its call in the
 * cost ledger, both real rows the dump walks (D104's seeded row is gone, D106).
 *
 * This server has no database, so telemetry is stood in for, as journey 9 does.
 */

const MASKED = `the key ending in ${SENTINEL.slice(-4)}.`;

const vaultIds = (page: Page) => idsAtRest(page, "palier", "keyVault");

test("a remembered key is ciphertext at rest, a tab-only key is never written, and neither leaks [R12]", async ({
  page,
  context,
}) => {
  test.setTimeout(120_000);
  const watch = watchForLeaks(context);
  await stubOpenAi(context);
  await context.route("**/api/telemetry", (route) => route.fulfill({ status: 202, body: "" }));

  // 1. The skip path: step 5 is the wizard's last step, and "Add a key now" goes to the key screen.
  await onboard(page, "skip", { addKey: true });
  await expect(page).toHaveURL(/\/en\/settings\/key$/);
  await waitForOfflineReady(page);

  // 2. A remembered key: saved, checked, and at rest only as the vault's ciphertext row.
  await page.getByLabel("OpenAI API key").fill(SENTINEL);
  await page.getByRole("button", { name: "Save the key" }).click();
  await expect(page.getByText(`Saved on this device: ${MASKED}`)).toBeVisible();
  await page.getByRole("button", { name: "Check the key" }).click();
  await expect(page.getByRole("status").filter({ hasText: "This key works." })).toBeVisible();
  expect(watch.openAiAuthorizations()).toEqual([`Bearer ${SENTINEL}`]);
  expect(await vaultIds(page)).toContain("api-key");

  // …and it survives a reload, still masked.
  await page.reload();
  await expect(page.getByText(`Saved on this device: ${MASKED}`)).toBeVisible();
  // A workshop submission that really spends: the call is metered into the ledger and the text
  // is kept in the workshop's own store, so the dump walks two real rows (D104, D106).
  await page.goto("/en/practice/writing/workshop");
  await writeAndGetFeedback(page, `Madame, votre demande ${SUBMISSION_SENTINEL} est en cours de traitement.`);
  expect(watch.openAiBodies().filter((body) => body.includes(SUBMISSION_SENTINEL))).toHaveLength(1);
  expect(await idsAtRest(page, "palier", "writingSubmissions")).toHaveLength(1);
  expect(await idsAtRest(page, "palier", "costLedger")).toHaveLength(1);
  await watch.assertNoLeak([page], { deviceOnly: [SUBMISSION_SENTINEL] });

  // 3. A mock exam, submitted, with its answers shared.
  await page.goto("/en/exam");
  await page.getByRole("radio", { name: /Unsupervised/ }).check();
  await page.getByRole("button", { name: "Start the exam" }).click();
  await expect(page).toHaveURL(/\/en\/exam\/run\?run=/);
  for (let i = 0; i < 3; i++) {
    await expect(page.locator(".app-exam__count")).toContainText(`Item ${String(i + 1)} of`);
    await page.keyboard.press("1");
    await page.keyboard.press("Enter");
  }
  await expect(page.locator(".app-exam__count")).toContainText("3 answered");
  await page.getByRole("button", { name: "Submit the exam" }).click();
  await page.getByRole("dialog", { name: "Submit the exam?" }).getByRole("button", { name: "Submit", exact: true }).click();
  const telemetry = page.waitForRequest((r) => new URL(r.url()).pathname === "/api/telemetry");
  await page.getByRole("region", { name: "Help make these items better" }).getByRole("button", { name: "Share my answers" }).click();
  await telemetry;

  // 4. An export.
  await page.goto("/en/settings/data");
  const [download] = await Promise.all([
    page.waitForEvent("download"),
    page.getByRole("button", { name: "Download everything (JSON)" }).click(),
  ]);
  const exported = await downloadedText(download);
  expect(exported).toContain("attempts");
  expect(exported).not.toContain(SENTINEL);
  expect(exported).not.toContain(SUBMISSION_SENTINEL);

  // 5. Replace it with a key for this tab only: the stored row goes, and nothing replaces it.
  await page.goto("/en/settings/key");
  await page.getByRole("button", { name: "Remove the key" }).click();
  await expect(page.getByLabel("OpenAI API key")).toBeVisible();
  await page.getByLabel("OpenAI API key").fill(SENTINEL);
  await page.getByRole("checkbox", { name: /for this tab only/ }).check();
  await page.getByRole("button", { name: "Save the key" }).click();
  await expect(page.getByText(`Held for this tab only: ${MASKED}`)).toBeVisible();
  await page.getByRole("button", { name: "Check the key" }).click();
  await expect(page.getByRole("status").filter({ hasText: "This key works." })).toBeVisible();
  expect(await vaultIds(page)).not.toContain("api-key");
  await watch.assertNoLeak([page], { deviceOnly: [SUBMISSION_SENTINEL] });

  // 6. A reload forgets it.
  await page.reload();
  await expect(page.getByLabel("OpenAI API key")).toBeVisible();
  await expect(page.getByText(MASKED)).toHaveCount(0);
  expect(await vaultIds(page)).not.toContain("api-key");
  await watch.assertNoLeak([page], { deviceOnly: [SUBMISSION_SENTINEL] });
});
