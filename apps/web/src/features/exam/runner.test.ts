import type { ExamRun } from "@palier/app";
import { formId, sessionId } from "@palier/domain";
import { FIXTURE_BANK } from "@palier/testing/in-memory";
import { describe, expect, it } from "vitest";

import {
  type RunnerEvent,
  type RunnerState,
  answeredCount,
  currentItem,
  navigatorEntries,
  runnerReducer,
  startRunner,
  submitCounts,
} from "./runner";

const [FIXTURE_FORM] = FIXTURE_BANK.forms ?? [];
if (FIXTURE_FORM === undefined) throw new Error("the fixture bank ships forms");
const FORM = { ...FIXTURE_FORM, itemIds: FIXTURE_FORM.itemIds.slice(0, 4) };
const ITEMS = (FIXTURE_BANK.items ?? []).filter((item) => FORM.itemIds.includes(item.id));
const [I0, I1, I2, I3] = FORM.itemIds;
if (I0 === undefined || I1 === undefined || I2 === undefined || I3 === undefined) throw new Error("four items");

const at = (ms: number) => 1_000_000 + ms;
const RUN: ExamRun = {
  id: sessionId("run-1"),
  formId: formId(FORM.id),
  startedAt: "2026-01-01T00:00:00.000Z",
  answers: [],
  flagged: [],
  elapsedMs: 0,
  checkpointedAt: "2026-01-01T00:00:00.000Z",
  submittedAt: null,
};

const start = (run: ExamRun = RUN) => startRunner(run, FORM, ITEMS, at(0));
const run = (state: RunnerState, ...events: RunnerEvent[]) => events.reduce(runnerReducer, state);

describe("startRunner", () => {
  it("opens on the first item, in form order, whatever order the bank gave the items in", () => {
    const s = startRunner(RUN, FORM, [...ITEMS].reverse(), at(0));
    expect(s.items.map((i) => i.id)).toEqual(FORM.itemIds);
    expect(currentItem(s)?.id).toBe(I0);
    expect(s.phase).toBe("running");
  });

  it("resumes on the first unanswered item, with the stored answers and flags", () => {
    const answered = { ...RUN, answers: [{ itemId: I0, response: "b" as const, msToFirstSelect: 1, msToConfirm: 1, changedAnswer: false, answeredAt: RUN.startedAt }], flagged: [I2] };
    const s = start(answered);
    expect(s.index).toBe(1);
    expect(s.answers.get(I0)).toBe("b");
    expect(s.flagged.has(I2)).toBe(true);
  });

  it("opens on the first item when every item is answered", () => {
    const all = { ...RUN, answers: FORM.itemIds.map((id) => ({ itemId: id, response: "a" as const, msToFirstSelect: 1, msToConfirm: 1, changedAnswer: false, answeredAt: RUN.startedAt })) };
    expect(start(all).index).toBe(0);
  });

  it("opens a submitted run as submitted, so nothing can change it", () => {
    const s = start({ ...RUN, submittedAt: "2026-01-01T01:00:00.000Z" });
    expect(s.phase).toBe("submitted");
    expect(run(s, { type: "select", option: "a", at: at(5) }).outbox).toEqual([]);
  });

  it("leaves out an item the bank no longer holds", () => {
    expect(startRunner(RUN, FORM, ITEMS.slice(1), at(0)).items).toHaveLength(3);
  });
});

describe("selecting is answering (D84, ruling 4)", () => {
  it("records the answer at once, timed from when the item was shown", () => {
    const s = run(start(), { type: "select", option: "c", at: at(2_500) });
    expect(s.answers.get(I0)).toBe("c");
    expect(s.outbox).toEqual([
      { kind: "answer", itemId: I0, response: "c", msToFirstSelect: 2_500, msToConfirm: 2_500, changedAnswer: false },
    ]);
  });

  it("writes a changed answer as changed, keeping the first choice's time", () => {
    const s = run(start(), { type: "select", option: "a", at: at(1_000) }, { type: "select", option: "b", at: at(3_000) });
    expect(s.outbox[1]).toMatchObject({ response: "b", msToFirstSelect: 1_000, msToConfirm: 3_000, changedAnswer: true });
  });

  it("writes nothing when the option chosen is already the answer", () => {
    const s = run(start(), { type: "select", option: "a", at: at(1) }, { type: "select", option: "a", at: at(2) });
    expect(s.outbox).toHaveLength(1);
  });

  it("marks an answer changed on coming back to an item and choosing differently", () => {
    const s = run(
      start(),
      { type: "select", option: "a", at: at(1) },
      { type: "next", at: at(2) },
      { type: "previous", at: at(3) },
      { type: "select", option: "d", at: at(4_003) },
    );
    expect(s.outbox[1]).toMatchObject({ itemId: I0, response: "d", msToFirstSelect: 4_000, changedAnswer: true });
  });

  it("drops the written answers from the outbox once they are sent, in order", () => {
    const s = run(
      start(),
      { type: "select", option: "a", at: at(1) },
      { type: "toggleFlag" },
      { type: "sent", count: 1 },
    );
    expect(s.outbox).toEqual([{ kind: "flag", itemId: I0, flagged: true }]);
  });
});

