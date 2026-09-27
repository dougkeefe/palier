import { describe, expect, it, vi } from "vitest";

import type {
  Attempt,
  GenerateItemsRequest,
  ItemDraft,
  ItemId,
  ReviewRequest,
  ReviewVerdict,
  UsageRecord,
} from "@palier/domain";
import { attemptId, itemId, itemTypeDefinition, sessionId } from "@palier/domain";

import type { AiProvider, AttemptStore, CostEntry, CostLedger, ItemRepository, KeyVault, ScheduleStore } from "../ports/index.js";
import { NoApiKeyError } from "./api-key.js";
import {
  GENERATED_ITEM_TYPES,
  GENERATED_SET_SIZE,
  UnknownGeneratedItemError,
  UnsupportedSubSkillError,
  generatePracticeSet,
  latestGeneratedSet,
  scoreGeneratedAnswer,
} from "./generate.js";
import { practiceTrend } from "./practice-trend.js";
import { generatedStore } from "./__tests__/generated-fakes.js";

// Local stubs rather than @palier/testing (progress.md D37).

const NOW = "2026-09-26T12:00:00.000Z";
const clock = { now: () => NOW };

const vaultWith = (key: string | null): KeyVault => ({
  putApiKey: () => Promise.resolve(),
  withApiKey: (fn) => (key === null ? Promise.reject(new Error("no key")) : fn(key)),
  hasApiKey: () => Promise.resolve(key !== null),
  apiKeyStorage: () => Promise.resolve(key === null ? null : "device"),
  clear: () => Promise.resolve(),
  deviceSecret: () => Promise.resolve("device-secret"),
});

const ledgerStub = () => {
  const entries: CostEntry[] = [];
  const ledger: CostLedger = {
    append: (entry) => {
      entries.push(entry);
      return Promise.resolve();
    },
    since: () => Promise.resolve(entries),
    clear: () => Promise.resolve(),
  };
  return { ledger, entries };
};

/** A draft whose right answer is always option a, `right-<n>`, before the key is debiased. */
const aDraft = (n: number, over: Partial<ItemDraft> = {}): ItemDraft => ({
  type: "error-id",
  stem: { en: `Find the error ${n}.`, fr: `Trouvez l'erreur ${n}.` },
  options: [
    { id: "a", text: `right-${n}`, rationale: { en: "RATIONALE-RIGHT", fr: "RATIONALE-RIGHT" } },
    { id: "b", text: `wrong-${n}-b`, rationale: { en: "RATIONALE-B", fr: "RATIONALE-B" } },
    { id: "c", text: `wrong-${n}-c`, rationale: { en: "RATIONALE-C", fr: "RATIONALE-C" } },
    { id: "d", text: `wrong-${n}-d`, rationale: { en: "RATIONALE-D", fr: "RATIONALE-D" } },
  ],
  key: "a",
  explanation: { en: "EXPLANATION", fr: "EXPLANATION" },
  subSkill: "agreement",
  targetBand: "C",
  topic: "finance-and-budgets",
  ...over,
});

const DRAFT_USAGE: UsageRecord = { model: "m-draft", inputTokens: 400, outputTokens: 900, costUsd: 0.008 };
const REVIEW_USAGE: UsageRecord = { model: "m-review", inputTokens: 300, outputTokens: 600, costUsd: 0.005 };

type Judge = (request: ReviewRequest, index: number) => Partial<ReviewVerdict> | Error;

/** An honest reviewer: it finds the `right-` option wherever the key was moved to. */
const honest: Judge = () => ({});

/**
 * A provider that drafts `drafts` (or fails with `draftError`) and reviews through `judge`.
 * It records every request, and how many calls were in flight at once.
 */
