import type { AiProvider } from "@palier/adapters/openai";
import type {
  ExamForm,
  ExamProfile,
  Item,
  ItemType,
  Lang,
  OralScenario,
  Passage,
  PassageId,
  SubSkill,
  TargetBand,
} from "@palier/domain";

import type { BatchReport, HarvestResult, OralSessionPlan, ReviewResult, SourceCandidate } from "../lib/types.js";
import { hashNum } from "../lib/scripted-key.js";
import { meterProvider } from "../providers/metered.js";
import { harvest } from "./harvest.js";
import { constructPassages } from "./passages.js";
import { draftItems } from "./draft.js";
import type { WritingPlanRow } from "./draft.js";
import { reviewItems } from "./review.js";
import { checkScenario, constructScenarios } from "./scenarios.js";
import type { ScenarioRejection, ScenarioStageResult } from "./scenarios.js";
import { FormShortfallError, assembleForms } from "./forms.js";
import { checkForms, validateBank } from "./validate.js";
import type { ValidationReport } from "./validate.js";
import { buildBank } from "./bank-build.js";
import type { BankBuild } from "./bank-build.js";
import { batchReport } from "./metrics.js";

/**
 * The five-stage pipeline end to end (content-factory.md §4), plus the bank build
 * and the batch report. Everything is deterministic given `now`/`batchId`/the
 * provider, so a committed sample batch is reproducible. The CLI wires reading
 * and writing; this function does no I/O.
 */

/**
 * Passages per source. Sized so every skill publishes about 1.3 times its largest
 * variant's item count, so a form's pilots are drawn from a real choice rather
 * than being whatever is left (progress.md D82). A pipeline knob, not an exam rule.
 */
export const DEFAULT_PER_SOURCE = 2;

const ITEM_TYPE_CYCLE: readonly ItemType[] = ["cloze", "error-id", "best-completion"];

/**
 * Every writing sub-skill against every profile topic at every drafted band, cycling
 * the item type, so a bank covers the taxonomy evenly and is large enough to fill
 * the biggest writing variant with headroom. Sized from the profile, not from a
 * count in code.
 */
export const defaultWritingPlan = (profile: ExamProfile, bands: readonly TargetBand[]): WritingPlanRow[] =>
  profile.subSkills.writing.flatMap((subSkill, s) =>
    profile.topics.flatMap((topic, t) =>
      bands.map((targetBand, b) => ({
        subSkill,
        type: ITEM_TYPE_CYCLE[(s + t + b) % ITEM_TYPE_CYCLE.length]!,
        targetBand,
        topic,
      })),
    ),
  );

/**
 * A previous bank version's content, carried into this one so its ids stay valid. Its
 * forms too (progress.md D114, closing D82's residual): an exam run is rescored from its
 * form, so a form a user sat must be in every later bank. And its oral scenarios, so a
 * session's scenario id stays valid. Banks v1 and v2 predate both, so each may be absent.
 */
export type CarriedBank = {
  readonly items: readonly Item[];
  readonly passages: readonly Passage[];
  readonly forms?: readonly ExamForm[];
  readonly scenarios?: readonly OralScenario[];
};

/**
 * Hand-authored contributions, from `content/authored/` (content-factory.md §5). They
 * enter at stage 4: review, then validation and the bank build, unchanged, and are not
 * exempt from any gate. An item that fails review is discarded whoever wrote it. An
 * authored scenario is held to the scenario stage's checks, against the session lengths
 * in the oral plan, and joins the bank after the carried ones (progress.md D203).
 */
export type AuthoredContent = {
  readonly items: readonly Item[];
  readonly passages: readonly Passage[];
  readonly scenarios?: readonly OralScenario[];
};

