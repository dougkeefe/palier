import type { ExamReport, ExamRun } from "@palier/app";
import type { ExamForm, Item, ItemId, OptionId } from "@palier/domain";
import { formId, sessionId } from "@palier/domain";
import { scoreExam } from "@palier/engine";
import { FIXTURE_BANK } from "@palier/testing/in-memory";
import { describe, expect, it } from "vitest";

import { NEAR_CUT_BELOW, resultsView } from "./results";

// Eight fixture reading items: six scored and two pilots, at positions 3 and 6.
const ITEMS: readonly Item[] = (FIXTURE_BANK.items ?? []).filter((i) => i.skill === "reading").slice(0, 8);
const IDS: readonly ItemId[] = ITEMS.map((i) => i.id);
const PILOTS: readonly ItemId[] = [IDS[2], IDS[5]].filter((id): id is ItemId => id !== undefined);
const SCORED: readonly ItemId[] = IDS.filter((id) => !PILOTS.includes(id));
const FORM: ExamForm = {
  id: formId("f-results"),
  skill: "reading",
  lang: "fr",
  mode: "unsupervised",
  itemIds: IDS,
  pilotItemIds: PILOTS,
  timeLimitMinutes: 45,
  bandCuts: [
    { band: "C", min: 5, max: 6 },
    { band: "X", min: 0, max: 1 },
    { band: "B", min: 3, max: 4 },
    { band: "A", min: 2, max: 2 },
  ],
  version: 1,
};

const keyOf = (id: ItemId): OptionId => ITEMS.find((i) => i.id === id)?.key ?? "a";
const wrongFor = (id: ItemId): OptionId => (keyOf(id) === "a" ? "b" : "a");

type Given = { readonly id: ItemId; readonly right: boolean; readonly changed?: boolean };

const reportOf = (given: readonly Given[], over: Partial<ExamRun> = {}, extra: Partial<ExamReport> = {}): ExamReport => {
  const run: ExamRun = {
    id: sessionId("r"),
    formId: FORM.id,
    startedAt: "2026-01-01T00:00:00.000Z",
    answers: given.map((g) => ({
      itemId: g.id,
      response: g.right ? keyOf(g.id) : wrongFor(g.id),
      msToFirstSelect: 1,
      msToConfirm: 1,
      changedAnswer: g.changed ?? false,
      answeredAt: "2026-01-01T00:01:00.000Z",
    })),
    flagged: [],
    elapsedMs: 60_000,
    checkpointedAt: "2026-01-01T00:01:00.000Z",
    submittedAt: "2026-01-01T00:02:00.000Z",
    ...over,
  };
  const result = scoreExam(FORM, ITEMS, new Map(run.answers.map((a) => [a.itemId, a.response])));
  return { run, form: FORM, items: ITEMS, result, retake: false, ...extra };
};

const right = (n: number): Given[] => SCORED.slice(0, n).map((id) => ({ id, right: true }));

describe("the band and the cuts", () => {
  it("gives the band, the raw score over scored items only, and the cut table lowest first", () => {
    const view = resultsView(reportOf([...right(3), ...PILOTS.map((id) => ({ id, right: true }))]));
    expect(view).toMatchObject({ band: "B", raw: 3, scored: 6, bandMin: 3 });
    expect(view.cuts.map((c) => c.band)).toEqual(["X", "A", "B", "C"]);
    expect(view.namesOwnCut).toBe(true);
  });

  it("does not name the bottom band's cut, which is always 0", () => {
    expect(resultsView(reportOf([])).namesOwnCut).toBe(false);
  });
});

describe("the near-miss (ruling 8)", () => {
  it("always gives the gap to the next band up", () => {
    expect(resultsView(reportOf(right(3))).up).toEqual({ band: "C", pointsAway: 2 });
  });

  it("has no band up at the top of the scale", () => {
    expect(resultsView(reportOf(right(6))).up).toBeNull();
  });

  it("gives the band below when the score sits within two of its band's cut", () => {
    // B starts at 3: raw 4 is one above, so two fewer right would have been A.
    expect(resultsView(reportOf(right(4))).down).toEqual({ band: "A", answers: 2 });
    expect(resultsView(reportOf(right(3))).down).toEqual({ band: "A", answers: 1 });
  });

  it("says nothing of the band below further than two above the cut", () => {
    const wide: ExamForm = { ...FORM, bandCuts: [{ band: "X", min: 0, max: 2 }, { band: "C", min: 3, max: 6 }] };
    const report = reportOf(right(6));
    const view = resultsView({ ...report, form: wide, result: scoreExam(wide, ITEMS, new Map(report.run.answers.map((a) => [a.itemId, a.response]))) });
    // C starts at 3, and 6 is further above it than NEAR_CUT_BELOW.
    expect(6 - 3).toBeGreaterThan(NEAR_CUT_BELOW);
    expect(view.down).toBeNull();
  });

  it("has no band below at the bottom of the scale", () => {
    expect(resultsView(reportOf([])).down).toBeNull();
  });
});

describe("sub-skill counts (ruling 7)", () => {
  it("counts scored items per sub-skill, pilots left out, adding up to the raw score", () => {
    const view = resultsView(reportOf([...right(2), ...PILOTS.map((id) => ({ id, right: true }))]));
    expect(view.subSkills.reduce((n, s) => n + s.total, 0)).toBe(6);
    expect(view.subSkills.reduce((n, s) => n + s.correct, 0)).toBe(view.raw);
  });
});

describe("confidence calibration (ruling 6)", () => {
  it("counts sure-and-wrong and unsure-and-right, unsure meaning flagged or changed", () => {
    const [a, b, c, d] = SCORED;
    if (a === undefined || b === undefined || c === undefined || d === undefined) throw new Error("scored items");
    const view = resultsView(
      reportOf(
        [
          { id: a, right: false },
          { id: b, right: true, changed: true },
          { id: c, right: true },
          { id: d, right: false, changed: true },
        ],
        { flagged: [c] },
      ),
    );
    expect(view.sureWrong).toBe(1);
    expect(view.unsureRight).toBe(2);
  });

  it("leaves pilots and unanswered items out", () => {
    const view = resultsView(reportOf(PILOTS.map((id) => ({ id, right: false }))));
    expect(view.sureWrong).toBe(0);
  });
});

describe("the labels (rulings 1, 2, 3)", () => {
  it("has none for a first sitting, never paused, without extra time", () => {
    expect(resultsView(reportOf([]))).toMatchObject({ pauses: 0, extraTime: false, retake: false });
  });

  it("says how many times the exam was paused, that it had extra time, and that it was a retake", () => {
    const view = resultsView(reportOf([], { resumes: 2, timeAllowance: 1.5 }, { retake: true }));
    expect(view).toMatchObject({ pauses: 2, extraTime: true, retake: true });
  });
});

describe("the review walkthrough", () => {
  it("lists every item in form order, pilots included and indistinguishable", () => {
    const view = resultsView(reportOf([...right(1), { id: PILOTS[0] as ItemId, right: false }]));
    expect(view.review.map((r) => r.item.id)).toEqual(IDS);
    expect(view.review.map((r) => r.position)).toEqual([1, 2, 3, 4, 5, 6, 7, 8]);
    const keys = new Set(view.review.map((r) => Object.keys(r).sort().join()));
    expect(keys.size).toBe(1);
    expect([...keys][0]).not.toContain("pilot");
  });

  it("leaves out an item the bank no longer holds", () => {
    const report = reportOf([]);
    expect(resultsView({ ...report, items: ITEMS.slice(1) }).review).toHaveLength(7);
  });
});
