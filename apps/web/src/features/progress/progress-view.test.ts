import type { OralTotals, ProgressReport } from "@palier/app";
import type { ScoredSkill } from "@palier/domain";
import type { SkillTrend, SubSkillTally } from "@palier/engine";
import { describe, expect, it } from "vitest";

import { glanceCards, practiceTime, tallyScale } from "./progress-view";

const trend = (skill: ScoredSkill, c: SkillTrend["byBand"]["C"]): SkillTrend => ({
  skill,
  windowSize: 100,
  byBand: {
    A: { status: "insufficient", attempted: 0, needed: 30 },
    B: { status: "insufficient", attempted: 0, needed: 30 },
    C: c,
  },
});

const report = (skill: ScoredSkill, c: SkillTrend["byBand"]["C"], answered: number, msAnswering: number): ProgressReport => ({
  trend: trend(skill, c),
  bySubSkill: [],
  answered,
  msAnswering,
});

const reports: Record<ScoredSkill, ProgressReport> = {
  reading: report(
    "reading",
    { status: "estimated", attempted: 50, correct: 32, accuracy: 0.64, interval: { low: 0.5, high: 0.76 } },
    210,
    7_800_000,
  ),
  writing: report("writing", { status: "insufficient", attempted: 18, needed: 30 }, 96, 3_900_000),
};

const NO_ORAL: OralTotals = { sessions: 0, msSpoken: 0 };

describe("glanceCards", () => {
  it("names the three domains in the app's order: reading, writing, then speaking", () => {
    expect(glanceCards(reports, NO_ORAL, "C").map((card) => card.kind)).toEqual(["reading", "writing", "oral"]);
  });

  it("leads a skill with an estimate at the target band with that estimate and its interval (R10)", () => {
    const [reading] = glanceCards(reports, NO_ORAL, "C");
    expect(reading).toMatchObject({
      kind: "reading",
      headline: { status: "estimate", line: { band: "C", percents: { accuracy: 64, low: 50, high: 76 } } },
      answered: 210,
      minutes: 130,
    });
  });

  it("leads a skill still short of evidence with its answers toward the first figure, never a figure", () => {
    const [, writing] = glanceCards(reports, NO_ORAL, "C");
    expect(writing).toMatchObject({ kind: "writing", headline: { status: "building", attempted: 18, threshold: 30 } });
  });

  it("never fills the rail past its threshold", () => {
    const over = { ...reports, writing: report("writing", { status: "insufficient", attempted: 45, needed: 30 }, 45, 0) };
    expect(glanceCards(over, NO_ORAL, "C")[1]).toMatchObject({ headline: { attempted: 30, threshold: 30 } });
  });

  it("reads the band it is given, so a learner aiming at B sees B", () => {
    expect(glanceCards(reports, NO_ORAL, "B")[0]).toMatchObject({ headline: { status: "building", attempted: 0 } });
  });

  it("gives speaking its sessions and whole minutes spoken", () => {
    expect(glanceCards(reports, { sessions: 3, msSpoken: 2_530_000 }, "C")[2]).toEqual({ kind: "oral", sessions: 3, minutes: 42 });
    expect(glanceCards(reports, NO_ORAL, "C")[2]).toEqual({ kind: "oral", sessions: 0, minutes: 0 });
  });
});

describe("practiceTime", () => {
  it("adds answering at both skills to speaking, in hours and the minutes past them", () => {
    expect(practiceTime(reports, { sessions: 2, msSpoken: 2_520_000 })).toEqual({ hours: 3, minutes: 57 });
  });

  it("is under an hour as minutes alone, and nothing as zero", () => {
    const quiet = { reading: report("reading", reports.reading.trend.byBand.C, 0, 600_000), writing: report("writing", reports.writing.trend.byBand.C, 0, 0) };
    expect(practiceTime(quiet, NO_ORAL)).toEqual({ hours: 0, minutes: 10 });
    expect(practiceTime({ ...quiet, reading: report("reading", reports.reading.trend.byBand.C, 0, 0) }, NO_ORAL)).toEqual({ hours: 0, minutes: 0 });
  });

  it("counts a negative duration as none", () => {
    expect(practiceTime(reports, { sessions: 1, msSpoken: -60_000 })).toEqual({ hours: 3, minutes: 15 });
  });
});

describe("tallyScale", () => {
  it("is the most answers any sub-skill has", () => {
    const rows: SubSkillTally[] = [
      { subSkill: "inference", attempted: 14, correct: 6 },
      { subSkill: "main-idea", attempted: 40, correct: 31 },
    ];
    expect(tallyScale(rows)).toBe(40);
  });

  it("is zero with no sub-skill practised", () => {
    expect(tallyScale([])).toBe(0);
  });
});
