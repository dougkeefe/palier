import type * as z from "zod";

import type { Translation, TranslationDraft } from "./ai.js";
import type { translationDraftSchema, translationSchema } from "./schemas/ai.js";

/**
 * The hand-written types are the contract, and what each schema parses must be one (progress.md
 * D248), the same one-way check as the diagnostic interpretation's.
 */
type ParsedDraft = z.infer<typeof translationDraftSchema>;
type Parsed = z.infer<typeof translationSchema>;

const toDraft = (parsed: ParsedDraft): TranslationDraft => parsed;
const toTranslation = (parsed: Parsed): Translation => parsed;
void toDraft;
void toTranslation;
