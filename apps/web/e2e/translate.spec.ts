import { expect, type Page, test } from "@playwright/test";

import { axeClean, onboard } from "./helpers";
import { MODELS_ANSWER, type OpenAiAnswer, SENTINEL, completionKind, stubOpenAi, translateAnswer } from "./leak-guard";

/**
 * The translator (progress.md D248), on the hermetic lane, through the real adapter and the real
 * metering, with OpenAI stubbed by `page.route`: the writing drill's way in, no key, a correction of
 * the user's own French with its marks, reasons and study links, a translation of English with its
 * notes, and an answer that goes stale when the text changes. Every state is audited by axe [R9].
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

test("the writing drill links to the translator, and without a key the editor works beside PRD §14's card", async ({ page, context }) => {
  await stubOpenAi(context);
  // A drill sends a user who has not set up to onboarding (D224), so set up first, then reach the
  // writing drill in-app, since the hermetic container lives for one page load.
  await onboard(page, "skip");
  await page.getByRole("radio", { name: "Written expression" }).check();
  await page.getByRole("link", { name: /^Start/ }).click();
  await expect(page).toHaveURL(/\/en\/practice\/writing$/);
  await page.getByRole("link", { name: "Open the translator" }).click();
  await expect(page).toHaveURL(/\/en\/practice\/writing\/translate$/);
  await expect(page.getByRole("heading", { level: 1, name: "Translator" })).toBeVisible();

  await expect(page.getByRole("radio", { name: "Detect" })).toBeChecked();
  await expect(page.getByText("Always in French")).toBeVisible();
  const editor = page.getByRole("textbox", { name: "Your text" });
  await editor.fill(MINE);
  await expect(page.getByText(/^\d[\d,]* characters left$/)).toBeVisible();

  await expect(page.getByRole("heading", { name: "The translator needs an OpenAI key" })).toBeVisible();
  await expect(page.getByText(/^About US\$\d+\.\d+ a text/)).toBeVisible();
  await expect(page.getByRole("button", { name: "Translate or correct" })).toHaveCount(0);
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await axeClean(page);
});

test("with a key: the user's French is corrected, each correction marked, explained and linked to study", async ({ page, context }) => {
  test.setTimeout(90_000);
  // The correction is scripted; once it is set to null, the stub fits its answer to what was sent.
  let completion: OpenAiAnswer | null = CORRECTED;
  await stubOpenAi(context, (path, body) =>
    path.endsWith("/chat/completions") && completionKind(body) === "translate" ? (completion ?? translateAnswer(body)) : MODELS_ANSWER,
  );
  await openTranslator(page);

  await page.getByRole("link", { name: "Add a key" }).click();
  await expect(page.getByRole("heading", { level: 1, name: "Your API key" })).toBeVisible();
  await page.getByLabel("OpenAI API key").fill(SENTINEL);
  await page.getByRole("button", { name: "Save the key" }).click();
  await expect(page.getByText(/^Saved on this device/)).toBeVisible();
  await page.goBack();
  await expect(page.getByRole("heading", { level: 1, name: "Translator" })).toBeVisible();

  // The button waits for words, and shows its estimate before it is pressed (D237).
  const button = page.getByRole("button", { name: "Translate or correct" });
  await expect(button).toBeDisabled();
  await page.getByRole("radio", { name: "French" }).check();
  await expect(page.getByRole("textbox", { name: "Your text" })).toHaveAttribute("lang", "fr");
  await page.getByRole("textbox", { name: "Your text" }).fill(MINE);
  const correct = page.getByRole("button", { name: "Correct my French" });
  await expect(page.getByText(/^This should cost about US\$/)).toBeVisible();
  await expect(correct).toBeEnabled();
  await axeClean(page);

  await correct.click();
  await expect(page.getByRole("heading", { level: 2, name: "French", exact: true })).toBeFocused();
  await expect(page.locator(".app-translate__output")).toHaveText(/est reportée à mardi/);
  await expect(page.getByText("Read as French, so it was corrected.")).toBeVisible();
  await expect(page.getByRole("heading", { name: "What your French does well" })).toBeVisible();
  await expect(page.getByText("Your closing line suits a message to a team.")).toBeVisible();
  await expect(page.locator("mark.app-writing-mark")).toHaveText(/^est reporter/);
  await expect(page.getByText("“est reporter” becomes “est reportée”")).toBeVisible();
  await expect(page.getByText(/agrees with the subject, la réunion/)).toBeVisible();

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

  // Editing keeps the answer, and says it is for an earlier text.
  await page.getByRole("textbox", { name: "Your text" }).fill(`${MINE} À bientôt.`);
  await expect(page.getByText(/This answer is for an earlier version of your text/)).toBeVisible();

  // English is translated, with its notes.
  completion = null;
  await page.getByRole("button", { name: "Start again" }).click();
  await page.getByRole("radio", { name: "English" }).check();
  await page.getByRole("textbox", { name: "Your text" }).fill("Treasury Board approved the plan.");
  await page.getByRole("button", { name: "Translate into French" }).click();
  await expect(page.locator(".app-translate__output")).toHaveText(/Treasury Board approved the plan\./);
  await expect(page.getByText("Read as English, so it was translated.")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Choices worth knowing" })).toBeVisible();
  await expect(page.getByText("“Treasury Board” is “Conseil du Trésor”")).toBeVisible();
  await expect(page.getByRole("heading", { name: "What was corrected, and why" })).toHaveCount(0);
  await axeClean(page);
});

test("in French, a failure keeps the text and says why", async ({ page, context }) => {
  await stubOpenAi(context, (path) =>
    path.endsWith("/chat/completions") ? { status: 429, body: { error: { message: "slow", code: "insufficient_quota" } } } : MODELS_ANSWER,
  );
  await openTranslator(page, "/fr/practice/writing/translate");
  await page.getByRole("link", { name: "Ajouter une clé" }).click();
  await page.getByLabel("Clé d’API OpenAI").fill(SENTINEL);
  await page.getByRole("button", { name: "Enregistrer la clé" }).click();
  await expect(page.getByText(/^Enregistrée sur cet appareil/)).toBeVisible();
  await page.goBack();
  await expect(page.getByRole("heading", { level: 1, name: "Traducteur" })).toBeVisible();
  await page.getByRole("textbox", { name: "Votre texte" }).fill(MINE);
  await page.getByRole("button", { name: "Traduire ou corriger" }).click();
  await expect(page.getByText(/OpenAI indique que votre clé a atteint sa limite/)).toBeVisible();
  await expect(page.getByRole("textbox", { name: "Votre texte" })).toHaveValue(MINE);
  await expect(page.getByRole("button", { name: "Réessayer" })).toBeEnabled();
  await axeClean(page);
});
