import { describe, expect, it } from "vitest";

import { citedRuns } from "./cited";

describe("citedRuns", () => {
  it("splits a paragraph into its plain and its cited runs, in order", () => {
    expect(citedRuns("Write _sur le site Web_, not _dans_.")).toEqual([
      { text: "Write ", cited: false },
      { text: "sur le site Web", cited: true },
      { text: ", not ", cited: false },
      { text: "dans", cited: true },
      { text: ".", cited: false },
    ]);
  });

  it("keeps a paragraph with no marker whole, and drops the empty runs at either end", () => {
    expect(citedRuns("No French here.")).toEqual([{ text: "No French here.", cited: false }]);
    expect(citedRuns("_Dont_ replaces de.")).toEqual([
      { text: "Dont", cited: true },
      { text: " replaces de.", cited: false },
    ]);
  });
});
