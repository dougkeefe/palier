import { expect, type Page, test } from "@playwright/test";

import { axeClean, practiseSpeaking } from "./helpers";
import {
  EXAMINER_QUESTION,
  MODELS_ANSWER,
  type OpenAiAnswer,
  SENTINEL,
  TRANSCRIPT_SENTINEL,
  defaultAnswer,
  installFakeAudio,
  stubOpenAi,
} from "./leak-guard";

/**
 * Spoken practice (product-requirements.md §8.6 practice mode, §14; progress.md D117–D120), on the
 * hermetic lane. OpenAI is stubbed with `page.route` (the examiner, the voice and the
 * transcription), so each state is reached through the real adapter, the real turn-based transport
 * and the real metering. A synthesised microphone answers the level check and a stand-in
 * `MediaRecorder` makes each clip (`installFakeAudio`). Every state is audited by axe [R9].
 *
 * The hermetic container lives for one page load, so the key is added by the card's in-app link and
 * the way back is the browser's own, which keeps the page. The hermetic clock is frozen, so these
 * sessions end by the end control; a phase crossed by time is `oral-production.spec.ts`'s (D119).
 */

const REFUSED: OpenAiAnswer = { status: 401, body: { error: { message: "bad key", code: "invalid_api_key" } } };

const openOral = async (page: Page, path = "/en/practice/oral") => {
  await page.goto(path);
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
};

/** Add a key from the no-key card, then come back the browser's way, keeping the hermetic page. */
const addKeyFromCard = async (page: Page, labels = { add: "Add a key", field: "OpenAI API key", save: "Save the key", saved: /^Saved on this device/ }) => {
  await page.getByRole("link", { name: labels.add }).click();
  await page.getByLabel(labels.field).fill(SENTINEL);
  await page.getByRole("button", { name: labels.save }).click();
  await expect(page.getByText(labels.saved)).toBeVisible();
  await page.goBack();
};

test("without a key: every session with its length and estimate, PRD §14's inline card, and nothing to start", async ({ page, context }) => {
  await stubOpenAi(context);
  await openOral(page);
  await expect(page.getByRole("heading", { level: 1, name: "Spoken practice" })).toBeVisible();
  for (const session of ["Warm-up", "Work discussion", "Opinion and abstract", "Situation", "Full simulation"]) {
    await expect(page.getByRole("heading", { level: 3, name: session })).toBeVisible();
  }
  await expect(page.getByText(/^22 minutes · about US\$\d+\.\d+$/)).toBeVisible();
  await expect(page.getByRole("heading", { name: "Spoken practice needs an OpenAI key" })).toBeVisible();
  await expect(page.getByText(/^About US\$\d+\.\d+ a minute of practice/)).toBeVisible();
  await expect(page.getByRole("button", { name: "Choose" })).toHaveCount(0);
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await axeClean(page);
});

test("a spoken session: the level check, the pre-flight, the question voiced, two recorded answers, and the transcript at the end", async ({
  page,
  context,
}) => {
  test.setTimeout(90_000);
  await stubOpenAi(context);
  await installFakeAudio(context);
  await openOral(page);
  await addKeyFromCard(page);

  const states: string[] = [];
  await practiseSpeaking(page, {
    session: "Work discussion",
    answers: 2,
    onState: async (state) => {
      states.push(state);
      if (state === "pre-flight") await expect(page.getByText(/^This session should cost about US\$/)).toBeVisible();
      if (state === "recording") await expect(page.getByRole("status").filter({ hasText: "Recording your answer…" })).toBeVisible();
      if (state === "answered") {
        await expect(page.getByText("Part 1 of 3")).toBeVisible();
        await expect(page.getByRole("group", { name: "Elapsed time" })).toBeVisible();
        await expect(page.getByText(EXAMINER_QUESTION)).toHaveAttribute("lang", "fr");
        // Only the question is on screen during a session: never a running transcript (§8.6).
        await expect(page.getByText(TRANSCRIPT_SENTINEL, { exact: false })).toHaveCount(0);
      }
      await axeClean(page);
    },
  });
  expect(states).toEqual(["picker", "microphone", "microphone checked", "pre-flight", "recording", "answered", "ended"]);

  await expect(page.getByText("You ended the session.")).toBeVisible();
  const transcript = page.getByRole("region", { name: "Transcript" });
  await expect(transcript.getByRole("listitem")).toHaveCount(5);
  await expect(transcript.getByText(TRANSCRIPT_SENTINEL, { exact: false })).toHaveCount(2);
  await expect(page.getByText("The recording of your answers is kept on this device only.", { exact: false })).toBeVisible();

  // The data settings show the recording, and delete it in one action, transcripts kept.
  await page.getByRole("link", { name: "Open your data settings" }).click();
  await expect(page.getByRole("heading", { name: "Recordings of your spoken practice" })).toBeVisible();
  await expect(page.getByText(/^They take \d+(\.\d)? MB on this device\.$/)).toBeVisible();
  await page.getByRole("button", { name: "Delete all recordings" }).click();
  await expect(page.getByText("Every recording was deleted. Your transcripts are kept.")).toBeVisible();
  await expect(page.getByText("No recordings are kept on this device.")).toBeVisible();
  await axeClean(page);
});

