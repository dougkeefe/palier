// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { provided } from "../../__tests__/render";
import { DEFAULT_CHOICES } from "../../features/onboarding/onboarding";
import { GoalStep } from "./GoalStep";

afterEach(cleanup);

describe("GoalStep (D269)", () => {
  it("offers 10, 20 and 30 minutes as tiles, each with its pace, 20 chosen by default", () => {
    render(provided(<GoalStep headingRef={null} choices={DEFAULT_CHOICES} onChoose={() => undefined} />, "en"));
    const radios = screen.getAllByRole("radio") as HTMLInputElement[];
    expect(radios.map((radio) => radio.value)).toEqual(["10", "20", "30"]);
    expect(radios.map((radio) => radio.checked)).toEqual([false, true, false]);
    expect(screen.getByRole("radio", { name: /20 minutes a day/ }).closest("label")?.textContent).toContain("A steady pace");
  });

  it("chooses the minutes tapped", () => {
    const onChoose = vi.fn();
    render(provided(<GoalStep headingRef={null} choices={DEFAULT_CHOICES} onChoose={onChoose} />, "en"));
    fireEvent.click(screen.getByRole("radio", { name: /10 minutes a day/ }));
    expect(onChoose).toHaveBeenCalledWith({ dailyGoalMinutes: 10 });
  });
});
