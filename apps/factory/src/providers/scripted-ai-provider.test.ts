import { describe, expect, it } from "vitest";

import type { ItemType, TargetBand } from "@palier/domain";

import { estimateBand, normaliseStem, tokenJaccard } from "../lib/text.js";
import { NEAR_DUPLICATE_THRESHOLD } from "../pipeline/validate.js";
import { scriptedAiProvider, stemForBand } from "./scripted-ai-provider.js";

const draftStem = async (band: TargetBand, type: ItemType = "cloze"): Promise<string> => {
  const [draft] = await scriptedAiProvider().generateItems({
    promptSpec: { itemType: type, targetBand: band, subSkill: "agreement", instructions: "" },
    topic: "procurement",
    lang: "fr",
    count: 1,
  });
  return draft!.stem.fr;
};

describe("stemForBand", () => {
  it("reads at the band it was built for", () => {
    for (const band of ["A", "B", "C"] as const) expect(estimateBand(stemForBand(band, "s"))).toBe(band);
  });

  it("is a pure function of its seed", () => {
    expect(stemForBand("C", "same")).toBe(stemForBand("C", "same"));
  });

  it("keeps stems from seeds differing only in their last character apart", () => {
    // The old polynomial hash put these on consecutive word indices, so a large
    // batch collapsed into near-duplicates (D82).
    const stems = Array.from({ length: 200 }, (_, i) => normaliseStem(stemForBand("B", `seed:${String(i)}`)));
    let nearDuplicates = 0;
    for (let a = 0; a < stems.length; a++) {
      for (let b = a + 1; b < stems.length; b++) {
        if (tokenJaccard(stems[a]!, stems[b]!) >= NEAR_DUPLICATE_THRESHOLD) nearDuplicates++;
      }
    }
    expect(nearDuplicates).toBe(0);
  });
});

describe("scriptedAiProvider.generateItems", () => {
  it("draws different stems for requests that differ only by band", async () => {
    expect(await draftStem("B")).not.toBe(await draftStem("C"));
  });

  it("draws different stems for requests that differ only by item type", async () => {
    expect(await draftStem("B", "cloze")).not.toBe(await draftStem("B", "error-id"));
  });
});
