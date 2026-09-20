import type { ItemType } from "../skills.js";
import type { PromptContext, PromptSpec } from "./definition.js";

/**
 * Per-type drafting instructions for the content factory (Phase 1). Kept
 * deliberately small — the factory owns the full `PromptSpec` shape when it
 * lands (progress.md deviation D29). Each type carries its own instruction
 * string, which is the per-type behaviour the registry exists to hold.
 */
const spec = (itemType: ItemType, ctx: PromptContext, instructions: string): PromptSpec => ({
  itemType,
  targetBand: ctx.targetBand,
  subSkill: ctx.subSkill,
  instructions,
});

export const generateClozePrompt = (ctx: PromptContext): PromptSpec =>
  spec(
    "cloze",
    ctx,
    "Draft a cloze item: a sentence with exactly one blank and four options, one clearly correct and three plausibly tempting.",
  );

export const generateComprehensionPrompt = (ctx: PromptContext): PromptSpec =>
  spec(
    "comprehension",
    ctx,
    "Draft a comprehension question about the supplied passage, with four options, one supported by the text and three defensible only on a misreading.",
  );

export const generateErrorIdPrompt = (ctx: PromptContext): PromptSpec =>
  spec(
    "error-id",
    ctx,
    "Draft an error-identification item: a sentence containing one grammatical error, with four options naming candidate error sites, one correct.",
  );

export const generateBestCompletionPrompt = (ctx: PromptContext): PromptSpec =>
  spec(
    "best-completion",
    ctx,
    "Draft a best-completion item: an incomplete sentence or short paragraph with four continuations, one idiomatic and correct, three grammatical but weaker.",
  );