const scriptedProvider = (drafts: readonly ItemDraft[] | Error, judge: Judge = honest) => {
  const generateRequests: GenerateItemsRequest[] = [];
  const reviewRequests: ReviewRequest[] = [];
  let usage: UsageRecord | null = null;
  let inFlight = 0;
  let maxInFlight = 0;
  const enter = () => {
    inFlight += 1;
    maxInFlight = Math.max(maxInFlight, inFlight);
  };
  const provider: AiProvider = {
    capabilities: () => ({ generatePassage: false, generateItems: true, reviewItem: true, assessWriting: false }),
    generatePassage: () => Promise.reject(new Error("unused")),
    generateItems: async (req) => {
      enter();
      generateRequests.push(req);
      usage = DRAFT_USAGE;
      await Promise.resolve();
      inFlight -= 1;
      if (drafts instanceof Error) throw drafts;
      return drafts;
    },
    reviewItem: async (req) => {
      enter();
      reviewRequests.push(req);
      usage = REVIEW_USAGE;
      await Promise.resolve();
      inFlight -= 1;
      const verdict = judge(req, reviewRequests.length - 1);
      if (verdict instanceof Error) throw verdict;
      const right = req.options.find((o) => o.text.startsWith("right-"));
      return {
        chosenKey: right?.id ?? "a",
        confidence: 0.92,
        defensibleDistractors: [],
        optionCases: { a: "case a", b: "case b", c: "case c", d: "case d" },
        registerFlag: { flagged: false },
        estimatedBand: req.targetBand,
        ...verdict,
      };
    },
    assessWriting: () => Promise.reject(new Error("unused")),
    verifyKey: () => Promise.resolve(),
    lastUsage: () => usage,
  };
  return { provider, generateRequests, reviewRequests, maxInFlight: () => maxInFlight };
};

/**
 * Selection randomness: 0.5 for the item type and the topic (error-id, which needs no blank),
 * then 0 for every shuffle, which moves option a to d.
 */
const randomOf = () => {
  let calls = 0;
  return { next: () => ((calls += 1) <= 2 ? 0.5 : 0) };
};

const depsFor = (provider: AiProvider, over: { key?: string | null } = {}) => {
  const { ledger, entries } = ledgerStub();
  const generated = generatedStore();
  let n = 0;
  return {
    deps: {
      vault: vaultWith(over.key === undefined ? "sk-held" : over.key),
      aiProvider: () => provider,
      ledger,
      clock,
      generated,
      ids: { ulid: () => `ULID${String((n += 1)).padStart(3, "0")}` },
      random: randomOf(),
      promptVersion: "3",
    },
    entries,
    generated,
  };
};

const drafts = (count = GENERATED_SET_SIZE) => Array.from({ length: count }, (_, i) => aDraft(i + 1));

const REQUEST = { subSkill: "agreement", targetBand: "C", lang: "fr" } as const;

