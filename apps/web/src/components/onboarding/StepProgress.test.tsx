import { describe, expect, it } from "vitest";

import { html } from "../../__tests__/render";
import { StepProgress } from "./StepProgress";

describe("StepProgress (D269)", () => {
  it("says the step in words, and draws a dot per step, hidden from assistive technology", () => {
    const markup = html(<StepProgress index={1} total={6} />);
    expect(markup).toContain("Step 2 of 6");
    expect(markup).toContain('<span class="app-onboarding__dots" aria-hidden="true">');
    expect([...markup.matchAll(/app-onboarding__dot app-onboarding__dot--(\w+)/g)].map((m) => m[1])).toEqual([
      "past",
      "current",
      "next",
      "next",
      "next",
      "next",
    ]);
  });

  it("says it in French in French", () => {
    expect(html(<StepProgress index={4} total={5} />, "fr")).toContain("Étape 5 sur 5");
  });
});
