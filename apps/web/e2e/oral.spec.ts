import { expect, type Page, test } from "@playwright/test";

import { axeClean, getOralReport, practiseSpeaking, talkInStudio } from "./helpers";
import {
  EXAMINER_QUESTION,
  MODELS_ANSWER,
  type OpenAiAnswer,
  REPORT_SENTINEL,
  SENTINEL,
  STUDIO_ANSWER,
  TRANSCRIPT_SENTINEL,
  completionKind,
  defaultAnswer,
  installFakeAudio,
  installFakeRealtime,
  realtimeSent,
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
 *
 * Studio mode (D185, D188) runs its real realtime transport and its real secret route over an
 * `RTCPeerConnection` stubbed by `installFakeRealtime`, whose data channel plays a short scripted examiner.
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

test("a spoken session: the level check, the pre-flight, the question voiced, two recorded answers, the transcript, and its report", async ({
  page,
  context,
}) => {
  test.setTimeout(150_000);
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

  // The report (D126): asked for on the key past its pre-flight, then every part of it, axe on each state.
  const reportStates: string[] = [];
  await getOralReport(page, {
    onState: async (state) => {
      reportStates.push(state);
      if (state === "offer") await expect(page.getByText(/^About US\$\d+\.\d+, paid to OpenAI directly\.$/)).toBeVisible();
      if (state === "pre-flight") await expect(page.getByText(/^This report should cost about US\$/)).toBeVisible();
      await axeClean(page);
    },
  });
  expect(reportStates).toEqual(["offer", "pre-flight", "report"]);
  const report = page.getByRole("region", { name: "Your report" });
  await expect(report.getByText("Level B", { exact: true })).toHaveCount(5);
  await expect(report.getByText("Not assessed", { exact: true })).toBeVisible();
  await expect(report.locator(".app-nonaffiliation")).toContainText("not affiliated");
  await expect(report.getByRole("link", { name: "Practise agreement in written expression" })).toBeVisible();
  await expect(report.getByRole("link", { name: "Practise inference in reading" })).toBeVisible();
  await expect(report.getByRole("heading", { name: "Five useful words you did not use" })).toBeVisible();
  // Each error is a button that shows its correction beside it, in the practised language.
  const mark = report.getByRole("button", { expanded: false }).first();
  await expect(page.getByText(REPORT_SENTINEL, { exact: false })).toBeHidden();
  await mark.click();
  await expect(report.getByRole("button", { expanded: true })).toHaveCount(1);
  await expect(page.getByText(REPORT_SENTINEL, { exact: false })).toBeVisible();
  await axeClean(page);
  // The fluency is measured on this device from the two spoken answers, and the cost from the ledger.
  await expect(page.getByText("Measured over your 2 spoken answers.", { exact: false })).toBeVisible();
  await expect(page.getByRole("heading", { name: "What it cost" })).toBeVisible();
  // The recording plays here and is deleted in one tap, the report and transcript kept.
  await expect(page.getByLabel("The recording of your answers")).toBeVisible();
  await page.getByRole("button", { name: "Delete this recording" }).click();
  await expect(page.getByText("There is no recording of this session on this device.")).toBeVisible();
  await expect(report).toBeVisible();

  // Back at the picker, the session is listed with its report ready.
  await page.getByRole("link", { name: "Back to spoken practice" }).first().click();
  const earlier = page.getByRole("region", { name: "Your earlier sessions" });
  await expect(earlier.getByText("Report ready")).toBeVisible();
  await axeClean(page);

  // The data settings, reached from a fresh session's end, delete the rest in one action, transcripts kept.
  await practiseSpeaking(page, { session: "Warm-up", answers: 1 });
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
  // "Practise again" lists the session just finished, without a reload (D127).
  await page.getByRole("button", { name: "Practise again" }).click();
  await expect(page.getByRole("region", { name: "Your earlier sessions" }).getByText("No report yet")).toBeVisible();
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

  // The report is refused the same way (D126): named in words, the transcript kept, and offered again.
  await page.getByRole("link", { name: "See the report on this session" }).click();
  await page.getByRole("button", { name: "Get the report" }).click();
  await page.getByRole("button", { name: "Send for the report" }).click();
  await expect(page.getByText("OpenAI did not accept your key.", { exact: false })).toBeVisible();
  await expect(page.getByText("Your transcript is kept on this device, and you can ask again.", { exact: false })).toBeVisible();
  await expect(page.getByRole("button", { name: "Try again" })).toBeVisible();
  await axeClean(page);
});

test("a report still being made is waited for when you come back, and never asked for twice (D127)", async ({ page, context }) => {
  test.setTimeout(90_000);
  await stubOpenAi(context);
  let reports = 0;
  let release: () => void = () => undefined;
  const held = new Promise<void>((resolve) => {
    release = resolve;
  });
  // Registered after the stub, so it is asked first: it holds the report's answer, and passes every other call on.
  await context.route("https://api.openai.com/v1/chat/completions", async (route) => {
    if (completionKind(route.request().postData() ?? "") === "oral-report") {
      reports += 1;
      await held;
    }
    await route.fallback();
  });
  await openOral(page);
  await addKeyFromCard(page);
  await practiseSpeaking(page, { mode: "typed", answers: 1 });
  await page.getByRole("link", { name: "See the report on this session" }).click();
  await page.getByRole("button", { name: "Get the report" }).click();
  await page.getByRole("button", { name: "Send for the report" }).click();
  await expect(page.getByRole("status").filter({ hasText: "Assessing your answers…" })).toBeVisible();

  // Leave while it is being made, and come back to the same session from the list.
  await page.getByRole("link", { name: "Back to spoken practice" }).first().click();
  await page.getByRole("region", { name: "Your earlier sessions" }).getByRole("link", { name: "Open" }).click();
  await expect(page.getByRole("status").filter({ hasText: "Assessing your answers…" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Get the report" })).toHaveCount(0);

  release();
  await expect(page.getByRole("region", { name: "Your report" })).toBeVisible();
  expect(reports).toBe(1);
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

  // Le bilan, à parité (D126).
  await page.getByRole("link", { name: "Voir le bilan de cette séance" }).click();
  await expect(page.getByRole("heading", { level: 1, name: "Bilan d’une séance orale" })).toBeVisible();
  await page.getByRole("button", { name: "Obtenir le bilan" }).click();
  await expect(page.getByRole("heading", { name: "Avant de demander" })).toBeFocused();
  await axeClean(page);
  await page.getByRole("button", { name: "Demander le bilan" }).click();
  const bilan = page.getByRole("region", { name: "Votre bilan" });
  await expect(bilan.getByText("Non évaluée", { exact: true })).toBeVisible();
  await expect(page.getByText("Vous avez tapé vos réponses : il n’y a pas de parole à mesurer.")).toBeVisible();
  await bilan.getByRole("button", { expanded: false }).first().click();
  await axeClean(page);
});

/** The user messages the studio screen sent: each repeat request. */
const repeatRequests = async (page: Page) =>
  (await realtimeSent(page)).filter((m) => m.type === "conversation.item.create" && (m.item as { type?: string } | undefined)?.type === "message");

test("studio mode: both modes costed, the studio pre-flight, the conversation with its meter and a repeat, the end, and playback from each answer", async ({
  page,
  context,
}) => {
  test.setTimeout(120_000);
  await stubOpenAi(context);
  await installFakeAudio(context);
  await installFakeRealtime(context);
  await openOral(page);
  await addKeyFromCard(page);
  await expect(page.getByRole("radio", { name: /^Practice mode.*About US\$\d+\.\d+ a minute\.$/ })).toBeChecked();
  await expect(page.getByRole("radio", { name: /^Studio mode.*About US\$\d+\.\d+ a minute\.$/ })).toBeVisible();

  const states: string[] = [];
  await talkInStudio(page, {
    onState: async (state) => {
      states.push(state);
      if (state === "repeated") {
        await expect.poll(async () => (await repeatRequests(page)).length).toBe(1);
        const [request] = await repeatRequests(page);
        expect(JSON.stringify(request)).toContain("répéter");
        const sent = await realtimeSent(page);
        expect(sent.map((m) => m.type).at(-1)).toBe("response.create");
      }
      if (state === "conversation") {
        // No transcript while the conversation runs (PRD §8.6), and a form that moves with the voices.
        await expect(page.getByText(STUDIO_ANSWER)).toHaveCount(0);
        await expect(page.locator(".pl-voice-form")).toHaveAttribute("aria-hidden", "true");
      }
      await axeClean(page);
    },
  });
  expect(states).toEqual(["picker", "microphone", "pre-flight", "conversation", "repeated", "ended"]);

  await expect(page.getByText("You ended the session.")).toBeVisible();
  await expect(page.getByRole("region", { name: "Transcript" }).getByText(STUDIO_ANSWER)).toBeVisible();
  await expect(page.getByText("The recording of your answers is kept", { exact: false })).toBeVisible();

  // The report: the conversation's cost on its own line, and the recording played from the answer (D182, D187).
  await page.getByRole("link", { name: "See the report on this session" }).click();
  await expect(page.getByRole("heading", { level: 1, name: "Report on a spoken session" })).toBeVisible();
  await expect(page.getByRole("term").filter({ hasText: "The conversation" })).toBeVisible();
  await expect(page.getByText("It holds your microphone for the whole conversation", { exact: false })).toBeVisible();
  const play = page.getByRole("button", { name: "Play from here: answer 1" });
  await expect(play).toBeVisible();
  await play.click();
  await axeClean(page);
});

test("studio mode under reduced motion: the voice form at rest, and every control still there", async ({ page, context }) => {
  test.setTimeout(90_000);
  await page.emulateMedia({ reducedMotion: "reduce" });
  await stubOpenAi(context);
  await installFakeAudio(context);
  await installFakeRealtime(context);
  await openOral(page);
  await addKeyFromCard(page);
  await talkInStudio(page, {
    onState: async (state) => {
      if (state !== "conversation") return;
      const form = page.locator(".pl-voice-form");
      await expect(form).toHaveClass(/pl-voice-form--still/);
      expect(await form.evaluate((element) => (element as HTMLElement).style.getPropertyValue("--pl-voice-examiner"))).toBe("");
      await axeClean(page);
    },
  });
});

test("studio mode without a microphone: it says why, and offers practice by typing", async ({ page, context }) => {
  test.setTimeout(90_000);
  await stubOpenAi(context);
  await context.addInitScript(() => {
    navigator.mediaDevices.getUserMedia = () => Promise.reject(new DOMException("Permission denied", "NotAllowedError"));
  });
  await openOral(page);
  await addKeyFromCard(page);
  await page.getByRole("radio", { name: /^Studio mode/ }).check();
  await page.getByRole("listitem").filter({ has: page.getByRole("heading", { name: "Warm-up", exact: true }) }).getByRole("button", { name: "Choose" }).click();
  await page.getByRole("button", { name: "Check my microphone" }).click();
  await expect(page.getByText("The microphone is blocked")).toBeVisible();
  await expect(page.getByText("Studio mode is a spoken conversation, so it needs your microphone.", { exact: false })).toBeVisible();
  await axeClean(page);

  await page.getByRole("button", { name: "Practise by typing instead" }).click();
  await expect(page.getByRole("heading", { name: "Before you start" })).toBeFocused();
  await expect(page.getByText("Your typed answers go to OpenAI only", { exact: false })).toBeVisible();
  await page.getByRole("button", { name: "Start the session" }).click();
  await expect(page.getByText(EXAMINER_QUESTION)).toBeVisible();
});

test("a realtime call OpenAI refuses ends the studio session at once, and names why in words", async ({ page, context }) => {
  test.setTimeout(90_000);
  await stubOpenAi(context, (path, body) => (path.endsWith("/realtime/calls") ? REFUSED : defaultAnswer(path, body)));
  await installFakeAudio(context);
  await installFakeRealtime(context);
  await openOral(page);
  await addKeyFromCard(page);
  await page.getByRole("radio", { name: /^Studio mode/ }).check();
  await page.getByRole("listitem").filter({ has: page.getByRole("heading", { name: "Warm-up", exact: true }) }).getByRole("button", { name: "Choose" }).click();
  await page.getByRole("button", { name: "Check my microphone" }).click();
  await expect(page.getByText("Palier can hear you.").or(page.getByText("Palier heard very little.", { exact: false }))).toBeVisible({ timeout: 10_000 });
  await page.getByRole("button", { name: /^Continue/ }).first().click();
  await page.getByRole("button", { name: "Start the session" }).click();

  await expect(page.getByRole("heading", { name: "Session over" })).toBeFocused();
  await expect(page.getByText("OpenAI did not accept your key.", { exact: false })).toBeVisible();
  await expect(page.getByText("The recording of your answers is kept", { exact: false })).toHaveCount(0);
  await axeClean(page);
});

test("en français : le mode studio, à parité", async ({ page, context }) => {
  test.setTimeout(90_000);
  await stubOpenAi(context);
  await installFakeAudio(context);
  await installFakeRealtime(context);
  await openOral(page, "/fr/practice/oral");
  await addKeyFromCard(page, {
    add: "Ajouter une clé",
    field: "Clé d’API OpenAI",
    save: "Enregistrer la clé",
    saved: /^Enregistrée sur cet appareil/,
  });
  await page.getByRole("radio", { name: /^Mode studio/ }).check();
  await expect(page.getByText("Votre clé est transmise une fois au serveur de Palier", { exact: false })).toBeVisible();
  await axeClean(page);
  await page.getByRole("listitem").filter({ has: page.getByRole("heading", { name: "Mise en train", exact: true }) }).getByRole("button", { name: "Choisir" }).click();
  await page.getByRole("button", { name: "Vérifier mon microphone" }).click();
  await expect(page.getByText("Palier vous entend.").or(page.getByText("Palier n’a presque rien entendu", { exact: false }))).toBeVisible({ timeout: 10_000 });
  await page.getByRole("button", { name: /^Continuer/ }).first().click();
  await expect(page.getByRole("heading", { name: "Avant de commencer" })).toBeFocused();
  await page.getByRole("button", { name: "Commencer la séance" }).click();
  await expect(page.getByRole("heading", { name: "La conversation" })).toBeFocused();
  await expect(page.getByRole("status").filter({ hasText: "La conversation est en cours." })).toBeVisible();
  await expect(page.getByRole("button", { name: "Je n’ai pas compris, pourriez-vous répéter" })).toBeVisible();
  await axeClean(page);
  await page.getByRole("button", { name: "Terminer la séance" }).click();
  await expect(page.getByRole("heading", { name: "Séance terminée" })).toBeFocused();
  await axeClean(page);
});
