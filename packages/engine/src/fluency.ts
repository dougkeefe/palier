import type { OralTurn } from "@palier/domain";
import { spokenWords } from "@palier/domain";

/**
 * Fluency metrics for a spoken session (architecture.md §8.5, "computed client-side from
 * timings rather than asked of the model"; progress.md D123). Pure, over the stored turns.
 *
 * Only **spoken** answers count: a candidate's turn with `input: "voice"`. A typed answer
 * has no speech to time and no hesitation to hear, and a turn stored before Slice 3 says
 * neither, so it counts as untimed. Each metric is `null` when no spoken answer measures it,
 * never a zero that would read as a result.
 *
 * - **Words per minute**: the words of every spoken answer over the time they were spoken.
 * - **Fillers**: how many times any word or phrase of `fillers` is said, whole and without
 *   regard to case. The list is content data (`@palier/content/oral/fillers.json`), so the
 *   caller hands in the practised language's. A transcription model may drop some hesitations,
 *   so the count is what the transcript kept.
 * - **Mean pause**: how long the candidate waited, once the question had been heard, before they
 *   began a spoken answer: each spoken turn's `pauseMs`, which the screen measures from the end of
 *   the question's voice to the press of Record (progress.md D127). A turn's `startMs` cannot say
 *   it: the examiner's turn is stamped when its words appear, before its voice has played, so the
 *   gap between the two turns counts the listening too.
 *
 * Words are `@palier/domain`'s `spokenWords`, the tokenising the filler list is checked with, so a
 * curly apostrophe or an accent written in two code points counts as it reads (D127).
 */

export type FluencyMetrics = {
  /** How many spoken answers the figures are measured over. */
  readonly spokenTurns: number;
  readonly wordsPerMinute: number | null;
  readonly fillerCount: number | null;
  readonly meanPauseMs: number | null;
};

const MINUTE_MS = 60_000;

const wordsOf = spokenWords;

/** How many times `phrase` occurs as whole words, in order, in `words`. */
const occurrences = (words: readonly string[], phrase: readonly string[]): number => {
  let count = 0;
  for (let start = 0; start + phrase.length <= words.length; start += 1) {
    if (phrase.every((word, offset) => words[start + offset] === word)) count += 1;
  }
  return count;
};

const isSpoken = (turn: OralTurn): boolean => turn.speaker === "candidate" && turn.input === "voice";

export const fluencyMetrics = (turns: readonly OralTurn[], fillers: readonly string[]): FluencyMetrics => {
  const spoken = turns.filter(isSpoken);
  if (spoken.length === 0) {
    return { spokenTurns: 0, wordsPerMinute: null, fillerCount: null, meanPauseMs: null };
  }

  const words = spoken.map((turn) => wordsOf(turn.text));
  const speakingMs = spoken.reduce((sum, turn) => sum + (turn.endMs - turn.startMs), 0);
  const wordCount = words.reduce((sum, list) => sum + list.length, 0);

  const phrases = fillers.map(wordsOf).filter((phrase) => phrase.length > 0);
  const fillerCount = words.reduce(
    (sum, list) => sum + phrases.reduce((inner, phrase) => inner + occurrences(list, phrase), 0),
    0,
  );

  const pauses = spoken.flatMap((turn) => (turn.pauseMs === undefined ? [] : [turn.pauseMs]));

  return {
    spokenTurns: spoken.length,
    wordsPerMinute: speakingMs === 0 ? null : (wordCount * MINUTE_MS) / speakingMs,
    fillerCount,
    meanPauseMs: pauses.length === 0 ? null : pauses.reduce((sum, pause) => sum + pause, 0) / pauses.length,
  };
};
