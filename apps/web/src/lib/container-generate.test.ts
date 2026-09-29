import { type OpenAiCompletion, generationCompletions, mswServer, openAiHandlers, verdictFor } from "@palier/testing";
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";

import aiModels from "./ai-models.json";
import { holdLedger } from "./__tests__/hold";
import { createContainer } from "./container";

/**
 * Runtime item generation through the real wiring (Phase 4 Slice 4, progress.md D110): drafted
 * and reviewed by the real OpenAI adapter over MSW, metered into the real ledger, kept in the
 * graph's own generated-item store, and on this device alone.
 */

vi.mock("../server/db", () => ({ syncApi: () => Promise.resolve(null) }));

const KEY = "sk-palier-generate-test-4c1a";
const MARKER = "Pimpernel-5521";
const REQUEST = { subSkill: "agreement", targetBand: "C", lang: "fr" } as const;

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

/** A recorded completion's content, whether it is fixed or made from the prompt. */
const contentOf = (completion: OpenAiCompletion, prompt: string): unknown =>
  typeof completion.content === "function" ? (completion.content as (p: string) => unknown)(prompt) : completion.content;

const keyed = async (hermetic: boolean) => {
  const c = createContainer({ hermetic });
  await c.useCases.saveApiKey({ key: KEY, remember: true });
  return c;
};

