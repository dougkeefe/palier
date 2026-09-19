import { itemId, passageId } from "./ids.js";
import type { ItemId, PassageId } from "./ids.js";

/**
 * Type-level tests. They fail by producing a compile error, so `tsc` is the
 * runner — `turbo check-types` covers this file through tsconfig.vitest.json.
 *
 * `@ts-expect-error` rather than `expectTypeOf`, deliberately: if a brand ever
 * stops working, TypeScript reports "Unused '@ts-expect-error' directive" and
 * the build fails. An equality assertion would just quietly start passing.
 */
declare const takesItemId: (id: ItemId) => void;
declare const takesPassageId: (id: PassageId) => void;

const item: ItemId = itemId("01HZZ");
const passage: PassageId = passageId("01HZY");

// The happy path compiles.
takesItemId(item);
takesPassageId(passage);

// @ts-expect-error a PassageId is not an ItemId
takesItemId(passage);

// @ts-expect-error an ItemId is not a PassageId
takesPassageId(item);

// @ts-expect-error a bare string is not a branded id
takesItemId("01HZZ");

// A branded id is still usable as the string it is.
const asString: string = item;
void asString;
