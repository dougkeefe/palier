import type { ItemId, PassageId } from "./ids.js";
import type { Localised, LocalisedRich } from "./localised.js";
import type { TargetBand } from "./bands.js";
import type { ContentStatus, ItemType, Lang, OptionId, ScoredSkill } from "./skills.js";
import type { SubSkill } from "./sub-skills.js";
import type { Topic } from "./topics.js";

/**
 * Observed, never authored (architecture.md 5.1). Absent until telemetry
 * exists, which is why the whole block is optional rather than zero-filled:
 * "no estimate without the evidence behind it" [R10] starts with not inventing
 * one.
 */
export type ItemStats = {
  readonly responses: number;
  /** Simple difficulty: the proportion of users who answered correctly. */
  readonly proportionCorrect: number;
  /**
   * Simple discrimination. Negative is the signature of a broken key. Null when no
   * correlation exists: every response the same, or every one from the same rest bucket.
   */
  readonly pointBiserial: number | null;
  readonly updatedAt: string;
};

export type ItemProvenance = {
  readonly origin: "authored" | "generated" | "adapted";
  readonly sourcePassageId?: PassageId | undefined;
  readonly generator?:
    | { readonly model: string; readonly promptVersion: string; readonly date: string }
    | undefined;
  readonly reviewedBy?: string | undefined;
  readonly reviewedAt?: string | undefined;
  /**
   * Who wrote a hand-authored item: a public handle, such as a GitHub username, and
   * never a name or an email (content-factory.md §5). CC BY 4.0 asks for attribution, and
   * this is where it lives. Optional in the schema, so every bank published before it
   * stays valid; `validate()` flags an `origin: "authored"` item without one
   * (`authored-without-contributor`).
   */
  readonly contributor?: string | undefined;
};

/**
 * Every option carries a rationale, and every item an explanation, in both
 * locales. Not a convention — [R7] makes it a requirement, and the content
 * validator fails the build on a missing one (architecture.md 5.1).
 */
export type ItemOption = {
  readonly id: OptionId;
  /** In the item's own language; the rationale is localised, the option is not. */
  readonly text: string;
  readonly rationale: Localised;
};

export type Item = {
  readonly id: ItemId;
  readonly version: number;
  readonly skill: ScoredSkill;
  readonly lang: Lang;
  readonly type: ItemType;
  readonly passageId?: PassageId | undefined;
  readonly stem: LocalisedRich;
  readonly blankIndex?: number | undefined;
  readonly options: readonly ItemOption[];
  readonly key: OptionId;
  /** The rule, taught. Required in both locales [R7]. */
  readonly explanation: Localised;
  /** Exactly one, from the fixed taxonomy (product-requirements.md 13.2). */
  readonly subSkill: SubSkill;
  /** The only difficulty signal the engine uses (product-requirements.md 5.4). */
  readonly targetBand: TargetBand;
  readonly stats?: ItemStats | undefined;
  readonly topic: Topic;
  readonly tags: readonly string[];
  readonly provenance: ItemProvenance;
  readonly status: ContentStatus;
  readonly createdAt: string;
  readonly updatedAt: string;
};
