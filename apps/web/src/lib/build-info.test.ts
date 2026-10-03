import { describe, expect, it } from "vitest";

import { BUILD_VERSION, buildVersionFrom, siteUrlFrom } from "./build-info";

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

describe("siteUrlFrom (D199)", () => {
  it("is PALIER_SITE_URL when set, without a trailing slash", () => {
    expect(siteUrlFrom({ PALIER_SITE_URL: "https://palier.dougkeefe.com/", VERCEL_PROJECT_PRODUCTION_URL: "x.vercel.app" })).toBe(
      "https://palier.dougkeefe.com",
    );
  });

  it("is Vercel's production domain over https otherwise", () => {
    expect(siteUrlFrom({ PALIER_SITE_URL: "", VERCEL_PROJECT_PRODUCTION_URL: "palier-virid.vercel.app" })).toBe(
      "https://palier-virid.vercel.app",
    );
  });

  it("is the local dev server with neither", () => {
    expect(siteUrlFrom({})).toBe("http://localhost:3000");
    expect(siteUrlFrom({ VERCEL_PROJECT_PRODUCTION_URL: "" })).toBe("http://localhost:3000");
  });
});