describe.each([
  ["hermetic", true],
  ["production", false],
] as const)("runtime generation through the %s graph", (_, hermetic) => {
  it("drafts a set, reviews each item blind, and keeps the set on this device", async () => {
    mswServer.use(...openAiHandlers({ mode: "ok", completions: generationCompletions(MARKER) }));
    const c = await keyed(hermetic);

    const { set, drafted, discarded } = await c.useCases.generatePracticeSet(REQUEST);

    expect({ drafted, discarded }).toEqual({ drafted: 5, discarded: 0 });
    expect(set?.items).toHaveLength(5);
    for (const item of set?.items ?? []) {
      expect(item.stem.fr).toContain(MARKER);
      expect(item.options.find((o) => o.id === item.key)?.text).toMatch(/^RIGHT/);
      expect(item.provenance).toMatchObject({ origin: "generated", generator: { model: aiModels.draft } });
    }
    expect(await c.useCases.latestGeneratedSet()).toEqual(set);
  });

  it("meters the draft and every review as item-generation, on their own models", async () => {
    mswServer.use(...openAiHandlers({ mode: "ok", completions: generationCompletions(MARKER) }));
    const c = await keyed(hermetic);

    await c.useCases.generatePracticeSet(REQUEST);

    const entries = await c.costLedger.since("1970-01-01T00:00:00.000Z");
    expect(entries.map((e) => [e.feature, e.model])).toEqual([
      ["item-generation", aiModels.draft],
      ...Array.from({ length: 5 }, () => ["item-generation", aiModels.review]),
    ]);
    expect(entries.every((e) => (e.costUsd ?? 0) > 0)).toBe(true);
  });

  it("discards a draft the reviewer will not stand behind, and keeps the rest", async () => {
    const [draft] = generationCompletions(MARKER);
    let reviews = 0;
    const doubtful = {
      content: (prompt: string) => ({ ...verdictFor(prompt), confidence: (reviews += 1) === 1 ? 0.2 : 0.93 }),
      usage: { prompt_tokens: 300, completion_tokens: 600 },
    };
    mswServer.use(...openAiHandlers({ mode: "ok", completions: [draft!, doubtful] }));
    const c = await keyed(hermetic);

    const { set, discarded } = await c.useCases.generatePracticeSet(REQUEST);

    expect(discarded).toBe(1);
    expect(set?.items).toHaveLength(4);
  });

  it("keeps nothing when the draft is malformed twice, and bills both tries", async () => {
    mswServer.use(
      ...openAiHandlers({ mode: "ok", completions: [{ content: { items: "not a list" }, usage: { prompt_tokens: 100, completion_tokens: 50 } }] }),
    );
    const c = await keyed(hermetic);

    await expect(c.useCases.generatePracticeSet(REQUEST)).rejects.toMatchObject({ name: "InvalidResponseError" });
    expect(await c.useCases.latestGeneratedSet()).toBeNull();
    expect(await c.costLedger.since("1970-01-01T00:00:00.000Z")).toMatchObject([{ inputTokens: 200, outputTokens: 100 }]);
  });

  it("degrades to the adapter's own error on a rate limit, and keeps nothing", async () => {
    mswServer.use(...openAiHandlers({ mode: "rate-limited" }));
    const c = await keyed(hermetic);

    await expect(c.useCases.generatePracticeSet(REQUEST)).rejects.toMatchObject({ name: "RateLimitError" });
    expect(await c.useCases.latestGeneratedSet()).toBeNull();
  });

  it("scores a generated answer without writing an attempt or a schedule entry", async () => {
    mswServer.use(...openAiHandlers({ mode: "ok", completions: generationCompletions(MARKER) }));
    const c = await keyed(hermetic);
    const { set } = await c.useCases.generatePracticeSet(REQUEST);

    for (const item of set?.items ?? []) {
      expect(await c.useCases.scoreGeneratedAnswer({ itemId: item.id, response: item.key })).toEqual({ correct: true });
    }

    expect(await c.attempts.all()).toEqual([]);
    expect(await c.schedule.all()).toEqual([]);
  });

  it("never exports a generated item, and empties them on a wipe and on delete-everywhere", async () => {
    mswServer.use(...openAiHandlers({ mode: "ok", completions: generationCompletions(MARKER) }));
    const c = await keyed(hermetic);
    await c.useCases.generatePracticeSet(REQUEST);

    expect(JSON.stringify(await c.useCases.exportData())).not.toContain(MARKER);

    await c.useCases.wipeData();
    expect(await c.useCases.latestGeneratedSet()).toBeNull();

    mswServer.resetHandlers();
    mswServer.use(...openAiHandlers({ mode: "ok", completions: generationCompletions(MARKER) }));
    await c.useCases.saveApiKey({ key: KEY, remember: true });
    expect((await c.useCases.generatePracticeSet(REQUEST)).set).not.toBeNull();
    await c.useCases.deleteEverywhere();
    expect(await c.useCases.latestGeneratedSet()).toBeNull();
  });

  it("joins a generation still out rather than paying twice, from a rebuilt container too, and names what it is for (D143)", async () => {
    let drafts = 0;
    const [draft, ...reviews] = generationCompletions(MARKER);
    if (draft === undefined) throw new Error("the fixture drafts a set");
    const counted = { ...draft, content: (prompt: string) => ((drafts += 1), contentOf(draft, prompt)) };
    mswServer.use(...openAiHandlers({ mode: "ok", completions: [counted, ...reviews] }));
    const c = await keyed(hermetic);
    const { release } = holdLedger(c);

    const first = c.useCases.generatePracticeSet(REQUEST);
    expect(c.useCases.generatePracticeSet({ ...REQUEST, subSkill: "pronouns" })).toBe(first);
    expect(c.useCases.generationInFlight()?.request).toEqual(REQUEST);
    // A container built again, as a change of language builds one, still finds it.
    const rebuilt = createContainer({ hermetic });
    expect(rebuilt.useCases.generationInFlight()?.result).toBe(first);
    release();
    await first;

    expect(drafts).toBe(1);
    expect(c.useCases.generationInFlight()).toBeNull();
  });

  it("forgets a generation that failed, so asking again makes a new call (D143)", async () => {
    mswServer.use(...openAiHandlers({ mode: "rate-limited" }));
    const c = await keyed(hermetic);

    await expect(c.useCases.generatePracticeSet(REQUEST)).rejects.toMatchObject({ name: "RateLimitError" });
    expect(c.useCases.generationInFlight()).toBeNull();
  });

  it("never keeps a set that arrives after a wipe, and forgets the request (D143)", async () => {
    mswServer.use(...openAiHandlers({ mode: "ok", completions: generationCompletions(MARKER) }));
    const c = await keyed(hermetic);
    // The draft and four reviews are recorded; the fifth review's answer is held, so every call
    // is made and only the keeping is left when "Delete everything" is pressed.
    const { release, reached } = holdLedger(c, { from: 6 });

    const asked = c.useCases.generatePracticeSet(REQUEST);
    await reached;
    await c.useCases.wipeData();
    expect(c.useCases.generationInFlight()).toBeNull();
    release();
    const { set } = await asked;

    expect(set?.items).toHaveLength(5);
    expect(await c.useCases.latestGeneratedSet()).toBeNull();
  });
});

describe("the practice trend beside a generated set (D110)", () => {
  // Hermetic only: the trend reads the fixture bank, which this graph holds in memory.
  it("is the same after a whole generated set is answered", async () => {
    mswServer.use(...openAiHandlers({ mode: "ok", completions: generationCompletions(MARKER) }));
    const c = await keyed(true);
    const before = await c.useCases.practiceTrend({ skill: "writing" });
    const { set } = await c.useCases.generatePracticeSet(REQUEST);

    for (const item of set?.items ?? []) await c.useCases.scoreGeneratedAnswer({ itemId: item.id, response: item.key });

    expect(await c.useCases.practiceTrend({ skill: "writing" })).toEqual(before);
  });
});
