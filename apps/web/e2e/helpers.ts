import { readFileSync } from "node:fs";

import AxeBuilder from "@axe-core/playwright";
import { expect, type Page } from "@playwright/test";

import { bankVersionFrom } from "../scripts/prepare-public.mjs";

/** Shared by the hermetic journeys and the offline project. Not a spec file. */

/**
 * The manifest of the bank version this build reads, taken from `src/lib/bank-version.ts`
 * the way `prepare-public.mjs` takes it, so a bank bump never leaves a spec behind.
 */
export const BANK_MANIFEST = `/content/bank/v${String(
  bankVersionFrom(readFileSync(new URL("../src/lib/bank-version.ts", import.meta.url), "utf8")),
)}/manifest.json`;

const WCAG_TAGS = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"];

/**
 * Audit a settled page. After a client-side navigation Next streams the new metadata
 * in, and for a moment the document has no `<title>`: axe once caught exactly that
 * frame. That is a transient no user rests on, so wait for the title first; the pages
 * do each carry one (see the "titled for its purpose" test).
 */
export const axeClean = async (page: Page) => {
  await expect(page).toHaveTitle(/\S/);
  const results = await new AxeBuilder({ page }).withTags(WCAG_TAGS).analyze();
  expect(results.violations).toEqual([]);
};

/**
 * Collects every CSP and Trusted Types violation a page reports, from before its first script, for the production
 * specs that hold a flow to zero (`csp-production.spec.ts`, `studio-selfhost-production.spec.ts`).
 */
export const recordViolations = async (page: Page) => {
  await page.addInitScript(() => {
    const seen: string[] = [];
    Object.defineProperty(window, "__cspViolations", { value: seen });
    document.addEventListener("securitypolicyviolation", (event) => {
      seen.push(`${event.effectiveDirective} ${event.blockedURI} ${event.sample}`);
    });
  });
  return () => page.evaluate(() => (window as unknown as { __cspViolations: string[] }).__cspViolations.slice());
};

/** Wait until the worker has installed (so precaching is done) and controls the page. */
export const waitForOfflineReady = async (page: Page) => {
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
  });
  await page.waitForFunction(() => navigator.serviceWorker.controller !== null);
};

/**
 * §8.1 onboarding, placing as asked. Leaves the page wherever onboarding lands. On the skip
 * path the wizard's last step is step 5, the optional key: it is passed over unless `addKey`
 * (progress.md D100). On the diagnostic path, step 5 comes after the diagnostic instead.
 */
export const onboard = async (
  page: Page,
  placement: "diagnostic" | "skip",
  { addKey = false }: { addKey?: boolean } = {},
) => {
  await page.goto("/en/start");
  const next = page.getByRole("button", { name: "Continue" });
  await expect(next).toBeEnabled();
  await next.click();

  await page.getByRole("radio", { name: /Level C/ }).check();
  await next.click();

  await page
    .getByRole("radio", { name: placement === "diagnostic" ? /Take the diagnostic/ : /Skip for now/ })
    .check();
  await next.click();

  await page.getByRole("radio", { name: "20 minutes a day" }).check();
  if (placement === "skip") {
    await next.click();
    await expect(page.getByRole("heading", { name: "An OpenAI key, if you want one" })).toBeFocused();
    if (addKey) {
      await page.getByRole("button", { name: "Add a key now" }).click();
      return;
    }
  }
  await page.getByRole("button", { name: "Start practising" }).click();
};

/** How many items the current set holds, read off its "Item 1 of N" line. */
export const setSize = async (page: Page): Promise<number> => {
  const line = page.locator(".app-session__count");
  await expect(line).toHaveText(/Item 1 of \d+/);
  return Number(/of (\d+)/.exec((await line.textContent()) ?? "")?.[1]);
};

/** Answer every item of the drill on screen by keyboard: 1, Enter to confirm, Enter to go on. */
export const drillThroughByKeyboard = async (page: Page) => {
  const total = await setSize(page);
  for (let i = 1; i <= total; i++) {
    await expect(page.locator(".app-session__count")).toHaveText(`Item ${i} of ${total}`);
    await page.keyboard.press("1");
    await page.keyboard.press("Enter");
    await expect(page.getByRole("region", { name: /Correct|Not quite/ })).toBeVisible();
    await page.keyboard.press("Enter");
  }
  return total;
};

/**
 * The writing workshop's one spending path (progress.md D105–D108), from the prompt list: pick
 * the first prompt, write `text`, ask for feedback, send it past the pre-flight, and wait for
 * the feedback's heading, which takes focus.
 */
