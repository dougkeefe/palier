import { expect, type Page, test } from "@playwright/test";

import { axeClean } from "./helpers";
import { MODELS_ANSWER, type OpenAiAnswer, SENTINEL, completionKind, feedbackAnswer, stubOpenAi } from "./leak-guard";

/**
 * The writing workshop (product-requirements.md §8.7, §14; progress.md D105–D108), on the
 * hermetic lane. OpenAI is stubbed with `page.route`, scripted per step, so each state is
 * reached through the real adapter and the real metering: no key, editing, the pre-flight
 * with its cap warning, a failure, and the feedback. Every state is audited by axe [R9].
 *
 * The hermetic container lives for one page load, so the key and the cap are set by in-app
 * links from the workshop and the way back is the browser's own, which keeps the page.
 */

const WRITTEN = "Madame, je vous écrit pour vous informer que votre demande est en cours de traitement.";
const FEEDBACK = feedbackAnswer(
  [{ excerpt: "écrit", correction: "écris", rule: "Conjugaison : je écris, au présent de l’indicatif." }],
  "Madame, je vous écris pour vous informer que votre demande est en cours de traitement.",
);
const RATE_LIMITED: OpenAiAnswer = { status: 429, body: { error: { message: "slow down", code: "rate_limit_exceeded" } } };

const openWorkshop = async (page: Page, path = "/en/practice/writing/workshop") => {
  await page.goto(path);
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
};

