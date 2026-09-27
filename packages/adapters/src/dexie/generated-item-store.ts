import type { GeneratedItemStore, GeneratedSet } from "@palier/app";
import type { Item, ItemId, ScoredSkill } from "@palier/domain";
import { itemSchema } from "@palier/domain";

import type { GeneratedItemRow, PalierDb } from "./db.js";

/**
 * The structure check at the edge (D55's approach). A row reads only if its set fields are
 * whole and its item parses as a whole `Item` of the row's own id and skill; anything else
 * reads as nothing, so a broken row can never reach a renderer or the scorer.
 */
const rowOf = (raw: GeneratedItemRow | undefined): GeneratedItemRow | null => {
  if (raw === undefined) return null;
  const { id, skill, createdAt, setId, position, item } = raw as Partial<Record<keyof GeneratedItemRow, unknown>>;
  if (typeof setId !== "string" || setId.length === 0) return null;
  if (typeof createdAt !== "string" || Number.isNaN(Date.parse(createdAt))) return null;
  if (typeof position !== "number" || !Number.isInteger(position)) return null;
  const parsed = itemSchema.safeParse(item);
  if (!parsed.success) return null;
  // The schema checked the shape; the brand on `id` is ours to assert, as the openai adapter does for drafts.
  const whole = parsed.data as unknown as Item;
  if (whole.id !== id || whole.skill !== skill) return null;
  return { id: whole.id, skill: whole.skill, createdAt, setId, position, item: whole };
};

const rowsOf = (set: GeneratedSet): GeneratedItemRow[] =>
  set.items.map((item, position) => ({
    id: item.id,
    skill: set.skill,
    createdAt: set.createdAt,
    setId: set.id,
    position,
    item,
  }));

/**
 * Runtime-generated items over v1's `generated` table (progress.md D110), one row per item.
 * Device-local: no sync collector reads this table, and no export carries it. `latestSet`
 * reads the skill's rows through v1's `skill` index and keeps the newest set's; every
 * `createdAt` is a UTC `toISOString()` from the clock, so string order is time order.
 */
export const dexieGeneratedItemStore = (db: PalierDb): GeneratedItemStore => ({
  putSet: async (set) => {
    if (set.items.length === 0) return;
    // A set put again replaces itself: its old rows go first, so no stale item survives by position.
    await db.transaction("rw", db.generated, async () => {
      await db.generated.filter((row) => row.setId === set.id).delete();
      await db.generated.bulkPut(rowsOf(set));
    });
  },
  latestSet: async (skill: ScoredSkill) => {
    const rows = (await db.generated.where("skill").equals(skill).toArray())
      .map(rowOf)
      .filter((row): row is GeneratedItemRow => row !== null);
    const newest = rows.reduce<GeneratedItemRow | null>(
      (best, row) =>
        best === null || row.createdAt > best.createdAt || (row.createdAt === best.createdAt && row.setId > best.setId)
          ? row
          : best,
      null,
    );
    if (newest === null) return null;
    const items = rows
      .filter((row) => row.setId === newest.setId)
      .sort((a, b) => a.position - b.position)
      .map((row) => row.item);
    return { id: newest.setId, skill, createdAt: newest.createdAt, items };
  },
  item: async (id: ItemId) => rowOf(await db.generated.get(id))?.item ?? null,
  clear: () => db.generated.clear(),
});
