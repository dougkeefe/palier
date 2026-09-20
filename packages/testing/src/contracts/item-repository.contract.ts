import { describe, expect, it } from "vitest";

import type { ItemRepository } from "@palier/app";
import type { ExamForm, Item, OralScenario, Passage } from "@palier/domain";
import { formId, itemId, passageId, scenarioId } from "@palier/domain";

import { anExamForm, anItem, anOralScenario, aPassage } from "../fixtures/builders.js";

/**
 * The bank an `ItemRepository` serves is static and versioned, so — unlike the
 * write-backed stores — the contract cannot populate it through the port. It
 * hands `make` a known bank instead, so the same suite holds the in-memory repo
 * and, later, the HTTP bank adapter serving these very fixtures through MSW.
 */
export type ItemRepositoryBank = {
  readonly items: readonly Item[];
  readonly passages: readonly Passage[];
  readonly forms: readonly ExamForm[];
  readonly scenarios: readonly OralScenario[];
  readonly bankVersion: number;
};

const READING_MAIN = anItem({
  id: itemId("i-read-main"),
  skill: "reading",
  subSkill: "main-idea",
  targetBand: "B",
});
const READING_INFER = anItem({
  id: itemId("i-read-infer"),
  skill: "reading",
  subSkill: "inference",
  targetBand: "C",
});
const WRITING_AGREE = anItem({
  id: itemId("i-write-agree"),
  skill: "writing",
  subSkill: "agreement",
  targetBand: "B",
});
const PASSAGE = aPassage({ id: passageId("p-1") });
const FORM = anExamForm({ id: formId("f-1") });
const SCENARIO = anOralScenario({ id: scenarioId("s-1") });

export const CONTRACT_BANK: ItemRepositoryBank = {
  items: [READING_MAIN, READING_INFER, WRITING_AGREE],
  passages: [PASSAGE],
  forms: [FORM],
  scenarios: [SCENARIO],
  bankVersion: 7,
};

export const itemRepositoryContract = (
  name: string,
  make: (bank: ItemRepositoryBank) => Promise<ItemRepository>,
): void => {
  describe(`ItemRepository contract: ${name}`, () => {
    it("returns items by id in the requested order", async () => {
      const repo = await make(CONTRACT_BANK);

      expect((await repo.byIds([READING_INFER.id, READING_MAIN.id])).map((i) => i.id))
        .toEqual([READING_INFER.id, READING_MAIN.id]);
    });

    it("drops an id it does not hold rather than returning a gap", async () => {
      const repo = await make(CONTRACT_BANK);

      expect((await repo.byIds([READING_MAIN.id, itemId("absent")])).map((i) => i.id))
        .toEqual([READING_MAIN.id]);
    });

    it("returns the whole bank for empty criteria", async () => {
      const repo = await make(CONTRACT_BANK);

      expect(await repo.query({})).toHaveLength(3);
    });

    it("filters by skill", async () => {
      const repo = await make(CONTRACT_BANK);

      expect((await repo.query({ skill: "writing" })).map((i) => i.id)).toEqual([
        WRITING_AGREE.id,
      ]);
    });

    it("filters by sub-skill", async () => {
      const repo = await make(CONTRACT_BANK);

      expect((await repo.query({ subSkill: "inference" })).map((i) => i.id)).toEqual([
        READING_INFER.id,
      ]);
    });

    it("filters by target band", async () => {
      const repo = await make(CONTRACT_BANK);

      expect((await repo.query({ band: "C" })).map((i) => i.id)).toEqual([
        READING_INFER.id,
      ]);
    });

    it("combines criteria as a conjunction", async () => {
      const repo = await make(CONTRACT_BANK);

      expect((await repo.query({ skill: "reading", band: "B" })).map((i) => i.id)).toEqual([
        READING_MAIN.id,
      ]);
    });

    it("excludes the ids it is given", async () => {
      const repo = await make(CONTRACT_BANK);

      expect(
        (await repo.query({ skill: "reading", exclude: [READING_MAIN.id] })).map((i) => i.id),
      ).toEqual([READING_INFER.id]);
    });

    it("honours the limit", async () => {
      const repo = await make(CONTRACT_BANK);

      expect(await repo.query({ limit: 1 })).toHaveLength(1);
    });

    it("returns a passage by id, and null when it is absent", async () => {
      const repo = await make(CONTRACT_BANK);

      expect((await repo.passage(PASSAGE.id))?.id).toBe(PASSAGE.id);
      expect(await repo.passage(passageId("absent"))).toBeNull();
    });

    it("returns a form by id, and null when it is absent", async () => {
      const repo = await make(CONTRACT_BANK);

      expect((await repo.form(FORM.id))?.id).toBe(FORM.id);
      expect(await repo.form(formId("absent"))).toBeNull();
    });

    it("returns a scenario by id, and null when it is absent", async () => {
      const repo = await make(CONTRACT_BANK);

      expect((await repo.scenario(SCENARIO.id))?.id).toBe(SCENARIO.id);
      expect(await repo.scenario(scenarioId("absent"))).toBeNull();
    });

    it("reports the bank version", async () => {
      const repo = await make(CONTRACT_BANK);

      expect(await repo.bankVersion()).toBe(7);
    });
  });
};