describe("moving between items", () => {
  it("steps forward and back, and not past either end", () => {
    const s = run(start(), { type: "previous", at: at(1) });
    expect(s.index).toBe(0);
    const end = run(start(), { type: "goTo", index: 3, at: at(1) }, { type: "next", at: at(2) });
    expect(end.index).toBe(3);
  });

  it("jumps from the navigator and closes it, starting a fresh visit", () => {
    const s = run(start(), { type: "select", option: "a", at: at(1) }, { type: "openNavigator" }, { type: "goTo", index: 2, at: at(50) });
    expect(s.index).toBe(2);
    expect(s.panel).toBe("none");
    expect(s.shownAt).toBe(at(50));
    expect(s.firstSelectAt).toBeNull();
  });

  it("closes the navigator without a new visit when the current item is chosen", () => {
    const s = run(start(), { type: "select", option: "a", at: at(1) }, { type: "openNavigator" }, { type: "goTo", index: 0, at: at(50) });
    expect(s.panel).toBe("none");
    expect(s.firstSelectAt).toBe(at(1));
  });
});

describe("flagging", () => {
  it("flags and unflags the current item, writing each change", () => {
    const s = run(start(), { type: "toggleFlag" }, { type: "toggleFlag" });
    expect(s.flagged.has(I0)).toBe(false);
    expect(s.outbox).toEqual([
      { kind: "flag", itemId: I0, flagged: true },
      { kind: "flag", itemId: I0, flagged: false },
    ]);
  });
});

describe("the keyboard", () => {
  it("chooses with 1 to 4, goes on with Enter, and flags with F", () => {
    const s = run(
      start(),
      { type: "key", key: "2", at: at(1) },
      { type: "key", key: "Enter", at: at(2) },
      { type: "key", key: "f", at: at(3) },
      { type: "key", key: "F", at: at(4) },
    );
    expect(s.answers.get(I0)).toBe("b");
    expect(s.index).toBe(1);
    expect(s.outbox.slice(1)).toEqual([
      { kind: "flag", itemId: I1, flagged: true },
      { kind: "flag", itemId: I1, flagged: false },
    ]);
  });

  it("resolves a fast digit then Enter against the state it holds, so neither is lost (D67)", () => {
    const s = run(start(), { type: "key", key: "3", at: at(1) }, { type: "key", key: "Enter", at: at(1) });
    expect(s.answers.get(I0)).toBe("c");
    expect(s.index).toBe(1);
  });

  it("ignores digits past the options, other keys, and every key while a dialog is open", () => {
    expect(run(start(), { type: "key", key: "9", at: at(1) }).outbox).toEqual([]);
    expect(run(start(), { type: "key", key: "0", at: at(1) }).outbox).toEqual([]);
    expect(run(start(), { type: "key", key: "x", at: at(1) }).outbox).toEqual([]);
    expect(run(start(), { type: "openSubmit" }, { type: "key", key: "1", at: at(1) }).outbox).toEqual([]);
  });
});

describe("submitting", () => {
  it("counts the unanswered and flagged items for the dialog (ruling 5)", () => {
    const s = run(start(), { type: "select", option: "a", at: at(1) }, { type: "toggleFlag" }, { type: "next", at: at(2) }, { type: "toggleFlag" });
    expect(submitCounts(s)).toEqual({ unanswered: 3, flagged: 2 });
    expect(answeredCount(s)).toBe(1);
  });

  it("submits from the dialog, then accepts nothing more but its outcome", () => {
    const s = run(start(), { type: "openSubmit" }, { type: "submit" });
    expect(s.phase).toBe("submitting");
    expect(s.panel).toBe("none");
    expect(run(s, { type: "select", option: "a", at: at(1) }).answers.size).toBe(0);
    expect(run(s, { type: "submitted" }).phase).toBe("submitted");
  });

  it("submits by itself when time runs out, and says so", () => {
    const s = run(start(), { type: "openNavigator" }, { type: "expire" });
    expect(s).toMatchObject({ phase: "submitting", panel: "none", timedOut: true });
  });

  it("goes back to running if the submission fails, with every answer kept", () => {
    const s = run(start(), { type: "select", option: "a", at: at(1) }, { type: "expire" }, { type: "submitFailed" });
    expect(s).toMatchObject({ phase: "running", timedOut: false });
    expect(s.answers.get(I0)).toBe("a");
  });

  it("ignores a failure report when nothing is being submitted", () => {
    const s = start();
    expect(run(s, { type: "submitFailed" })).toBe(s);
  });

  it("opens and closes the dialogs", () => {
    expect(run(start(), { type: "openSubmit" }).panel).toBe("submit");
    expect(run(start(), { type: "openNavigator" }, { type: "closePanel" }).panel).toBe("none");
  });
});

describe("a runner with no items", () => {
  it("does nothing on a choice, a flag or a key, when every form item has left the bank", () => {
    const empty = startRunner(RUN, FORM, [], at(0));
    expect(currentItem(empty)).toBeNull();
    const s = run(
      empty,
      { type: "select", option: "a", at: at(1) },
      { type: "toggleFlag" },
      { type: "key", key: "1", at: at(2) },
    );
    expect(s.outbox).toEqual([]);
  });
});

describe("navigatorEntries", () => {
  it("lists every item with its answered, flagged and current state, and nothing about pilots", () => {
    const s = run(start(), { type: "select", option: "a", at: at(1) }, { type: "goTo", index: 2, at: at(2) }, { type: "toggleFlag" });
    expect(navigatorEntries(s)).toEqual([
      { index: 0, itemId: I0, answered: true, flagged: false, current: false },
      { index: 1, itemId: I1, answered: false, flagged: false, current: false },
      { index: 2, itemId: I2, answered: false, flagged: true, current: true },
      { index: 3, itemId: I3, answered: false, flagged: false, current: false },
    ]);
    expect(Object.keys(navigatorEntries(s)[0] ?? {})).not.toContain("pilot");
  });
});

// The fixture items are keyed a–d; a guard so the digit tests mean what they say.
it("has four options on every runner item", () => {
  expect(ITEMS.every((item) => item.options.length === 4)).toBe(true);
});
