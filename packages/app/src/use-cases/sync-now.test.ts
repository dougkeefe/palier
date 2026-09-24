import { type Attempt, attemptId, itemId, sessionId } from "@palier/domain";
import { describe, expect, it, vi } from "vitest";

import type { ScheduleEntry, Session, SyncTransport } from "../ports/index.js";
import { SyncUnauthorizedError, SyncUnavailableError, deviceId } from "../ports/index.js";
import { recordHash } from "../sync/records.js";
import {
  type FakeServer,
  attemptStore,
  fakeServer,
  scheduleStore,
  sessionStore,
  settingsStore,
  syncStateStore,
} from "./__tests__/sync-fakes.js";
import { MAX_PUSH_ROUNDS, PUSH_BATCH, type SyncNowDeps, syncNow } from "./sync-now.js";

const NOW = "2026-09-24T12:00:00.000Z";

const anAttempt = (id: string, over: Partial<Attempt> = {}): Attempt => ({
  id: attemptId(id),
  itemId: itemId(`item-${id}`),
  bankVersion: 1,
  skill: "reading",
  sessionId: sessionId("s-1"),
  chosen: "a",
  correct: true,
  msToFirstSelect: 1000,
  msToConfirm: 2000,
  changedAnswer: false,
  mode: "drill",
  ts: "2026-09-24T10:00:00.000Z",
  ...over,
});

const anEntry = (id: string, over: Partial<ScheduleEntry> = {}): ScheduleEntry => ({
  itemId: itemId(id),
  due: "2026-09-25T00:00:00.000Z",
  skill: "reading",
  box: 1,
  ...over,
});

const done: Session = {
  id: sessionId("s-1"),
  mode: "drill",
  startedAt: "2026-09-24T09:00:00.000Z",
  completedAt: "2026-09-24T09:15:00.000Z",
};

type Device = SyncNowDeps & { readonly sync: () => ReturnType<typeof syncNow> };

const aDevice = (transport: SyncTransport, over: Partial<SyncNowDeps> = {}): Device => {
  const deps: SyncNowDeps = {
    clock: { now: () => NOW },
    transport,
    syncState: syncStateStore(),
    attempts: attemptStore(),
    schedule: scheduleStore(),
    sessions: sessionStore(),
    settings: settingsStore(),
    ...over,
  };
  return { ...deps, sync: () => syncNow({ label: "Test browser" }, deps) };
};

/** A device that has completed a session, so registration is no longer deferred. */
const aStudiedDevice = async (server: FakeServer, secret: string): Promise<Device> => {
  const device = aDevice(server.transport(secret));
  await device.sessions.create(done);
  return device;
};

/** Two devices on one account, both synced once. */
const aPair = async () => {
  const server = fakeServer();
  const a = await aStudiedDevice(server, "secret-a");
  await a.sync();
  const { code } = await a.transport.requestPairCode();
  const b = aDevice(server.transport("secret-b"));
  const identity = await b.transport.redeemPairCode(code, "Phone");
  await b.syncState.update({ identity });
  await b.sync();
  return { server, a, b };
};

describe("syncNow — when it does nothing", () => {
  it("does nothing while sync is switched off", async () => {
    const transport = fakeServer().transport("s");
    const pull = vi.spyOn(transport, "pull");
    const device = aDevice(transport, { syncState: syncStateStore({ enabled: false }) });

    expect(await device.sync()).toEqual({ status: "off" });
    expect(pull).not.toHaveBeenCalled();
  });

  it("defers registration until a session is complete, so a visitor creates nothing (§9.3)", async () => {
    const transport = fakeServer().transport("s");
    const register = vi.spyOn(transport, "registerDevice");
    const device = aDevice(transport);
    await device.sessions.create({ ...done, completedAt: null });

    expect(await device.sync()).toEqual({ status: "waiting" });
    expect(register).not.toHaveBeenCalled();
    expect((await device.syncState.state()).identity).toBeNull();
  });
});

