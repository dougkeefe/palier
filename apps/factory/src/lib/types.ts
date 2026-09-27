import type { DocType, Lang, Licence, OralSessionType, Topic } from "@palier/domain";

/** A candidate source as it appears in the committed seed (harvest input). */
export type SourceCandidate = {
  readonly url: string;
  readonly docType: DocType;
  readonly topic: Topic;
  readonly licence: Licence;
  readonly licenceNote?: string;
};

/**
 * The oral scenarios a batch plans (progress.md D114), from `content/factory/oral-sessions.json`:
 * each session type at its length (product-requirements.md §8.6), at each band. Session lengths
 * are Palier's own product, not a §5 exam rule (the PSC publishes no phase breakdown, §5.3), so
 * they are factory configuration, as the source queue is, and not profile data.
 */
export type OralSessionPlan = {
  readonly lang: Lang;
  readonly bands: readonly ("B" | "C")[];
  readonly sessions: readonly { readonly sessionType: OralSessionType; readonly minutes: number }[];
};

/** A source that cleared the licence gate (harvest output, content-factory.md §4.1). */
export type SourceRecord = SourceCandidate & { readonly retrievedAt: string };

/** Why a candidate was rejected at harvest. */
export type SourceRejection = { readonly url: string; readonly reason: string };

export type HarvestResult = {
  readonly queue: readonly SourceRecord[];
  readonly rejected: readonly SourceRejection[];
};

/** One drafted item that failed the review gate, with the reason (never repaired). */
export type Discard = { readonly stemFr: string; readonly reasons: readonly string[] };

export type ReviewResult<T> = {
  readonly passed: readonly T[];
  readonly discarded: readonly Discard[];
};

/** The per-batch metrics committed alongside the bank (content-factory.md §6). */
export type BatchReport = {
  readonly batchId: string;
  readonly generatedAt: string;
  readonly provider: string;
  readonly counts: {
    readonly sources: number;
    readonly passages: number;
    readonly itemsDrafted: number;
    readonly itemsPassed: number;
    /** Published in this batch; carried items are counted separately. */
    readonly itemsPublished: number;
    /** Carried from the previous bank version, still valid. */
    readonly itemsCarried: number;
    /** Oral scenarios published in this batch (progress.md D114); carried ones apart. */
    readonly scenarios: number;
    readonly scenariosCarried: number;
  };
  /** Stage-4 yield: passed / drafted. Target 0.45–0.75 (§6). */
  readonly stage4Yield: number;
  /** Cost per accepted item in USD, or null when no pricing was configured. */
  readonly costPerAcceptedItemUsd: number | null;
  readonly totalCostUsd: number | null;
};
