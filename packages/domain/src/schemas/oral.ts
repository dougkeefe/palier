import * as z from "zod";

import { ORAL_CRITERIA, ORAL_NOTE_SEVERITIES } from "../ai.js";
import { ORAL_INPUTS, ORAL_SPEAKERS } from "../oral-session.js";

/**
 * A stored turn's shape (progress.md D116). Read back from the device's own
 * database, so an adapter re-checks each row with it rather than trusting it
 * (D55's successor pattern). A DTO, not a content artefact, so it is absent from
 * `CONTENT_SCHEMAS`.
 */
export const oralTurnShape = z
  .strictObject({
    speaker: z.enum(ORAL_SPEAKERS),
    text: z.string(),
    phase: z.number().int().nonnegative(),
    startMs: z.number().int().nonnegative(),
    endMs: z.number().int().nonnegative(),
    input: z.enum(ORAL_INPUTS).optional(),
    pauseMs: z.number().int().nonnegative().optional(),
  })
  .refine((turn) => turn.startMs <= turn.endMs, { message: "a turn cannot end before it starts", path: ["endMs"] });

export const oralTurnSchema = oralTurnShape.readonly();

/**
 * A studio examiner's note (progress.md D168), read back from the device the way a turn is,
 * and the shape the realtime transport checks a `note_observation` call against. Evidence
 * must say something.
 */
export const oralNoteShape = z.strictObject({
  criterion: z.enum(ORAL_CRITERIA),
  evidence: z.string().trim().min(1),
  severity: z.enum(ORAL_NOTE_SEVERITIES),
  phase: z.number().int().nonnegative(),
});

export const oralNoteSchema = oralNoteShape.readonly();
