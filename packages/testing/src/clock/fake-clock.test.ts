import fc from "fast-check";
import { describe, expect, it } from "vitest";

import { fakeClock } from "./fake-clock.js";

describe("fakeClock", () => {
  it("starts at the instant it was given", () => {
    expect(fakeClock("2026-03-04T05:06:07.000Z").now()).toBe(
      "2026-03-04T05:06:07.000Z",
    );
  });

  it("rejects an unparseable start", () => {
    expect(() => fakeClock("not an instant")).toThrow(TypeError);
  });

  it("refuses to run time backwards", () => {
    expect(() => fakeClock().advance(-1)).toThrow(RangeError);
  });

  it("jumps to an instant when set", () => {
    const clock = fakeClock();
    clock.set("2030-12-25T00:00:00.000Z");

    expect(clock.now()).toBe("2030-12-25T00:00:00.000Z");
  });

  it("rejects an unparseable instant when set", () => {
    expect(() => fakeClock().set("not an instant")).toThrow(TypeError);
  });

  it("does not read the system clock", () => {
    const clock = fakeClock("2026-01-01T00:00:00.000Z");
    const before = clock.now();
    // Any real elapsed time between these two calls must not show up.
    expect(clock.now()).toBe(before);
  });
});

describe("fakeClock, as a property", () => {
  it("advancing by a duration moves now forward by exactly that duration", () => {
    fc.assert(
      fc.property(fc.integer({ min: 0, max: 10 ** 12 }), (duration) => {
        const start = "2026-01-01T00:00:00.000Z";
        const clock = fakeClock(start);
        clock.advance(duration);

        expect(Date.parse(clock.now()) - Date.parse(start)).toBe(duration);
      }),
    );
  });
});
