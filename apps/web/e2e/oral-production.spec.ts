import { expect, test } from "@playwright/test";

import { onboard } from "./helpers";
import { EXAMINER_QUESTION, SENTINEL, idsAtRest, promptOf, stubOpenAi } from "./leak-guard";

/**
 * Spoken practice on the production build (the `offline` project; progress.md D119–D120): the wall
 * clock and real IndexedDB. The hermetic clock is frozen, so this is where a phase is crossed by
 * time: the screen's timer ticks the session, the session machine directs the next phase, and the
 * examiner's next question is asked in it. `page.clock.setFixedTime`, as journey 4 does, because
 * `clock.install`'s fake timers stall Dexie and React.
 */

const START = new Date("2026-10-01T14:00:00.000Z");
const MIN = 60_000;

test("the screen's timer moves the session into its next phase, and the examiner asks in it", async ({ page, context }) => {
  test.setTimeout(90_000);
  const phases: string[] = [];
  await stubOpenAi(context, (path, body) => {
    const phase = /Current phase: "([^"]+)"/.exec(promptOf(body))?.[1];
    if (phase !== undefined) phases.push(phase);
    return path.endsWith("/chat/completions")
      ? { status: 200, body: { choices: [{ message: { content: JSON.stringify({ text: EXAMINER_QUESTION, difficulty: null }) } }], usage: { prompt_tokens: 900, completion_tokens: 30 } } }
      : path.endsWith("/audio/speech")
        ? { status: 200, contentType: "audio/mpeg", body: "ID3-stub-voice" }
        : { status: 200, body: { object: "list", data: [] } };
  });
  await page.clock.setFixedTime(START);

  await onboard(page, "skip", { addKey: true });
  await page.getByLabel("OpenAI API key").fill(SENTINEL);
  await page.getByRole("button", { name: "Save the key" }).click();
  await expect(page.getByText(/^Saved on this device/)).toBeVisible();

  // Level C, so the bank's C warm-up: three minutes, then two.
  await page.goto("/en/practice/oral");
  await page.getByRole("listitem").filter({ has: page.getByRole("heading", { name: "Warm-up", exact: true }) }).getByRole("button", { name: "Choose" }).click();
  await page.getByRole("button", { name: "Answer by typing instead" }).click();
  await page.getByRole("button", { name: "Start the session" }).click();
  await expect(page.getByText(EXAMINER_QUESTION)).toBeVisible();
  await expect(page.getByText("Part 1 of 2")).toBeVisible();

  // Three and a half minutes on: the next tick crosses into the second phase.
  await page.clock.setFixedTime(new Date(START.getTime() + 3.5 * MIN));
  await page.waitForTimeout(2_500);
  await page.getByRole("textbox", { name: "Your answer" }).fill("Je travaille à la direction des finances.");
  await page.getByRole("button", { name: "Send answer" }).click();
  await expect(page.getByText("Part 2 of 2")).toBeVisible();
  expect(phases).toEqual(["Mise en train", "Description"]);

  await page.getByRole("button", { name: "End the session" }).click();
  await expect(page.getByRole("heading", { name: "Session over" })).toBeFocused();
  await expect(page.getByRole("region", { name: "Transcript" }).getByText("Je travaille à la direction des finances.")).toBeVisible();
  // The transcript is at rest in this device's own store, and the calls in its ledger.
  expect(await idsAtRest(page, "palier", "oralSessions")).toHaveLength(1);
  expect(await idsAtRest(page, "palier", "costLedger")).toHaveLength(4);
});
