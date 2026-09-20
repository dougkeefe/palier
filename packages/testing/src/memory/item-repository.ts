import type { ItemCriteria, ItemRepository } from "@palier/app";
import type { ExamForm, Item, OralScenario, Passage } from "@palier/domain";

/**
 * The content an `ItemRepository` serves. The bank is static and versioned, so
 * this is a constructor argument rather than a write side (implementation-plan.md
 * 3.3): the in-memory repo is seeded once, exactly as the real one is seeded by
 * a fetch. Every field is optional so a test declares only what it queries.
 */
export type MemoryBank = {
  readonly items?: readonly Item[];
  readonly passages?: readonly Passage[];
  readonly forms?: readonly ExamForm[];
  readonly scenarios?: readonly OralScenario[];
  readonly bankVersion?: number;
};

const matches = (item: Item, c: ItemCriteria): boolean => {
  if (c.skill !== undefined && item.skill !== c.skill) return false;
  if (c.subSkill !== undefined && item.subSkill !== c.subSkill) return false;
  if (c.band !== undefined && item.targetBand !== c.band) return false;
  if (c.exclude !== undefined && c.exclude.includes(item.id)) return false;
  return true;
};

export const memoryItemRepository = (bank: MemoryBank = {}): ItemRepository => {
  const items = bank.items ?? [];
  const passages = new Map(bank.passages?.map((p) => [p.id, p]));
  const forms = new Map(bank.forms?.map((f) => [f.id, f]));
  const scenarios = new Map(bank.scenarios?.map((s) => [s.id, s]));
  const version = bank.bankVersion ?? 1;

  return {
    byIds: (ids) =>
      Promise.resolve(
        ids
          .map((id) => items.find((item) => item.id === id))
          .filter((item): item is Item => item !== undefined),
      ),
    query: (criteria) => {
      const hits = items.filter((item) => matches(item, criteria));
      return Promise.resolve(
        criteria.limit === undefined ? hits : hits.slice(0, criteria.limit),
      );
    },
    passage: (id) => Promise.resolve(passages.get(id) ?? null),
    form: (id) => Promise.resolve(forms.get(id) ?? null),
    scenario: (id) => Promise.resolve(scenarios.get(id) ?? null),
    bankVersion: () => Promise.resolve(version),
  };
};
