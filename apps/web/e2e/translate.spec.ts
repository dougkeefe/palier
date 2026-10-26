import { expect, type Page, test } from "@playwright/test";

import { axeClean, onboard } from "./helpers";
import { MODELS_ANSWER, type OpenAiAnswer, SENTINEL, completionKind, stubOpenAi, translateAnswer } from "./leak-guard";

/**
 * The translator (progress.md D250, D251), on the hermetic lane, through the real adapter and the real
 * metering, with OpenAI stubbed by `page.route`. It covers:
 * - the header's way in, and the writing drill's;
 * - no key;
 * - French typed and corrected on a pause with no button, its marks, reasons and study links beside it;
 * - typing on while a call is out, which sends the newest text once that call is answered;
 * - an emptied text emptying the French;
 * - English translated with its notes;
 * - the copy icon and the visit's running total;
 * - a month past the cap, where a pause no longer sends;
 * - a failure that is never retried on its own.
 * Every state is audited by axe [R9].
 *
 * The hermetic container lives for one page load, so the key is added from the card's link and the
 * way back is the browser's own, which keeps the page.
 */

const MINE = "Bonjour à tous, la réunion de lundi est reporter à mardi. Merci de votre compréhension.";
const CORRECTED: OpenAiAnswer = {
  status: 200,
  body: {
    choices: [
      {
        message: {
          content: JSON.stringify({
            source: "fr",
            output: "Bonjour à tous, la réunion de lundi est reportée à mardi. Merci de votre compréhension.",
            strengths: ["Your closing line suits a message to a team."],
            corrections: [
              {
                excerpt: "est reporter",
                correction: "est reportée",
                why: "After être, the past participle agrees with the subject, la réunion.",
                subSkill: "agreement",
              },
            ],
            notes: [],
          }),
        },
      },
    ],
    usage: { prompt_tokens: 1_400, completion_tokens: 1_100 },
  },
};

const openTranslator = async (page: Page, path = "/en/practice/writing/translate") => {
  await page.goto(path);
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
};

/** Every translation request's body, in order, from a stub that fits its answer to what was sent unless `scripted` says otherwise. */
const stubTranslations = async (page: Page, scripted: () => OpenAiAnswer | null = () => null) => {
  const sent: string[] = [];
  await stubOpenAi(page.context(), (path, body) => {
    if (!path.endsWith("/chat/completions") || completionKind(body) !== "translate") return MODELS_ANSWER;
    sent.push(body);
    return scripted() ?? translateAnswer(body);
  });
  return sent;
};

const addKey = async (page: Page, { cap }: { cap?: string } = {}) => {
  await page.getByRole("link", { name: "Add a key" }).click();
  await expect(page.getByRole("heading", { level: 1, name: "Your API key" })).toBeVisible();
  await page.getByLabel("OpenAI API key").fill(SENTINEL);
  await page.getByRole("button", { name: "Save the key" }).click();
  await expect(page.getByText(/^Saved on this device/)).toBeVisible();
  if (cap !== undefined) {
    await page.getByLabel("Monthly cap, in US dollars").fill(cap);
    await page.getByRole("button", { name: "Set the cap" }).click();
    await expect(page.getByRole("status").filter({ hasText: "The cap is set." })).toBeVisible();
  }
  await page.goBack();
  await expect(page.getByRole("heading", { level: 1, name: "Translator" })).toBeVisible();
};

/** Longer than the pause (`TRANSLATE_PAUSE_MS`), so a send that was going to happen has happened. */
const PAST_THE_PAUSE_MS = 3_000;

