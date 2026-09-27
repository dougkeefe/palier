import { expect, type Page, test } from "@playwright/test";

import { axeClean } from "./helpers";
import {
  GENERATED_SENTINEL,
  MODELS_ANSWER,
  type OpenAiAnswer,
  SENTINEL,
  completionKind,
  defaultCompletion,
  reviewAnswer,
  stubOpenAi,
} from "./leak-guard";

/**
 * Fresh practice items (architecture.md §8.3, PRD §13.0, §14; progress.md D110–D111), on the
 * hermetic lane. OpenAI is stubbed through the context, scripted per step, so each state is
 * reached through the real adapter, the real review gate and the real metering: no key,
 * choosing, the pre-flight with its cap warning, generating, a failure, the result, practising
 * with the provenance badge open, a set in which nothing passed, and the last set kept. Every
 * state is audited by axe [R9].
 *
 * The hermetic container lives for one page load, so the key and the cap are set by in-app
 * links from the screen and the way back is the browser's own, which keeps the page.
 */

const RATE_LIMITED: OpenAiAnswer = { status: 429, body: { error: { message: "slow down", code: "rate_limit_exceeded" } } };

const openGenerator = async (page: Page, path = "/en/practice/writing/generate") => {
  await page.goto(path);
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
};

/** Save the sentinel key and a low cap from the no-key card's link, then come back the browser's way. */
const addKeyAndCap = async (page: Page) => {
  await page.getByRole("link", { name: "Add a key" }).click();
  await expect(page.getByRole("heading", { level: 1, name: "Your API key" })).toBeVisible();
  await page.getByLabel("OpenAI API key").fill(SENTINEL);
  await page.getByRole("button", { name: "Save the key" }).click();
  await expect(page.getByText(/^Saved on this device/)).toBeVisible();
  await page.getByLabel("Monthly cap, in US dollars").fill("0.01");
  await page.getByRole("button", { name: "Set the cap" }).click();
  await expect(page.getByRole("status").filter({ hasText: "The cap is set." })).toBeVisible();
  await page.goBack();
  await expect(page.getByRole("heading", { level: 1, name: "Fresh practice items" })).toBeVisible();
};

test("the writing drill links to fresh items, and without a key the screen shows PRD §14's inline card", async ({
  page,
  context,
}) => {
  await stubOpenAi(context);
  await page.goto("/en/practice/writing");
  await page.getByRole("link", { name: "Generate a fresh set" }).click();
  await expect(page.getByRole("heading", { level: 1, name: "Fresh practice items" })).toBeVisible();
  await expect(page.getByText(/never counted in your progress/)).toBeVisible();

  await expect(page.getByRole("heading", { name: "Fresh items need an OpenAI key" })).toBeVisible();
  await expect(page.getByText(/^About US\$\d+\.\d+ a set/)).toBeVisible();
  await expect(page.getByRole("button", { name: "Generate a fresh set" })).toHaveCount(0);
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await axeClean(page);
});