describe("generatePracticeSet (progress.md D110)", () => {
  it("drafts a set, reviews each draft, and keeps every one that passes", async () => {
    const scripted = scriptedProvider(drafts());
    const { deps, generated } = depsFor(scripted.provider);

    const result = await generatePracticeSet(REQUEST, deps);

    expect(result.drafted).toBe(GENERATED_SET_SIZE);
    expect(result.discarded).toBe(0);
    expect(result.set?.items).toHaveLength(GENERATED_SET_SIZE);
    expect(result.set).toMatchObject({ skill: "writing", createdAt: NOW });
    expect(await generated.latestSet("writing")).toEqual(result.set);
  });

  it("asks for one set of the configured size, through the registry's prompt for the chosen type", async () => {
    const scripted = scriptedProvider(drafts());
    const { deps } = depsFor(scripted.provider);

    await generatePracticeSet(REQUEST, deps);

    expect(scripted.generateRequests).toHaveLength(1);
    const [req] = scripted.generateRequests;
    expect(req?.count).toBe(GENERATED_SET_SIZE);
    expect(req?.lang).toBe("fr");
    expect(GENERATED_ITEM_TYPES).toContain(req?.promptSpec.itemType);
    expect(req?.promptSpec).toEqual(
      itemTypeDefinition(req!.promptSpec.itemType).generatePrompt({
        targetBand: "C",
        subSkill: "agreement",
        topic: req!.topic,
        lang: "fr",
      }),
    );
  });

  it("assembles each kept item as generated just now: a gen- id, never human-reviewed, not calibrated", async () => {
    const scripted = scriptedProvider(drafts(1));
    const { deps } = depsFor(scripted.provider);

    const [item] = (await generatePracticeSet(REQUEST, deps)).set?.items ?? [];

    expect(item?.id).toMatch(/^gen-ULID/);
    expect(item).toMatchObject({ skill: "writing", lang: "fr", status: "published", subSkill: "agreement", targetBand: "C" });
    expect(item?.provenance).toEqual({
      origin: "generated",
      generator: { model: "m-draft", promptVersion: "3", date: NOW },
    });
    expect(item).not.toHaveProperty("stats");
    expect(item?.provenance).not.toHaveProperty("reviewedBy");
  });

  it("moves the key off the drafted position and keeps it pointing at the right answer", async () => {
    const scripted = scriptedProvider(drafts(1));
    const { deps } = depsFor(scripted.provider);

    const [item] = (await generatePracticeSet(REQUEST, deps)).set?.items ?? [];

    expect(item?.key).not.toBe("a");
    expect(item?.options.find((o) => o.id === item.key)?.text).toBe("right-1");
    expect(item?.options.map((o) => o.id)).toEqual(["a", "b", "c", "d"]);
  });

  it("reviews blind: no key, no rationale and no explanation reach the reviewer", async () => {
    const scripted = scriptedProvider(drafts());
    const { deps } = depsFor(scripted.provider);

    await generatePracticeSet(REQUEST, deps);

    const sent = JSON.stringify(scripted.reviewRequests);
    expect(sent).not.toContain("RATIONALE");
    expect(sent).not.toContain("EXPLANATION");
    for (const req of scripted.reviewRequests) expect(req).not.toHaveProperty("key");
  });

  it.each<[string, Judge]>([
    ["the reviewer chooses another key", (req) => ({ chosenKey: req.options.find((o) => o.text.startsWith("wrong-"))!.id })],
    ["the reviewer is not confident", () => ({ confidence: 0.4 })],
    ["a distractor is defensible", () => ({ defensibleDistractors: ["b"] })],
    ["the register is flagged", () => ({ registerFlag: { flagged: true, note: "France usage" } })],
    ["the band is more than one away", () => ({ estimatedBand: "A" })],
  ])("discards a draft, never repairs it, when %s", async (_, judge) => {
    // The first draft is judged by `judge`, the rest honestly.
    const scripted = scriptedProvider(drafts(), (req, index) => (index === 0 ? judge(req, index) : {}));
    const { deps } = depsFor(scripted.provider);

    const result = await generatePracticeSet(REQUEST, deps);

    expect(result.discarded).toBe(1);
    expect(result.set?.items.map((i) => i.options.find((o) => o.id === i.key)?.text)).toEqual([
      "right-2",
      "right-3",
      "right-4",
      "right-5",
    ]);
    expect(scripted.reviewRequests).toHaveLength(GENERATED_SET_SIZE);
  });

  it.each<[string, ItemDraft]>([
    ["has three options", aDraft(1, { options: aDraft(1).options.slice(0, 3) })],
    ["answers a sub-skill it was not asked for", aDraft(1, { subSkill: "pronouns" })],
    ["is at another band", aDraft(1, { targetBand: "B" })],
    ["is another item type", aDraft(1, { type: "best-completion" })],
    ["is a cloze without a blank", aDraft(1, { type: "cloze" })],
  ])("discards a draft that %s before spending a review on it", async (_, bad) => {
    const scripted = scriptedProvider([bad, aDraft(2)]);
    const { deps } = depsFor(scripted.provider);

    const result = await generatePracticeSet(REQUEST, deps);

    expect(result).toMatchObject({ drafted: 2, discarded: 1 });
    expect(scripted.reviewRequests).toHaveLength(1);
  });

  it("reviews no more drafts than it asked for, and counts the rest as discarded", async () => {
    const scripted = scriptedProvider(drafts(GENERATED_SET_SIZE + 3));
    const { deps, entries } = depsFor(scripted.provider);

    const result = await generatePracticeSet(REQUEST, deps);

    expect(scripted.reviewRequests).toHaveLength(GENERATED_SET_SIZE);
    expect(result).toMatchObject({ drafted: GENERATED_SET_SIZE + 3, discarded: 3 });
    expect(result.set?.items).toHaveLength(GENERATED_SET_SIZE);
    expect(entries).toHaveLength(1 + GENERATED_SET_SIZE);
  });

  it("keeps nothing, and says so, when no draft passes", async () => {
    const scripted = scriptedProvider(drafts(), () => ({ confidence: 0.1 }));
    const { deps, generated } = depsFor(scripted.provider);

    const result = await generatePracticeSet(REQUEST, deps);

    expect(result).toEqual({ set: null, drafted: GENERATED_SET_SIZE, discarded: GENERATED_SET_SIZE });
    expect(generated.sets()).toEqual([]);
  });

  it("meters every call under item-generation: the draft and each review, one row each", async () => {
    const scripted = scriptedProvider(drafts());
    const { deps, entries } = depsFor(scripted.provider);

    await generatePracticeSet(REQUEST, deps);

    expect(entries.map((e) => [e.feature, e.model])).toEqual([
      ["item-generation", "m-draft"],
      ...Array.from({ length: GENERATED_SET_SIZE }, () => ["item-generation", "m-review"]),
    ]);
  });

  it("makes its calls one at a time, so each one's usage is its own (D101)", async () => {
    const scripted = scriptedProvider(drafts());
    const { deps } = depsFor(scripted.provider);

    await generatePracticeSet(REQUEST, deps);

    expect(scripted.maxInFlight()).toBe(1);
  });

  it("keeps nothing when the draft is malformed, and still meters what it billed", async () => {
    const malformed = Object.assign(new Error("failed validation after 2 attempts"), { name: "InvalidResponseError" });
    const scripted = scriptedProvider(malformed);
    const { deps, entries, generated } = depsFor(scripted.provider);

    await expect(generatePracticeSet(REQUEST, deps)).rejects.toMatchObject({ name: "InvalidResponseError" });
    expect(generated.sets()).toEqual([]);
    expect(entries).toHaveLength(1);
    expect(scripted.reviewRequests).toEqual([]);
  });

  it.each(["RateLimitError", "ProviderTimeoutError"])(
    "keeps nothing when a review fails with %s, and meters every call made",
    async (name) => {
      const failure = Object.assign(new Error(name), { name });
      const scripted = scriptedProvider(drafts(), (_req, index) => (index === 2 ? failure : {}));
      const { deps, entries, generated } = depsFor(scripted.provider);

      await expect(generatePracticeSet(REQUEST, deps)).rejects.toMatchObject({ name });
      expect(generated.sets()).toEqual([]);
      expect(entries).toHaveLength(1 + 3);
    },
  );

  it("refuses without a key, before any call", async () => {
    const scripted = scriptedProvider(drafts());
    const { deps, entries } = depsFor(scripted.provider, { key: null });

    await expect(generatePracticeSet(REQUEST, deps)).rejects.toBeInstanceOf(NoApiKeyError);
    expect(scripted.generateRequests).toEqual([]);
    expect(entries).toEqual([]);
  });

  it("refuses a sub-skill written expression does not test, before any call", async () => {
    const scripted = scriptedProvider(drafts());
    const { deps } = depsFor(scripted.provider);

    await expect(generatePracticeSet({ ...REQUEST, subSkill: "main-idea" }, deps)).rejects.toBeInstanceOf(
      UnsupportedSubSkillError,
    );
    expect(scripted.generateRequests).toEqual([]);
  });
});

