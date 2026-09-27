import type { GeneratedItemStore, GeneratedSet } from "@palier/app";

/**
 * Runtime-generated sets, in memory (progress.md D110). `latestSet` is the newest set
 * for a skill by `createdAt` in string order (canonical UTC, as the port requires), ties
 * broken by id; a set with no items is not kept, and a set put again replaces itself.
 */
export const memoryGeneratedItemStore = (): GeneratedItemStore => {
  const sets = new Map<string, GeneratedSet>();
  return {
    putSet: (set) => {
      if (set.items.length > 0) sets.set(set.id, set);
      return Promise.resolve();
    },
    latestSet: (skill) => {
      const newest = [...sets.values()]
        .filter((set) => set.skill === skill)
        .sort((a, b) => (a.createdAt === b.createdAt ? (a.id < b.id ? 1 : -1) : a.createdAt < b.createdAt ? 1 : -1))[0];
      return Promise.resolve(newest ?? null);
    },
    item: (id) =>
      Promise.resolve([...sets.values()].flatMap((set) => set.items).find((item) => item.id === id) ?? null),
    clear: () => {
      sets.clear();
      return Promise.resolve();
    },
  };
};
