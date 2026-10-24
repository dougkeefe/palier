import { mswServer, openAiHandlers, type OpenAiCompletion } from "@palier/testing";
import { STUDY_RESOURCE_HOSTS, WRITING_SUB_SKILLS } from "@palier/domain";
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";

import aiModels from "./ai-models.json";
import { createContainer } from "./container";

/**
 * The translator through the real wiring (progress.md D250): the real OpenAI adapter over MSW, the
 * correction placed in the user's own words, the call metered into the real ledger, one request at a
 * time joined from module scope, and nothing kept on the device but the ledger's row.
 */

vi.mock("../server/db", () => ({ syncApi: () => Promise.resolve(null) }));

const KEY = "sk-palier-translate-test-4c1d";
const MINE = "Bonjour à tous, la réunion de lundi est reporter à mardi. Merci de votre compréhension.";

const CORRECTED = {
  source: "fr",
  output: "Bonjour à tous, la réunion de lundi est reportée à mardi. Merci de votre compréhension.",
  strengths: ["« Merci de votre compréhension » closes a team message well."],
  corrections: [{ excerpt: "est reporter", correction: "est reportée", why: "A past participle after être.", subSkill: "agreement" }],
  notes: [],
};

const answer = (content: unknown, prompt_tokens = 1_400, completion_tokens = 1_200): OpenAiCompletion => ({
  content,
  usage: { prompt_tokens, completion_tokens },
});

const asks = { text: MINE, source: null, target: "fr", feedbackLang: "en" } as const;

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

const withKey = async (hermetic: boolean) => {
  const c = createContainer({ hermetic });
  await c.useCases.saveApiKey({ key: KEY, remember: true });
  return c;
};

describe("the committed study resources", () => {
  it("are parsed once at the composition root, every written-expression sub-skill covered, on known hosts only", () => {
    const { studyResources } = createContainer({ hermetic: true });
    expect(new Set(studyResources.map((r) => r.subSkill))).toEqual(new Set(WRITING_SUB_SKILLS));
    const hosts = new Set(Object.values(STUDY_RESOURCE_HOSTS));
    for (const resource of studyResources) expect(hosts.has(new URL(resource.url).hostname), resource.id).toBe(true);
  });
});

describe.each([
  ["hermetic", true],
  ["production", false],
] as const)("the translator through the %s graph", (_, hermetic) => {
  it("corrects the user's own French, placing each correction over their words", async () => {
    mswServer.use(...openAiHandlers({ mode: "ok", completions: [answer(CORRECTED)] }));
    const c = await withKey(hermetic);

    const corrected = await c.useCases.translateText(asks);

    const start = MINE.indexOf("est reporter");
    expect(corrected.source).toBe("fr");
    expect(corrected.corrections).toEqual([
      { start, end: start + 12, correction: "est reportée", why: "A past participle after être.", subSkill: "agreement" },
    ]);
  });

  it("meters the call as translation, on the assess model, and keeps nothing else", async () => {
    mswServer.use(...openAiHandlers({ mode: "ok", completions: [answer(CORRECTED)] }));
    const c = await withKey(hermetic);

    await c.useCases.translateText(asks);

    const entries = await c.costLedger.since("1970-01-01T00:00:00.000Z");
    expect(entries).toHaveLength(1);
    expect(entries[0]).toMatchObject({ feature: "translation", model: aiModels.assess, inputTokens: 1_400, outputTokens: 1_200 });
    expect(entries[0]?.costUsd).toBeGreaterThan(0);
    expect(JSON.stringify(await c.useCases.exportData())).not.toContain("est reporter");
    expect(await c.useCases.writingHistory()).toEqual([]);
  });

  it("joins a second request while one is out, so one press pays once (D143)", async () => {
    mswServer.use(...openAiHandlers({ mode: "ok", completions: [answer(CORRECTED)] }));
    const c = await withKey(hermetic);

    const first = c.useCases.translateText(asks);
    const second = createContainer({ hermetic }).useCases.translateText({ ...asks, text: "autre chose" });
    expect(c.useCases.translationInFlight()?.request).toEqual(asks);
    expect(await second).toBe(await first);
    expect(c.useCases.translationInFlight()).toBeNull();
    expect(await c.costLedger.since("1970-01-01T00:00:00.000Z")).toHaveLength(1);
  });

  it("refuses an answer it cannot place, twice, and bills both tries", async () => {
    const miscopied = { ...CORRECTED, corrections: [{ ...CORRECTED.corrections[0], excerpt: "absent" }] };
    mswServer.use(...openAiHandlers({ mode: "ok", completions: [answer(miscopied, 500, 100)] }));
    const c = await withKey(hermetic);

    await expect(c.useCases.translateText(asks)).rejects.toMatchObject({ name: "InvalidResponseError" });
    expect(await c.costLedger.since("1970-01-01T00:00:00.000Z")).toMatchObject([{ inputTokens: 1_000, outputTokens: 200 }]);
  });

  it("names a missing key before any request", async () => {
    mswServer.use(...openAiHandlers({ mode: "ok", completions: [answer(CORRECTED)] }));
    const c = createContainer({ hermetic });
    await expect(c.useCases.translateText(asks)).rejects.toMatchObject({ name: "NoApiKeyError" });
    expect(await c.costLedger.since("1970-01-01T00:00:00.000Z")).toEqual([]);
  });

  it("forgets a request still out on a wipe, so the screen never joins it again", async () => {
    mswServer.use(...openAiHandlers({ mode: "ok", completions: [answer(CORRECTED)] }));
    const c = await withKey(hermetic);
    const pending = c.useCases.translateText(asks);
    await c.useCases.wipeData();
    expect(c.useCases.translationInFlight()).toBeNull();
    await pending.catch(() => undefined);
  });
});
