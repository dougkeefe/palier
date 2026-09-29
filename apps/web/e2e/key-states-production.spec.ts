import { expect, test } from "@playwright/test";

import { axeClean } from "./helpers";
import { SENTINEL, stubOpenAi } from "./leak-guard";

/**
 * The key check's failure states on the **production build** (the `offline` project).
 * Journey 5 reaches each of them on the hermetic dev server, which is not minified. The screen
 * tells the adapter's errors apart by `name`, and a production build minifies class names, so
 * every failure once read as the generic message there. A live key found it (progress.md D158).
 * This spec holds it on the build users get.
 */

type Answer = { status: number; body: unknown };

test("each key-check result reads as its own sentence in the production build", async ({ page, context }) => {
  let answer: Answer = { status: 200, body: { object: "list", data: [] } };
  await stubOpenAi(context, () => answer);

  await page.goto("/en/settings/key");
  await page.getByLabel("OpenAI API key").fill(SENTINEL);
  await page.getByRole("button", { name: "Save the key" }).click();

  for (const [next, says] of [
    [{ status: 200, body: { object: "list", data: [] } }, "This key works. OpenAI accepted it."],
    [{ status: 401, body: { error: { code: "invalid_api_key" } } }, "OpenAI did not accept this key."],
    [{ status: 429, body: { error: { code: "insufficient_quota" } } }, "has reached its usage limit or has no credit left"],
    [{ status: 503, body: { error: { code: "overloaded" } } }, "OpenAI returned an error (503)."],
    [{ status: 200, body: { object: "list" } }, "was not what Palier expected"],
  ] as const) {
    answer = next;
    await page.getByRole("button", { name: "Check the key" }).click();
    await expect(page.getByRole("status").filter({ hasText: says })).toBeVisible();
  }
  await axeClean(page);
});
