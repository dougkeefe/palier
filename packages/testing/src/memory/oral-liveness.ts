import type { OralLiveness } from "@palier/app";
import type { SessionId } from "@palier/domain";

/**
 * Which sessions are running, in memory (progress.md D144): a held session is live until its
 * release is called. `abandon` drops a hold without its release, as a tab closed hard does.
 */
export type MemoryOralLiveness = OralLiveness & { readonly abandon: (id: SessionId) => void };

export const memoryOralLiveness = (): MemoryOralLiveness => {
  const holds = new Map<SessionId, number>();
  const drop = (id: SessionId) => {
    const count = (holds.get(id) ?? 0) - 1;
    if (count > 0) holds.set(id, count);
    else holds.delete(id);
  };
  return {
    hold: (id) => {
      holds.set(id, (holds.get(id) ?? 0) + 1);
      let released = false;
      return () => {
        if (released) return;
        released = true;
        drop(id);
      };
    },
    live: () => Promise.resolve(new Set(holds.keys())),
    abandon: (id) => {
      holds.delete(id);
    },
  };
};
