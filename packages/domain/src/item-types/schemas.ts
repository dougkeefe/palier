import type * as z from "zod";

import { itemSchema } from "../schemas/content.js";
import type { ItemType } from "../skills.js";

/**
 * A per-type schema is the shared `itemSchema` narrowed to one `type`, so the
 * registry's `schema` member accepts a well-formed item of that type and rejects
 * any other. The shared schema already enforces the cross-field structure
 * (unique option ids, key present, comprehension has a passage, blankIndex only
 * on cloze); this only adds the type discriminant, so there is one source of
 * truth for item structure rather than four diverging copies (ADR 17).
 */
const ofType = (type: ItemType): z.ZodType =>
  itemSchema.refine((item) => item.type === type, {
    error: `Expected an item of type "${type}".`,
    path: ["type"],
  });

export const clozeSchema = ofType("cloze");
export const comprehensionSchema = ofType("comprehension");
export const errorIdSchema = ofType("error-id");
export const bestCompletionSchema = ofType("best-completion");
