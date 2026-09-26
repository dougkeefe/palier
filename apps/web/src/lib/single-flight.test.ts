import { describe, expect, it } from "vitest";

import { singleFlight } from "./single-flight";

/** A task whose runs finish only when the test says so. */
const gated = () => {
  const releases: (() => void)[] = [];
  let runs = 0;
  const task = () => {
    runs += 1;
    return new Promise<void>((resolve) => releases.push(resolve));
  };
  return { task, runs: () => runs, release: () => releases.shift()?.() };
};

const tick = () => new Promise((resolve) => setTimeout(resolve, 0));

describe("singleFlight", () => {
  it("runs the task when called", async () => {
    let runs = 0;
    await singleFlight(() => {
      runs += 1;
      return Promise.resolve();
    })();
    expect(runs).toBe(1);
  });

  it("never runs two at once, and gives calls made meanwhile exactly one more run", async () => {
    const { task, runs, release } = gated();
    const flush = singleFlight(task);

    void flush();
    void flush();
    void flush();
    expect(runs()).toBe(1);

    release();
    await tick();
    expect(runs()).toBe(2);

    release();
    await tick();
    expect(runs()).toBe(2);
  });

  it("runs again for a call after the last run finished", async () => {
    let runs = 0;
    const flush = singleFlight(() => {
      runs += 1;
      return Promise.resolve();
    });
    await flush();
    await flush();
    expect(runs).toBe(2);
  });

  it("swallows a failed run, and runs again on the next call", async () => {
    let runs = 0;
    const flush = singleFlight(() => {
      runs += 1;
      return runs === 1 ? Promise.reject(new Error("offline")) : Promise.resolve();
    });
    await expect(flush()).resolves.toBeUndefined();
    await flush();
    expect(runs).toBe(2);
  });
});
