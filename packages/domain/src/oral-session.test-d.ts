import type * as z from "zod";

import type { OralTurn } from "./oral-session.js";
import type { oralTurnSchema } from "./schemas/oral.js";

/**
 * The hand-written `OralTurn` is the contract, and the schema is held to it both
 * ways, so neither can drift from the other (CLAUDE.md). A mismatch is a compile
 * error under `turbo check-types`.
 */
type Parsed = z.infer<typeof oralTurnSchema>;

const toType = (turn: Parsed): OralTurn => turn;
const toParsed = (turn: OralTurn): Parsed => turn;
void toType;
void toParsed;
