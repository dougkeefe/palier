import { describe, expect, it } from "vitest";

import { BUILD_VERSION, buildVersionFrom } from "./build-info";

describe("buildVersionFrom", () => {
  it("names a Vercel build by its commit's first seven characters", () => {
    expect(buildVersionFrom({ VERCEL_GIT_COMMIT_SHA: "d9fbed6c0ffee1234567890abcdef" })).toBe("d9fbed6");
  });

  it("names any other build local", () => {
    expect(buildVersionFrom({})).toBe("local");
    expect(buildVersionFrom({ VERCEL_GIT_COMMIT_SHA: "" })).toBe("local");
  });
});

describe("BUILD_VERSION", () => {
  it("is dev where next.config.ts never inlined one", () => {
    expect(BUILD_VERSION).toBe("dev");
  });
});
