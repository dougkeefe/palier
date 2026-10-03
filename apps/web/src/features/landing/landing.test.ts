import { describe, expect, it } from "vitest";

import { SAMPLE_ANSWER, SAMPLE_OPTIONS, sampleFeedback, sampleOptionState, showsAppChrome } from "./landing";

describe("showsAppChrome", () => {
  it("leaves the landing page to its own header and footer", () => {
    expect(showsAppChrome("/")).toBe(false);
  });

  it("wraps every other page in the app's", () => {
    expect(showsAppChrome("/home")).toBe(true);
    expect(showsAppChrome("/about")).toBe(true);
    expect(showsAppChrome("/practice/reading")).toBe(true);
  });
});

describe("sampleFeedback", () => {
  it("is the hint until an answer is picked", () => {
    expect(sampleFeedback(null)).toBe("hint");
  });

  it("is correct for the right answer", () => {
    expect(sampleFeedback(SAMPLE_ANSWER)).toBe("correct");
  });

  it("is incorrect for any other answer", () => {
    for (const option of SAMPLE_OPTIONS.filter((o) => o !== SAMPLE_ANSWER)) {
      expect(sampleFeedback(option)).toBe("incorrect");
    }
  });
});

describe("sampleOptionState", () => {
  it("marks nothing before a pick", () => {
    expect(SAMPLE_OPTIONS.map((o) => sampleOptionState(o, null))).toEqual(["plain", "plain", "plain", "plain"]);
  });

  it("marks only the right answer when it is picked", () => {
    expect(SAMPLE_OPTIONS.map((o) => sampleOptionState(o, "a"))).toEqual(["correct", "plain", "plain", "plain"]);
  });

  it("marks the wrong pick and still shows the right answer", () => {
    expect(SAMPLE_OPTIONS.map((o) => sampleOptionState(o, "c"))).toEqual(["correct", "plain", "incorrect", "plain"]);
  });
});
