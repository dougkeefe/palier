import { describe, expect, it } from "vitest";

import { selectionSeedFor, systemClock } from "./system-clock";

describe("systemClock", () => {
  it("reports the injected wall-clock time as an ISO-8601 UTC string", () => {
    const clock = systemClock(() => new Date(Date.UTC(2026, 8, 24, 13, 5, 0)));
    expect(clock.now()).toBe("2026-09-24T13:05:00.000Z");
  });

  it("reads the real clock when no source is injected", () => {
    const before = Date.now();
    const at = Date.parse(systemClock().now());
    expect(at).toBeGreaterThanOrEqual(before);
    expect(at).toBeLessThanOrEqual(Date.now());
  });
});

describe("selectionSeedFor", () => {
  it("gives every moment of one UTC day the same seed, so a reload replays today's plan", () => {
    expect(selectionSeedFor("2026-09-24T00:00:00.000Z")).toBe(
      selectionSeedFor("2026-09-24T23:59:59.999Z"),
    );
  });

  it("gives consecutive days different seeds, so each day draws a fresh order", () => {
    const seeds = new Set(
      ["2026-09-23", "2026-09-24", "2026-09-25", "2026-10-24", "2027-09-24"].map((d) =>
        selectionSeedFor(`${d}T12:00:00.000Z`),
      ),
    );
    expect(seeds.size).toBe(5);
  });

  it("is an unsigned 32-bit integer, which is what seededRandom takes", () => {
    const seed = selectionSeedFor("2026-09-24T12:00:00.000Z");
    expect(Number.isInteger(seed)).toBe(true);
    expect(seed).toBeGreaterThanOrEqual(0);
    expect(seed).toBeLessThan(2 ** 32);
  });
});
