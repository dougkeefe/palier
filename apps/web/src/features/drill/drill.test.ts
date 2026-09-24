import { FIXTURE_BANK } from "@palier/testing/in-memory";
import { describe, expect, it } from "vitest";

import {
  currentItem,
  type DrillState,
  drillReducer,
  keyIntent,
  pendingAnswer,
  startDrill,
  summaryOf,
} from "./drill";

const ITEMS = (FIXTURE_BANK.items ?? []).slice(0, 3);
const at = (ms: number) => 1_000_000 + ms;

const run = (state: DrillState, ...events: Parameters<typeof drillReducer>[1][]) =>
  events.reduce(drillReducer, state);

describe("startDrill", () => {
  it("has three fixture items to drill (a guard on the fixture, not the machine)", () => {
    expect(ITEMS).toHaveLength(3);
  });

  it("shows the first item, with nothing selected", () => {
    const s = startDrill(ITEMS, at(0));
    expect(s.phase).toBe("answering");
    expect(currentItem(s)).toBe(ITEMS[0]);
    expect(s.selected).toBeNull();
  });

  it("is complete at once when there is nothing to drill", () => {
    const s = startDrill([], at(0));
    expect(s.phase).toBe("complete");
    expect(currentItem(s)).toBeNull();
  });
});

describe("selecting and confirming", () => {
  it("records when an option was first chosen, not the last change", () => {
    const s = run(
      startDrill(ITEMS, at(0)),
      { type: "select", option: "a", at: at(1_200) },
      { type: "select", option: "b", at: at(3_000) },
      { type: "confirm" },
    );
    expect(pendingAnswer(s, at(4_000))).toMatchObject({
      response: "b",
      msToFirstSelect: 1_200,
      msToConfirm: 4_000,
      changedAnswer: true,
    });
  });

  it("does not count re-choosing the same option as a change", () => {
    const s = run(
      startDrill(ITEMS, at(0)),
      { type: "select", option: "a", at: at(100) },
      { type: "select", option: "a", at: at(200) },
    );
    expect(s.changedAnswer).toBe(false);
  });

  it("ignores confirm until something is selected", () => {
    const s = drillReducer(startDrill(ITEMS, at(0)), { type: "confirm" });
    expect(s.phase).toBe("answering");
    expect(pendingAnswer(s, at(10))).toBeNull();
  });

  it("locks the choice while the answer is recording and in feedback", () => {
    const recording = run(startDrill(ITEMS, at(0)), { type: "select", option: "a", at: at(1) }, { type: "confirm" });
    expect(drillReducer(recording, { type: "select", option: "c", at: at(2) })).toBe(recording);
    const feedback = drillReducer(recording, { type: "answered", correct: true });
    expect(drillReducer(feedback, { type: "select", option: "c", at: at(3) })).toBe(feedback);
  });

  it("returns to answering, keeping the choice, when recording fails", () => {
    const recording = run(startDrill(ITEMS, at(0)), { type: "select", option: "d", at: at(1) }, { type: "confirm" });
    const back = drillReducer(recording, { type: "failed" });
    expect(back.phase).toBe("answering");
    expect(back.selected).toBe("d");
    // A stray failure outside recording changes nothing.
    expect(drillReducer(back, { type: "failed" })).toBe(back);
  });

  it("never reports a negative duration, even with a clock that stepped back", () => {
    const s = run(startDrill(ITEMS, at(5_000)), { type: "select", option: "a", at: at(1_000) }, { type: "confirm" });
    expect(pendingAnswer(s, at(0))).toMatchObject({ msToFirstSelect: 0, msToConfirm: 0 });
  });
});

describe("feedback and advancing", () => {
  it("shows feedback only after the answer is recorded, and keeps each outcome", () => {
    const s = run(
      startDrill(ITEMS, at(0)),
      { type: "select", option: "a", at: at(1) },
      { type: "confirm" },
      { type: "answered", correct: false },
    );
    expect(s.phase).toBe("feedback");
    expect(s.outcomes).toEqual(["incorrect"]);
    // An "answered" that arrives outside recording is ignored.
    expect(drillReducer(s, { type: "answered", correct: true })).toBe(s);
  });

  it("moves to the next item with fresh timings and no selection", () => {
    const s = run(
      startDrill(ITEMS, at(0)),
      { type: "select", option: "a", at: at(1) },
      { type: "select", option: "b", at: at(2) },
      { type: "confirm" },
      { type: "answered", correct: true },
      { type: "next", at: at(9_000) },
    );
    expect(currentItem(s)).toBe(ITEMS[1]);
    expect(s).toMatchObject({ phase: "answering", selected: null, firstSelectAt: null, changedAnswer: false, shownAt: at(9_000) });
  });

  it("ignores next until the feedback is showing", () => {
    const s = startDrill(ITEMS, at(0));
    expect(drillReducer(s, { type: "next", at: at(1) })).toBe(s);
  });

  it("completes after the last item and summarises the set", () => {
    let s = startDrill(ITEMS, at(0));
    ITEMS.forEach((_, i) => {
      s = run(
        s,
        { type: "select", option: "a", at: at(i * 10 + 1) },
        { type: "confirm" },
        { type: "answered", correct: i !== 1 },
        { type: "next", at: at(i * 10 + 5) },
      );
    });
    expect(s.phase).toBe("complete");
    expect(summaryOf(s)).toEqual({ answered: 3, correct: 2 });
  });
});

describe("keyIntent", () => {
  const answering = startDrill(ITEMS, at(0));

  it("maps 1 to 4 to the item's options while answering", () => {
    expect(keyIntent("1", answering)).toEqual({ type: "select", option: ITEMS[0]!.options[0]!.id });
    expect(keyIntent("4", answering)).toEqual({ type: "select", option: ITEMS[0]!.options[3]!.id });
  });

  it("ignores keys that are not an option number", () => {
    expect(keyIntent("5", answering)).toBeNull();
    expect(keyIntent("0", answering)).toBeNull();
    expect(keyIntent("1.5", answering)).toBeNull();
    expect(keyIntent("x", answering)).toBeNull();
  });

  it("confirms on Enter only once something is selected", () => {
    expect(keyIntent("Enter", answering)).toBeNull();
    const selected = drillReducer(answering, { type: "select", option: "b", at: at(1) });
    expect(keyIntent("Enter", selected)).toEqual({ type: "confirm" });
  });

  it("advances on Enter in feedback, and does nothing while recording or complete", () => {
    const recording = run(answering, { type: "select", option: "a", at: at(1) }, { type: "confirm" });
    expect(keyIntent("Enter", recording)).toBeNull();
    const feedback = drillReducer(recording, { type: "answered", correct: true });
    expect(keyIntent("Enter", feedback)).toEqual({ type: "next" });
    expect(keyIntent("1", feedback)).toBeNull();
    expect(keyIntent("Enter", startDrill([], at(0)))).toBeNull();
  });
});