test("the workshop without a key: prompts, an editor that works, and PRD §14's inline card", async ({ page, context }) => {
  await stubOpenAi(context);
  await openWorkshop(page);
  await expect(page.getByText("Supplementary practice")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Choose a prompt" })).toBeVisible();
  await axeClean(page);

  await page.getByRole("button", { name: "Write this" }).first().click();
  const editor = page.getByRole("textbox", { name: "Your text" });
  await expect(editor).toBeFocused();
  await expect(editor).toHaveAttribute("lang", "fr");
  await editor.fill(WRITTEN);
  await expect(page.getByText(/^15 words of about \d+ · Below the target$/)).toBeVisible();
  await expect(page.getByRole("group", { name: "Time spent writing" })).toBeVisible();

  // No key: the card says what feedback does and costs, links to the key, and is not a dialog.
  await expect(page.getByRole("heading", { name: "Feedback needs an OpenAI key" })).toBeVisible();
  await expect(page.getByText(/^About US\$\d+\.\d+ for one piece of writing/)).toBeVisible();
  await expect(page.getByRole("button", { name: "Get feedback" })).toHaveCount(0);
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await axeClean(page);
});

test("the workshop with a key: the pre-flight warns past the cap, a failure keeps the text, and feedback arrives", async ({
  page,
  context,
}) => {
  test.setTimeout(90_000);
  let completion = FEEDBACK;
  await stubOpenAi(context, (path) => (path.endsWith("/chat/completions") ? completion : MODELS_ANSWER));
  await openWorkshop(page);
  await page.getByRole("button", { name: "Write this" }).first().click();

  // Add a key and a low cap from the card's link, then come back the browser's way.
  await page.getByRole("link", { name: "Add a key" }).click();
  await expect(page.getByRole("heading", { level: 1, name: "Your API key" })).toBeVisible();
  await page.getByLabel("OpenAI API key").fill(SENTINEL);
  await page.getByRole("button", { name: "Save the key" }).click();
  await expect(page.getByText(/^Saved on this device/)).toBeVisible();
  await page.getByLabel("Monthly cap, in US dollars").fill("0.01");
  await page.getByRole("button", { name: "Set the cap" }).click();
  await expect(page.getByRole("status").filter({ hasText: "The cap is set." })).toBeVisible();
  await page.goBack();
  await expect(page.getByRole("heading", { level: 1, name: "Writing workshop" })).toBeVisible();

  // Editing.
  await page.getByRole("button", { name: "Write this" }).first().click();
  await page.getByRole("textbox", { name: "Your text" }).fill(WRITTEN);
  await axeClean(page);

  // The pre-flight: the estimate, and the warning past the cap. It never blocks.
  await page.getByRole("button", { name: "Get feedback" }).click();
  await expect(page.getByRole("heading", { name: "Before you send" })).toBeFocused();
  await expect(page.getByText(/^This feedback should cost about US\$/)).toBeVisible();
  await expect(page.getByText(/past the limit you set in Palier/)).toBeVisible();
  await axeClean(page);

  // A rate limit: a plain sentence, and the text is kept.
  completion = RATE_LIMITED;
  await page.getByRole("button", { name: "Send for feedback" }).click();
  await expect(page.getByRole("status").filter({ hasText: "has reached its usage limit or has no credit left" })).toBeVisible();
  await expect(page.getByRole("textbox", { name: "Your text" })).toHaveValue(WRITTEN);
  await axeClean(page);

  // Try again: the same submission, and this time the feedback.
  completion = FEEDBACK;
  await page.getByRole("button", { name: "Try again" }).click();
  await page.getByRole("button", { name: "Send for feedback" }).click();
  await expect(page.getByRole("heading", { name: "Feedback", exact: true })).toBeFocused();

  // The five criteria, the error drawn over the user's own words, and the model answer's changes.
  for (const criterion of ["Register", "Structure", "Grammar and mechanics", "Vocabulary precision", "Task achievement"]) {
    await expect(page.getByRole("term").filter({ hasText: criterion })).toBeVisible();
  }
  await expect(page.locator("mark.app-writing-mark")).toHaveText(/^écrit/);
  await expect(page.getByText("“écrit” becomes “écris”.")).toBeVisible();
  await expect(page.locator("del.app-writing-removed")).toContainText("écrit");
  await expect(page.locator("ins.app-writing-added")).toContainText("écris");
  // Inside the French, the interface's own words read as English (WCAG 3.1.2, Slice 3's lang audit).
  await expect(page.locator("ins.app-writing-added .pl-visually-hidden")).toHaveAttribute("lang", "en");
  await expect(page.locator("mark.app-writing-mark .pl-visually-hidden")).toHaveAttribute("lang", "en");
  await expect(page.locator("main .app-nonaffiliation")).toContainText("not affiliated");
  await axeClean(page);

  // The history keeps it, on this device only; opening it shows the feedback again, free.
  await page.getByRole("button", { name: "Choose another prompt" }).click();
  await expect(page.getByRole("heading", { name: "Your earlier writing" })).toBeVisible();
  await expect(page.getByText("With feedback")).toBeVisible();
  await axeClean(page);
  await page.getByRole("button", { name: "Open" }).first().click();
  await expect(page.getByRole("heading", { name: "Feedback", exact: true })).toBeFocused();

});

test("the workshop in French, at parity", async ({ page, context }) => {
  await stubOpenAi(context);
  await openWorkshop(page, "/fr/practice/writing/workshop");
  await expect(page.getByRole("heading", { level: 1, name: "Atelier d’écriture" })).toBeVisible();
  await expect(page.getByText("Pratique complémentaire")).toBeVisible();
  await axeClean(page);
  await page.getByRole("button", { name: "Rédiger ce texte" }).first().click();
  await page.getByRole("textbox", { name: "Votre texte" }).fill(WRITTEN);
  await expect(page.getByRole("heading", { name: "La rétroaction exige une clé OpenAI" })).toBeVisible();
  await axeClean(page);
});

test("feedback still being made is waited for when you come back, and never asked for twice (D143)", async ({ page, context }) => {
  test.setTimeout(90_000);
  await stubOpenAi(context);
  let asked = 0;
  let release: () => void = () => undefined;
  const held = new Promise<void>((resolve) => {
    release = resolve;
  });
  // Registered after the stub, so it is asked first: it holds the feedback's answer, and passes every other call on.
  await context.route("https://api.openai.com/v1/chat/completions", async (route) => {
    if (completionKind(route.request().postData() ?? "") === "feedback") {
      asked += 1;
      await held;
    }
    await route.fallback();
  });
  await openWorkshop(page);
  await page.getByRole("button", { name: "Write this" }).first().click();
  await page.getByRole("link", { name: "Add a key" }).click();
  await page.getByLabel("OpenAI API key").fill(SENTINEL);
  await page.getByRole("button", { name: "Save the key" }).click();
  await expect(page.getByText(/^Saved on this device/)).toBeVisible();
  await page.goBack();

  await page.getByRole("button", { name: "Write this" }).first().click();
  const editor = page.getByRole("textbox", { name: "Your text" });
  await editor.fill(WRITTEN);
  await page.getByRole("button", { name: "Get feedback" }).click();
  await page.getByRole("button", { name: "Send for feedback" }).click();
  const sending = page.getByRole("status").filter({ hasText: "Getting feedback." });
  await expect(sending).toBeVisible();
  // The text being assessed is fixed until its feedback arrives.
  await expect(editor).toHaveAttribute("readonly", "");

  // Leave while it is being made, and come back the browser's way.
  await page.getByRole("link", { name: "About" }).first().click();
  await expect(page.getByRole("heading", { level: 1, name: "What Palier is, and what it is not" })).toBeVisible();
  await page.goBack();
  await expect(page.getByRole("heading", { level: 1, name: "Writing workshop" })).toBeVisible();
  await expect(sending).toBeVisible();
  await expect(editor).toHaveValue(WRITTEN);
  await expect(page.getByRole("button", { name: "Get feedback" })).toBeDisabled();
  await axeClean(page);

  release();
  await expect(page.getByRole("heading", { name: "Feedback", exact: true })).toBeVisible();
  expect(asked).toBe(1);
});
