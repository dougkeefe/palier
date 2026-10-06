import type { AiProvider } from "@palier/adapters/openai";
import type { ReviewRequest, ReviewVerdict, UsageRecord } from "@palier/domain";

import { contentHash } from "../lib/json.js";

/**
 * Stage 4's reviewer when the verdicts were given outside the pipeline (progress.md D204):
 * reviewers who read each item blind, from the requests `palier-factory review-requests`
 * writes, and returned a verdict for each. The verdicts are committed under
 * `content/factory/reviews/`, so a bank built on them rebuilds byte for byte with no key
 * and no model (content-factory.md §4.6), the way the scripted provider's bank did.
 *
 * A verdict is keyed by the hash of the request it answers, so it belongs to exactly the
 * item text the reviewer saw. An item edited after its review has no verdict, and the
 * review **throws, naming it**, rather than pass or discard it on a stale judgement.
 *
 * It only reviews. Every other method rejects: an authored-only run asks for nothing else.
 * Its usage names the reviewer and carries no cost, because none was metered.
 */

export type RecordedVerdict = {
  readonly requestHash: string;
  readonly itemId: string;
  readonly verdict: ReviewVerdict;
};

/** One file under `content/factory/reviews/`: who reviewed, and what they found. */
export type RecordedReviews = {
  readonly reviewer: string;
  readonly verdicts: readonly RecordedVerdict[];
};

/** The key a verdict is filed under: the blind request's canonical hash. */
export const reviewRequestHash = (request: ReviewRequest): string => contentHash(request).slice(0, 24);

export const recordedReviewProvider = (files: readonly RecordedReviews[]): AiProvider => {
  const byHash = new Map<string, { readonly reviewer: string; readonly verdict: ReviewVerdict }>();
  for (const file of files) {
    for (const { requestHash, itemId, verdict } of file.verdicts) {
      if (byHash.has(requestHash)) {
        throw new Error(`item ${itemId}: two recorded verdicts answer the same request ${requestHash}`);
      }
      byHash.set(requestHash, { reviewer: file.reviewer, verdict });
    }
  }

  let usage: UsageRecord | null = null;
  const unsupported = (method: string) => (): Promise<never> => {
    usage = null;
    return Promise.reject(new Error(`The recorded reviewer only reviews; it cannot ${method}.`));
  };

  return {
    capabilities: () => ({
      generatePassage: false,
      generateItems: false,
      reviewItem: true,
      assessWriting: false,
      generateScenario: false,
      transcribe: false,
      speak: false,
      examinerTurn: false,
      assessOral: false,
      interpretDiagnostic: false,
    }),

    reviewItem: (request) => {
      const hash = reviewRequestHash(request);
      const recorded = byHash.get(hash);
      if (recorded === undefined) {
        usage = null;
        return Promise.reject(
          new Error(`no recorded verdict for the item whose stem begins "${request.stem.fr.slice(0, 60)}" (request ${hash}); review it`),
        );
      }
      usage = { model: recorded.reviewer, inputTokens: 0, outputTokens: 0 };
      return Promise.resolve(recorded.verdict);
    },

    generatePassage: unsupported("draft a passage"),
    generateItems: unsupported("draft an item"),
    assessWriting: unsupported("assess writing"),
    generateScenario: unsupported("plan a scenario"),
    transcribe: unsupported("transcribe"),
    speak: unsupported("speak"),
    examinerTurn: unsupported("run an oral session"),
    assessOral: unsupported("assess an oral session"),
    interpretDiagnostic: unsupported("interpret a diagnostic"),
    verifyKey: () => {
      usage = null;
      return Promise.resolve();
    },
    lastUsage: () => usage,
  };
};