test("a refused microphone: recovery steps for this browser, and typed answers instead", async ({ page, context }) => {
  test.setTimeout(90_000);
  await stubOpenAi(context);
  await context.addInitScript(() => {
    navigator.mediaDevices.getUserMedia = () => Promise.reject(new DOMException("Permission denied", "NotAllowedError"));
  });
  await openOral(page);
  await addKeyFromCard(page);
  await page.getByRole("listitem").filter({ has: page.getByRole("heading", { name: "Warm-up", exact: true }) }).getByRole("button", { name: "Choose" }).click();
  await page.getByRole("button", { name: "Check my microphone" }).click();

  await expect(page.getByText("The microphone is blocked")).toBeVisible();
  await expect(page.getByRole("listitem").filter({ hasText: "Set Microphone to Allow." })).toBeVisible();
  await axeClean(page);

  await page.getByRole("button", { name: "Answer by typing instead" }).click();
  await expect(page.getByText("Your typed answers go to OpenAI only", { exact: false })).toBeVisible();
  await page.getByRole("button", { name: "Back" }).click();
  await practiseSpeaking(page, { mode: "typed", answers: 1, onState: (state) => (state === "answered" ? axeClean(page) : Promise.resolve()) });
  await expect(page.getByRole("region", { name: "Transcript" }).getByText("Réponse écrite numéro 1.")).toBeVisible();
  // A typed session records nothing, so there is no recording to keep.
  await expect(page.getByText("The recording of your answers is kept", { exact: false })).toHaveCount(0);
});

test("a call OpenAI refuses ends the session, names why in words, and keeps the transcript", async ({ page, context }) => {
  test.setTimeout(90_000);
  let examiner: OpenAiAnswer | null = null;
  await stubOpenAi(context, (path, body) => {
    if (path.endsWith("/chat/completions") && examiner !== null) return examiner;
    return path.endsWith("/models") ? MODELS_ANSWER : defaultAnswer(path, body);
  });
  await openOral(page);
  await addKeyFromCard(page);
  await page.getByRole("listitem").filter({ has: page.getByRole("heading", { name: "Warm-up", exact: true }) }).getByRole("button", { name: "Choose" }).click();
  await page.getByRole("button", { name: "Answer by typing instead" }).click();
  await page.getByRole("button", { name: "Start the session" }).click();
  await expect(page.getByText(EXAMINER_QUESTION)).toBeVisible();

  examiner = REFUSED;
  await page.getByRole("textbox", { name: "Your answer" }).fill("Je travaille aux finances.");
  await page.getByRole("button", { name: "Send answer" }).click();

  await expect(page.getByRole("heading", { name: "Session over" })).toBeFocused();
  await expect(page.getByText("The session stopped because a call to OpenAI failed.")).toBeVisible();
  await expect(page.getByText("OpenAI did not accept your key.", { exact: false })).toBeVisible();
  await expect(page.getByText("Your transcript so far is kept on this device.", { exact: false })).toBeVisible();
  await expect(page.getByRole("region", { name: "Transcript" }).getByText("Je travaille aux finances.")).toBeVisible();
  await axeClean(page);
});

test("en français : la même pratique, à parité", async ({ page, context }) => {
  test.setTimeout(90_000);
  await stubOpenAi(context);
  await openOral(page, "/fr/practice/oral");
  await expect(page.getByRole("heading", { level: 1, name: "Pratique orale" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "La pratique orale nécessite une clé OpenAI" })).toBeVisible();
  await axeClean(page);
  await addKeyFromCard(page, {
    add: "Ajouter une clé",
    field: "Clé d’API OpenAI",
    save: "Enregistrer la clé",
    saved: /^Enregistrée sur cet appareil/,
  });

  await page.getByRole("listitem").filter({ has: page.getByRole("heading", { name: "Mise en train", exact: true }) }).getByRole("button", { name: "Choisir" }).click();
  await expect(page.getByRole("heading", { name: "Vérifier votre microphone" })).toBeFocused();
  await page.getByRole("button", { name: "Répondre par écrit" }).click();
  await expect(page.getByRole("heading", { name: "Avant de commencer" })).toBeFocused();
  await axeClean(page);
  await page.getByRole("button", { name: "Commencer la séance" }).click();
  await expect(page.getByText(EXAMINER_QUESTION)).toBeVisible();
  await expect(page.getByText("Partie 1 sur 2")).toBeVisible();
  await page.getByRole("textbox", { name: "Votre réponse" }).fill("Je suis analyste des politiques.");
  await page.getByRole("button", { name: "Envoyer la réponse" }).click();
  await expect(page.getByRole("textbox", { name: "Votre réponse" })).toHaveValue("");
  await axeClean(page);
  await page.getByRole("button", { name: "Terminer la séance" }).click();
  await expect(page.getByRole("heading", { name: "Séance terminée" })).toBeFocused();
  await expect(page.getByText("Vous avez terminé la séance.")).toBeVisible();
  await axeClean(page);
});
