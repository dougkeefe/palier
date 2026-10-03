import { expect, test } from "@playwright/test";

import { axeClean, onboard, recordViolations, talkInStudio } from "./helpers";
import {
  SELFHOST_ORIGIN,
  SENTINEL,
  installFakeAudio,
  installFakeRealtime,
  realtimeSent,
  stubOpenAi,
  watchForLeaks,
} from "./leak-guard";

/**
 * ADR 3's self-hosted escape, end to end on the production build (Phase 6 Slice 3, progress.md D192): the `offline`
 * project, so the strict CSP and Trusted Types are the real ones (ADR 22). The endpoint is the repository's own
 * Cloudflare Worker, run under Node on `SELFHOST_ORIGIN` by `e2e/selfhost-server.mjs`, minting against a stand-in for
 * OpenAI. The microphone and the realtime peer are the hermetic studio journey's fakes (D188); everything between them
 * is the shipped code: the settings form, the vault, the popup, `postMessage`, the Worker's page and mint, the
 * transport's dial and the session.
 *
 * What it proves:
 * - **the key never reaches Palier's route**, not even a warm-up, and reaches the user's endpoint once, in
 *   `authorization`, from the popup, on the endpoint's own origin;
 * - **the dial carries the endpoint's `ek_` secret**, never the key;
 * - **the policy is unchanged**: `connect-src` is still this origin and OpenAI, and the session breaks none of it;
 * - the sentinel is nowhere else at all, and the endpoint's address stays on this device.
 */

test("studio mode mints on the user's own endpoint through a popup: the key never reaches Palier's route, and the policy is unchanged (D192)", async ({
  page,
  context,
  request,
}) => {
  test.setTimeout(90_000);
  const watch = watchForLeaks(context, { selfHostedOrigin: SELFHOST_ORIGIN });
  await installFakeAudio(context);
  await installFakeRealtime(context);
  await stubOpenAi(context);
  const violations = await recordViolations(page);
  const before = ((await (await request.get(`${SELFHOST_ORIGIN}/fake-openai/seen`)).json()) as { authorizations: string[] }).authorizations.length;

  await onboard(page, "skip", { addKey: true });
  await page.getByLabel("OpenAI API key").fill(SENTINEL);
  await page.getByRole("button", { name: "Save the key" }).click();
  await expect(page.getByText(/^Saved on this device/)).toBeVisible();

  // The key settings: a plain-http address off this machine is refused, then the endpoint is kept.
  await expect(page.getByText("Studio conversations get their pass from Palier’s server.")).toBeVisible();
  const field = page.getByRole("textbox", { name: "Your endpoint’s address" });
  await field.fill("http://secret.example.org/");
  await page.getByRole("button", { name: "Use this endpoint" }).click();
  await expect(page.getByText("Your key would travel to this address, so it must start with https://.")).toBeVisible();
  await expect(field).toHaveAttribute("aria-invalid", "true");
  await axeClean(page);
  await field.fill(`${SELFHOST_ORIGIN}/`);
  await page.getByRole("button", { name: "Use this endpoint" }).click();
  await expect(page.getByText("Saved. Your next studio conversation will use your endpoint.")).toBeVisible();
  await expect(page.getByText(`Studio conversations get their pass from ${SELFHOST_ORIGIN}/.`)).toBeVisible();
  await expect(page.getByRole("button", { name: "Use Palier’s server again" })).toBeVisible();
  await axeClean(page);

  // The page's policy, as served: the endpoint is not in it.
  const oral = await page.goto("/en/practice/oral");
  const policy = (await oral?.headerValue("content-security-policy")) ?? "";
  expect(policy).toContain("connect-src 'self' https://api.openai.com;");
  expect(policy).not.toContain(SELFHOST_ORIGIN);

  // The session: the tap opens the endpoint's popup, which closes itself once it has answered.
  const popup = context.waitForEvent("page");
  await talkInStudio(page, { ownEndpoint: true });
  const opened = await popup;
  expect(opened.url()).toBe(`${SELFHOST_ORIGIN}/`);
  await expect.poll(() => opened.isClosed()).toBe(true);

  // Palier's route never saw the key, nor a warm-up; the endpoint saw it once, in `authorization`.
  expect(watch.realtimeSecretAuthorizations()).toEqual([]);
  expect(watch.realtimeSecretWarmups()).toBe(0);
  expect(watch.selfHostedAuthorizations()).toEqual([`Bearer ${SENTINEL}`]);
  // The endpoint's server passed it to OpenAI's stand-in, and nothing else did.
  const seen = ((await (await request.get(`${SELFHOST_ORIGIN}/fake-openai/seen`)).json()) as { authorizations: string[] }).authorizations;
  expect(seen.slice(before)).toEqual([`Bearer ${SENTINEL}`]);
  // The dial carried the endpoint's secret, never the key; no call to OpenAI spent the key for the conversation.
  expect(watch.realtimeCallAuthorizations()).toEqual([expect.stringMatching(/^Bearer ek_selfhosted_\d+$/)]);
  expect(watch.openAiAuthorizations().filter((authorization) => authorization.includes("ek_"))).toEqual([]);
  expect((await realtimeSent(page)).some((event) => event.type === "session.update")).toBe(true);

  // Nothing broke the policy, and the key is nowhere it should not be.
  expect(await violations()).toEqual([]);
  await watch.assertNoLeak([page]);
});

