import { describe, expect, it } from "vitest";

import { html } from "../../__tests__/render";
import { DEFAULT_CHOICES } from "../../features/onboarding/onboarding";
import { NowStep } from "./NowStep";

const BANDS = ["X", "A", "B", "C", "E"] as const;

describe("NowStep (D259, D263, D269)", () => {
  it("is a staircase per skill, each a group named by the skill, Coco on Not yet by default", () => {
    const markup = html(
      <NowStep headingRef={null} choices={DEFAULT_CHOICES} onChoose={() => undefined} bands={BANDS} exemptBand="E" />,
    );
    expect(markup).toContain("Which SLE results do you hold now?");
    for (const skill of ["Reading", "Written expression", "Oral expression"]) expect(markup).toContain(skill);
    // Each stair's ground is "Not yet", and the one chosen with no result declared.
    expect(markup.match(/>Not yet</g)).toHaveLength(3);
    expect(markup.match(/<input[^>]*checked=""[^>]*>/g)).toHaveLength(3);
    expect(markup).toContain("Reading: no result yet. Your target is C.");
  });

  it("says a declared result in the stair's caption", () => {
    const markup = html(
      <NowStep
        headingRef={null}
        choices={{ ...DEFAULT_CHOICES, current: { reading: "E", writing: null, oral: null } }}
        onChoose={() => undefined}
        bands={BANDS}
        exemptBand="E"
      />,
    );
    expect(markup).toContain("Reading: you hold E, the exemption. Nothing left to study here.");
  });
});
