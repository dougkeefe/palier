import { describe, expect, it } from "vitest";

import type { Translation, TranslationRequest, UsageRecord } from "@palier/domain";

import type { AiProvider, CostEntry, CostLedger, KeyVault } from "../ports/index.js";
import { NoApiKeyError } from "./api-key.js";
import {
  EmptyTranslationError,
  MAX_TRANSLATION_CHARS,
  TranslationTooLongError,
  translateText,
} from "./translate.js";

const NOW = "2026-10-23T12:00:00.000Z";

/** A vault stub (D37) that holds a key, or none. */
const vaultWith = (key: string | null): KeyVault => ({
  putApiKey: () => Promise.resolve(),
  withApiKey: (fn) => (key === null ? Promise.reject(new NoApiKeyError()) : fn(key)),
  hasApiKey: () => Promise.resolve(key !== null),
  apiKeyStorage: () => Promise.resolve(key === null ? null : "device"),
  clear: () => Promise.resolve(),
  deviceSecret: () => Promise.resolve("device-secret"),
  realtimeEndpoint: () => Promise.resolve(null),
  setRealtimeEndpoint: () => Promise.resolve(),
});

const USAGE: UsageRecord = { model: "m-assess", inputTokens: 600, outputTokens: 900, costUsd: 0.01 };

const TRANSLATION: Translation = {
  source: "en",
  target: "fr",
  output: "Le rapport est joint.",
  strengths: [],
  corrections: [],
  notes: [],
};

/** A provider whose `translate` records what it was sent and bills once. */
const translatingProvider = (outcome: "ok" | "fail" = "ok") => {
  const requests: TranslationRequest[] = [];
  let usage: UsageRecord | null = null;
  const unused = () => Promise.reject(new Error("unused"));
  const provider: AiProvider = {
    capabilities: () => ({
      generatePassage: false,
      generateItems: false,
      reviewItem: false,
      assessWriting: false,
      generateScenario: false,
      transcribe: false,
      speak: false,
      examinerTurn: false,
      assessOral: false,
      interpretDiagnostic: false,
      translate: true,
    }),
    generatePassage: unused,
    generateItems: unused,
    reviewItem: unused,
    assessWriting: unused,
    generateScenario: unused,
    transcribe: unused,
    speak: unused,
    examinerTurn: unused,
    assessOral: unused,
    interpretDiagnostic: unused,
    translate: (req) => {
      requests.push(req);
      usage = USAGE;
      return outcome === "ok" ? Promise.resolve(TRANSLATION) : Promise.reject(new Error("malformed twice"));
    },
    verifyKey: () => Promise.resolve(),
    lastUsage: () => usage,
  };
  return { provider, requests };
};

const depsWith = (over: { key?: string | null; outcome?: "ok" | "fail" } = {}) => {
  const entries: CostEntry[] = [];
  const ledger: CostLedger = {
    append: (entry) => {
      entries.push(entry);
      return Promise.resolve();
    },
    since: () => Promise.resolve(entries),
    clear: () => Promise.resolve(),
  };
  const { provider, requests } = translatingProvider(over.outcome);
  const keys: string[] = [];
  return {
    deps: {
      vault: vaultWith(over.key === undefined ? "sk-test" : over.key),
      aiProvider: (apiKey: string) => {
        keys.push(apiKey);
        return provider;
      },
      ledger,
      clock: { now: () => NOW },
    },
    entries,
    requests,
    keys,
  };
};

const asks = { text: "The report is attached.", source: "en", target: "fr", feedbackLang: "en" } as const;

describe("translateText", () => {
  it("makes one call on the key, sends the text as written, and meters it as translation", async () => {
    const { deps, entries, requests, keys } = depsWith();
    const text = "  Le rapport  est joint.\n";
    await expect(translateText({ ...asks, text, source: null }, deps)).resolves.toEqual(TRANSLATION);
    expect(requests).toEqual([{ text, source: null, target: "fr", feedbackLang: "en" }]);
    expect(keys).toEqual(["sk-test"]);
    expect(entries.map((entry) => entry.feature)).toEqual(["translation"]);
  });

  it("refuses an empty text before any request, so it costs nothing", async () => {
    const { deps, requests, entries } = depsWith();
    await expect(translateText({ ...asks, text: " \n\t" }, deps)).rejects.toBeInstanceOf(EmptyTranslationError);
    expect(requests).toEqual([]);
    expect(entries).toEqual([]);
  });

  it("refuses a text longer than one call takes before any request, naming its length", async () => {
    const { deps, requests } = depsWith();
    const text = "a".repeat(MAX_TRANSLATION_CHARS + 1);
    const refused = translateText({ ...asks, text }, deps);
    await expect(refused).rejects.toBeInstanceOf(TranslationTooLongError);
    await expect(refused).rejects.toMatchObject({ name: "TranslationTooLongError", length: MAX_TRANSLATION_CHARS + 1 });
    expect(requests).toEqual([]);
  });

  it("takes a text of exactly the limit", async () => {
    const { deps, requests } = depsWith();
    await translateText({ ...asks, text: "a".repeat(MAX_TRANSLATION_CHARS) }, deps);
    expect(requests).toHaveLength(1);
  });

  it("names a missing key, and makes no request", async () => {
    const { deps, requests } = depsWith({ key: null });
    await expect(translateText(asks, deps)).rejects.toBeInstanceOf(NoApiKeyError);
    expect(requests).toEqual([]);
  });

  it("rethrows a failed call and still records what it billed", async () => {
    const { deps, entries } = depsWith({ outcome: "fail" });
    await expect(translateText(asks, deps)).rejects.toThrow("malformed twice");
    expect(entries.map((entry) => entry.feature)).toEqual(["translation"]);
  });
});
