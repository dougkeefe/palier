// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { provided } from "../../__tests__/render";
import { DEFAULT_CHOICES } from "../../features/onboarding/onboarding";
import { TargetStep } from "./TargetStep";

afterEach(cleanup);

const step = (onChoose = vi.fn(), choices = DEFAULT_CHOICES) => {
  render(
    provided(
      <TargetStep headingRef={null} choices={choices} onChoose={onChoose} perSkillOpen={false} onPerSkillToggle={() => undefined} />,
      "en",
    ),
  );
  return onChoose;
};

describe("TargetStep (D259, D269)", () => {
  it("sets every skill's target with one answer", () => {
    const onChoose = step();
    fireEvent.click(screen.getByRole("radio", { name: /^Level B\s?You/ }));
    expect(onChoose).toHaveBeenCalledWith({ targets: { reading: "B", writing: "B", oral: "B" } });
  });

  it("shows the shared target as chosen, and none when the skills differ", () => {
    step(vi.fn(), { ...DEFAULT_CHOICES, targets: { reading: "C", writing: "B", oral: "C" } });
    expect((screen.getByRole("radio", { name: /^Level C\s?You/ }) as HTMLInputElement).checked).toBe(false);
    expect((screen.getByRole("radio", { name: /^Level B\s?You/ }) as HTMLInputElement).checked).toBe(false);
    // The targets differ, so the per-skill disclosure is open.
    expect(screen.getByText("My position needs a different level in each skill").closest("details")?.open).toBe(true);
  });

  it("keeps the test date optional: emptied, it is none", () => {
    const onChoose = step(vi.fn(), { ...DEFAULT_CHOICES, testDate: "2027-01-05" });
    fireEvent.change(screen.getByLabelText("I have a test booked on (optional)"), { target: { value: "" } });
    expect(onChoose).toHaveBeenCalledWith({ testDate: null });
  });
});
