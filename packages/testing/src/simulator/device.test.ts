import type { SyncTransport } from "@palier/app";
import { itemId } from "@palier/domain";
import { describe, expect, it } from "vitest";

import { fakeClock } from "../clock/fake-clock.js";
import { fixtureBankRepository } from "../fixtures/bank.js";
import { memorySyncServer } from "../memory/index.js";
import { psc } from "./__tests__/profile.js";
import { simulatedDevice } from "./device.js";

const aDevice = (transport: SyncTransport = memorySyncServer().transport("a")) =>
  simulatedDevice({ name: "d0", idSeed: 1, clock: fakeClock(), transport, items: fixtureBankRepository(), profile: psc });

describe("simulatedDevice", () => {
  it("records an attempt for each answer, through the real answerItem", async () => {
    const device = aDevice();

    const recorded = await device.study([{ itemId: itemId("fixture-item-01"), correct: true, changedAnswer: false }], true);

    expect(recorded.map((r) => r.id)).toEqual((await device.deps.attempts.all()).map((a) => a.id));
  });

  it("scores an answer marked wrong as wrong", async () => {
    const device = aDevice();

    await device.study([{ itemId: itemId("fixture-item-01"), correct: false, changedAnswer: false }], false);

    expect((await device.deps.attempts.all())[0]?.correct).toBe(false);
  });

  it("skips an answer to an item the bank does not hold", async () => {
    const device = aDevice();

    expect(await device.study([{ itemId: itemId("no-such-item"), correct: true, changedAnswer: false }], false)).toEqual([]);
  });

  it("runs one sync at a time: asking again while one runs waits for that one", async () => {
    const device = aDevice();
    await device.study([], true);

    const [first, second] = await Promise.all([device.sync(), device.sync()]);

    expect(second).toBe(first);
  });

  it("raises a background sync's defect when it is waited for, since a throw from sync is a bug", async () => {
    const transport = memorySyncServer().transport("a");
    const device = aDevice({ ...transport, pull: () => Promise.reject(new Error("defect")) });
    await device.study([], true);

    device.syncInBackground();

    await expect(device.idle()).rejects.toThrow("defect");
  });

  it("lists every record it holds under its sync key", async () => {
    const device = aDevice();
    await device.setSetting("dailyGoal", 20);
    await device.study([{ itemId: itemId("fixture-item-01"), correct: false, changedAnswer: false }], true);

    expect([...(await device.records()).keys()].map((k) => k.split(":")[0]).sort()).toEqual([
      "attempt",
      "schedule",
      "session",
      "setting",
    ]);
  });
});