describe("syncNow — the first sync", () => {
  it("registers once after the first completed session, then pushes every local record", async () => {
    const server = fakeServer();
    const device = await aStudiedDevice(server, "secret-a");
    await device.attempts.append(anAttempt("a"));
    await device.schedule.put(anEntry("item-a"));
    await device.settings.set("goal", 20);

    const outcome = await device.sync();

    expect(outcome).toEqual({ status: "synced", pulled: 0, pushed: 4, merged: 0, at: NOW });
    const state = await device.syncState.state();
    expect(state.identity?.accountId).toBe(server.accountOf("secret-a"));
    expect(state.lastSyncedAt).toBe(NOW);
    expect(server.docs(state.identity?.accountId ?? "").map((d) => d.type).sort()).toEqual(
      ["attempt", "schedule", "session", "setting"],
    );
  });

  it("pushes nothing the second time when nothing has changed", async () => {
    const server = fakeServer();
    const device = await aStudiedDevice(server, "secret-a");
    await device.sync();
    const register = vi.spyOn(device.transport, "registerDevice");

    expect(await device.sync()).toMatchObject({ status: "synced", pulled: 0, pushed: 0, merged: 0 });
    expect(register).not.toHaveBeenCalled();
  });
});

describe("syncNow — pulling", () => {
  it("writes a record the device does not have and reports the count as it lands", async () => {
    const { a, b } = await aPair();
    await a.attempts.append(anAttempt("from-a"));
    await a.sync();
    const onPulled = vi.fn();

    const outcome = await syncNow({ label: "Phone", onPulled }, b);

    expect(outcome).toMatchObject({ status: "synced", pulled: 1, pushed: 0 });
    expect((await b.attempts.all()).map((x) => x.id)).toContain("from-a");
    expect(onPulled).toHaveBeenLastCalledWith(1);
  });

  it("fast-forwards a record this device has not changed, so the other device's progress arrives", async () => {
    const { a, b } = await aPair();
    await a.schedule.put(anEntry("item-x", { box: 1 }));
    await a.sync();
    await b.sync();
    await a.schedule.put(anEntry("item-x", { box: 3, due: "2026-10-01T00:00:00.000Z" }));
    await a.sync();

    expect(await b.sync()).toMatchObject({ pulled: 1, merged: 0 });
    expect((await b.schedule.get(itemId("item-x")))?.box).toBe(3);
  });

  it("writes a setting the device has never set", async () => {
    const { a, b } = await aPair();
    await a.settings.set("dailyGoal", 20);
    await a.sync();

    await b.sync();

    expect(await b.settings.get("dailyGoal")).toBe(20);
  });

  it("skips a malformed document rather than writing it", async () => {
    const { server, a, b } = await aPair();
    const account = server.accountOf("secret-a") ?? "";
    server.write(account, { type: "schedule", id: "bad", payload: { itemId: "bad", box: 0 } });

    expect(await b.sync()).toMatchObject({ status: "synced", pulled: 0 });
    expect(await b.schedule.get(itemId("bad"))).toBeNull();
    expect(await a.schedule.get(itemId("bad"))).toBeNull();
  });

  it("follows the continuation until the server has nothing more, keeping the watermark", async () => {
    const { server, a, b } = await aPair();
    server.pageSize = 2;
    for (const id of ["p1", "p2", "p3", "p4", "p5"]) await a.attempts.append(anAttempt(id));
    await a.sync();
    const pull = vi.spyOn(b.transport, "pull");

    expect(await b.sync()).toMatchObject({ pulled: 5 });
    expect(pull.mock.calls.length).toBeGreaterThan(2);
    const watermark = (await b.syncState.state()).watermark;
    expect(watermark).toBe(Math.max(...server.docs(server.accountOf("secret-a") ?? "").map((d) => d.revision)));
  });
});

