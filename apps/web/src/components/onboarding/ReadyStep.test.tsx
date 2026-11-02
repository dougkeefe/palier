import { describe, expect, it } from "vitest";

import { html } from "../../__tests__/render";
import { DEFAULT_CHOICES, readySummary } from "../../features/onboarding/onboarding";
import { ReadyStep } from "./ReadyStep";

const ready = (summary: Parameters<typeof ReadyStep>[0]["summary"], locale: "en" | "fr" = "en") =>
  html(<ReadyStep headingRef={null} summary={summary} />, locale);

describe("ReadyStep (D269)", () => {
  it("reads back one target, no results, the minutes and a key not yet added", () => {
    const markup = ready(readySummary(DEFAULT_CHOICES, false));
    expect(markup).toContain("You’re set");
    expect(markup).toContain("<dd>Level C</dd>");
    expect(markup).toContain("<dd>None declared</dd>");
    expect(markup).toContain("<dd>20 minutes</dd>");
    expect(markup).toContain("<dd>Not yet. Drills, review and mock exams need none.</dd>");
  });

  it("lists each skill's target when they differ, and each result declared", () => {
    const markup = ready(
      readySummary(
        { ...DEFAULT_CHOICES, targets: { reading: "C", writing: "B", oral: "C" }, current: { reading: "E", writing: null, oral: "B" } },
        true,
      ),
    );
    expect(markup).toContain("<dd>Reading: C · Written expression: B · Oral expression: C</dd>");
    expect(markup).toContain("<dd>Reading: E · Oral expression: B</dd>");
    expect(markup).toContain("<dd>Saved on this device</dd>");
  });

  it("names the test date only when one is booked, as the same day wherever it is read", () => {
    expect(ready(readySummary(DEFAULT_CHOICES, false))).not.toContain("Test booked");
    const markup = ready(readySummary({ ...DEFAULT_CHOICES, testDate: "2027-03-01" }, false));
    expect(markup).toContain("<dt>Test booked</dt><dd>March 1, 2027</dd>");
  });

  it("reads back in French in French", () => {
    const markup = ready(readySummary({ ...DEFAULT_CHOICES, testDate: "2027-03-01" }, false), "fr");
    expect(markup).toContain("Tout est prêt");
    expect(markup).toContain("<dd>Niveau C</dd>");
    expect(markup).toContain("1 mars 2027");
  });
});
