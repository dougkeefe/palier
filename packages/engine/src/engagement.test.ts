import { describe, expect, it } from "vitest";

import { MILESTONES, localDay, milestonesReached, streak } from "./engagement.js";

describe("localDay", () => {
  it("is the calendar day on the device's clock, not UTC's", () => {
    // 23:30 in Toronto on 28 September is already the 29th in UTC.
    expect(localDay("2026-09-29T03:30:00.000Z", "America/Toronto")).toBe("2026-09-28");
    expect(localDay("2026-09-29T03:30:00.000Z", "UTC")).toBe("2026-09-29");
  });

  it("follows daylight saving time: the hour before and after the November change", () => {
    // EDT (UTC−4) until 06:00Z on 1 November 2026, EST (UTC−5) after.
    expect(localDay("2026-11-01T03:59:59.000Z", "America/Toronto")).toBe("2026-10-31");
    expect(localDay("2026-11-01T04:00:00.000Z", "America/Toronto")).toBe("2026-11-01");
    // In January, EST: midnight is 05:00Z.
    expect(localDay("2027-01-15T04:59:59.000Z", "America/Toronto")).toBe("2027-01-14");
  });

  it("handles a half-hour offset", () => {
    // Newfoundland daylight time is UTC−2:30.
    expect(localDay("2026-09-29T02:29:00.000Z", "America/St_Johns")).toBe("2026-09-28");
    expect(localDay("2026-09-29T02:31:00.000Z", "America/St_Johns")).toBe("2026-09-29");
  });

  it("refuses a value that is not an instant", () => {
    expect(() => localDay("yesterday", "UTC")).toThrow(RangeError);
  });

  it("refuses a time zone the runtime does not know", () => {
    expect(() => localDay("2026-09-29T12:00:00.000Z", "Mars/Olympus_Mons")).toThrow(RangeError);
  });
});

describe("streak", () => {
  const TODAY = "2026-09-29";

  it("is zero with no activity at all", () => {
    expect(streak({ days: [], today: TODAY, freezesPerMonth: 2 })).toEqual({ length: 0, frozen: [], doneToday: false });
  });

  it("counts consecutive days ending today", () => {
    const days = ["2026-09-27", "2026-09-28", "2026-09-29"];
    expect(streak({ days, today: TODAY, freezesPerMonth: 2 })).toEqual({ length: 3, frozen: [], doneToday: true });
  });

  it("is not broken by today still being to do", () => {
    const days = ["2026-09-27", "2026-09-28"];
    expect(streak({ days, today: TODAY, freezesPerMonth: 2 })).toEqual({ length: 2, frozen: [], doneToday: false });
  });

  it("freezes a missed day silently, and does not count it", () => {
    const days = ["2026-09-26", "2026-09-27", "2026-09-29"];
    expect(streak({ days, today: TODAY, freezesPerMonth: 2 })).toEqual({
      length: 3,
      frozen: ["2026-09-28"],
      doneToday: true,
    });
  });

  it("freezes yesterday when today is still to do, so opening the app the next day keeps it", () => {
    const days = ["2026-09-27"];
    expect(streak({ days, today: TODAY, freezesPerMonth: 2 })).toEqual({
      length: 1,
      frozen: ["2026-09-28"],
      doneToday: false,
    });
  });

  it("freezes at most the allowance in one calendar month, then ends", () => {
    // Three misses in September: the two newest are frozen, the third ends the streak.
    const days = ["2026-09-20", "2026-09-21", "2026-09-25", "2026-09-26", "2026-09-29"];
    const result = streak({ days, today: TODAY, freezesPerMonth: 2 });
    expect(result).toEqual({ length: 3, frozen: ["2026-09-28", "2026-09-27"], doneToday: true });
  });

  it("gives each calendar month its own allowance", () => {
    // 31 August and 1 September missed: one freeze from each month.
    const days = ["2026-08-29", "2026-08-30", "2026-09-02"];
    expect(streak({ days, today: "2026-09-02", freezesPerMonth: 1 })).toEqual({
      length: 3,
      frozen: ["2026-09-01", "2026-08-31"],
      doneToday: true,
    });
  });

  it("keeps no freeze the streak did not reach, and freezes nothing before its first day", () => {
    // Two misses before a third ends it: those two are not kept, since no active day precedes them.
    const days = ["2026-09-20", "2026-09-29"];
    expect(streak({ days, today: TODAY, freezesPerMonth: 2 })).toEqual({ length: 1, frozen: [], doneToday: true });
  });

  it("is zero when the last activity is too long ago, and says nothing was kept", () => {
    expect(streak({ days: ["2026-09-01"], today: TODAY, freezesPerMonth: 2 })).toEqual({
      length: 0,
      frozen: [],
      doneToday: false,
    });
  });

  it("with no allowance, is the unbroken run", () => {
    const days = ["2026-09-26", "2026-09-28", "2026-09-29"];
    expect(streak({ days, today: TODAY, freezesPerMonth: 0 })).toEqual({ length: 2, frozen: [], doneToday: true });
  });

  it("ignores a day after today, as a clock moved back would leave", () => {
    const days = ["2026-09-28", "2026-09-30"];
    expect(streak({ days, today: TODAY, freezesPerMonth: 2 })).toEqual({ length: 1, frozen: [], doneToday: false });
  });

  it("counts a day once, however many sessions it held", () => {
    const days = ["2026-09-29", "2026-09-29", "2026-09-28"];
    expect(streak({ days, today: TODAY, freezesPerMonth: 2 }).length).toBe(2);
  });

  it("refuses an allowance that is not a whole number of days", () => {
    expect(() => streak({ days: [], today: TODAY, freezesPerMonth: -1 })).toThrow(RangeError);
    expect(() => streak({ days: [], today: TODAY, freezesPerMonth: 1.5 })).toThrow(RangeError);
  });

  it("refuses a day that is not a local day", () => {
    expect(() => streak({ days: [], today: "29/09/2026", freezesPerMonth: 2 })).toThrow(RangeError);
    expect(() => streak({ days: ["2026-13-45"], today: TODAY, freezesPerMonth: 2 })).toThrow(RangeError);
  });
});

describe("milestonesReached", () => {
  const none = { examsSubmitted: 0, examsAtOrAboveC: 0, oralSessionsEnded: 0, itemsAnswered: 0 };
  const thresholds = { itemsAnswered: 1000 };

  it("reaches nothing with no activity", () => {
    expect(milestonesReached(none, thresholds)).toEqual([]);
  });

  it("reaches the first mock exam at one submitted exam", () => {
    expect(milestonesReached({ ...none, examsSubmitted: 1 }, thresholds)).toEqual(["first-exam"]);
  });

  it("reaches the first spoken session at one ended session", () => {
    expect(milestonesReached({ ...none, oralSessionsEnded: 1 }, thresholds)).toEqual(["first-oral"]);
  });

  it("reaches the items milestone at the threshold exactly, not one before", () => {
    expect(milestonesReached({ ...none, itemsAnswered: 999 }, thresholds)).toEqual([]);
    expect(milestonesReached({ ...none, itemsAnswered: 1000 }, thresholds)).toEqual(["items-answered"]);
  });

  it("reaches the first exam at C, in the fixed order, beside the rest", () => {
    const all = { examsSubmitted: 2, examsAtOrAboveC: 1, oralSessionsEnded: 3, itemsAnswered: 1200 };
    expect(milestonesReached(all, thresholds)).toEqual([...MILESTONES]);
  });
});
