import { describe, expect, it } from "vitest";

import { formId, itemId, passageId, scenarioId } from "@palier/domain";

import { memoryItemRepository } from "./item-repository.js";

/**
 * The shared `itemRepositoryContract` always hands the repo a full bank, so the
 * constructor's "field omitted" defaults are exercised here instead: an empty
 * bank must read as empty rather than throw, and the version falls back to 1.
 */
describe("memoryItemRepository with an omitted bank", () => {
  it("reads as empty and defaults the version to 1", async () => {
    const repo = memoryItemRepository();

    expect(await repo.query({})).toEqual([]);
    expect(await repo.byIds([itemId("x")])).toEqual([]);
    expect(await repo.passage(passageId("x"))).toBeNull();
    expect(await repo.form(formId("x"))).toBeNull();
    expect(await repo.scenario(scenarioId("x"))).toBeNull();
    expect(await repo.scenarios()).toEqual([]);
    expect(await repo.bankVersion()).toBe(1);
  });
});
