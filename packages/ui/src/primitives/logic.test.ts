import { describe, expect, it } from "vitest";

import {
  buttonClass,
  calloutState,
  optionRowKeydown,
  optionRowState,
  railGeometry,
} from "./logic.js";

describe("buttonClass", () => {
  it("names the variant modifier alongside the base class", () => {
    expect(buttonClass("primary")).toBe("pl-btn pl-btn--primary");
    expect(buttonClass("secondary")).toBe("pl-btn pl-btn--secondary");
    expect(buttonClass("ghost")).toBe("pl-btn pl-btn--ghost");
    expect(buttonClass("danger")).toBe("pl-btn pl-btn--danger");
  });
});

describe("optionRowState", () => {
  it("marks a correct answer with the correct class and a check glyph", () => {
    const state = optionRowState({ selected: true, outcome: "correct", disabled: true });
    expect(state.className).toBe("pl-option pl-option--correct");
    expect(state.glyph).toBe("check");
  });

  it("marks an incorrect answer with the incorrect class and a cross glyph", () => {
    const state = optionRowState({ selected: true, outcome: "incorrect", disabled: true });
    expect(state.className).toBe("pl-option pl-option--incorrect");
    expect(state.glyph).toBe("cross");
  });

  it("shows the selected class with no glyph before an outcome is revealed", () => {
    const state = optionRowState({ selected: true, disabled: false });
    expect(state.className).toBe("pl-option pl-option--selected");
    expect(state.glyph).toBeNull();
  });

  it("is the bare option when unselected and unanswered", () => {
    const state = optionRowState({ selected: false, disabled: false });
    expect(state.className).toBe("pl-option");
    expect(state.glyph).toBeNull();
  });

  it("reflects selection and disabled state for ARIA", () => {
    expect(optionRowState({ selected: true, disabled: false }).ariaChecked).toBe(true);
    expect(optionRowState({ selected: false, disabled: true }).ariaDisabled).toBe(true);
  });
});

describe("optionRowKeydown", () => {
  it("moves to the next option on ArrowDown and ArrowRight, wrapping at the end", () => {
    expect(optionRowKeydown("ArrowDown", 0, 3)).toEqual({ type: "move", to: 1 });
    expect(optionRowKeydown("ArrowRight", 2, 3)).toEqual({ type: "move", to: 0 });
  });

  it("moves to the previous option on ArrowUp and ArrowLeft, wrapping at the start", () => {
    expect(optionRowKeydown("ArrowUp", 1, 3)).toEqual({ type: "move", to: 0 });
    expect(optionRowKeydown("ArrowLeft", 0, 3)).toEqual({ type: "move", to: 2 });
  });

  it("jumps to the first option on Home and the last on End", () => {
    expect(optionRowKeydown("Home", 2, 3)).toEqual({ type: "move", to: 0 });
    expect(optionRowKeydown("End", 0, 3)).toEqual({ type: "move", to: 2 });
  });

  it("selects on Space and Enter", () => {
    expect(optionRowKeydown(" ", 0, 3)).toEqual({ type: "select" });
    expect(optionRowKeydown("Enter", 0, 3)).toEqual({ type: "select" });
  });

  it("ignores any other key", () => {
    expect(optionRowKeydown("Tab", 0, 3)).toEqual({ type: "none" });
  });

  it("ignores every key when the group is empty", () => {
    expect(optionRowKeydown("ArrowDown", 0, 0)).toEqual({ type: "none" });
  });
});

describe("railGeometry", () => {
  it("maps a partial value to a percentage of the total", () => {
    expect(railGeometry(3, 12)).toEqual({ percent: 25, valueNow: 3, valueMax: 12 });
  });

  it("is full at the total", () => {
    expect(railGeometry(12, 12).percent).toBe(100);
  });

  it("clamps a negative current to zero", () => {
    expect(railGeometry(-5, 12)).toEqual({ percent: 0, valueNow: 0, valueMax: 12 });
  });

  it("clamps a current above the total to the total", () => {
    expect(railGeometry(20, 12)).toEqual({ percent: 100, valueNow: 12, valueMax: 12 });
  });

  it("reports zero rather than dividing by zero on an empty total", () => {
    expect(railGeometry(0, 0)).toEqual({ percent: 0, valueNow: 0, valueMax: 0 });
  });
});

describe("calloutState", () => {
  it("uses an info glyph for the info tone", () => {
    expect(calloutState("info")).toEqual({ className: "pl-callout pl-callout--info", glyph: "info" });
  });

  it("uses a check for correct, a cross for incorrect, and a star for accent", () => {
    expect(calloutState("correct").glyph).toBe("check");
    expect(calloutState("incorrect").glyph).toBe("cross");
    expect(calloutState("accent").glyph).toBe("star");
  });
});