export type RunInput = {
  readonly sources: readonly SourceCandidate[];
  readonly profile: ExamProfile;
  readonly provider: AiProvider;
  readonly now: string;
  readonly batchId: string;
  readonly bankVersion: number;
  readonly promptVersion: string;
  readonly lang?: Lang;
  readonly bands?: readonly TargetBand[];
  readonly perSource?: number;
  readonly readingSubSkills?: readonly SubSkill[];
  readonly writingPlan?: readonly WritingPlanRow[];
  /**
   * The previous bank version's items and passages. A bank update is additive
   * (architecture.md §5.5): users' attempts and review schedules point at item ids,
   * so a published item carries into every later version. Carried items are
   * re-validated with the new ones, never trusted.
   */
  readonly carried?: CarriedBank;
  /** Seeds the form draw; defaults to a hash of the batch id. */
  readonly formSeed?: number;
  /** The oral scenarios to plan (progress.md D114). Absent, the batch plans none. */
  readonly oralPlan?: OralSessionPlan;
  /** Hand-authored items and passages, joining the drafted ones at stage 4. Absent, none. */
  readonly authored?: AuthoredContent;
  /**
   * Draft nothing (progress.md D203): no passage, item or scenario is generated, so the
   * batch is the carried bank and the authored content alone, and the provider is asked
   * only to review. The oral plan still gives authored scenarios their session lengths.
   */
  readonly authoredOnly?: boolean;
};

export type RunOutput = {
  readonly harvest: HarvestResult;
  readonly passages: readonly Passage[];
  /** Every candidate the drafter produced, kept so a run can be inspected. */
  readonly drafted: readonly Item[];
  readonly itemsDrafted: number;
  /** Provider calls that failed re-validation and were skipped (§4.3). */
  readonly providerFailures: number;
  readonly review: ReviewResult<Item>;
  readonly validation: ValidationReport;
  readonly forms: readonly ExamForm[];
  /** The scenario stage's own result: what it kept, what it discarded and why. */
  readonly scenarioStage: ScenarioStageResult;
  readonly scenarios: readonly OralScenario[];
  readonly bank: BankBuild;
  readonly report: BatchReport;
};

/**
 * The scenario stage's result with the authored scenarios held to its checks and joined
 * after the generated ones: discarded, never repaired, on a schema fault, phases that do
 * not fill the session's planned length, a phase with nowhere to escalate or de-escalate,
 * or a duplicate. A session type the oral plan gives no length cannot be checked, so it is
 * discarded too.
 */
export const withAuthoredScenarios = (
  stage: ScenarioStageResult,
  authored: readonly OralScenario[],
  plan: OralSessionPlan | undefined,
): ScenarioStageResult => {
  const scenarios = [...stage.scenarios];
  const rejected: ScenarioRejection[] = [...stage.rejected];
  for (const scenario of authored) {
    const minutes = plan?.sessions.find((s) => s.sessionType === scenario.sessionType)?.minutes;
    const reasons =
      minutes === undefined ? [`no session length is planned for ${scenario.sessionType}`] : checkScenario(scenario, minutes);
    if (scenarios.some((kept) => kept.id === scenario.id)) reasons.push(`duplicate of ${scenario.id}`);
    if (reasons.length > 0) rejected.push({ id: scenario.id, reasons });
    else scenarios.push(scenario);
  }
  return { ...stage, scenarios, rejected };
};

