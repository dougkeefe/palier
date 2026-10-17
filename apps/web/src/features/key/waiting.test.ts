import { describe, expect, it } from "vitest";

import { SLOW_WAIT_MS, waitView } from "./waiting";

describe("waitView (D237)", () => {
  it("shows the time waited as m:ss, and announces no minute before the first is up", () => {
    expect(waitView(0)).toEqual({ elapsed: "0:00", minutes: 0, slow: false });
    expect(waitView(23_400)).toEqual({ elapsed: "0:23", minutes: 0, slow: false });
  });

  it("says the wait is slow from the minute the screens promise, and counts whole minutes", () => {
    expect(waitView(SLOW_WAIT_MS - 1).slow).toBe(false);
    expect(waitView(SLOW_WAIT_MS)).toEqual({ elapsed: "1:00", minutes: 1, slow: true });
    expect(waitView(125_000)).toEqual({ elapsed: "2:05", minutes: 2, slow: true });
  });

  it("never shows a negative time, as a clock stepped back would give", () => {
    expect(waitView(-5_000)).toEqual({ elapsed: "0:00", minutes: 0, slow: false });
  });
});
