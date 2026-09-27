import type {
  Item,
  ItemDraft,
  ItemId,
  ItemOption,
  ItemResponse,
  ItemType,
  Lang,
  OptionId,
  SubSkill,
  TargetBand,
} from "@palier/domain";
import {
  OPTION_IDS,
  TOPICS,
  WRITING_SUB_SKILLS,
  gateReasons,
  itemId,
  itemSchema,
  itemTypeDefinition,
  reviewRequestFor,
} from "@palier/domain";

import type { GeneratedItemStore, GeneratedSet, IdGenerator, Random } from "../ports/index.js";
import { type MeteredAiDeps, withAiProvider } from "./api-key.js";

/**
 * Runtime item generation (architecture.md §8.3, progress.md D110): a compressed factory in
 * the browser, on the user's key. One draft call, then one **blind** review per draft, one
 * at a time (`lastUsage` is the last call's, D101), all inside one
 * `withAiProvider(…, "item-generation", …)`, so every call is metered. A draft that fails
 * the schema, the item type's own validation, the request it answered, or the review gate
 * is **discarded, never repaired** (content-factory.md §4.4).
 *
 * Written expression only, by human decision (D110): the three sentence-level types the
 * factory cycles, none of which needs a passage.
 *
 * The survivors are kept on the device (`GeneratedItemStore`, never synced or exported)
 * and practised through `scoreGeneratedAnswer`, which writes no `Attempt`: that is how a
 * generated item stays out of the practice trend.
 */

/** How many items one set drafts. Product behaviour, not a §5 exam rule (ADR 9), like `CAP_WARNING_PERCENT`. */
export const GENERATED_SET_SIZE = 5;

/** The item types runtime generation drafts: the factory's sentence-level cycle, no passage needed. */
export const GENERATED_ITEM_TYPES: readonly ItemType[] = ["cloze", "error-id", "best-completion"];

export type GeneratePracticeSetDeps = MeteredAiDeps & {
  readonly generated: GeneratedItemStore;
  readonly ids: IdGenerator;
  /** Selection randomness for the item type, the topic and the key position; never an id (D39). */
  readonly random: Random;
  /** The adapter's prompt version, recorded in each item's provenance (architecture.md §8.2). */
  readonly promptVersion: string;
};

export type GeneratePracticeSetRequest = {
  readonly subSkill: SubSkill;
  readonly targetBand: TargetBand;
  /** The language being practised. */
  readonly lang: Lang;
};

export type GeneratePracticeSetResult = {
  /** The kept set, or null when no draft passed. */
  readonly set: GeneratedSet | null;
  /** Drafts that were checked: at most `GENERATED_SET_SIZE`. Extras a model returns are dropped unchecked and uncounted. */
  readonly drafted: number;
  /** `drafted` less the drafts kept. */
  readonly discarded: number;
};

/** Generation was asked for a sub-skill written expression does not test. */
export class UnsupportedSubSkillError extends Error {
  constructor(subSkill: string) {
    super(`Runtime generation drafts written-expression items only, and "${subSkill}" is not one.`);
    this.name = "UnsupportedSubSkillError";
  }
}

/** An answer was scored for an item this device's generated sets do not hold. */
export class UnknownGeneratedItemError extends Error {
  constructor(id: string) {
    super(`No generated item has the id "${id}".`);
    this.name = "UnknownGeneratedItemError";
  }
}

const pick = <T>(random: Random, list: readonly T[]): T =>
  list[Math.min(list.length - 1, Math.floor(random.next() * list.length))] as T;

/**
 * Shuffle the four options and remap the key, so a drafter's position bias ("the answer is
 * always a") does not reach the user; the factory does the same from a content hash. A draft
 * without exactly the four ids a–d is left as it is, and the type's validation discards it.
 */
const debiasKeyPosition = (draft: ItemDraft, random: Random): { options: readonly ItemOption[]; key: OptionId } => {
  const ordered = OPTION_IDS.map((id) => draft.options.find((o) => o.id === id));
  if (draft.options.length !== OPTION_IDS.length || ordered.some((o) => o === undefined)) {
    return { options: draft.options, key: draft.key };
  }
  const source = ordered as ItemOption[];
  const perm = OPTION_IDS.map((_, i) => i);
  for (let i = perm.length - 1; i > 0; i -= 1) {
    const j = Math.min(i, Math.floor(random.next() * (i + 1)));
    [perm[i], perm[j]] = [perm[j] as number, perm[i] as number];
  }
  const options = perm.map((from, to) => ({
    id: OPTION_IDS[to] as OptionId,
    text: (source[from] as ItemOption).text,
    rationale: (source[from] as ItemOption).rationale,
  }));
  const key = OPTION_IDS[perm.indexOf(OPTION_IDS.indexOf(draft.key))] as OptionId;
  return { options, key };
};

type AssembleMeta = {
  readonly id: ItemId;
  readonly lang: Lang;
  readonly now: string;
  readonly model: string;
  readonly promptVersion: string;
};

/**
 * A draft made into an `Item`: a fresh `gen-` id that can never collide with a bank id, the
 * key debiased, and provenance that says what it is — generated just now, never reviewed by a
 * human, not calibrated (no `stats`, no `reviewedBy`).
 */