describe("syncNow — the Gate B rule (progress.md D69)", () => {
  /**
   * The failure a naive `min(box)` merge would cause: once box 1 has synced, the
   * device's own later box 2 must replace it, not lose to it. This is a causally later
   * write, not a concurrent one, so nothing is merged.
   */
  it("lets a box rise after it has synced: a later write on the same device replaces the server's copy", async () => {
    const { server, a, b } = await aPair();
    await a.schedule.put(anEntry("item-x", { box: 1 }));
    await a.sync();
    await a.schedule.put(anEntry("item-x", { box: 2 }));

    expect(await a.sync()).toMatchObject({ pushed: 1, merged: 0 });
    await b.sync();
    expect((await b.schedule.get(itemId("item-x")))?.box).toBe(2);
    const stored = server.docs(server.accountOf("secret-a") ?? "").find((d) => d.id === "item-x");
    expect((stored?.payload as ScheduleEntry).box).toBe(2);
  });

  it("keeps the lower box on both devices when both changed the same item offline", async () => {
    const { a, b } = await aPair();
    await a.schedule.put(anEntry("item-x", { box: 2 }));
    await a.sync();
    await b.sync();
    await a.schedule.put(anEntry("item-x", { box: 3 }));
    await b.schedule.put(anEntry("item-x", { box: 1 }));

    await a.sync();
    expect(await b.sync()).toMatchObject({ merged: 1, pushed: 1 });
    await a.sync();

    expect((await a.schedule.get(itemId("item-x")))?.box).toBe(1);
    expect((await b.schedule.get(itemId("item-x")))?.box).toBe(1);
  });

  it("merges a conflict the push meets after the pull, then pushes the merge", async () => {
    const { server, a, b } = await aPair();
    await a.schedule.put(anEntry("item-x", { box: 2 }));
    await a.sync();
    await b.sync();
    await b.schedule.put(anEntry("item-x", { box: 4 }));
    // Another device writes box 1 between b's pull and its push.
    const pull = b.transport.pull;
    vi.spyOn(b.transport, "pull").mockImplementation(async (watermark) => {
      const page = await pull(watermark);
      server.write(server.accountOf("secret-a") ?? "", { type: "schedule", id: "item-x", payload: anEntry("item-x", { box: 1 }) });
      return page;
    });

    expect(await b.sync()).toMatchObject({ merged: 1 });
    expect((await b.schedule.get(itemId("item-x")))?.box).toBe(1);
  });

  /**
   * The app's background sync can fire mid-drill. The sync reads the device's records,
   * then waits on the network; an answer lands in that gap; then the pull brings the
   * other device's copy of the same item. The answer did not see that copy, so the two
   * are concurrent and must merge — not be overwritten by a snapshot taken before the
   * answer (found by the sync simulator; progress.md D75).
   */
  it("merges an answer made while its own sync was in flight, rather than overwriting it", async () => {
    const { a, b } = await aPair();
    await a.schedule.put(anEntry("item-x", { box: 2 }));
    await a.sync();
    await b.sync();
    await b.schedule.put(anEntry("item-x", { box: 3 }));
    await b.sync();
    const pull = a.transport.pull;
    vi.spyOn(a.transport, "pull").mockImplementationOnce(async (watermark) => {
      await a.schedule.put(anEntry("item-x", { box: 1 }));
      return pull(watermark);
    });

    expect(await a.sync()).toMatchObject({ merged: 1, pushed: 1 });
    await b.sync();

    expect((await a.schedule.get(itemId("item-x")))?.box).toBe(1);
    expect((await b.schedule.get(itemId("item-x")))?.box).toBe(1);
  });

  it("keeps a setting changed while its own sync was in flight", async () => {
    const { a, b } = await aPair();
    await b.settings.set("dailyGoal", 20);
    await b.sync();
    const pull = a.transport.pull;
    vi.spyOn(a.transport, "pull").mockImplementationOnce(async (watermark) => {
      await a.settings.set("dailyGoal", 30);
      return pull(watermark);
    });

    await a.sync();

    expect(await a.settings.get("dailyGoal")).toBe(30);
  });

  it("keeps a session completed while its own sync was in flight", async () => {
    const { a, b } = await aPair();
    const open: Session = { ...done, id: sessionId("s-open"), completedAt: null };
    await a.sessions.create(open);
    await a.sync();
    await b.sync();
    const pull = a.transport.pull;
    vi.spyOn(a.transport, "pull").mockImplementationOnce(async (watermark) => {
      await a.sessions.create({ ...open, completedAt: NOW });
      // The server hands back the open copy, as it would after another device's import.
      return { docs: [{ type: "session", id: "s-open", revision: 999, payload: open }], watermark: await pull(watermark).then((p) => p.watermark), more: false };
    });

    await a.sync();

    expect((await a.sessions.all()).find((x) => x.id === open.id)?.completedAt).toBe(NOW);
  });

  it("gives up after a bounded number of rounds against a server that keeps conflicting", async () => {
    const { a } = await aPair();
    const push = vi.spyOn(a.transport, "push").mockImplementation((items) =>
      Promise.resolve({
        accepted: [],
        conflicts: items.map((i) => ({ type: i.type, id: i.id, revision: 999, payload: anEntry("item-x", { box: 9 }) })),
      }),
    );
    await a.schedule.put(anEntry("item-x", { box: 2 }));

    expect(await a.sync()).toMatchObject({ status: "synced", pushed: 0 });
    expect(push).toHaveBeenCalledTimes(MAX_PUSH_ROUNDS);
  });

  it("ignores an acceptance for a record the device does not hold", async () => {
    const { a } = await aPair();
    vi.spyOn(a.transport, "push").mockResolvedValue({
      accepted: [{ type: "attempt", id: "ghost", revision: 50 }],
      conflicts: [],
    });
    await a.attempts.append(anAttempt("real"));

    expect(await a.sync()).toMatchObject({ pushed: 0 });
    expect((await a.syncState.ledger()).some((e) => e.id === "ghost")).toBe(false);
  });
});

