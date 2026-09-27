import type {
  ExamForm,
  FormId,
  Item,
  ItemId,
  OralScenario,
  Passage,
  PassageId,
  ScenarioId,
  ScoredSkill,
  SubSkill,
  TargetBand,
} from "@palier/domain";

/**
 * The query the selector runs against the bank (implementation-plan.md 3.3).
 * Every field is optional and they combine as a conjunction: an omitted field
 * does not constrain the result. `band` is a `TargetBand` because that is the
 * only difficulty signal an item carries (product-requirements.md 5.4).
 */
export type ItemCriteria = {
  readonly skill?: ScoredSkill;
  readonly subSkill?: SubSkill;
  readonly band?: TargetBand;
  readonly exclude?: readonly ItemId[];
  readonly limit?: number;
};

/**
 * Read-only access to the content bank (implementation-plan.md 3.3). The bank is
 * static and versioned, so there is no write side here; authoring happens in the
 * factory, delivery is a fetch, and `bankVersion` is what a cache and the sync
 * layer key on.
 */
export type ItemRepository = {
  byIds: (ids: readonly ItemId[]) => Promise<readonly Item[]>;
  query: (criteria: ItemCriteria) => Promise<readonly Item[]>;
  passage: (id: PassageId) => Promise<Passage | null>;
  form: (id: FormId) => Promise<ExamForm | null>;
  /**
   * Every exam form the bank ships, in no promised order. The exam picker pairs
   * the profile's variants with them (progress.md D85), so the app never derives
   * a form id from the factory's naming convention.
   */
  forms: () => Promise<readonly ExamForm[]>;
  scenario: (id: ScenarioId) => Promise<OralScenario | null>;
  /**
   * Every oral scenario the bank ships, in no promised order, for the session
   * picker (progress.md D114), as `forms` serves the exam picker.
   */
  scenarios: () => Promise<readonly OralScenario[]>;
  bankVersion: () => Promise<number>;
};
