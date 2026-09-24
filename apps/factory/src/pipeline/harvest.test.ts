import { describe, expect, it } from "vitest";

import type { SourceCandidate } from "../lib/types.js";
import { harvest } from "./harvest.js";

const source = (over: Partial<SourceCandidate>): SourceCandidate => ({
  url: "https://canada.ca/a",
  docType: "memo",
  topic: "human-resources",
  licence: "OGL-Canada-2.0",
  ...over,
});

describe("harvest", () => {
  it("keeps sources under a clearly permissive licence", () => {
    const result = harvest([source({ licence: "public-domain" }), source({ url: "https://canada.ca/b", licence: "canada.ca-non-commercial" })], "2026-09-21T00:00:00.000Z");
    expect(result.queue).toHaveLength(2);
    expect(result.queue[0]?.retrievedAt).toBe("2026-09-21T00:00:00.000Z");
  });

  it("rejects an unclear licence", () => {
    const result = harvest([source({ licence: "other" })], "2026-09-21T00:00:00.000Z");
    expect(result.queue).toHaveLength(0);
    expect(result.rejected[0]?.reason).toMatch(/does not clearly permit/);
  });

  it("rejects a duplicate url", () => {
    const result = harvest([source({}), source({})], "2026-09-21T00:00:00.000Z");
    expect(result.queue).toHaveLength(1);
    expect(result.rejected[0]?.reason).toMatch(/duplicate/);
  });
});