test("with a key: the pre-flight warns past the cap, a failure says so plainly, and a set is generated and practised", async ({
  page,
  context,
}) => {
  test.setTimeout(120_000);
  let failNext = false;
  let hold: Promise<void> | null = null;
  await stubOpenAi(context, (path, body) => {
    if (!path.endsWith("/chat/completions")) return MODELS_ANSWER;
    if (failNext) return RATE_LIMITED;
    return defaultCompletion(body);
  });
  // Later routes run first: this one can hold a draft, so the sending state stays on screen.
  await context.route("https://api.openai.com/v1/chat/completions", async (route) => {
    if (hold !== null && completionKind(route.request().postData() ?? "") === "draft") await hold;
    await route.fallback();
  });
  await openGenerator(page);
  await addKeyAndCap(page);

  // Choosing: the sub-skill, at the target level.
  const subSkill = page.getByLabel("Sub-skill to practise");
  await expect(subSkill).toBeVisible();
  await subSkill.selectOption({ label: "pronouns" });
  await expect(page.getByText("The set is written at your target level, C.")).toBeVisible();
  await axeClean(page);

  // "Not now" puts focus back on the sub-skill, never on the page (WCAG 2.4.3).
  await page.getByRole("button", { name: "Generate a fresh set" }).click();
  await page.getByRole("button", { name: "Not now" }).click();
  await expect(subSkill).toBeFocused();

  // The pre-flight: the estimate, and the warning past the cap. It never blocks.
  await page.getByRole("button", { name: "Generate a fresh set" }).click();
  await expect(page.getByRole("heading", { name: "Before generating" })).toBeFocused();
  await expect(page.getByText(/^This set should cost about US\$/)).toBeVisible();
  await expect(page.getByText(/past the cap you set in Palier/)).toBeVisible();
  await axeClean(page);

  // A rate limit: a plain sentence, and the chosen sub-skill kept.
  failNext = true;
  await page.getByRole("button", { name: "Generate the set" }).click();
  await expect(page.getByRole("status").filter({ hasText: "has reached its usage limit or is out of credit" })).toBeVisible();
  await expect(subSkill).toHaveValue("pronouns");
  await expect(subSkill).toBeFocused();
  await axeClean(page);

  // Try again, held mid-draft: the sending state.
  failNext = false;
  let release = () => undefined as void;
  hold = new Promise<void>((resolve) => {
    release = resolve;
  });
  await page.getByRole("button", { name: "Try again" }).click();
  await page.getByRole("button", { name: "Generate the set" }).click();
  await expect(page.getByRole("status").filter({ hasText: "Drafting and checking the set" })).toBeVisible();
  // Its controls are disabled while it works, so focus rests on the status line that says so.
  await expect(page.getByRole("status").filter({ hasText: "Drafting and checking the set" }).locator("..")).toBeFocused();
  await axeClean(page);
  release();
  hold = null;

  // The result: every draft passed the stub's honest review.
  await expect(page.getByRole("heading", { name: "Your fresh set" })).toBeFocused();
  await expect(page.getByText("5 of 5 drafts passed the automated check.")).toBeVisible();
  await axeClean(page);

  // Practising, with the provenance badge and the contribution open.
  await page.getByRole("button", { name: "Practise this set" }).click();
  await expect(page.locator(".app-session__count")).toHaveText("Item 1 of 5");
  await expect(page.getByText(GENERATED_SENTINEL).first()).toBeVisible();
  await page.keyboard.press("1");
  await page.keyboard.press("Enter");
  await expect(page.getByRole("region", { name: /Correct|Not quite/ })).toBeVisible();
  await expect(page.getByRole("button", { name: "Report a problem with this item" })).toHaveCount(0);
  await page.getByRole("button", { name: "About this item" }).click();
  await expect(page.getByText(/^Generated just now on your key\. Reviewed by one automated check/)).toBeVisible();
  const href = await page.getByRole("link", { name: "Contribute this item to Palier" }).getAttribute("href");
  const url = new URL(href ?? "");
  expect(`${url.origin}${url.pathname}`).toBe("https://github.com/dougkeefe/palier/issues/new");
  expect(url.searchParams.get("labels")).toBe("item-contribution");
  expect(url.searchParams.get("body")).toContain(GENERATED_SENTINEL);
  await axeClean(page);

  // The rest by keyboard, then the end, which says it never counts.
  await page.getByRole("button", { name: "Next", exact: true }).click();
  for (let i = 2; i <= 5; i++) {
    await expect(page.locator(".app-session__count")).toHaveText(`Item ${i} of 5`);
    await page.keyboard.press("1");
    await page.keyboard.press("Enter");
    await expect(page.getByRole("region", { name: /Correct|Not quite/ })).toBeVisible();
    await page.keyboard.press("Enter");
  }
  await expect(page.getByRole("heading", { name: "Set complete" })).toBeVisible();
  await expect(page.getByText(/Generated items are never counted in your progress/)).toBeVisible();
  await axeClean(page);

  // Back on the screen, the last set is offered again.
  await page.getByRole("button", { name: "Back to fresh items" }).click();
  await expect(page.getByRole("heading", { name: "Your last generated set" })).toBeVisible();
  await expect(page.getByLabel("Sub-skill to practise")).toBeFocused();
  await expect(page.getByText(/^5 items, generated/)).toBeVisible();
  await axeClean(page);
});

test("a set in which no draft passes the review says so, and offers nothing to practise", async ({ page, context }) => {
  test.setTimeout(90_000);
  await stubOpenAi(context, (path, body) => {
    if (!path.endsWith("/chat/completions")) return MODELS_ANSWER;
    if (completionKind(body) !== "review") return defaultCompletion(body);
    const honest = reviewAnswer(body).body as { choices: [{ message: { content: string } }]; usage: unknown };
    const verdict = { ...(JSON.parse(honest.choices[0].message.content) as object), confidence: 0.2 };
    return { status: 200, body: { ...honest, choices: [{ message: { content: JSON.stringify(verdict) } }] } };
  });
  await openGenerator(page);
  await addKeyAndCap(page);

  await page.getByRole("button", { name: "Generate a fresh set" }).click();
  await page.getByRole("button", { name: "Generate the set" }).click();
  await expect(page.getByRole("heading", { name: "Your fresh set" })).toBeFocused();
  await expect(page.getByText(/^None of the 5 drafts passed the automated check/)).toBeVisible();
  await expect(page.getByRole("button", { name: "Practise this set" })).toHaveCount(0);
  await axeClean(page);
});

test("fresh items in French, at parity", async ({ page, context }) => {
  await stubOpenAi(context);
  await openGenerator(page, "/fr/practice/writing/generate");
  await expect(page.getByRole("heading", { level: 1, name: "Nouvelles questions d’exercice" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Les nouvelles questions exigent une clé OpenAI" })).toBeVisible();
  await axeClean(page);
});