const assembleGenerated = (draft: ItemDraft, meta: AssembleMeta, random: Random): Item => {
  const { options, key } = debiasKeyPosition(draft, random);
  return {
    id: meta.id,
    version: 1,
    skill: "writing",
    lang: meta.lang,
    type: draft.type,
    stem: draft.stem,
    ...(draft.blankIndex === undefined ? {} : { blankIndex: draft.blankIndex }),
    options,
    key,
    explanation: draft.explanation,
    subSkill: draft.subSkill,
    targetBand: draft.targetBand,
    topic: draft.topic,
    tags: [],
    provenance: {
      origin: "generated",
      generator: { model: meta.model, promptVersion: meta.promptVersion, date: meta.now },
    },
    status: "published",
    createdAt: meta.now,
    updatedAt: meta.now,
  };
};

/** Why an assembled item cannot be kept before review, or an empty list when it can. */
const preReviewReasons = (item: Item, type: ItemType, request: GeneratePracticeSetRequest): string[] => {
  if (!itemSchema.safeParse(item).success) return ["not a whole item"];
  const reasons = itemTypeDefinition(item.type).validate(item).map((issue) => `${issue.code}: ${issue.message}`);
  if (item.type !== type) reasons.push(`drafted a ${item.type} item, asked for ${type}`);
  if (item.subSkill !== request.subSkill) reasons.push(`drafted for ${item.subSkill}, asked for ${request.subSkill}`);
  if (item.targetBand !== request.targetBand) reasons.push(`drafted at ${item.targetBand}, asked for ${request.targetBand}`);
  return reasons;
};

/**
 * Draft `GENERATED_SET_SIZE` items for one written-expression sub-skill at the target band,
 * review each blind, and keep the ones that pass. A failed call (no key, 401, 429, timeout,
 * malformed twice) rethrows and keeps nothing, and whatever it billed is already metered. A
 * set in which nothing passed is a result, not an error.
 */
export const generatePracticeSet = async (
  request: GeneratePracticeSetRequest,
  deps: GeneratePracticeSetDeps,
): Promise<GeneratePracticeSetResult> => {
  if (!(WRITING_SUB_SKILLS as readonly string[]).includes(request.subSkill)) {
    throw new UnsupportedSubSkillError(request.subSkill);
  }
  const type = pick(deps.random, GENERATED_ITEM_TYPES);
  const topic = pick(deps.random, TOPICS);
  const promptSpec = itemTypeDefinition(type).generatePrompt({
    targetBand: request.targetBand,
    subSkill: request.subSkill,
    topic,
    lang: request.lang,
  });
  const now = deps.clock.now();

  const { kept, drafted } = await withAiProvider(deps, "item-generation", async (ai) => {
    const returned = await ai.generateItems({ promptSpec, topic, lang: request.lang, count: GENERATED_SET_SIZE });
    const model = ai.lastUsage()?.model ?? "unknown";
    // A model that returns more than it was asked for gets no more paid reviews. The extra drafts are
    // dropped unchecked and not counted, so "N of M passed the check" only ever counts checked drafts.
    const drafts = returned.slice(0, GENERATED_SET_SIZE);
    const passed: Item[] = [];
    for (const draft of drafts) {
      const item = assembleGenerated(
        draft,
        { id: itemId(`gen-${deps.ids.ulid()}`), lang: request.lang, now, model, promptVersion: deps.promptVersion },
        deps.random,
      );
      if (preReviewReasons(item, type, request).length > 0) continue;
      // One call at a time: the meter reads each call's own usage (D101).
      const verdict = await ai.reviewItem(reviewRequestFor(item));
      if (gateReasons(item, verdict).length === 0) passed.push(item);
    }
    return { kept: passed, drafted: drafts.length };
  });

  const set: GeneratedSet | null =
    kept.length === 0 ? null : { id: deps.ids.ulid(), skill: "writing", createdAt: now, items: kept };
  if (set !== null) await deps.generated.putSet(set);
  return { set, drafted, discarded: drafted - kept.length };
};

/** The newest generated set for written expression on this device, or null. */
export const latestGeneratedSet = (deps: { readonly generated: GeneratedItemStore }): Promise<GeneratedSet | null> =>
  deps.generated.latestSet("writing");

export type ScoreGeneratedAnswerRequest = {
  readonly itemId: ItemId;
  readonly response: ItemResponse;
};

/**
 * Score an answer to a generated item, locally, by its type's own `score`. **It writes
 * nothing**: no `Attempt`, no schedule entry, no session. So a generated item can never
 * reach `practiceTrend`'s input, and nothing about it syncs (architecture.md §8.3, D110).
 */
export const scoreGeneratedAnswer = async (
  request: ScoreGeneratedAnswerRequest,
  deps: { readonly generated: GeneratedItemStore },
): Promise<{ readonly correct: boolean }> => {
  const item = await deps.generated.item(request.itemId);
  if (item === null) throw new UnknownGeneratedItemError(request.itemId);
  return { correct: itemTypeDefinition(item.type).score(item, request.response).correct };
};