test("the header and the writing drill lead to the translator, and without a key the editor works beside PRD §14's card", async ({
  page,
}) => {
  const sent = await stubTranslations(page);
  // A drill sends a user who has not set up to onboarding (D224), so set up first, then reach the
  // writing drill in-app, since the hermetic container lives for one page load.
  await onboard(page, "skip");
  const nav = page.getByRole("navigation", { name: "Primary" });
  await expect(nav.getByRole("link", { name: "Translate" })).toHaveAttribute("href", "/en/practice/writing/translate");
  await expect(nav.getByRole("link", { name: "About" })).toHaveCount(0);
  await expect(page.getByRole("contentinfo").getByRole("link", { name: "About" })).toBeVisible();

  await page.getByRole("tab", { name: "Written expression" }).click();
  await page.getByRole("link", { name: /^Start/ }).click();
  await expect(page).toHaveURL(/\/en\/practice\/writing$/);
  await page.getByRole("link", { name: "Open the translator" }).click();
  await expect(page).toHaveURL(/\/en\/practice\/writing\/translate$/);
  await expect(page.getByRole("heading", { level: 1, name: "Translator" })).toBeVisible();
  await expect(nav.getByRole("link", { name: "Translate" })).toHaveAttribute("aria-current", "page");

  await expect(page.getByRole("radio", { name: "Detect" })).toBeChecked();
  await expect(page.getByText("Always in French")).toHaveCount(0);
  // Named by its label alone: the hint and the count describe it, never name it.
  const editor = page.getByRole("textbox", { name: "Your text", exact: true });
  await expect(editor).toHaveAccessibleDescription(/as soon as you pause\. [\d,]+ characters left$/);
  await editor.fill(MINE);
  await expect(page.getByText(/^\d[\d,]* characters left$/)).toBeVisible();

  const noKey = page.getByRole("heading", { name: "The translator needs an OpenAI key" });
  await expect(noKey).toBeVisible();
  // Above the editor, so it is read before anything is typed (D258).
  expect((await noKey.boundingBox())!.y).toBeLessThan((await editor.boundingBox())!.y);
  await expect(page.getByText(/^About US\$\d+\.\d+ a text/)).toBeVisible();
  await page.waitForTimeout(PAST_THE_PAUSE_MS);
  expect(sent).toHaveLength(0);
  await expect(page.getByRole("button", { name: "Translate" })).toHaveCount(0);
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await axeClean(page);
});

