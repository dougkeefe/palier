import type { Item, ItemOption, Passage } from "@palier/domain";

import { CORRECT_MARKER } from "../lib/scripted-key.js";

/**
 * Hand-authored contributions for the intake's tests (content-factory.md §5), written as
 * a contributor would, and shaped so the scripted reviewer can judge them: the correct
 * option carries its marker, as the eval set's do. A test fixture, not bank content.
 */

/** Fourteen words, two of them long, so the band estimate reads B. */
const BAND_B_STEM = "La directrice approuve le rapport annuel avant que le comité ne se réunisse jeudi.";

const option = (id: ItemOption["id"], text: string): ItemOption => ({
  id,
  text,
  rationale: { fr: `Pourquoi ${id} convient ou non.`, en: `Why ${id} fits or does not.` },
});

/** A clean authored item: the scripted reviewer agrees with its key and flags nothing. */
export const anAuthoredItem = (over: Partial<Item> = {}): Item => ({
  id: "authored-octocat-1" as Item["id"],
  version: 1,
  skill: "writing",
  lang: "fr",
  type: "best-completion",
  stem: { fr: BAND_B_STEM, en: "The director approves the annual report before the committee meets on Thursday." },
  options: [
    option("a", "le rapportage annuel"),
    option("b", `${CORRECT_MARKER} : le rapport annuel`),
    option("c", "la rapporte annuelle"),
    option("d", "les rapports annuel"),
  ],
  key: "b",
  explanation: { fr: "«Rapport» est masculin, et l'adjectif s'accorde.", en: "“Rapport” is masculine, and the adjective agrees." },
  subSkill: "agreement",
  targetBand: "B",
  topic: "human-resources",
  tags: [],
  provenance: { origin: "authored", contributor: "octocat" },
  status: "published",
  createdAt: "2026-09-28T00:00:00.000Z",
  updatedAt: "2026-09-28T00:00:00.000Z",
  ...over,
});

/**
 * An authored item the review gate rejects: a distractor reads as France-specific, which
 * the scripted reviewer flags. It must be discarded whoever wrote it.
 */
export const anAuthoredItemReviewRejects = (): Item =>
  anAuthoredItem({
    id: "authored-octocat-2" as Item["id"],
    stem: { fr: "Le gestionnaire confirme la décision par écrit avant la fin de la semaine prochaine.", en: "The manager confirms the decision in writing before the end of next week." },
    options: [
      option("a", `${CORRECT_MARKER} : par écrit`),
      option("b", "envoyez un mail"),
      option("c", "de vive voix"),
      option("d", "au téléphone"),
    ],
    key: "a",
  });

/** A hand-authored passage, credited as an authored item is. */
export const anAuthoredPassage = (over: Partial<Passage> = {}): Passage => ({
  id: "authored-octocat-passage-1" as Passage["id"],
  lang: "fr",
  docType: "memo",
  title: "Note de service : horaire d'été",
  body:
    "À compter du premier juillet, les bureaux ouvriront à huit heures. Les employés qui souhaitent un autre horaire " +
    "doivent en discuter avec leur gestionnaire avant la fin du mois. La direction remercie le personnel de sa " +
    "collaboration habituelle et rappelle que le service à la clientèle reste ouvert jusqu'à seize heures.",
  // Held to the drafted passages' rules since D203: at least three sentences, a band-B length,
  // and the readability the factory computes from the body.
  wordCount: 51,
  targetBand: "B",
  topic: "human-resources",
  readability: { sentences: 3, avgSentenceLength: 17, rareWordRatio: 0.235 },
  source: { kind: "original", contributor: "octocat" },
  status: "published",
  ...over,
});

/** An authored comprehension item that asks about `anAuthoredPassage`. */
export const anAuthoredComprehensionItem = (): Item =>
  anAuthoredItem({
    id: "authored-octocat-3" as Item["id"],
    skill: "reading",
    type: "comprehension",
    passageId: anAuthoredPassage().id,
    stem: { fr: "Selon la note, à quelle heure les bureaux ouvriront-ils pendant l'été ?", en: "According to the memo, when will the offices open in summer?" },
    options: [
      option("a", "à sept heures"),
      option("b", "à neuf heures"),
      option("c", `${CORRECT_MARKER} : à huit heures`),
      option("d", "à midi"),
    ],
    key: "c",
    subSkill: "specific-detail",
  });
