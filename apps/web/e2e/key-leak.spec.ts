import { type Browser, expect, type Page, test } from "@playwright/test";

import {
  drillThroughByKeyboard,
  generateAndPractise,
  getOralReport,
  onboard,
  practiseSpeaking,
  setSize,
  talkInStudio,
  writeAndGetFeedback,
} from "./helpers";
import {
  AUDIO_SENTINEL,
  GENERATED_SENTINEL,
  REPORT_SENTINEL,
  SENTINEL,
  SUBMISSION_SENTINEL,
  TRANSCRIPT_SENTINEL,
  downloadedText,
  installFakeAudio,
  installFakeRealtime,
  recorderMarker,
  stubOpenAi,
  watchForLeaks,
} from "./leak-guard";

/**
 * The key-leak test, tier 11 (implementation-plan.md §6.2; Phase 4 exit criterion 1; [R12]),
 * on the hermetic lane. "The single most important test in the repo."
 *
 * A sentinel key is entered through the UI, checked against a stubbed OpenAI, and then
 * everything else the app does is driven with it held: the diagnostic, a drill, a writing
 * workshop submission that really spends (a stubbed completion, metered), the review queue, a
 * mock exam with telemetry shared (through the real route and PGlite), an export, and a
 * pairing with a second device so real sync pushes and pulls cross the wire. The guard then
 * asserts the sentinel reached nowhere but OpenAI: no request or response of our own, no
 * console line, no error, no storage, no DOM, no field and no export file. The submission's
 * text is followed too (R12's writing half, D106): it reached OpenAI, stays on this device,
 * went nowhere else, and never arrived on the paired phone. So is a runtime-generated set
 * (D110): drafted and reviewed on the key, practised, kept on this device alone. So is a spoken
 * practice session (Phase 5 exit criterion 3, D120): each answer's clip reaches only OpenAI's
 * transcription endpoint, the session recording reaches no request at all, and the transcript stays
 * on this device and goes back to OpenAI only in the examiner's next question and in the request for
 * its report (D126), whose words stay on this device. So is a studio conversation (Phase 6 Slice 2, D171, D188):
 * the key goes to this origin's one realtime route in `Authorization` and nowhere else on it, OpenAI's
 * `/v1/realtime/calls` gets only the short-lived `ek_` secret, and the whole-session recording reaches no request.
 *
 * The hermetic container lives for one page load, so this moves by in-app links only. The
 * at-rest half on real IndexedDB is `key-leak-production.spec.ts`.
 */

const openSettings = async (page: Page, name: string, heading: string) => {
  await page.getByRole("link", { name, exact: true }).click();
  await expect(page.getByRole("heading", { level: 1, name: heading })).toBeVisible();
};

const syncNow = async (page: Page) => {
  const pull = page.waitForRequest((r) => r.method() === "GET" && new URL(r.url()).pathname === "/api/sync");
  await page.getByRole("button", { name: "Sync now" }).click();
  await (await pull).response();
  const status = page.getByRole("status").filter({ hasText: /^Last synced/ });
  await expect(status).toHaveAttribute("aria-busy", "false");
};

const device = async (browser: Browser) => {
  const context = await browser.newContext();
  const watch = watchForLeaks(context);
  await stubOpenAi(context);
  await installFakeAudio(context);
  await installFakeRealtime(context);
  return { page: await context.newPage(), watch };
};

