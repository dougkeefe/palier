import type * as z from "zod";

import type { studyResourceSchema } from "./schemas/content.js";
import type { StudyResource } from "./study-resource.js";

/**
 * The hand-written type is the contract, and what the schema parses must be one (progress.md
 * D248), the same one-way check as the pointer's.
 */
type Parsed = z.infer<typeof studyResourceSchema>;

const toResource = (parsed: Parsed): StudyResource => parsed;
void toResource;
