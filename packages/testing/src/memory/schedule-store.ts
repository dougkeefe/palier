import type { ISO, ScheduleEntry, ScheduleStore } from "@palier/app";

export const memoryScheduleStore = (): ScheduleStore => {
  const byItem = new Map<string, ScheduleEntry>();

  return {
    due: (now: ISO, limit: number) =>
      Promise.resolve(
        [...byItem.values()]
          .filter((e) => Date.parse(e.due) <= Date.parse(now))
          .sort((a, b) => Date.parse(a.due) - Date.parse(b.due))
          .slice(0, limit),
      ),
    put: (entry) => {
      byItem.set(entry.itemId, entry);
      return Promise.resolve();
    },
  };
};
