import * as z from "zod";

import {
  attemptShape,
  examFormShape,
  itemShape,
  libraryArticleShape,
  oralFillersShape,
  oralScenarioShape,
  passageShape,
  writingPromptShape,
} from "./content.js";
import { examProfileShape } from "../profile/schema.js";

/**
 * Every content artefact, keyed by the name its JSON Schema is published under
 * in `docs/schemas/`. The registry exists so the generator and the architecture
 * test iterate one list rather than two, and so adding an artefact without
 * publishing its schema is impossible to do quietly.
 *
 * These are the **plain** shapes, not the `.readonly()` exports: readonly is a
 * TypeScript concern, and `z.toJSONSchema` would otherwise stamp
 * `"readOnly": true` onto a document meant for external validators.
 */
export const CONTENT_SCHEMAS = {
  item: itemShape,
  passage: passageShape,
  "oral-scenario": oralScenarioShape,
  "exam-form": examFormShape,
  attempt: attemptShape,
  "exam-profile": examProfileShape,
  "writing-prompt": writingPromptShape,
  "oral-fillers": oralFillersShape,
  "library-article": libraryArticleShape,
} as const satisfies Record<string, z.ZodType>;

export type ContentSchemaName = keyof typeof CONTENT_SCHEMAS;

export const CONTENT_SCHEMA_NAMES = Object.keys(
  CONTENT_SCHEMAS,
) as readonly ContentSchemaName[];
