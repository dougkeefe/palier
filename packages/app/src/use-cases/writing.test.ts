import { describe, expect, it } from "vitest";

import type { UsageRecord, WritingRequest } from "@palier/domain";

import type { AiProvider, CostEntry, CostLedger, KeyVault } from "../ports/index.js";
import { NoApiKeyError } from "./api-key.js";
import {
  EmptyWritingError,
  UnknownWritingPromptError,
  UnknownWritingSubmissionError,
  requestWritingFeedback,
  saveWriting,
  writingHistory,
  writingPrompts,
} from "./writing.js";
import { aPrompt, aSubmission, anAssessment, writingStore } from "./__tests__/writing-fakes.js";

const NOW = "2026-09-26T12:00:00.000Z";
const clock = { now: () => NOW };

/** A vault stub (D37) that holds a key, or none. */
const vaultWith = (key: string | null): KeyVault => ({
  putApiKey: () => Promise.resolve(),
  withApiKey: (fn) => (key === null ? Promise.reject(new Error("no key")) : fn(key)),
  hasApiKey: () => Promise.resolve(key !== null),
  apiKeyStorage: () => Promise.resolve(key === null ? null : "device"),
  clear: () => Promise.resolve(),
  deviceSecret: () => Promise.resolve("device-secret"),
  realtimeEndpoint: () => Promise.resolve(null),
  setRealtimeEndpoint: () => Promise.resolve(),
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

const USAGE: UsageRecord = { model: "m-assess", inputTokens: 900, outputTokens: 700, costUsd: 0.02 };

/** A provider whose `assessWriting` records what it was sent and bills once. */
const assessingProvider = (outcome: "ok" | "fail" = "ok") => {
  const requests: WritingRequest[] = [];
  let usage: UsageRecord | null = null;
  const provider: AiProvider = {
    capabilities: () => ({ generatePassage: false, generateItems: false, reviewItem: false, assessWriting: true, generateScenario: false, transcribe: false, speak: false, examinerTurn: false, assessOral: false, interpretDiagnostic: false }),
    generatePassage: () => Promise.reject(new Error("unused")),
    generateItems: () => Promise.reject(new Error("unused")),
    reviewItem: () => Promise.reject(new Error("unused")),
    assessWriting: (req) => {
      requests.push(req);
      usage = USAGE;
      return outcome === "ok" ? Promise.resolve(anAssessment()) : Promise.reject(new Error("malformed twice"));
    },
    generateScenario: () => Promise.reject(new Error("unused")),
    transcribe: () => Promise.reject(new Error("unused")),
    speak: () => Promise.reject(new Error("unused")),
    examinerTurn: () => Promise.reject(new Error("unused")),
    assessOral: () => Promise.reject(new Error("unused")),
    interpretDiagnostic: () => Promise.reject(new Error("unused")),
    verifyKey: () => Promise.resolve(),
    lastUsage: () => usage,
  };
  return { provider, requests };
};

const feedbackDeps = (over: { key?: string | null; provider?: AiProvider; seed?: ReturnType<typeof aSubmission>[] } = {}) => {
  const { ledger, entries } = ledgerStub();
  const writing = writingStore(over.seed ?? [aSubmission()]);
  const provider = over.provider ?? assessingProvider().provider;
  return {
    deps: {
      prompts: [aPrompt()],
      writing,
      vault: vaultWith(over.key === undefined ? "sk-held" : over.key),
      aiProvider: () => provider,
      ledger,
      clock,
    },
    entries,
    writing,
  };
};

const REQUEST = { submissionId: "sub-1", targetBand: "C", feedbackLang: "en" } as const;

describe("writingPrompts", () => {
  it("offers the library in the order it is authored", () => {
    const prompts = [aPrompt({ id: "b" }), aPrompt({ id: "a" })];
    expect(writingPrompts({ prompts }).map((p) => p.id)).toEqual(["b", "a"]);
  });
});

describe("saveWriting", () => {
  const saveDeps = () => {
    let n = 0;
    return {
      prompts: [aPrompt()],
      writing: writingStore(),
      ids: { ulid: () => `id-${(n += 1)}` },
      clock,
    };
  };

  it("keeps the text exactly as written, as a new unassessed submission", async () => {
    const deps = saveDeps();
    const text = "  Madame,\n\nJe vous écris…  ";
    const saved = await saveWriting({ promptId: "wp-briefing-01", text }, deps);

    expect(saved).toEqual({ id: "id-1", promptId: "wp-briefing-01", text, writtenAt: NOW, assessment: null });
    expect(await deps.writing.get("id-1")).toEqual(saved);
  });

  it("makes every save a new submission, since feedback belongs to the exact text it assessed", async () => {
    const deps = saveDeps();
    await saveWriting({ promptId: "wp-briefing-01", text: "Un" }, deps);
    await saveWriting({ promptId: "wp-briefing-01", text: "Un deux" }, deps);
    expect(await deps.writing.all()).toHaveLength(2);
  });

  it("refuses a text that is empty or only whitespace, and keeps nothing", async () => {
    const deps = saveDeps();
    await expect(saveWriting({ promptId: "wp-briefing-01", text: " \n\t" }, deps)).rejects.toThrow(EmptyWritingError);
    expect(await deps.writing.all()).toEqual([]);
  });

  it("refuses a prompt the library does not have", async () => {
    await expect(saveWriting({ promptId: "wp-none", text: "Du texte" }, saveDeps())).rejects.toThrow(
      UnknownWritingPromptError,
    );
  });
});

describe("requestWritingFeedback", () => {
  it("sends the prompt, the text, the target band and both languages in one call", async () => {
    const { provider, requests } = assessingProvider();
    const { deps } = feedbackDeps({ provider });

    await requestWritingFeedback(REQUEST, deps);

    expect(requests).toEqual([
      {
        task: aPrompt().task,
        wordTarget: 150,
        text: aSubmission().text,
        targetBand: "C",
        lang: "fr",
        feedbackLang: "en",
      },
    ]);
  });

  it("stores the assessment with the submission and returns it", async () => {
    const { deps, writing } = feedbackDeps();

    const assessed = await requestWritingFeedback(REQUEST, deps);

    expect(assessed.assessment).toEqual(anAssessment());
    expect(await writing.get("sub-1")).toEqual(assessed);
  });

  it("is metered once, as writing-feedback, at the clock's time (D101)", async () => {
    const { deps, entries } = feedbackDeps();

    await requestWritingFeedback(REQUEST, deps);

    expect(entries).toEqual([
      { ts: NOW, feature: "writing-feedback", model: "m-assess", inputTokens: 900, outputTokens: 700, costUsd: 0.02 },
    ]);
  });

  it("leaves the submission unassessed when the call fails, so it can be asked again", async () => {
    const { deps, writing, entries } = feedbackDeps({ provider: assessingProvider("fail").provider });

    await expect(requestWritingFeedback(REQUEST, deps)).rejects.toThrow("malformed twice");

    expect((await writing.get("sub-1"))?.assessment).toBeNull();
    // Billed before it failed, so the ledger still has it (D102).
    expect(entries).toHaveLength(1);
  });

  it("returns feedback already given and spends nothing, so a double tap never pays twice", async () => {
    const { provider, requests } = assessingProvider();
    const { deps, entries, writing } = feedbackDeps({
      provider,
      seed: [aSubmission({ assessment: anAssessment({ modelAnswer: "Déjà faite." }) })],
    });

    const again = await requestWritingFeedback(REQUEST, deps);

    expect(again.assessment?.modelAnswer).toBe("Déjà faite.");
    expect(requests).toEqual([]);
    expect(entries).toEqual([]);
    expect(writing.puts()).toBe(0);
  });

  it("rejects with NoApiKeyError when no key is held, and keeps the text", async () => {
    const { deps, writing } = feedbackDeps({ key: null });

    await expect(requestWritingFeedback(REQUEST, deps)).rejects.toThrow(NoApiKeyError);
    expect((await writing.get("sub-1"))?.text).toBe(aSubmission().text);
  });

  it("refuses a submission this device does not hold", async () => {
    const { deps } = feedbackDeps({ seed: [] });
    await expect(requestWritingFeedback(REQUEST, deps)).rejects.toThrow(UnknownWritingSubmissionError);
  });

  it("refuses a submission whose prompt has left the library, before spending anything", async () => {
    const { deps, entries } = feedbackDeps({ seed: [aSubmission({ promptId: "wp-retired" })] });
    await expect(requestWritingFeedback(REQUEST, deps)).rejects.toThrow(UnknownWritingPromptError);
    expect(entries).toEqual([]);
  });
});

describe("writingHistory", () => {
  it("lists this device's submissions, newest first", async () => {
    const writing = writingStore([
      aSubmission({ id: "old", writtenAt: "2026-09-20T10:00:00.000Z" }),
      aSubmission({ id: "new", writtenAt: "2026-09-26T10:00:00.000Z" }),
    ]);
    expect((await writingHistory({ writing })).map((s) => s.id)).toEqual(["new", "old"]);
  });
});