export const writeAndGetFeedback = async (page: Page, text: string) => {
  await page.getByRole("button", { name: "Write this" }).first().click();
  const editor = page.getByRole("textbox", { name: "Your text" });
  await expect(editor).toBeFocused();
  await editor.fill(text);
  await page.getByRole("button", { name: "Get feedback" }).click();
  await expect(page.getByRole("heading", { name: "Before you send" })).toBeFocused();
  await page.getByRole("button", { name: "Send for feedback" }).click();
  await expect(page.getByRole("heading", { name: "Feedback", exact: true })).toBeFocused();
};

/**
 * Runtime generation's one spending path (progress.md D110–D111), from the fresh-set screen:
 * generate past the pre-flight, wait for the result's heading, which takes focus, practise the
 * set by keyboard, and come back to the screen. Returns how many items the set held.
 */
export const generateAndPractise = async (page: Page) => {
  await page.getByRole("button", { name: "Generate a fresh set" }).click();
  await expect(page.getByRole("heading", { name: "Before generating" })).toBeFocused();
  await page.getByRole("button", { name: "Generate the set" }).click();
  await expect(page.getByRole("heading", { name: "Your fresh set" })).toBeFocused();
  await page.getByRole("button", { name: "Practise this set" }).click();
  const total = await drillThroughByKeyboard(page);
  await expect(page.getByRole("heading", { name: "Set complete" })).toBeVisible();
  await page.getByRole("button", { name: "Back to fresh items" }).click();
  await expect(page.getByRole("heading", { name: "Your last generated set" })).toBeVisible();
  return total;
};

/**
 * Spoken practice's one spending path (progress.md D117–D119), from the spoken-practice screen:
 * choose `session`, check the microphone (the synthesised one `installFakeAudio` gives) or choose to type, start past
 * the pre-flight, answer `answers` questions, then end the session and wait for its end, whose
 * heading takes focus. `onState` runs at each state a user rests on, for axe. Returns nothing; the
 * transcript is on the page.
 */
export const practiseSpeaking = async (
  page: Page,
  {
    session = "Warm-up",
    mode = "spoken",
    answers = 1,
    onState = async () => undefined,
  }: {
    session?: string;
    mode?: "spoken" | "typed";
    answers?: number;
    onState?: (state: string) => Promise<void>;
  } = {},
) => {
  await expect(page.getByRole("heading", { name: "Choose a session" })).toBeVisible();
  await onState("picker");
  await page.getByRole("listitem").filter({ has: page.getByRole("heading", { name: session, exact: true }) }).getByRole("button", { name: "Choose" }).click();
  await expect(page.getByRole("heading", { name: "Check your microphone" })).toBeFocused();
  await onState("microphone");
  if (mode === "spoken") {
    await page.getByRole("button", { name: "Check my microphone" }).click();
    const heard = page.getByText("Palier can hear you.");
    const quiet = page.getByText("Palier heard very little.", { exact: false });
    await expect(heard.or(quiet)).toBeVisible({ timeout: 10_000 });
    await onState("microphone checked");
    await page.getByRole("button", { name: (await heard.isVisible()) ? "Continue" : "Continue anyway", exact: true }).click();
  } else {
    await page.getByRole("button", { name: "Answer by typing instead" }).click();
  }
  await expect(page.getByRole("heading", { name: "Before you start" })).toBeFocused();
  await onState("pre-flight");
  await page.getByRole("button", { name: "Start the session" }).click();
  // Focus goes to the step's heading, then, once the first question waits, to where the answer starts (D121): the
  // question for a spoken answer, the field for a typed one. Where it lands is what is checked. The heading can hold it
  // for only a moment when the question comes back quickly, which CI caught (progress.md D196, D197).
  await expect(page.getByRole("heading", { name: "The examiner asks" })).toBeVisible();
  await expect(mode === "spoken" ? page.locator(".app-oral-question") : page.getByRole("textbox", { name: "Your answer" })).toBeFocused();
  for (let i = 0; i < answers; i++) {
    if (mode === "spoken") {
      await page.getByRole("button", { name: "Record your answer" }).click();
      if (i === 0) await onState("recording");
      await page.getByRole("button", { name: "Stop and send" }).click();
      await expect(page.getByRole("button", { name: "Record your answer" })).toBeVisible();
    } else {
      const field = page.getByRole("textbox", { name: "Your answer" });
      await field.fill(`Réponse écrite numéro ${String(i + 1)}.`);
      await page.getByRole("button", { name: "Send answer" }).click();
      await expect(field).toHaveValue("");
      await expect(page.getByRole("button", { name: "Send answer" })).toBeVisible();
    }
    if (i === 0) await onState("answered");
  }
  await page.getByRole("button", { name: "End the session" }).click();
  await expect(page.getByRole("heading", { name: "Session over" })).toBeFocused();
  await onState("ended");
};