test("a blocked popup ends the dial with the endpoint's own sentence, and the key goes nowhere (D192)", async ({ page, context }) => {
  test.setTimeout(90_000);
  const watch = watchForLeaks(context, { selfHostedOrigin: SELFHOST_ORIGIN });
  await installFakeAudio(context);
  await installFakeRealtime(context);
  await stubOpenAi(context);
  // A browser that blocks the popup: `window.open` answers null, as Safari's and Firefox's blockers do.
  await context.addInitScript(() => {
    Object.defineProperty(window, "open", { value: () => null, configurable: true, writable: true });
  });

  await onboard(page, "skip", { addKey: true });
  await page.getByLabel("OpenAI API key").fill(SENTINEL);
  await page.getByRole("button", { name: "Save the key" }).click();
  await expect(page.getByText(/^Saved on this device/)).toBeVisible();
  await page.getByRole("textbox", { name: "Your endpoint’s address" }).fill(`${SELFHOST_ORIGIN}/`);
  await page.getByRole("button", { name: "Use this endpoint" }).click();
  await expect(page.getByText("Saved. Your next studio conversation will use your endpoint.")).toBeVisible();

  await page.goto("/en/practice/oral");
  await page.getByRole("radio", { name: /^Studio mode/ }).check();
  await page.getByRole("listitem").filter({ has: page.getByRole("heading", { name: "Warm-up", exact: true }) }).getByRole("button", { name: "Choose" }).click();
  await page.getByRole("button", { name: "Check my microphone" }).click();
  const heard = page.getByText("Palier can hear you.");
  const quiet = page.getByText("Palier heard very little.", { exact: false });
  await expect(heard.or(quiet)).toBeVisible({ timeout: 10_000 });
  await page.getByRole("button", { name: (await heard.isVisible()) ? "Continue" : "Continue anyway", exact: true }).click();
  await page.getByRole("button", { name: "Start the session" }).click();

  await expect(page.getByRole("heading", { name: "Session over" })).toBeFocused();
  await expect(page.getByText("Your own endpoint gave no pass.", { exact: false })).toBeVisible();
  expect(watch.realtimeSecretAuthorizations()).toEqual([]);
  expect(watch.selfHostedAuthorizations()).toEqual([]);
  expect(watch.realtimeCallAuthorizations()).toEqual([]);
  await watch.assertNoLeak([page]);
});