test("the sentinel key never leaves for anywhere but OpenAI, across every journey [R12]", async ({ browser }) => {
  test.setTimeout(240_000);
  const laptop = await device(browser);
  const page = laptop.page;

  // 1. Onboarding, then the diagnostic. The key step comes after it, never before (§8.1).
  await onboard(page, "diagnostic");
  await page.getByRole("radio", { name: "Reading" }).check();
  await page.getByRole("button", { name: "Start the Reading diagnostic" }).click();
  const total = await setSize(page);
  for (let i = 1; i <= total; i++) {
    await expect(page.locator(".app-session__count")).toHaveText(`Item ${String(i)} of ${String(total)}`);
    await page.keyboard.press("1");
    await page.keyboard.press("Enter");
  }
  await expect(page.getByRole("heading", { name: "Your Reading diagnostic" })).toBeVisible();

  // 2. Step 5, on the readout: add the key.
  await page.getByRole("link", { name: "Add a key now" }).click();
  await expect(page.getByRole("heading", { level: 1, name: "Your API key" })).toBeVisible();
  await page.getByLabel("OpenAI API key").fill(SENTINEL);
  await page.getByRole("button", { name: "Save the key" }).click();
  await expect(page.getByText(`Saved on this device: the key ending in ${SENTINEL.slice(-4)}.`)).toBeVisible();
  // After entry the field is gone, and the key is described by its last four only (§6.2).
  await expect(page.getByLabel("OpenAI API key")).toHaveCount(0);
  await page.getByRole("button", { name: "Check the key" }).click();
  await expect(page.getByRole("status").filter({ hasText: "This key works." })).toBeVisible();
  // The positive control: the key really was in play, and it went to OpenAI, as a bearer token.
  expect(laptop.watch.openAiAuthorizations()).toEqual([`Bearer ${SENTINEL}`]);

  // 3. A drill, then the writing workshop from the drill's page, then the review queue. The
  // diagnostic used up the fixture bank's reading items, so the drill is written expression.
  await page.getByRole("link", { name: "Today", exact: true }).click();
  await page.getByRole("radio", { name: "Written expression" }).check();
  await page.getByRole("link", { name: /^Start, \d+ min$/ }).click();
  await drillThroughByKeyboard(page);
  await page.getByRole("link", { name: "Open the writing workshop" }).click();
  await expect(page.getByRole("heading", { level: 1, name: "Writing workshop" })).toBeVisible();
  await writeAndGetFeedback(page, `Madame, votre demande ${SUBMISSION_SENTINEL} est en cours de traitement.`);
  // The positive control for the text: it went to OpenAI, once, with the key.
  expect(laptop.watch.openAiBodies().filter((body) => body.includes(SUBMISSION_SENTINEL))).toHaveLength(1);
  expect(laptop.watch.openAiAuthorizations()).toEqual([`Bearer ${SENTINEL}`, `Bearer ${SENTINEL}`]);
  // 3b. A fresh set from the writing drill's page: one draft and five blind reviews, all on the
  // key, then practised. Every review carries a generated stem back to OpenAI, and only there.
  await page.getByRole("link", { name: "Today", exact: true }).click();
  await page.getByRole("radio", { name: "Written expression" }).check();
  await page.getByRole("link", { name: /^Start, \d+ min$/ }).click();
  await page.getByRole("link", { name: "Generate a fresh set" }).click();
  await expect(page.getByRole("heading", { level: 1, name: "Fresh practice items" })).toBeVisible();
  expect(await generateAndPractise(page)).toBe(5);
  expect(laptop.watch.openAiBodies().filter((body) => body.includes(GENERATED_SENTINEL))).toHaveLength(5);
  expect(laptop.watch.openAiAuthorizations()).toEqual(Array.from({ length: 8 }, () => `Bearer ${SENTINEL}`));
  // 3c. Spoken practice from Today, with two recorded answers. The screen makes the session's
  // recorder first (#1), then one per answer (#2, #3). Each clip goes to the transcription endpoint
  // once, with the key; the session recording goes nowhere; the transcript goes back to OpenAI only
  // inside the examiner's next request.
  await page.getByRole("link", { name: "Today", exact: true }).click();
  await page.getByRole("link", { name: "Practise speaking" }).click();
  await expect(page.getByRole("heading", { level: 1, name: "Spoken practice" })).toBeVisible();
  await practiseSpeaking(page, { answers: 2 });
  await expect(page.getByText(TRANSCRIPT_SENTINEL, { exact: false }).first()).toBeVisible();
  const audioRequests = laptop.watch.openAiRequests().filter((request) => request.body.includes(AUDIO_SENTINEL));
  expect(audioRequests.map((request) => request.path)).toEqual(["/v1/audio/transcriptions", "/v1/audio/transcriptions"]);
  expect(audioRequests[0]?.body).toContain(recorderMarker(2));
  expect(audioRequests[1]?.body).toContain(recorderMarker(3));
  expect(laptop.watch.openAiBodies().some((body) => body.includes(recorderMarker(1)))).toBe(false);
  const heardBack = laptop.watch.openAiRequests().filter((request) => request.body.includes(TRANSCRIPT_SENTINEL));
  expect(heardBack.length).toBeGreaterThan(0);
  expect(new Set(heardBack.map((request) => request.path))).toEqual(new Set(["/v1/chat/completions"]));
  // Three questions written and voiced, and two clips transcribed: 3 × 2 + 2 more calls on the key.
  expect(laptop.watch.openAiAuthorizations()).toEqual(Array.from({ length: 16 }, () => `Bearer ${SENTINEL}`));
  // 3d. The session's report (D126): one more completion on the key, carrying the transcript and no audio.
  await getOralReport(page);
  await page.getByRole("region", { name: "Your report" }).getByRole("button", { expanded: false }).first().click();
  await expect(page.getByText(REPORT_SENTINEL, { exact: false })).toBeVisible();
  expect(laptop.watch.openAiAuthorizations()).toEqual(Array.from({ length: 17 }, () => `Bearer ${SENTINEL}`));
  const reportRequest = laptop.watch.openAiRequests().at(-1);
  expect(reportRequest?.path).toBe("/v1/chat/completions");
  expect(reportRequest?.body).toContain(TRANSCRIPT_SENTINEL);
  expect(reportRequest?.body).not.toContain(AUDIO_SENTINEL);
  expect(laptop.watch.openAiBodies().some((body) => body.includes(recorderMarker(1)))).toBe(false);
  // 3e. Studio mode's secret (ADR 3, D169): the one route on this origin that may see the key, posted to
  // as the studio transport's route client posts, with the key in Authorization and no body. Its answer
  // is a secret and its expiry and nothing else; the final check reads that answer for the key too.
  const minted = await page.evaluate(async (key) => {
    const response = await fetch("/api/realtime/secret", { method: "POST", headers: { authorization: `Bearer ${key}` } });
    return { status: response.status, body: (await response.json()) as Record<string, unknown> };
  }, SENTINEL);
  expect(minted.status).toBe(200);
  expect(Object.keys(minted.body).sort()).toEqual(["expiresAt", "value"]);
  expect(String(minted.body.value)).toMatch(/^ek_memory_\d+$/);
  expect(laptop.watch.realtimeSecretAuthorizations()).toEqual([`Bearer ${SENTINEL}`]);
  expect(laptop.watch.openAiAuthorizations()).toHaveLength(17);
  // 3f. A studio conversation from the screen (D171, D188): the fake-peer half. The screen posts the key to the
  // route once, in Authorization; the call to /v1/realtime/calls carries the minted ek_ secret, never the key; the
  // conversation's recording, the page's fourth recorder, reaches no request; and no other call spends the key.
  await page.getByRole("link", { name: "Back to spoken practice" }).first().click();
  await talkInStudio(page);
  expect(laptop.watch.realtimeSecretAuthorizations()).toEqual([`Bearer ${SENTINEL}`, `Bearer ${SENTINEL}`]);
  const dialled = laptop.watch.realtimeCallAuthorizations();
  expect(dialled).toHaveLength(1);
  expect(dialled.every((authorization) => /^Bearer ek_memory_\d+$/.test(authorization))).toBe(true);
  expect(laptop.watch.openAiAuthorizations()).toHaveLength(17);
  expect(laptop.watch.openAiBodies().some((body) => body.includes(recorderMarker(4)))).toBe(false);

  // The first return home after a spoken session shows its milestone moment once (D159); it is closed as a user would.
  await page.getByRole("link", { name: "Today", exact: true }).click();
  const moment = page.getByRole("dialog", { name: "Your first spoken session" });
  await expect(moment).toBeVisible();
  await moment.getByRole("button", { name: "Keep going" }).click();
  await expect(moment).toBeHidden();
  await page.getByRole("link", { name: "Review", exact: true }).click();
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();

  // 4. A mock exam, submitted, with its answers shared (the real telemetry route, on PGlite).
  await page.getByRole("link", { name: "Today", exact: true }).click();
  await page.getByRole("link", { name: "Take a mock exam" }).first().click();
  await page.getByRole("radio", { name: /Unsupervised/ }).check();
  await page.getByRole("button", { name: "Start the exam" }).click();
  for (let i = 0; i < 3; i++) {
    await expect(page.locator(".app-exam__count")).toContainText(`Item ${String(i + 1)} of`);
    await page.keyboard.press("1");
    await page.keyboard.press("Enter");
  }
  await expect(page.locator(".app-exam__count")).toContainText("3 answered");
  await page.getByRole("button", { name: "Submit the exam" }).click();
  await page.getByRole("dialog", { name: "Submit the exam?" }).getByRole("button", { name: "Submit", exact: true }).click();
  const telemetry = page.waitForResponse((r) => new URL(r.url()).pathname === "/api/telemetry");
  await page.getByRole("region", { name: "Help make these items better" }).getByRole("button", { name: "Share my answers" }).click();
  expect((await telemetry).status()).toBe(202);

  // 5. An export: the file holds everything this device has, and never the key.
  await openSettings(page, "Your data", "Your data");
  const [download] = await Promise.all([
    page.waitForEvent("download"),
    page.getByRole("button", { name: "Download everything (JSON)" }).click(),
  ]);
  const exported = await downloadedText(download);
  expect(exported).toContain("attempts");
  expect(exported).not.toContain(SENTINEL);
  expect(exported).not.toContain(SUBMISSION_SENTINEL);
  expect(exported).not.toContain(GENERATED_SENTINEL);
  expect(exported).not.toContain(TRANSCRIPT_SENTINEL);
  expect(exported).not.toContain(AUDIO_SENTINEL);
  expect(exported).not.toContain(REPORT_SENTINEL);

  // 6. Sync, and a second device paired by code: real pushes and pulls through the routes.
  await openSettings(page, "Sync", "Sync");
  await syncNow(page);
  await page.getByRole("button", { name: "Show a code" }).click();
  const code = (await page.locator(".app-code").textContent())?.trim() ?? "";
  const phone = await device(browser);
  await onboard(phone.page, "skip");
  await openSettings(phone.page, "Sync", "Sync");
  await phone.page.getByLabel("Code").fill(code);
  await phone.page.getByRole("button", { name: "Link this device" }).click();
  await expect(phone.page.getByRole("status").filter({ hasText: /^This device is linked\./ })).toBeVisible();
  await syncNow(phone.page);
  await syncNow(page);

  // 7. The key is still held, and still only masked.
  await openSettings(page, "Your API key", "Your API key");
  await expect(page.getByText(`Saved on this device: the key ending in ${SENTINEL.slice(-4)}.`)).toBeVisible();

  await laptop.watch.assertNoLeak([page], {
    deviceOnly: [SUBMISSION_SENTINEL, GENERATED_SENTINEL, TRANSCRIPT_SENTINEL, AUDIO_SENTINEL, REPORT_SENTINEL],
  });
  await phone.watch.assertNoLeak([phone.page], {
    nowhere: [SUBMISSION_SENTINEL, GENERATED_SENTINEL, TRANSCRIPT_SENTINEL, AUDIO_SENTINEL, REPORT_SENTINEL],
  });
});
