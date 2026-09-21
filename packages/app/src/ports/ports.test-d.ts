import { itemId, passageId } from "@palier/domain";
import type { ItemId } from "@palier/domain";

import type { AttemptStore, ItemRepository, ScheduleStore } from "./index.js";

/**
 * Type-level tests. They fail by producing a compile error, so `tsc` is the
 * runner (`turbo check-types` covers this file through tsconfig.vitest.json).
 * `@ts-expect-error` rather than an equality assertion: if a brand stops working
 * TypeScript reports an unused directive and the build fails, where an equality
 * check would quietly start passing (see packages/domain/src/ids.test-d.ts).
 */
declare const items: ItemRepository;
declare const attempts: AttemptStore;
declare const schedule: ScheduleStore;

const oneItemId: ItemId = itemId("01HZZ");
const onePassageId = passageId("01HZY");

// The happy path compiles: a port method takes the id it is typed for.
void items.byIds([oneItemId]);
void attempts.forItem(oneItemId);
void schedule.get(oneItemId);

// @ts-expect-error a PassageId is not an ItemId, even at a port boundary
void items.byIds([onePassageId]);

// @ts-expect-error a bare string is not a branded id
void attempts.forItem("01HZZ");

// @ts-expect-error the schedule is keyed by item, so only an ItemId reaches it
void schedule.get(onePassageId);

// `passage` still takes its own id.
void items.passage(onePassageId);

// @ts-expect-error an ItemId is not a PassageId
void items.passage(oneItemId);
