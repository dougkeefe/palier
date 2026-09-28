import { describe, expect, it } from "vitest";

import { LEVEL_READ_MS, type LevelKit, measureLevel, rms } from "./level";

describe("rms (D119)", () => {
  it("is 0 for silence and for no samples, and the amplitude for a constant signal", () => {
    expect(rms([0, 0, 0])).toBe(0);
    expect(rms([])).toBe(0);
    expect(rms([0.5, -0.5, 0.5, -0.5])).toBe(0.5);
  });
});

describe("measureLevel (D119)", () => {
  it("reports every reading while it listens, settles with the loudest, and lets the microphone go", async () => {
    const readings = [0.01, 0.3, 0.05];
    const events: string[] = [];
    let tick: () => void = () => undefined;
    const kit: LevelKit = {
      open: () => ({ read: () => readings.shift() ?? 0, close: () => events.push("closed") }),
      every: (ms, fn) => {
        events.push(`every ${String(ms)}`);
        tick = fn;
        return () => events.push("stopped");
      },
      after: () => {
        tick();
        tick();
        tick();
        return Promise.resolve();
      },
    };
    const heard: number[] = [];

    const peak = await measureLevel({} as MediaStream, 3_000, (level) => heard.push(level), kit);

    expect(peak).toBe(0.3);
    expect(heard).toEqual([0.01, 0.3, 0.05]);
    expect(events).toEqual([`every ${String(LEVEL_READ_MS)}`, "stopped", "closed"]);
  });
});
