import * as z from "zod";

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
