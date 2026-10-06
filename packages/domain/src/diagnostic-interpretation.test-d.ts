import type * as z from "zod";

import type { DiagnosticInterpretation } from "./ai.js";
import type { diagnosticInterpretationSchema } from "./schemas/ai.js";

/**
 * The hand-written type is the contract, and what the schema parses must be one (ADR 25), the
 * same one-way check as the oral report's.
 */
type Parsed = z.infer<typeof diagnosticInterpretationSchema>;

const toInterpretation = (parsed: Parsed): DiagnosticInterpretation => parsed;
void toInterpretation;
