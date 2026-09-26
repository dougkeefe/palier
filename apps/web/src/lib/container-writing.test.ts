import { mswServer, openAiHandlers, type OpenAiCompletion } from "@palier/testing";
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";

import aiModels from "./ai-models.json";
import { createContainer } from "./container";

/**
 * The writing workshop through the real wiring (Phase 4 Slice 3, progress.md D105–D108): a
 * submission saved through the container's own ports, assessed by the real OpenAI adapter
 * over MSW, metered into the real ledger, and kept on the device alone.
 */

vi.mock("../server/db", () => ({ syncApi: () => Promise.resolve(null) }));

const KEY = "sk-palier-writing-test-9f3e";
const WRITTEN = "Bonjour à tous, la réunion de lundi est reporter à mardi. Merci de votre compréhension.";

const criterion = { band: "B", evidence: "« Bonjour à tous » convient à un courriel d'équipe." };
const FEEDBACK = {
  criteria: { register: criterion, structure: criterion, grammar: criterion, vocabulary: criterion, task: criterion },
  errors: [{ excerpt: "est reporter", correction: "est reportée", rule: "Accord du participe passé avec être" }],
  modelAnswer: "Bonjour à tous, la réunion de lundi est reportée à mardi. Merci de votre compréhension.",
};

const answer = (content: unknown, prompt_tokens = 900, completion_tokens = 700): OpenAiCompletion => ({
  content,
  usage: { prompt_tokens, completion_tokens },
});

beforeAll(() => {
  mswServer.listen({ onUnhandledRequest: "error" });
});
afterEach(async () => {
  mswServer.resetHandlers();
  await createContainer({ hermetic: false }).useCases.wipeData();
});
afterAll(() => {
  mswServer.close();
});

const saved = async (hermetic: boolean) => {
  const c = createContainer({ hermetic });
  await c.useCases.saveApiKey({ key: KEY, remember: true });
  const [prompt] = c.useCases.writingPrompts();
  if (prompt === undefined) throw new Error("the committed library has prompts");
  const submission = await c.useCases.saveWriting({ promptId: prompt.id, text: WRITTEN });
  return { c, submission };
};

describe("the committed prompt library", () => {
  it("is parsed once at the composition root and offered in authored order", () => {
    const prompts = createContainer({ hermetic: true }).useCases.writingPrompts();
    expect(prompts.length).toBeGreaterThan(0);
    expect(new Set(prompts.map((p) => p.register))).toEqual(new Set(["briefing-note", "client-reply", "meeting-summary"]));
  });
});

describe.each([
  ["hermetic", true],
  ["production", false],
] as const)("writing feedback through the %s graph", (_, hermetic) => {
  it("assesses a saved submission, places its errors in the text and keeps the feedback with it", async () => {
    mswServer.use(...openAiHandlers({ mode: "ok", completions: [answer(FEEDBACK)] }));
    const { c, submission } = await saved(hermetic);

    const assessed = await c.useCases.requestWritingFeedback({
      submissionId: submission.id,
      targetBand: "C",
      feedbackLang: "en",
    });

    const start = WRITTEN.indexOf("est reporter");
    expect(assessed.assessment?.errors).toEqual([
      { start, end: start + 12, correction: "est reportée", rule: "Accord du participe passé avec être" },
    ]);
    expect(await c.useCases.writingHistory()).toEqual([assessed]);
  });

  it("meters the call as writing-feedback, on the assess model", async () => {
    mswServer.use(...openAiHandlers({ mode: "ok", completions: [answer(FEEDBACK, 1_000, 800)] }));
    const { c, submission } = await saved(hermetic);

    await c.useCases.requestWritingFeedback({ submissionId: submission.id, targetBand: "B", feedbackLang: "fr" });

    const entries = await c.costLedger.since("1970-01-01T00:00:00.000Z");
    expect(entries).toHaveLength(1);
    expect(entries[0]).toMatchObject({
      feature: "writing-feedback",
      model: aiModels.assess,
      inputTokens: 1_000,
      outputTokens: 800,
    });
    expect(entries[0]?.costUsd).toBeGreaterThan(0);
  });

  it("keeps the text unassessed when the answer cannot be placed twice, and bills both tries", async () => {
    const miscopied = { ...FEEDBACK, errors: [{ excerpt: "absent", correction: "x", rule: "r" }] };
    mswServer.use(...openAiHandlers({ mode: "ok", completions: [answer(miscopied, 500, 100)] }));
    const { c, submission } = await saved(hermetic);

    await expect(
      c.useCases.requestWritingFeedback({ submissionId: submission.id, targetBand: "B", feedbackLang: "en" }),
    ).rejects.toMatchObject({ name: "InvalidResponseError" });

    expect((await c.useCases.writingHistory())[0]).toMatchObject({ text: WRITTEN, assessment: null });
    expect(await c.costLedger.since("1970-01-01T00:00:00.000Z")).toMatchObject([{ inputTokens: 1_000, outputTokens: 200 }]);
  });

  it("degrades to the adapter's own error on a rate limit, with the text kept", async () => {
    mswServer.use(...openAiHandlers({ mode: "rate-limited" }));
    const { c, submission } = await saved(hermetic);

    await expect(
      c.useCases.requestWritingFeedback({ submissionId: submission.id, targetBand: "B", feedbackLang: "en" }),
    ).rejects.toMatchObject({ name: "RateLimitError" });
    expect(await c.useCases.writingHistory()).toHaveLength(1);
  });

  it("never exports a submission, and empties them on a wipe and on delete-everywhere [R12]", async () => {
    mswServer.use(...openAiHandlers({ mode: "ok", completions: [answer(FEEDBACK)] }));
    const { c, submission } = await saved(hermetic);
    await c.useCases.requestWritingFeedback({ submissionId: submission.id, targetBand: "B", feedbackLang: "en" });

    const exported = JSON.stringify(await c.useCases.exportData());
    expect(exported).not.toContain("réunion de lundi");
    expect(exported).not.toContain("Accord du participe");

    await c.useCases.wipeData();
    expect(await c.useCases.writingHistory()).toEqual([]);

    await c.useCases.saveApiKey({ key: KEY, remember: true });
    await c.useCases.saveWriting({ promptId: submission.promptId, text: WRITTEN });
    await c.useCases.deleteEverywhere();
    expect(await c.useCases.writingHistory()).toEqual([]);
  });
});
