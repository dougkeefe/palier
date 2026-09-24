import type { AiProvider } from "@palier/adapters/openai";
import { itemTypeDefinition } from "@palier/domain";
import type { Item, ItemType, Lang, Passage, SubSkill, TargetBand, Topic } from "@palier/domain";

import { assembleItem } from "../lib/assemble.js";

/**
 * Stage 3 — item drafting (content-factory.md §4.3). For each passage (reading)
 * and each standalone plan row (writing), it builds the drafting instruction
 * through the item type registry's `generatePrompt` — so adding an item type
 * extends the factory without editing it (principle 6) — asks the provider to
 * draft, and assembles a candidate `Item`. Candidates are `status: published`
 * only once they clear review and validation; drafting just produces them.
 */

/** One standalone writing item to draft. */
export type WritingPlanRow = {
  readonly subSkill: SubSkill;
  readonly type: ItemType;
  readonly targetBand: TargetBand;
  readonly topic: Topic;
};

export type DraftStageOptions = {
  readonly now: string;
  readonly lang: Lang;
  readonly model: string;
  readonly promptVersion: string;
  /** Reading sub-skills to draft a comprehension item for, per passage. */
  readonly readingSubSkills: readonly SubSkill[];
  readonly writingPlan: readonly WritingPlanRow[];
};

export type DraftStageResult = {
  readonly items: readonly Item[];
  /** Draft calls the provider could not satisfy (e.g. a malformed response that
   * failed re-validation). The batch skips them and carries on — discard, never
   * repair — rather than one bad call aborting the whole run (§4.3). */
  readonly failedCalls: number;
};

export const draftItems = async (
  passages: readonly Passage[],
  provider: AiProvider,
  options: DraftStageOptions,
): Promise<DraftStageResult> => {
  const items: Item[] = [];
  let failedCalls = 0;

  const draftOne = async (
    skill: "reading" | "writing",
    promptSpec: ReturnType<ReturnType<typeof itemTypeDefinition>["generatePrompt"]>,
    topic: Passage["topic"],
    passage?: Passage,
  ): Promise<void> => {
    try {
      const drafts = await provider.generateItems({
        promptSpec,
        ...(passage ? { passage: { title: passage.title, body: passage.body } } : {}),
        topic,
        lang: options.lang,
        count: 1,
      });
      for (const draft of drafts) {
        items.push(
          assembleItem(draft, {
            skill,
            lang: options.lang,
            now: options.now,
            model: provider.lastUsage()?.model ?? "unknown",
            promptVersion: options.promptVersion,
            ...(passage ? { passageId: passage.id } : {}),
          }),
        );
      }
    } catch {
      failedCalls++;
    }
  };

  for (const passage of passages) {
    for (const subSkill of options.readingSubSkills) {
      const promptSpec = itemTypeDefinition("comprehension").generatePrompt({
        targetBand: passage.targetBand,
        subSkill,
        topic: passage.topic,
        lang: options.lang,
      });
      await draftOne("reading", promptSpec, passage.topic, passage);
    }
  }

  for (const row of options.writingPlan) {
    const promptSpec = itemTypeDefinition(row.type).generatePrompt({
      targetBand: row.targetBand,
      subSkill: row.subSkill,
      topic: row.topic,
      lang: options.lang,
    });
    await draftOne("writing", promptSpec, row.topic);
  }

  return { items, failedCalls };
};
