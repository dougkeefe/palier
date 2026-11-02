import { describe, expect, it } from "vitest";

import { chromeFor, needsOnboarding } from "./chrome";

describe("chromeFor (D201, D269)", () => {
  it("leaves the landing page to its own header and footer", () => {
    expect(chromeFor("/")).toBe("own");
  });

  it("frames onboarding in the focus chrome, with no navigation, sync status or settings", () => {
    expect(chromeFor("/start")).toBe("focus");
  });

  it("wraps every other page in the app's", () => {
    expect(chromeFor("/home")).toBe("app");
    expect(chromeFor("/about")).toBe("app");
    expect(chromeFor("/practice/reading")).toBe("app");
    expect(chromeFor("/settings/sync")).toBe("app");
  });
});

describe("needsOnboarding (D270)", () => {
  it("sends a visitor with no profile from every app page to onboarding", () => {
    for (const page of [
      "/home",
      "/review",
      "/progress",
      "/practice/reading",
      "/practice/writing",
      "/practice/oral",
      "/practice/oral/report",
      "/practice/writing/workshop",
      "/practice/writing/generate",
      "/exam",
      "/exam/run",
      "/exam/results",
      "/diagnostic",
      "/settings",
      "/settings/study",
      "/settings/key",
      "/settings/key/guide",
      "/settings/data",
      "/settings/sync",
    ]) {
      expect(needsOnboarding(page), page).toBe(true);
    }
  });

  it("leaves the landing page, onboarding, about, privacy and the translator open", () => {
    for (const page of ["/", "/start", "/about", "/privacy", "/practice/writing/translate"]) {
      expect(needsOnboarding(page), page).toBe(false);
    }
  });

  it("leaves the library and every article open", () => {
    expect(needsOnboarding("/library")).toBe(false);
    expect(needsOnboarding("/library/agreement")).toBe(false);
  });

  it("leaves a path the app does not know to the 404", () => {
    expect(needsOnboarding("/no-such-page")).toBe(false);
    expect(needsOnboarding("/hermetic/route")).toBe(false);
  });
});