export const runPipeline = async (input: RunInput): Promise<RunOutput> => {
  const lang: Lang = input.lang ?? "fr";
  const bands: readonly TargetBand[] = input.bands ?? ["B", "C"];
  const readingSubSkills = input.readingSubSkills ?? input.profile.subSkills.reading;
  const generating = input.authoredOnly !== true;
  const writingPlan = generating ? (input.writingPlan ?? defaultWritingPlan(input.profile, bands)) : [];

  const metered = meterProvider(input.provider);

  const harvested = harvest(generating ? input.sources : [], input.now);

  const passageStage = await constructPassages(harvested.queue, metered.provider, {
    lang,
    bands,
    perSource: input.perSource ?? DEFAULT_PER_SOURCE,
  });
  const passages = passageStage.passages;

  const draftStage = await draftItems(passages, metered.provider, {
    now: input.now,
    lang,
    model: metered.provider.lastUsage()?.model ?? "scripted",
    promptVersion: input.promptVersion,
    readingSubSkills,
    writingPlan,
  });
  const drafted = draftStage.items;

  // Authored items enter here, at stage 4 (content-factory.md §5), reviewed against
  // this batch's passages and their own. They are reviewed apart from the drafts, so
  // stage-4 yield stays a measure of the drafter, and then joined to them: validation
  // and the bank build treat the two alike.
  const authoredItems = input.authored?.items ?? [];
  const authoredPassages = input.authored?.passages ?? [];
  const passageIndex = new Map<PassageId, Passage>(passages.map((p) => [p.id, p]));
  for (const passage of authoredPassages) if (!passageIndex.has(passage.id)) passageIndex.set(passage.id, passage);
  const draftedReview = await reviewItems(drafted, metered.provider, passageIndex);
  const authoredReview = await reviewItems(authoredItems, metered.provider, passageIndex);
  const review: ReviewResult<Item> = {
    passed: [...draftedReview.passed, ...authoredReview.passed],
    discarded: [...draftedReview.discarded, ...authoredReview.discarded],
  };
  // The item stages' model, taken before the scenario stage calls its own.
  const itemModel = metered.provider.lastUsage()?.model ?? "scripted";

  const generated: ScenarioStageResult =
    input.oralPlan === undefined || !generating
      ? { scenarios: [], rejected: [], failedCalls: 0 }
      : await constructScenarios(input.oralPlan, metered.provider, input.profile.topics);
  const scenarioStage = withAuthoredScenarios(generated, input.authored?.scenarios ?? [], input.oralPlan);

  // Carried items go first, so a new draft that duplicates one is the item dropped,
  // and the id users already hold survives.
  const carriedItems = input.carried?.items ?? [];
  const carriedIds = new Set(carriedItems.map((i) => i.id));
  const itemValidation = validateBank([...carriedItems, ...review.passed], [], input.profile);

  // A bank that cannot fill a variant is reported as a form issue, beside the
  // batch's other numbers, and the CLI refuses to write it (it never ships a short
  // form). Any other error is a defect and propagates.
  let forms: readonly ExamForm[] = [];
  let shortfall: string | null = null;
  try {
    forms = assembleForms({
      items: itemValidation.valid,
      profile: input.profile,
      lang,
      bankVersion: input.bankVersion,
      seed: input.formSeed ?? hashNum(input.batchId),
    });
  } catch (error) {
    if (!(error instanceof FormShortfallError)) throw error;
    shortfall = error.message;
  }
  // Carried forms sit beside this version's, and are checked the same way: a form a user
  // sat must still resolve every item it names (D114).
  const carriedForms = input.carried?.forms ?? [];
  const allForms = [...carriedForms, ...forms.filter((f) => !carriedForms.some((c) => c.id === f.id))];
  const validation: ValidationReport = {
    ...itemValidation,
    formIssues: [
      ...(shortfall === null ? [] : [`cannot assemble forms: ${shortfall}`]),
      ...checkForms(allForms, itemValidation.valid, input.profile),
    ],
  };

  // A carried passage wins over this batch's copy of it, as a carried item does: its record,
  // provenance included, was published and never changes (D114). The two share an id only
  // when the body is the same; what differs is when the source was retrieved.
  const bankPassages = new Map<PassageId, Passage>();
  for (const passage of [...(input.carried?.passages ?? []), ...passages, ...authoredPassages]) {
    if (!bankPassages.has(passage.id)) bankPassages.set(passage.id, passage);
  }

  // Carried scenarios go first, so a regenerated duplicate is the one dropped.
  const carriedScenarios = input.carried?.scenarios ?? [];
  const newScenarios = scenarioStage.scenarios.filter((s) => !carriedScenarios.some((c) => c.id === s.id));
  const scenarios: readonly OralScenario[] = [...carriedScenarios, ...newScenarios];
  const bank = buildBank({
    items: validation.valid,
    passages: [...bankPassages.values()],
    forms: allForms,
    scenarios: [...scenarios],
    version: input.bankVersion,
  });

  const totals = metered.totals();
  const authoredIds = new Set(authoredItems.map((i) => i.id));
  const report = batchReport({
    batchId: input.batchId,
    generatedAt: input.now,
    provider: itemModel,
    sources: harvested.queue.length,
    passages: passages.length,
    itemsDrafted: drafted.length,
    review: draftedReview,
    validation,
    carriedPublished: validation.valid.filter((i) => carriedIds.has(i.id)).length,
    authored: {
      submitted: authoredItems.length,
      passed: authoredReview.passed.length,
      published: validation.valid.filter((i) => authoredIds.has(i.id) && !carriedIds.has(i.id)).length,
    },
    scenarios: { published: newScenarios.length, carried: carriedScenarios.length },
    totalCostUsd: totals.costUsd,
  });

  return {
    harvest: harvested,
    passages,
    drafted,
    itemsDrafted: drafted.length,
    providerFailures: passageStage.failedCalls + draftStage.failedCalls,
    review,
    validation,
    forms: allForms,
    scenarioStage,
    scenarios,
    bank,
    report,
  };
};
