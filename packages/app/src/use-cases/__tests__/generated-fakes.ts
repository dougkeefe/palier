import { itemId } from "@palier/domain";
import type { Item } from "@palier/domain";

import type { GeneratedItemStore, GeneratedSet } from "../../ports/index.js";

/**
 * A local generated-item store for the use-case tests (progress.md D37). `latestSet` keeps
 * the port's rule: newest by `createdAt`, ties by id; a set with no items is not kept.
 */
export const generatedStore = (
  seed: readonly GeneratedSet[] = [],
): GeneratedItemStore & { readonly sets: () => readonly GeneratedSet[] } => {
  const sets = new Map(seed.map((s) => [s.id, s]));
  return {
    putSet: (set) => {
      if (set.items.length > 0) sets.set(set.id, set);
      return Promise.resolve();
    },
    latestSet: (skill) =>
      Promise.resolve(
        [...sets.values()]
          .filter((s) => s.skill === skill)
          .sort((a, b) => b.createdAt.localeCompare(a.createdAt) || b.id.localeCompare(a.id))[0] ?? null,
      ),
    item: (id) => Promise.resolve([...sets.values()].flatMap((s) => s.items).find((i) => i.id === id) ?? null),
    clear: () => {
      sets.clear();
      return Promise.resolve();
    },
    sets: () => [...sets.values()],
  };
};

export const aGeneratedItem = (id = "gen-1", over: Partial<Item> = {}): Item => ({
  id: itemId(id),
  version: 1,
  skill: "writing",
  lang: "fr",
  type: "error-id",
  stem: { en: "Find the error.", fr: "Trouvez l'erreur: GENERATED-MARKER." },
  options: [
    { id: "a", text: "bien que ce soit", rationale: { en: "Correct.", fr: "Correct." } },
    { id: "b", text: "bien que c'est", rationale: { en: "Indicative.", fr: "Indicatif." } },
    { id: "c", text: "malgré que c'est", rationale: { en: "Rejected.", fr: "Rejeté." } },
    { id: "d", text: "quoique c'est", rationale: { en: "Indicative.", fr: "Indicatif." } },
  ],
  key: "a",
  explanation: { en: "«bien que» governs the subjunctive.", fr: "«bien que» régit le subjonctif." },
  subSkill: "verb-tense-and-mood",
  targetBand: "C",
  topic: "policy-and-legislation",
  tags: [],
  provenance: { origin: "generated", generator: { model: "m-draft", promptVersion: "3", date: "2026-09-26T10:00:00.000Z" } },
  status: "published",
  createdAt: "2026-09-26T10:00:00.000Z",
  updatedAt: "2026-09-26T10:00:00.000Z",
  ...over,
});

export const aGeneratedSet = (over: Partial<GeneratedSet> = {}): GeneratedSet => ({
  id: "set-1",
  skill: "writing",
  createdAt: "2026-09-26T10:00:00.000Z",
  items: [aGeneratedItem()],
  ...over,
});