/**
 * Studio mode's spending path (progress.md D185, D188), from the spoken-practice screen, over the fake realtime
 * examiner `installFakeRealtime` gives and the synthesised microphone `installFakeAudio` gives: choose studio mode
 * and `session`, check the microphone, start past the studio pre-flight, wait for the examiner's first response to
 * be counted and the candidate's answer to be heard, ask for a repeat, then end and wait for the end card, whose
 * heading takes focus. `onState` runs at each state a user rests on, for axe. `ownEndpoint` expects the copy for a device
 * that mints on the user's own endpoint (D192), whose popup the tap opens.
 */
export const talkInStudio = async (
  page: Page,
  {
    session = "Warm-up",
    onState = async () => undefined,
    ownEndpoint = false,
  }: { session?: string; onState?: (state: string) => Promise<void>; ownEndpoint?: boolean } = {},
) => {
  await expect(page.getByRole("heading", { name: "Choose a session" })).toBeVisible();
  await page.getByRole("radio", { name: /^Studio mode/ }).check();
  await expect(
    page.getByText(ownEndpoint ? "Your key goes once to your own endpoint" : "Your key goes once to Palier’s server", { exact: false }),
  ).toBeVisible();
  await onState("picker");
  await page.getByRole("listitem").filter({ has: page.getByRole("heading", { name: session, exact: true }) }).getByRole("button", { name: "Choose" }).click();
  await expect(page.getByRole("heading", { name: "Check your microphone" })).toBeFocused();
  await expect(page.getByRole("button", { name: "Practise by typing instead" })).toBeVisible();
  await onState("microphone");
  await page.getByRole("button", { name: "Check my microphone" }).click();
  const heard = page.getByText("Palier can hear you.");
  const quiet = page.getByText("Palier heard very little.", { exact: false });
  await expect(heard.or(quiet)).toBeVisible({ timeout: 10_000 });
  await page.getByRole("button", { name: (await heard.isVisible()) ? "Continue" : "Continue anyway", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Before you start" })).toBeFocused();
  await expect(
    page.getByText(ownEndpoint ? "Starting opens your own endpoint in a small window" : "Starting sends your key once to Palier’s server", {
      exact: false,
    }),
  ).toBeVisible();
  await onState("pre-flight");
  await page.getByRole("button", { name: "Start the session" }).click();
  await expect(page.getByRole("heading", { name: "The conversation" })).toBeFocused();
  await expect(page.getByRole("status").filter({ hasText: "The conversation is on." })).toBeVisible();
  // The first response's usage reaches the ledger, and the next tick reads it.
  await expect(page.getByText(/^About US\$\d+\.\d+ so far$/)).toBeVisible({ timeout: 10_000 });
  await onState("conversation");
  await page.getByRole("button", { name: "I did not understand, could you repeat" }).click();
  await onState("repeated");
  await page.getByRole("button", { name: "End the session" }).click();
  await expect(page.getByRole("heading", { name: "Session over" })).toBeFocused();
  await onState("ended");
};

/**
 * The report on the session just ended (progress.md D126), from its end screen: follow the link,
 * ask for the report past its pre-flight, and wait for it. `onState` runs at each state a user
 * rests on, for axe.
 */
export const getOralReport = async (page: Page, { onState = async () => undefined }: { onState?: (state: string) => Promise<void> } = {}) => {
  await page.getByRole("link", { name: "See the report on this session" }).click();
  await expect(page.getByRole("heading", { level: 1, name: "Report on a spoken session" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Get the report" })).toBeVisible();
  await onState("offer");
  await page.getByRole("button", { name: "Get the report" }).click();
  await expect(page.getByRole("heading", { name: "Before you ask" })).toBeFocused();
  await onState("pre-flight");
  await page.getByRole("button", { name: "Send for the report" }).click();
  await expect(page.getByRole("region", { name: "Your report" })).toBeVisible();
  // Focus lands on the report that just arrived (WCAG 2.4.3, D127).
  await expect(page.getByRole("heading", { level: 2, name: "Your report" })).toBeFocused();
  await onState("report");
};

/**
 * The non-affiliation statement beside what it qualifies, not only in the footer (R5,
 * product-requirements.md §2; progress.md D145): in onboarding and beside every band.
 */
export const expectStatementInMain = async (page: Page, words = "not affiliated") => {
  await expect(page.locator("main .app-nonaffiliation").first()).toContainText(words);
};
