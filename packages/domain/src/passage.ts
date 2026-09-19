import type { PassageId } from "./ids.js";
import type { TargetBand } from "./bands.js";
import type { ContentStatus, Lang } from "./skills.js";
import type { Topic } from "./topics.js";

export const DOC_TYPES = [
  "email",
  "memo",
  "letter",
  "bulletin",
  "report-excerpt",
  "research",
  "note",
] as const;
export type DocType = (typeof DOC_TYPES)[number];

export const LICENCES = [
  "OGL-Canada-2.0",
  "canada.ca-non-commercial",
  "public-domain",
  "other",
] as const;
export type Licence = (typeof LICENCES)[number];

/**
 * "Provenance is not optional. Every passage records where it came from and
 * under what terms, because the licensing posture in the requirements document
 * only holds if this data exists and is checked." (architecture.md 5.2)
 */
export type PassageSource = {
  readonly kind: "original" | "derived";
  readonly url?: string | undefined;
  readonly retrievedAt?: string | undefined;
  readonly licence?: Licence | undefined;
  readonly licenceNote?: string | undefined;
  /** How far it was rewritten. */
  readonly transformation?: string | undefined;
};

export type Readability = {
  readonly sentences: number;
  readonly avgSentenceLength: number;
  readonly rareWordRatio: number;
};

export type Passage = {
  readonly id: PassageId;
  readonly lang: Lang;
  readonly docType: DocType;
  readonly title: string;
  /** Markdown, light formatting only. */
  readonly body: string;
  readonly wordCount: number;
  readonly targetBand: TargetBand;
  readonly topic: Topic;
  readonly readability: Readability;
  readonly source: PassageSource;
  readonly status: ContentStatus;
};
