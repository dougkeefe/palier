import type { LibraryTopic, ScoredSkill } from "@palier/domain";
import { LIBRARY_TOPICS, SCORED_SKILLS } from "@palier/domain";

/**
 * The library index's filter (D257): one pill at a time, everything, a skill or a topic. An
 * article's tags are its skill and its topic, carried on its card as `data-tags`, so the filter
 * needs no article in the client's JavaScript. The chosen pill lives in the URL's hash, which is
 * never sent to the server or the service worker, so a filtered link opens offline from the page
 * it precached.
 */
export type LibraryFilterId = "all" | ScoredSkill | LibraryTopic;

/** The pills in the order the index shows them: everything, the skills, then the topics. */
export const FILTER_IDS: readonly LibraryFilterId[] = ["all", ...SCORED_SKILLS, ...LIBRARY_TOPICS];

export type FilterOption = { readonly id: LibraryFilterId; readonly count: number };

/** An article's tags, as its card carries them. */
export const tagsOf = (skill: ScoredSkill, topic: LibraryTopic): readonly string[] => [skill, topic];

export const matches = (tags: readonly string[], active: LibraryFilterId): boolean =>
  active === "all" || tags.includes(active);

/** The pill a hash names; anything else, an empty hash included, is everything. */
export const filterFromHash = (hash: string): LibraryFilterId => {
  const id = hash.replace(/^#/, "");
  return FILTER_IDS.find((known) => known === id) ?? "all";
};

/** The hash for a pill: none for everything, so the plain URL stays the plain URL. */
export const hashFor = (id: LibraryFilterId): string => (id === "all" ? "" : `#${id}`);

/** Each pill with how many articles it shows, leaving out any that would show none. */
export const filterOptions = (articles: readonly (readonly string[])[]): readonly FilterOption[] =>
  FILTER_IDS.map((id) => ({ id, count: articles.filter((tags) => matches(tags, id)).length })).filter(
    ({ count }) => count > 0,
  );