describe("latestGeneratedSet", () => {
  it("finds the newest written-expression set, so a reload never loses a paid set", async () => {
    const scripted = scriptedProvider(drafts(2));
    const { deps, generated } = depsFor(scripted.provider);
    const { set } = await generatePracticeSet(REQUEST, deps);

    expect(await latestGeneratedSet({ generated })).toEqual(set);
  });
});

describe("scoreGeneratedAnswer (progress.md D110)", () => {
  const generatedSet = async () => {
    const scripted = scriptedProvider(drafts(2));
    const { deps, generated } = depsFor(scripted.provider);
    const { set } = await generatePracticeSet(REQUEST, deps);
    return { generated, items: set?.items ?? [] };
  };

  it("scores the key right and any other option wrong, by the item type's own rule", async () => {
    const { generated, items } = await generatedSet();
    const [item] = items;
    const wrong = item!.options.find((o) => o.id !== item!.key)!.id;

    expect(await scoreGeneratedAnswer({ itemId: item!.id, response: item!.key }, { generated })).toEqual({ correct: true });
    expect(await scoreGeneratedAnswer({ itemId: item!.id, response: wrong }, { generated })).toEqual({ correct: false });
  });

  it("refuses an item this device's generated sets do not hold", async () => {
    await expect(
      scoreGeneratedAnswer({ itemId: itemId("gen-absent"), response: "a" }, { generated: generatedStore() }),
    ).rejects.toBeInstanceOf(UnknownGeneratedItemError);
  });

  it("writes no attempt and no schedule entry, so the practice trend is unchanged", async () => {
    const bankAttempt: Attempt = {
      id: attemptId("att-bank"),
      itemId: itemId("bank-1"),
      bankVersion: 2,
      skill: "writing",
      sessionId: sessionId("s-1"),
      chosen: "a",
      correct: true,
      msToFirstSelect: 800,
      msToConfirm: 1_500,
      changedAnswer: false,
      mode: "drill",
      ts: NOW,
    };
    const attempts: AttemptStore = {
      append: vi.fn(() => Promise.resolve(true)),
      recent: vi.fn(() => Promise.resolve([bankAttempt])),
      since: vi.fn(() => Promise.resolve([])),
      forItem: vi.fn(() => Promise.resolve([])),
      all: vi.fn(() => Promise.resolve([bankAttempt])),
      clear: vi.fn(() => Promise.resolve()),
    };
    const schedule = { put: vi.fn(), get: vi.fn(), due: vi.fn(), all: vi.fn(), clear: vi.fn() } as unknown as ScheduleStore;
    const items = {
      byIds: vi.fn((ids: readonly ItemId[]) =>
        Promise.resolve(ids.filter((id) => id === bankAttempt.itemId).map(() => ({ ...draftItem(), id: bankAttempt.itemId }))),
      ),
    } as unknown as ItemRepository;
    const before = await practiceTrend({ skill: "writing" }, { items, attempts });

    const { generated, items: set } = await generatedSet();
    // Handed the whole device, as the composition root could, so a write would be seen.
    const device = { generated, attempts, schedule, items };
    for (const item of set) await scoreGeneratedAnswer({ itemId: item.id, response: item.key }, device);

    expect(attempts.append).not.toHaveBeenCalled();
    expect(schedule.put).not.toHaveBeenCalled();
    expect(await practiceTrend({ skill: "writing" }, { items, attempts })).toEqual(before);
  });
});

const draftItem = () => ({
  ...aDraft(9),
  version: 1,
  skill: "writing" as const,
  lang: "fr" as const,
  tags: [],
  provenance: { origin: "authored" as const },
  status: "published" as const,
  createdAt: NOW,
  updatedAt: NOW,
});
