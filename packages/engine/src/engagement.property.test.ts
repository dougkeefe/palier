import fc from "fast-check";
import { describe, expect, it } from "vitest";

import { MILESTONES, localDay, milestonesReached, streak } from "./engagement.js";

/**
 * The streak is a function of the day *set* (D73): two synced devices gather the same days in
 * different orders, and must show the same streak. And it behaves like a streak: more activity, or
 * a bigger allowance, never shortens it, and the freeze never spends more than its allowance.
 */
const TODAY = "2026-09-29";
const TODAY_MS = Date.parse(`${TODAY}T00:00:00.000Z`);
const DAY_MS = 86_400_000;

const dayBack = fc.integer({ min: 0, max: 120 }).map((n) => new Date(TODAY_MS - n * DAY_MS).toISOString().slice(0, 10));
const days = fc.array(dayBack, { maxLength: 80 });
const allowance = fc.integer({ min: 0, max: 4 });

describe("streak, over any history", () => {
  it("does not depend on the order of the days, or on duplicates", () => {
    fc.assert(
      fc.property(days, allowance, (history, freezes) => {
        const forward = streak({ days: history, today: TODAY, freezesPerMonth: freezes });
        const shuffled = [...history].reverse().concat(history.slice(0, 3));
        expect(streak({ days: shuffled, today: TODAY, freezesPerMonth: freezes })).toEqual(forward);
      }),
    );
  });

  it("is never longer than the number of distinct active days", () => {
    fc.assert(
      fc.property(days, allowance, (history, freezes) => {
        expect(streak({ days: history, today: TODAY, freezesPerMonth: freezes }).length).toBeLessThanOrEqual(
          new Set(history).size,
        );
      }),
    );
  });

  it("never freezes more than the allowance in a calendar month, and never an active day", () => {
    fc.assert(
      fc.property(days, allowance, (history, freezes) => {
        const { frozen } = streak({ days: history, today: TODAY, freezesPerMonth: freezes });
        const perMonth = new Map<string, number>();
        for (const day of frozen) perMonth.set(day.slice(0, 7), (perMonth.get(day.slice(0, 7)) ?? 0) + 1);
        for (const count of perMonth.values()) expect(count).toBeLessThanOrEqual(freezes);
        for (const day of frozen) expect(history).not.toContain(day);
      }),
    );
  });

  it("is never shortened by one more active day", () => {
    fc.assert(
      fc.property(days, dayBack, allowance, (history, extra, freezes) => {
        const before = streak({ days: history, today: TODAY, freezesPerMonth: freezes });
        const after = streak({ days: [...history, extra], today: TODAY, freezesPerMonth: freezes });
        expect(after.length).toBeGreaterThanOrEqual(before.length);
      }),
    );
  });

  it("is never shortened by a bigger allowance", () => {
    fc.assert(
      fc.property(days, allowance, (history, freezes) => {
        const smaller = streak({ days: history, today: TODAY, freezesPerMonth: freezes });
        const bigger = streak({ days: history, today: TODAY, freezesPerMonth: freezes + 1 });
        expect(bigger.length).toBeGreaterThanOrEqual(smaller.length);
      }),
    );
  });
});

describe("localDay, over any instant", () => {
  it("is never more than a day from the UTC date, in either direction", () => {
    const zones = ["America/Toronto", "America/Vancouver", "America/St_Johns", "America/Halifax", "UTC"];
    fc.assert(
      fc.property(
        fc.integer({ min: Date.parse("2020-01-01T00:00:00Z"), max: Date.parse("2030-12-31T00:00:00Z") }),
        fc.constantFrom(...zones),
        (ms, zone) => {
          const local = Date.parse(`${localDay(new Date(ms).toISOString(), zone)}T00:00:00.000Z`);
          const utc = Date.parse(`${new Date(ms).toISOString().slice(0, 10)}T00:00:00.000Z`);
          expect(Math.abs(local - utc)).toBeLessThanOrEqual(DAY_MS);
        },
      ),
    );
  });
});

describe("milestonesReached, over any facts", () => {
  const facts = fc.record({
    examsSubmitted: fc.nat({ max: 20 }),
    examsAtOrAboveC: fc.nat({ max: 20 }),
    oralSessionsEnded: fc.nat({ max: 20 }),
    itemsAnswered: fc.nat({ max: 3000 }),
  });
  const more = fc.record({
    examsSubmitted: fc.nat({ max: 5 }),
    examsAtOrAboveC: fc.nat({ max: 5 }),
    oralSessionsEnded: fc.nat({ max: 5 }),
    itemsAnswered: fc.nat({ max: 500 }),
  });

  it("never un-reaches a milestone as activity grows, and keeps the fixed order", () => {
    fc.assert(
      fc.property(facts, more, (before, extra) => {
        const after = {
          examsSubmitted: before.examsSubmitted + extra.examsSubmitted,
          examsAtOrAboveC: before.examsAtOrAboveC + extra.examsAtOrAboveC,
          oralSessionsEnded: before.oralSessionsEnded + extra.oralSessionsEnded,
          itemsAnswered: before.itemsAnswered + extra.itemsAnswered,
        };
        const earlier = milestonesReached(before, { itemsAnswered: 1000 });
        const later = milestonesReached(after, { itemsAnswered: 1000 });
        for (const id of earlier) expect(later).toContain(id);
        expect([...later]).toEqual(MILESTONES.filter((id) => later.includes(id)));
      }),
    );
  });
});
