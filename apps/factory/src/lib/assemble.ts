import {
  OPTION_IDS,
  itemId,
  passageId,
} from "@palier/domain";
import type {
  Item,
  ItemDraft,
  ItemOption,
  Lang,
  OptionId,
  Passage,
  PassageDraft,
  PassageId,
  ScoredSkill,
} from "@palier/domain";

import type { SourceRecord } from "./types.js";
import { contentHash, contentId } from "./json.js";
import { readability, wordCount } from "./text.js";

/** A small seeded PRNG so a shuffle is reproducible from the item's content. */
const mulberry32 = (seed: number): (() => number) => () => {
  let t = (seed += 0x6d2b79f5);
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};

/**
 * Deterministically shuffle the four options and remap the key, so a drafter's
 * position bias (models love to put the answer first) does not survive into the
 * bank — a "the answer is always a" bank is trivially gameable, and stage-5's
 * key-position check would rightly reject it. Seeded from the content, so it is
 * reproducible. A no-op unless the draft carries exactly the four ids a–d, in
 * which case stage-5 rejects it on its own terms.
 */
export const debiasKeyPosition = (
  draft: ItemDraft,
): { options: readonly ItemOption[]; key: OptionId } => {
  const ordered = OPTION_IDS.map((id) => draft.options.find((o) => o.id === id));
  if (draft.options.length !== 4 || ordered.some((o) => o === undefined)) {
    return { options: draft.options, key: draft.key };
  }
  const source = ordered as ItemOption[];
  const rng = mulberry32(Number.parseInt(contentHash(draft.stem.fr + source.map((o) => o.text).join("|")).slice(0, 8), 16));
  const perm = [0, 1, 2, 3];
  for (let i = 3; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [perm[i], perm[j]] = [perm[j]!, perm[i]!];
  }
  const options = perm.map((oldIdx, newPos) => ({
    id: OPTION_IDS[newPos]!,
    text: source[oldIdx]!.text,
    rationale: source[oldIdx]!.rationale,
  }));
  const key = OPTION_IDS[perm.indexOf(OPTION_IDS.indexOf(draft.key))]!;
  return { options, key };
};

/**
 * Assembly is the factory's job, not the adapter's: id-minting, provenance,
 * status and the deterministic metrics live here so the `AiProvider` stays a
 * pure translator (adapters/CLAUDE.md). Ids are content-derived so a rebuild is
 * byte-identical and an unchanged item keeps its id forever (content-factory.md
 * §4.6, architecture.md §5.5).
 */

export type ItemMeta = {
  readonly skill: ScoredSkill;
  readonly lang: Lang;
  readonly now: string;
  readonly model: string;
  readonly promptVersion: string;
  readonly passageId?: PassageId | undefined;
};

export const assemblePassage = (draft: PassageDraft, source: SourceRecord): Passage => {
  const id = passageId(contentId({ k: "passage", lang: draft.lang, title: draft.title, body: draft.body }));
  return {
    id,
    lang: draft.lang,
    docType: draft.docType,
    title: draft.title,
    body: draft.body,
    wordCount: wordCount(draft.body),
    targetBand: draft.targetBand,
    topic: draft.topic,
    readability: readability(draft.body),
    source: {
      kind: "derived",
      url: source.url,
      retrievedAt: source.retrievedAt,
      licence: source.licence,
      transformation: "rewritten from structure and topic only; nothing quoted",
      ...(source.licenceNote === undefined ? {} : { licenceNote: source.licenceNote }),
    },
    status: "published",
  };
};

export const assembleItem = (draft: ItemDraft, meta: ItemMeta): Item => {
  const { options, key } = debiasKeyPosition(draft);
  const id = itemId(
    contentId({
      k: "item",
      lang: meta.lang,
      type: draft.type,
      stem: draft.stem,
      options,
      key,
    }),
  );
  return {
    id,
    version: 1,
    skill: meta.skill,
    lang: meta.lang,
    type: draft.type,
    ...(meta.passageId === undefined ? {} : { passageId: meta.passageId }),
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
      ...(meta.passageId === undefined ? {} : { sourcePassageId: meta.passageId }),
      generator: { model: meta.model, promptVersion: meta.promptVersion, date: meta.now },
    },
    status: "published",
    createdAt: meta.now,
    updatedAt: meta.now,
  };
};
