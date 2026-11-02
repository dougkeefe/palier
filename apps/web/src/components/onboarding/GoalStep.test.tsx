import { describe, expect, it } from "vitest";

import { html } from "../../__tests__/render";
import { DEFAULT_CHOICES } from "../../features/onboarding/onboarding";
import { GoalStep } from "./GoalStep";

// Rendered in node: choosing is the wizard's jsdom test's (`OnboardingWizard.test.tsx` saves 30 minutes chosen here).
const radios = (markup: string) =>
  [...markup.matchAll(/<input[^>]*name="goal"[^>]*>/g)].map(([tag]) => ({
    value: /value="([^"]*)"/.exec(tag)?.[1],
    checked: tag.includes('checked=""'),
  }));

describe("GoalStep (D269)", () => {
  it("offers 10, 20 and 30 minutes as tiles, 20 chosen by default", () => {
    expect(radios(html(<GoalStep headingRef={null} choices={DEFAULT_CHOICES} onChoose={() => undefined} />))).toEqual([
      { value: "10", checked: false },
      { value: "20", checked: true },
      { value: "30", checked: false },
    ]);
  });

  it("gives each tile its pace under the minutes", () => {
    const markup = html(<GoalStep headingRef={null} choices={DEFAULT_CHOICES} onChoose={() => undefined} />);
    expect(markup.match(/app-choice app-choice--tile/g)).toHaveLength(3);
    for (const pace of ["A light daily habit", "A steady pace", "A test coming up"]) expect(markup).toContain(pace);
  });

  it("shows the goal already chosen", () => {
    const markup = html(<GoalStep headingRef={null} choices={{ ...DEFAULT_CHOICES, dailyGoalMinutes: 10 }} onChoose={() => undefined} />);
    expect(radios(markup).find((radio) => radio.checked)?.value).toBe("10");
  });
});
