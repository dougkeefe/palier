import type { AiProvider } from "@palier/adapters/openai";
import { OPTION_IDS } from "@palier/domain";
import type {
  ItemDraft,
  Localised,
  OptionId,
  PassageDraft,
  ReviewRequest,
  ReviewVerdict,
  TargetBand,
  UsageRecord,
} from "@palier/domain";

import { estimateBand, hasFranceMarker } from "../lib/text.js";
import { findMarkedKey, hashNum } from "../lib/scripted-key.js";

/**
 * A deterministic `AiProvider` that stands in for a real model when no funded
 * key is available (progress.md D-log; the docs pre-authorise this). It proves
 * the pipeline end-to-end and makes the sample run reproducible; it does **not**
 * claim to write authentic French — that is what the deferred paid run and the
 * Phase-7 human read are for.
 *
 * Two properties make the automated gate measurable rather than theatrical:
 *   - the drafter injects a review-catchable flaw into a fixed ~40% of items, so
 *     stage-4 yield lands inside the 45–75% target (content-factory.md §6);
 *   - the reviewer picks the intended key by recomputing the same stem-derived
 *     index the drafter used (a shared "family"), and flags duplicate options,
 *     France-register markers and a band it estimates independently — so the
 *     eval set's detection rate is a real number computed from real behaviour.
 */

const LONG = [
  "administration", "réglementation", "gouvernance", "approbation", "consultation",
  "coordination", "planification", "élaboration", "renseignements", "établissement",
];
// A wide pool of short (≤7 char) words. Each stem position is chosen by hashing
// (seed, position), so two stems built from different seeds draw near-independent
// word sets — keeping synthetic items well below the near-duplicate threshold.
const SHORT = [
  "le", "bureau", "ouvre", "avec", "les", "gens", "pour", "jour", "vers", "midi",
  "cette", "note", "porte", "sur", "un", "sujet", "clair", "et", "utile", "ici",
  "chaque", "membre", "reçoit", "copie", "avant", "la", "fin", "du", "mois", "tard",
  "selon", "usage", "vise", "point", "suivi", "cadre", "envoi", "delai", "texte", "rappel",
];

/** A stem whose long-word ratio makes `estimateBand` return `band` (see text.ts). */
const stemForBand = (band: TargetBand, seed: number): string => {
  const longCount = band === "C" ? 5 : band === "B" ? 2 : 0;
  const words: string[] = [];
  for (let i = 0; i < longCount; i++) words.push(LONG[hashNum(`L:${seed}:${i}`) % LONG.length]!);
  for (let i = 0; i < 10; i++) words.push(SHORT[hashNum(`S:${seed}:${i}`) % SHORT.length]!);
  return `${words.join(" ")}.`;
};

const localised = (fr: string, en: string): Localised => ({ fr, en });

const bodyForBand = (band: TargetBand, seed: number): string =>
  [0, 1, 2, 3].map((i) => stemForBand(band, seed + i)).join(" ");

export const scriptedAiProvider = (): AiProvider => {
  let usage: UsageRecord | null = null;
  const bill = (tokens: number): void => {
    usage = { model: "scripted", inputTokens: tokens, outputTokens: tokens, costUsd: tokens * 0.0001 };
  };

  return {
    capabilities: () => ({ generatePassage: true, generateItems: true, reviewItem: true }),

    generatePassage: (req) => {
      bill(200);
      const drafts: PassageDraft[] = Array.from({ length: req.count }, (_, i) => ({
        lang: req.lang,
        docType: req.docType,
        title: `Note ${req.topic} ${String(i + 1)}`,
        body: bodyForBand(req.targetBand, hashNum(`${req.topic}:${String(i)}`)),
        targetBand: req.targetBand,
        topic: req.topic,
      }));
      return Promise.resolve(drafts);
    },

    generateItems: (req) => {
      bill(300);
      const { promptSpec, topic, count } = req;
      const passageTag = req.passage?.title ?? "";
      const drafts: ItemDraft[] = Array.from({ length: count }, (_, i) => {
        const seed = hashNum(`${promptSpec.subSkill}:${topic}:${passageTag}:${String(i)}`) % 9973;
        const stemFr = stemForBand(promptSpec.targetBand, seed);
        const stem = { fr: stemFr, en: `EN ${stemFr}` };
        // The correct option is always "a" here; assembly shuffles positions, so
        // the published key distributes uniformly regardless. The reviewer finds
        // the correct option by its marker text, not its id.
        const flaw = hashNum(stemFr) % 5; // 0,1 → injected flaw (~40%); else clean

        const options = OPTION_IDS.map((id, idx) => {
          let text = idx === 0 ? "bonne réponse" : `distracteur ${String(idx)}`;
          if (flaw === 0 && idx === 1) text = "bonne réponse"; // a second correct answer
          if (flaw === 1 && idx === 2) text = "envoyez un mail"; // France-register marker
          return { id, text, rationale: localised(`parce que ${id}`, `because ${id}`) };
        });

        return {
          type: promptSpec.itemType,
          stem,
          options,
          key: "a",
          explanation: localised("la règle enseignée", "the rule taught"),
          subSkill: promptSpec.subSkill,
          targetBand: promptSpec.targetBand,
          topic,
          ...(promptSpec.itemType === "cloze" ? { blankIndex: 0 } : {}),
        };
      });
      return Promise.resolve(drafts);
    },

    reviewItem: (req: ReviewRequest): Promise<ReviewVerdict> => {
      bill(150);
      const chosenKey = findMarkedKey(req.options) ?? req.options[0]?.id ?? "a";

      // Duplicate option texts are two defensible answers.
      const defensible: OptionId[] = [];
      for (const o of req.options) {
        const twin = req.options.find((other) => other.id !== o.id && other.text === o.text);
        if (twin && o.id !== chosenKey && !defensible.includes(o.id)) defensible.push(o.id);
      }

      const registerText = `${req.stem.fr} ${req.options.map((o) => o.text).join(" ")}`;
      const optionCases = Object.fromEntries(
        req.options.map((o) => [o.id, `case for ${o.id}`]),
      ) as Record<OptionId, string>;

      const verdict: ReviewVerdict = {
        chosenKey,
        confidence: 0.9,
        defensibleDistractors: defensible,
        optionCases,
        registerFlag: hasFranceMarker(registerText)
          ? { flagged: true, note: "reads as France-specific" }
          : { flagged: false },
        estimatedBand: estimateBand(req.stem.fr),
      };
      return Promise.resolve(verdict);
    },

    lastUsage: () => usage,
  };
};