describe("syncNow — batching", () => {
  it(`pushes at most ${String(PUSH_BATCH)} records per request`, async () => {
    const server = fakeServer();
    const device = await aStudiedDevice(server, "secret-a");
    for (let i = 0; i < PUSH_BATCH + 1; i++) await device.attempts.append(anAttempt(`b${String(i)}`));
    const push = vi.spyOn(device.transport, "push");

    expect(await device.sync()).toMatchObject({ pushed: PUSH_BATCH + 2 });
    expect(push.mock.calls.map(([items]) => items.length)).toEqual([PUSH_BATCH, 2]);
  });
});

describe("syncNow — failure never interrupts study (§11)", () => {
  it("reports an unreachable service as an outcome, not a throw", async () => {
    const { a } = await aPair();
    vi.spyOn(a.transport, "pull").mockRejectedValue(new SyncUnavailableError("offline"));

    expect(await a.sync()).toEqual({ status: "unavailable", reason: "offline" });
  });

  it("turns sync off and forgets the identity when the service no longer knows this device", async () => {
    const { a } = await aPair();
    vi.spyOn(a.transport, "pull").mockRejectedValue(new SyncUnauthorizedError());

    expect(await a.sync()).toEqual({ status: "removed" });
    const state = await a.syncState.state();
    expect(state).toMatchObject({ identity: null, enabled: false, watermark: 0 });
    expect(await a.syncState.ledger()).toEqual([]);
  });

  it("lets any other error through, because it is a bug, not a network condition", async () => {
    const { a } = await aPair();
    vi.spyOn(a.transport, "pull").mockRejectedValue(new TypeError("boom"));

    await expect(a.sync()).rejects.toThrow("boom");
  });
});

describe("syncNow — the ledger", () => {
  it("records the server's revision and the record's hash for everything it agreed on", async () => {
    const server = fakeServer();
    const device = await aStudiedDevice(server, "secret-a");
    await device.sync();

    const ledger = await device.syncState.ledger();
    expect(ledger).toEqual([{ type: "session", id: "s-1", revision: 1, hash: recordHash(done) }]);
    expect(deviceId("x")).toBe("x");
  });
});
