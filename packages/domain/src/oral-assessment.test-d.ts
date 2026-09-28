import type * as z from "zod";

import type { OralAssessment, OralAssessmentDraft } from "./ai.js";
import type { oralAssessmentDraftSchema, oralAssessmentSchema } from "./schemas/ai.js";

/**
 * The hand-written report types are the contract, and what the schemas parse must
 * be one (progress.md D122). One way only: `.readonly()` is shallow, so a hand-written
 * `readonly` array cannot flow back into the parsed type, as `WritingAssessment`'s
 * cannot.
 */
type Placed = z.infer<typeof oralAssessmentSchema>;
type Draft = z.infer<typeof oralAssessmentDraftSchema>;

const toPlaced = (report: Placed): OralAssessment => report;
const toDraft = (draft: Draft): OralAssessmentDraft => draft;
void toPlaced;
void toDraft;
