import { describe, expect, it } from "vitest";

import {
  bandMeterGeometry,
  buttonClass,
  calloutState,
  dialogClass,
  mascotClass,
  streakFlameClass,
  optionRowKeydown,
  optionRowState,
  railGeometry,
  sheetState,
  timerState,
  VOICE_EASE,
  VOICE_FULL_LEVEL,
  VOICE_REACH,
  easeLevel,
  voiceFormClass,
  voiceFormScale,
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

describe("bandMeterGeometry", () => {
  it("draws the estimate as the fill and the interval as the lighter range", () => {
    const geo = bandMeterGeometry({ accuracy: 0.52, low: 0.4, high: 0.64 });
    expect(geo.fillPercent).toBeCloseTo(52);
    expect(geo.rangeStartPercent).toBeCloseTo(40);
    expect(geo.rangeWidthPercent).toBeCloseTo(24);
    expect(geo.valueNow).toBe(52);
  });

  it("rounds the accessible value to a whole percentage", () => {
    expect(bandMeterGeometry({ accuracy: 0.846, low: 0.8, high: 0.9 }).valueNow).toBe(85);
  });

  it("clamps everything to the track, so nothing runs off either end", () => {
    const geo = bandMeterGeometry({ accuracy: 1.3, low: -0.2, high: 1.5 });
    expect(geo).toMatchObject({ fillPercent: 100, rangeStartPercent: 0, rangeWidthPercent: 100, valueNow: 100 });
  });

  it("puts an inverted interval right rather than drawing a negative width", () => {
    const geo = bandMeterGeometry({ accuracy: 0.5, low: 0.7, high: 0.3 });
    expect(geo.rangeStartPercent).toBeCloseTo(30);
    expect(geo.rangeWidthPercent).toBeCloseTo(40);
  });

  it("draws an empty meter from a value that is not a number", () => {
    expect(bandMeterGeometry({ accuracy: Number.NaN, low: Number.NaN, high: Number.POSITIVE_INFINITY })).toEqual({
      fillPercent: 0,
      rangeStartPercent: 0,
      rangeWidthPercent: 0,
      valueNow: 0,
    });
  });
});

describe("sheetState", () => {
  it("gives a correct answer the check glyph and an incorrect one the cross", () => {
    expect(sheetState("correct")).toEqual({ className: "pl-sheet pl-sheet--correct", glyph: "check" });
    expect(sheetState("incorrect")).toEqual({ className: "pl-sheet pl-sheet--incorrect", glyph: "cross" });
  });

  it("carries no glyph when neutral", () => {
    expect(sheetState("neutral")).toEqual({ className: "pl-sheet pl-sheet--neutral", glyph: null });
  });
});

describe("timerState", () => {
  it("draws a normal clock with no glyph", () => {
    expect(timerState("normal")).toEqual({ className: "pl-timer pl-timer--normal", glyph: null });
  });

  it.each(["warning", "urgent"] as const)("adds a clock glyph to a %s clock, so colour is not the only signal", (tone) => {
    expect(timerState(tone)).toEqual({ className: `pl-timer pl-timer--${tone}`, glyph: "clock" });
  });
});

describe("dialogClass", () => {
  it("names the placement", () => {
    expect(dialogClass("center")).toBe("pl-dialog pl-dialog--center");
    expect(dialogClass("side")).toBe("pl-dialog pl-dialog--side");
    expect(dialogClass("full")).toBe("pl-dialog pl-dialog--full");
  });
});

describe("mascotClass", () => {
  it("settles a cheering Coco in with the celebration, and leaves a sleeping one still", () => {
    expect(mascotClass("cheer")).toBe("pl-mascot pl-celebrate");
    expect(mascotClass("asleep")).toBe("pl-mascot");
  });
});

describe("streakFlameClass", () => {
  it("lights the flame, with its settle, only when today is done", () => {
    expect(streakFlameClass(true)).toBe("pl-streak-flame pl-streak-flame--lit");
    expect(streakFlameClass(false)).toBe("pl-streak-flame");
  });
});

describe("voiceFormScale (D184)", () => {
  it("rests at 1 in silence and grows with the voice, up to its reach at a full voice", () => {
    expect(voiceFormScale(0)).toBe(1);
    expect(voiceFormScale(VOICE_FULL_LEVEL / 2)).toBeCloseTo(1 + VOICE_REACH / 2, 10);
    expect(voiceFormScale(VOICE_FULL_LEVEL)).toBeCloseTo(1 + VOICE_REACH, 10);
    expect(voiceFormScale(1)).toBeCloseTo(1 + VOICE_REACH, 10);
  });

  it("rests for a negative reading or one that is not a number", () => {
    expect(voiceFormScale(-0.2)).toBe(1);
    expect(voiceFormScale(Number.NaN)).toBe(1);
  });
});

describe("easeLevel (D184)", () => {
  it("moves part of the way towards the level heard each frame", () => {
    expect(easeLevel(0, 1)).toBeCloseTo(VOICE_EASE, 10);
    expect(easeLevel(1, 0)).toBeCloseTo(1 - VOICE_EASE, 10);
  });

  it("stays where it is for a reading that is not a number", () => {
    expect(easeLevel(0.2, Number.NaN)).toBe(0.2);
  });
});

describe("voiceFormClass (D184)", () => {
  it("marks a still form", () => {
    expect(voiceFormClass(true)).toBe("pl-voice-form pl-voice-form--still");
    expect(voiceFormClass(false)).toBe("pl-voice-form");
  });
});
