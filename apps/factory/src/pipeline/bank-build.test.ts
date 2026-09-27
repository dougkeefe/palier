import { describe, expect, it } from "vitest";

import type { ExamForm, Item, OralScenario, Passage } from "@palier/domain";

import { buildBank } from "./bank-build.js";

const item = (id: string, skill: "reading" | "writing"): Item => ({ id, lang: "fr", skill }) as unknown as Item;

describe("buildBank", () => {
  it("shards items by lang and skill, with a manifest", () => {
    const bank = buildBank({
      items: [item("b", "reading"), item("a", "reading"), item("c", "writing")],
      passages: [{ id: "p1" } as unknown as Passage],
      forms: [{ id: "f1", itemIds: ["a"] } as unknown as ExamForm],
      scenarios: [{ id: "s1" } as unknown as OralScenario],
      version: 1,
    });
    const paths = bank.files.map((f) => f.path);
    expect(paths).toContain("bank/v1/manifest.json");
    expect(paths.some((p) => p.startsWith("bank/v1/fr/reading/"))).toBe(true);
    expect(paths.some((p) => p.startsWith("bank/v1/fr/writing/"))).toBe(true);
    expect(paths).toContain("bank/v1/forms/f1.json");
    expect(paths).toContain("bank/v1/oral/scenarios.json");
    expect(bank.manifest.counts).toEqual({ items: 3, passages: 1, forms: 1, scenarios: 1 });
  });

  it("lists the scenarios file in the manifest, hashed, so a client finds it there (D114)", () => {
    const bank = buildBank({ items: [], passages: [], forms: [], scenarios: [{ id: "s1" } as unknown as OralScenario], version: 3 });
    expect(bank.manifest.scenarios).toEqual({ path: "bank/v3/oral/scenarios.json", hash: expect.stringMatching(/^[0-9a-f]{16}$/) });
  });

  it("is byte-identical on a rebuild", () => {
    const input = { items: [item("a", "reading")], passages: [], forms: [], scenarios: [], version: 2 };
    expect(buildBank(input).files).toEqual(buildBank(input).files);
  });

  it("omits the oral shard when there are no scenarios", () => {
    const bank = buildBank({ items: [item("a", "writing")], passages: [], forms: [], scenarios: [], version: 1 });
    expect(bank.files.some((f) => f.path.includes("oral"))).toBe(false);
    expect(bank.manifest.scenarios).toBeNull();
  });
});
