import type { AiProvider } from "@palier/adapters/openai";
import type { Lang, Passage, TargetBand } from "@palier/domain";

import { assemblePassage } from "../lib/assemble.js";
import type { SourceRecord } from "../lib/types.js";

/**
 * Stage 2 — passage construction (content-factory.md §4.2). The provider drafts
 * original passages; this stage assembles them and applies the deterministic
 * checks the spec names: length within range for the band, enough sentences, no
 * number that could be mistaken for a real departmental figure, no acronym that
 * could name a real body. Nothing is quoted (the provider is told topic and
 * structure only), and provenance is written here and never removed.
 */

const BAND_WORD_RANGE: Readonly<Record<TargetBand, readonly [number, number]>> = {
  A: [30, 130],
  B: [40, 170],
  C: [50, 230],
};

export type PassageRejection = { readonly title: string; readonly reasons: readonly string[] };
export type PassageStageResult = {
  readonly passages: readonly Passage[];
  readonly rejected: readonly PassageRejection[];
  /** Generation calls that failed (e.g. a malformed response); skipped, not fatal. */
  readonly failedCalls: number;
};

export const checkPassage = (passage: Passage): string[] => {
  const reasons: string[] = [];
  const [min, max] = BAND_WORD_RANGE[passage.targetBand];
  if (passage.wordCount < min || passage.wordCount > max) {
    reasons.push(`word count ${String(passage.wordCount)} is outside [${String(min)}, ${String(max)}] for band ${passage.targetBand}`);
  }
  if (passage.readability.sentences < 3) {
    reasons.push("fewer than three sentences");
  }
  if (/\d{4,}/.test(passage.body)) {
    reasons.push("contains a long number that could be mistaken for a real departmental figure");
  }
  if (/\b[A-Z]{3,}\b/.test(passage.body)) {
    reasons.push("contains an all-caps acronym that could name a real body");
  }
  return reasons;
};

export type PassageStageOptions = {
  readonly lang: Lang;
  readonly bands: readonly TargetBand[];
  readonly perSource: number;
};

export const constructPassages = async (
  sources: readonly SourceRecord[],
  provider: AiProvider,
  options: PassageStageOptions,
): Promise<PassageStageResult> => {
  const passages: Passage[] = [];
  const rejected: PassageRejection[] = [];
  let failedCalls = 0;

  let i = 0;
  for (const source of sources) {
    const targetBand = options.bands[i % options.bands.length]!;
    i++;
    let drafts;
    try {
      drafts = await provider.generatePassage({
        topic: source.topic,
        docType: source.docType,
        targetBand,
        lang: options.lang,
        count: options.perSource,
      });
    } catch {
      failedCalls++;
      continue;
    }
    for (const draft of drafts) {
      const passage = assemblePassage(draft, source);
      const reasons = checkPassage(passage);
      if (reasons.length > 0) rejected.push({ title: passage.title, reasons });
      else passages.push(passage);
    }
  }

  return { passages, rejected, failedCalls };
};