test("with a key: French is corrected on a pause, with no button, each correction marked, explained and linked", async ({
  page,
  context,
}) => {
  test.setTimeout(90_000);
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  // The correction is scripted; once it is set to null, the stub fits its answer to what was sent.
  let completion: OpenAiAnswer | null = CORRECTED;
  const sent = await stubTranslations(page, () => completion);
  await openTranslator(page);
  await addKey(page);

  const editor = page.getByRole("textbox", { name: "Your text" });
  const french = page.getByRole("region", { name: "French", exact: true });
  await expect(page.getByRole("button", { name: /^(Translate|Correct)/ })).toHaveCount(0);
  await page.getByRole("radio", { name: "French" }).check();
  await expect(editor).toHaveAttribute("lang", "fr");
  await editor.fill(MINE);

  // The pause sends it; focus never leaves the editor, and the French is announced politely (D251).
  await expect(french.locator(".app-translate__output")).toHaveText(/est reportée à mardi/);
  expect(sent).toHaveLength(1);
  await expect(editor).toBeFocused();
  await expect(page.getByText("The French is ready.")).toBeAttached();
  await expect(page.getByText("Read as French, so it was corrected.")).toBeVisible();
  await expect(page.getByRole("heading", { name: "What your French does well" })).toBeVisible();
  await expect(page.getByText("Your closing line suits a message to a team.")).toBeVisible();
  await expect(page.locator("mark.app-writing-mark")).toHaveText(/^est reporter/);
  await expect(page.getByText("“est reporter” becomes “est reportée”")).toBeVisible();
  await expect(page.getByText(/agrees with the subject, la réunion/)).toBeVisible();
  await expect(page.getByText(/^This visit so far: US\$\d+\.\d+ on your OpenAI key, for 1 text\.$/)).toBeVisible();

  // Where to study it: Palier's own article, then curated government references, each in a new tab.
  await expect(page.getByRole("heading", { level: 3, name: "agreement" })).toBeVisible();
  const guide = page.getByRole("link", { name: /^Palier’s guide: agreement/ });
  await expect(guide).toHaveAttribute("href", "/en/library/agreement");
  const reference = page.getByRole("link", { name: /^Past participle agreement/ });
  await expect(reference).toHaveAttribute("href", /^https:\/\/vitrinelinguistique\.oqlf\.gouv\.qc\.ca\//);
  await expect(reference).toHaveAttribute("target", "_blank");
  await expect(reference).toHaveAttribute("rel", "noopener noreferrer");
  await expect(page.getByText("Office québécois de la langue française, in French").first()).toBeVisible();
  await axeClean(page);

  // The copy icon sits on the French itself, top right.
  await french.getByRole("button", { name: "Copy the French" }).click();
  await expect(page.getByRole("status").filter({ hasText: "Copied." })).toBeVisible();
  expect(await page.evaluate(() => navigator.clipboard.readText())).toMatch(/est reportée à mardi/);

  // Space at the end buys nothing; a new sentence is sent on the next pause.
  completion = null;
  await editor.press("End");
  await editor.press("Space");
  await page.waitForTimeout(PAST_THE_PAUSE_MS);
  expect(sent).toHaveLength(1);
  await editor.pressSequentially("À bientôt.");
  await expect(french.locator(".app-translate__output")).toHaveText(/À bientôt\.$/);
  expect(sent).toHaveLength(2);
  await expect(page.getByText(/^This visit so far: US\$\d+\.\d+ on your OpenAI key, for 2 texts\.$/)).toBeVisible();

  // Emptying the text empties the French, which replaced Start again.
  await editor.fill("");
  await expect(french.getByText("The French will appear here.")).toBeVisible();
  await expect(page.getByRole("heading", { name: "What your French does well" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Start again" })).toHaveCount(0);

  // English is translated, with its notes.
  await page.getByRole("radio", { name: "English" }).check();
  await editor.fill("Treasury Board approved the plan.");
  await expect(french.locator(".app-translate__output")).toHaveText(/Treasury Board approved the plan\./);
  await expect(page.getByText("Read as English, so it was translated.")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Choices worth knowing" })).toBeVisible();
  await expect(page.getByText("“Treasury Board” is “Conseil du Trésor”")).toBeVisible();
  await expect(page.getByRole("heading", { name: "What was corrected, and why" })).toHaveCount(0);
  expect(sent).toHaveLength(3);
  await axeClean(page);
});

test("typing on while a call is out is never held, and the newest text is sent once that call is answered", async ({ page }) => {
  test.setTimeout(60_000);
  const sent = await stubTranslations(page);
  // Hold the first translation until the user has typed on, then let every call through.
  let release = () => {};
  const held = new Promise<void>((resolve) => {
    release = resolve;
  });
  await page.route("**/v1/chat/completions", async (route) => {
    if (route.request().method() === "POST") await held;
    await route.fallback();
  });
  await openTranslator(page);
  await addKey(page);

  const editor = page.getByRole("textbox", { name: "Your text" });
  const output = page.locator(".app-translate__output");
  await editor.fill("Première version du message.");
  await expect(page.getByText("Translating…")).toBeVisible();
  await expect(editor).toBeEditable();
  await editor.fill("Deuxième version du message.");
  release();

  await expect(output).toHaveText("Deuxième version du message.");
  expect(sent).toHaveLength(2);
  expect(sent[0]).toContain("Première version");
  expect(sent[1]).toContain("Deuxième version");
  await axeClean(page);
});

test("past the cap a pause no longer sends, and one press does, with its estimate beside it", async ({ page }) => {
  const sent = await stubTranslations(page);
  await openTranslator(page);
  await addKey(page, { cap: "0.01" });

  await page.getByRole("textbox", { name: "Your text" }).fill(MINE);
  await expect(page.getByText(/^Translating as you type is paused/)).toBeVisible();
  await expect(page.getByText(/^This should cost about US\$/)).toBeVisible();
  await page.waitForTimeout(PAST_THE_PAUSE_MS);
  expect(sent).toHaveLength(0);
  await axeClean(page);

  await page.getByRole("button", { name: "Translate", exact: true }).click();
  await expect(page.locator(".app-translate__output")).not.toHaveText("The French will appear here.");
  expect(sent).toHaveLength(1);
});

test("in French, a failure keeps the text, says why, and is never retried on its own", async ({ page }) => {
  let calls = 0;
  await stubOpenAi(page.context(), (path) => {
    if (!path.endsWith("/chat/completions")) return MODELS_ANSWER;
    calls += 1;
    return { status: 429, body: { error: { message: "slow", code: "insufficient_quota" } } };
  });
  await openTranslator(page, "/fr/practice/writing/translate");
  // Capitalised as labels on the radio control, though lower case in running French (D258).
  await expect(page.getByRole("radio", { name: "Anglais", exact: true })).toBeVisible();
  await expect(page.getByRole("radio", { name: "Français", exact: true })).toBeVisible();
  await page.getByRole("link", { name: "Ajouter une clé" }).click();
  await page.getByLabel("Clé d’API OpenAI").fill(SENTINEL);
  await page.getByRole("button", { name: "Enregistrer la clé" }).click();
  await expect(page.getByText(/^Enregistrée sur cet appareil/)).toBeVisible();
  await page.goBack();
  await expect(page.getByRole("heading", { level: 1, name: "Traducteur" })).toBeVisible();
  await expect(page.getByRole("navigation", { name: "Principale" }).getByRole("link", { name: "Traduire" })).toHaveAttribute(
    "aria-current",
    "page",
  );
  await page.getByRole("textbox", { name: "Votre texte" }).fill(MINE);
  await expect(page.getByText(/OpenAI indique que votre clé a atteint sa limite/)).toBeVisible();
  await expect(page.getByRole("textbox", { name: "Votre texte" })).toHaveValue(MINE);
  await expect(page.getByRole("button", { name: "Réessayer" })).toBeEnabled();
  await page.waitForTimeout(PAST_THE_PAUSE_MS);
  // Whatever the OpenAI client retries on its own is over by now; the screen never sends the text again.
  const afterFailure = calls;
  await page.waitForTimeout(PAST_THE_PAUSE_MS);
  expect(calls).toBe(afterFailure);
  await axeClean(page);
});
