import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

import { bandsFor, parseExamProfile, parseExamProfileOrThrow } from "../profile/parse.js";
import { PROFILE_PATH, readProfile } from "./read-profile.js";

/**
 * The profile is transcribed from published PSC figures
 * (product-requirements.md 5). This file is the check on that transcription,
 * and it is the one place in the repository where a silent error would be
 * expensive: a wrong cut score produces a plausible band for every user,
 * forever, with nothing to notice.
 */
describe("the psc-sle profile", () => {
  const profile = parseExamProfileOrThrow(readProfile());

  it("validates", () => {
    expect(parseExamProfile(readProfile()).ok).toBe(true);
  });

  it("is committed where the loader and the factory both expect it", () => {
    expect(() => readFileSync(PROFILE_PATH, "utf8")).not.toThrow();
  });

  it("declares the four published variants", () => {
    expect(Object.keys(profile.variants).sort()).toEqual([
      "reading-supervised",
      "reading-unsupervised",
      "writing-supervised",
      "writing-unsupervised",
    ]);
  });

  it.each([
    ["reading-supervised", { items: 60, scored: 50, minutes: 90 }],
    ["reading-unsupervised", { items: 25, scored: 25, minutes: 45 }],
    ["writing-supervised", { items: 65, scored: 55, minutes: 90 }],
    ["writing-unsupervised", { items: 30, scored: 30, minutes: 45 }],
  ])("%s has the item count and time limit published in section 5", (name, expected) => {
    const v = profile.variants[name];
    expect({ items: v?.items, scored: v?.scored, minutes: v?.minutes }).toEqual(expected);
  });

  it.each([
    ["reading-supervised", { X: [0, 17], A: [18, 27], B: [28, 37], C: [38, 44], E: [45, 50] }],
    ["reading-unsupervised", { X: [0, 8], A: [9, 13], B: [14, 18], C: [19, 25] }],
    ["writing-supervised", { X: [0, 19], A: [20, 30], B: [31, 42], C: [43, 51], E: [52, 55] }],
    ["writing-unsupervised", { X: [0, 10], A: [11, 16], B: [17, 23], C: [24, 30] }],
  ])("%s carries the published cut table", (name, cuts) => {
    expect(profile.variants[name]?.cuts).toEqual(cuts);
  });

  it("gives the supervised variants ten pilot items each", () => {
    // Not asserted by the schema, which checks only scored <= items, so that a
    // PSC change to the pilot count stays a data edit (ADR 9).
    expect([
      (profile.variants["reading-supervised"]?.items ?? 0) -
        (profile.variants["reading-supervised"]?.scored ?? 0),
      (profile.variants["writing-supervised"]?.items ?? 0) -
        (profile.variants["writing-supervised"]?.scored ?? 0),
    ]).toEqual([10, 10]);
  });

  it("gives the unsupervised variants no pilot items", () => {
    expect([
      (profile.variants["reading-unsupervised"]?.items ?? 0) -
        (profile.variants["reading-unsupervised"]?.scored ?? 0),
      (profile.variants["writing-unsupervised"]?.items ?? 0) -
        (profile.variants["writing-unsupervised"]?.scored ?? 0),
    ]).toEqual([0, 0]);
  });

  it("awards E on the supervised variants only, because E is an exemption at the top of that range", () => {
    const withE = Object.entries(profile.variants)
      .filter(([, v]) => bandsFor(v).includes("E"))
      .map(([name]) => name)
      .sort();

    expect(withE).toEqual(["reading-supervised", "writing-supervised"]);
  });

  it("holds the four Leitner intervals from ADR 8, box 5 being retirement", () => {
    expect(profile.leitnerIntervalDays).toEqual([1, 3, 7, 21]);
  });

  it("publishes no raw-score cut table for oral, because the PSC does not", () => {
    expect(profile.oral.cuts).toBeNull();
  });

  it("carries the oral level descriptors the scoring prompt quotes, in both locales", () => {
    for (const band of ["A", "B", "C"] as const) {
      expect(profile.oral.descriptors[band].en.length).toBeGreaterThan(50);
      expect(profile.oral.descriptors[band].fr.length).toBeGreaterThan(50);
    }
  });

  it("names the twelve topics and the 8/10/8 sub-skills from section 13", () => {
    expect({
      topics: profile.topics.length,
      reading: profile.subSkills.reading.length,
      writing: profile.subSkills.writing.length,
      oral: profile.subSkills.oral.length,
    }).toEqual({ topics: 12, reading: 8, writing: 10, oral: 8 });
  });
});
