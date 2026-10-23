import type { Localised } from "./localised.js";
import type { Lang } from "./skills.js";
import type { WritingSubSkill } from "./sub-skills.js";

/**
 * Who publishes a study resource (progress.md D248). Each is a public, government-run language
 * service, and each has exactly one host a resource's address may name, so a link the app shows
 * can never point anywhere else.
 */
export const STUDY_RESOURCE_SOURCES = ["language-portal", "oqlf", "termium"] as const;
export type StudyResourceSource = (typeof STUDY_RESOURCE_SOURCES)[number];

/** The one host each source's pages live on. */
export const STUDY_RESOURCE_HOSTS: Readonly<Record<StudyResourceSource, string>> = {
  "language-portal": "nos-langues.canada.ca",
  oqlf: "vitrinelinguistique.oqlf.gouv.qc.ca",
  termium: "www.btb.termiumplus.gc.ca",
};

/**
 * One outside page to study a written-expression sub-skill from (progress.md D248), published as
 * `@palier/content/resources/resources.json`. The translator's explanation links each correction to
 * its sub-skill's resources, beside the library's article. **Resources are curated, never written
 * by a model**: a link a model made up could be dead or wrong, so the model names a sub-skill and
 * this list says where to read about it.
 *
 * `lang` is the language the page is written in, so a link can carry `hreflang`; `title` is shown
 * in the interface's language.
 */
export type StudyResource = {
  /** Unique across the file, stable. */
  readonly id: string;
  readonly subSkill: WritingSubSkill;
  readonly source: StudyResourceSource;
  readonly lang: Lang;
  readonly title: Localised;
  /** An `https` address on the source's own host. */
  readonly url: string;
};
