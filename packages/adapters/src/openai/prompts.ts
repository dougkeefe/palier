import type {
  GenerateItemsRequest,
  GeneratePassageRequest,
  ReviewRequest,
} from "@palier/domain";

/**
 * The prompts the adapter sends, versioned (architecture.md §8.2). The factory
 * records the model in item provenance; `PROMPT_VERSION` is bumped whenever a
 * prompt here changes materially, so output can be traced to a revision.
 *
 * Every prompt asks for JSON and names the envelope field, because the provider
 * uses `response_format: { type: "json_object" }` and re-validates the body — the
 * schema description here is guidance, the Zod re-validation is the contract.
 */
export const PROMPT_VERSION = "3";

const REGISTER = [
  "You write in Canadian federal public-service French: the register of a real",
  "departmental workplace — memos, bulletins, service pages — never France-specific,",
  "never textbook, never translated-sounding. Invent nothing that names a real",
  "official, event or departmental figure. Quote no source; every sentence is new.",
].join(" ");

const passage = (req: GeneratePassageRequest): { system: string; user: string } => ({
  system: REGISTER,
  user: [
    `Write ${String(req.count)} original ${req.lang === "fr" ? "French" : "English"} passage(s)`,
    `of document type "${req.docType}" on the topic "${req.topic}", pitched at CEFR-like band ${req.targetBand}.`,
    'Reply with JSON: { "passages": [ { "lang", "docType", "title", "body", "targetBand", "topic" } ] }.',
  ].join(" "),
});

const items = (req: GenerateItemsRequest): { system: string; user: string } => {
  const passageBlock = req.passage
    ? `\nThe item is about this passage titled "${req.passage.title}":\n${req.passage.body}\n`
    : "";
  const example = JSON.stringify({
    items: [
      {
        type: req.promptSpec.itemType,
        stem: { en: "English stem …", fr: "Énoncé français …" },
        blankIndex: req.promptSpec.itemType === "cloze" ? 0 : undefined,
        options: [
          { id: "a", text: "…", rationale: { en: "why a", fr: "pourquoi a" } },
          { id: "b", text: "…", rationale: { en: "why b", fr: "pourquoi b" } },
          { id: "c", text: "…", rationale: { en: "why c", fr: "pourquoi c" } },
          { id: "d", text: "…", rationale: { en: "why d", fr: "pourquoi d" } },
        ],
        key: "a",
        explanation: { en: "the rule", fr: "la règle" },
        subSkill: req.promptSpec.subSkill,
        targetBand: req.promptSpec.targetBand,
        topic: req.topic,
      },
    ],
  });
  return {
    system: REGISTER,
    user: [
      `${req.promptSpec.instructions}`,
      `Produce ${String(req.count)} item(s) of type "${req.promptSpec.itemType}",`,
      `sub-skill "${req.promptSpec.subSkill}", band ${req.promptSpec.targetBand}, topic "${req.topic}".`,
      "Each item has EXACTLY four options with ids a, b, c, d — one defensibly correct key and three plausible distractors.",
      "EVERY option object MUST include a `rationale` with BOTH `en` and `fr` strings; an option without a rationale is invalid.",
      "`stem` and `explanation` are also objects with both `en` and `fr`. Options' `text` is a single string in the item's language.",
      passageBlock,
      `Reply with JSON in exactly this shape (no extra or missing fields), filling every value: ${example}`,
    ].join(" "),
  };
};

const review = (req: ReviewRequest): { system: string; user: string } => {
  const passageBlock = req.passage
    ? `\nPassage titled "${req.passage.title}":\n${req.passage.body}\n`
    : "";
  const optionLines = req.options.map((o) => `${o.id}) ${o.text}`).join("\n");
  return {
    system: [
      "You are an adversarial reviewer of a second-language assessment item. You are NOT told the",
      "intended answer. Judge the item on its own terms.",
    ].join(" "),
    user: [
      `Item type "${req.itemType}", sub-skill "${req.subSkill}", intended band ${req.targetBand}, language ${req.lang}.`,
      passageBlock,
      `Stem (fr): ${req.stem.fr}`,
      `Options:\n${optionLines}`,
      "Do four things: (1) answer the item and give your confidence 0..1;",
      "(2) argue the strongest case for EACH option;",
      "(3) set registerFlag.flagged = true ONLY if the French is genuinely unfit: it reads as translated",
      "from English, uses France-specific rather than Canadian usage, or reads as an artificial language-",
      "textbook exercise. Formal, administrative, institutional Canadian public-service register is CORRECT",
      "and EXPECTED — do NOT flag it merely for being formal, generic, or 'textbook-like' in tone. When in",
      "doubt, do not flag. (4) estimate the band the item actually tests.",
      "List any options other than your answer that are also defensibly correct.",
      'Reply with JSON: { "chosenKey", "confidence", "defensibleDistractors": [], "optionCases": {"a","b","c","d"}, "registerFlag": {"flagged", "note"?}, "estimatedBand" }.',
    ].join(" "),
  };
};

export const buildPrompt = { passage, items, review };
