import type { Readability } from "@palier/domain";
import type { TargetBand } from "@palier/domain";

/** Words in a body — whitespace-separated non-empty tokens. */
export const wordCount = (body: string): number => words(body).length;

const words = (body: string): string[] => body.split(/\s+/).filter((w) => w.length > 0);

const sentences = (body: string): number => {
  const parts = body.split(/[.!?]+/).map((s) => s.trim()).filter((s) => s.length > 0);
  return Math.max(parts.length, 1);
};

/**
 * Deterministic readability metrics for a passage (architecture.md §5.2). Crude
 * on purpose — the factory computes them rather than asking the model, the same
 * discipline the oral fluency metrics use (§8.5).
 */
export const readability = (body: string): Readability => {
  const w = words(body);
  const s = sentences(body);
  const rare = w.filter((word) => stripPunctuation(word).length > 7).length;
  return {
    sentences: s,
    avgSentenceLength: Math.round((w.length / s) * 100) / 100,
    rareWordRatio: w.length === 0 ? 0 : Math.round((rare / w.length) * 1000) / 1000,
  };
};

const stripPunctuation = (word: string): string => word.replace(/[.,;:!?()"'«»]/g, "");

/**
 * A crude band estimate from lexical difficulty — the share of long words. The
 * scripted reviewer uses it to estimate the band an item actually tests; a real
 * provider reasons instead. Bands step up with the proportion of long words.
 */
export const estimateBand = (text: string): TargetBand => {
  const w = words(text);
  if (w.length === 0) return "A";
  const longRatio = w.filter((word) => stripPunctuation(word).length > 7).length / w.length;
  if (longRatio >= 0.3) return "C";
  if (longRatio >= 0.15) return "B";
  return "A";
};

/** Normalised stem text for near-duplicate detection: lowercase, punctuation and
 * whitespace collapsed. */
export const normaliseStem = (stem: string): string =>
  stem
    .toLowerCase()
    .replace(/[.,;:!?()"'«»-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

/** Jaccard similarity of the word sets of two normalised strings, 0..1. */
export const tokenJaccard = (a: string, b: string): number => {
  const sa = new Set(a.split(" ").filter((t) => t.length > 0));
  const sb = new Set(b.split(" ").filter((t) => t.length > 0));
  if (sa.size === 0 && sb.size === 0) return 1;
  let shared = 0;
  for (const t of sa) if (sb.has(t)) shared++;
  return shared / (sa.size + sb.size - shared);
};

/**
 * France-specific / anglicism markers a Canadian federal register avoids. The
 * scripted reviewer flags any of them; it stands in for a model's register
 * judgement (content-factory.md §4.4). Not exhaustive — a mechanism, not a lexicon.
 */
export const FRANCE_MARKERS = ["mail", "week-end", "shopping", "parking", "footing", "mel"] as const;

export const hasFranceMarker = (text: string): boolean => {
  const lower = ` ${text.toLowerCase()} `;
  return FRANCE_MARKERS.some((m) => lower.includes(` ${m} `));
};
