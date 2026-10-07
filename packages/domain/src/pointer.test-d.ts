import type * as z from "zod";

import type { Pointer } from "./pointer.js";
import type { pointerSchema } from "./schemas/content.js";

/**
 * The hand-written type is the contract, and what the schema parses must be one (progress.md
 * D216), the same one-way check as the diagnostic interpretation's.
 */
type Parsed = z.infer<typeof pointerSchema>;

const toPointer = (parsed: Parsed): Pointer => parsed;
void toPointer;
