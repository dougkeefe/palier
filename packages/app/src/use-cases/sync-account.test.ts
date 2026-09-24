import { type Attempt, attemptId, itemId, sessionId } from "@palier/domain";
import { describe, expect, it, vi } from "vitest";

import type { KeyVault, Session, SyncTransport } from "../ports/index.js";
import { PairCodeRejectedError, SyncUnavailableError, deviceId } from "../ports/index.js";
import {
  attemptStore,
  fakeServer,
  scheduleStore,
  sessionStore,
  settingsStore,
  syncStateStore,
} from "./__tests__/sync-fakes.js";
import {
  deleteEverywhere,
  listDevices,
  pairDevice,
  removeDevice,
  requestPairCode,
  setSyncEnabled,
} from "./sync-account.js";
import { syncNow } from "./sync-now.js";

const NOW = "2026-09-24T12:00:00.000Z";

const anAttempt = (id: string): Attempt => ({
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
});

const done: Session = {
  id: sessionId("s-1"),
  mode: "drill",
  startedAt: "2026-09-24T09:00:00.000Z",
  completedAt: "2026-09-24T09:15:00.000Z",
};

const vault = (): KeyVault => ({
  putApiKey: () => Promise.resolve(),
  withApiKey: () => Promise.reject(new Error("no key")),
  hasApiKey: () => Promise.resolve(false),
  clear: () => Promise.resolve(),
  deviceSecret: () => Promise.resolve("secret"),
});

const aDevice = (transport: SyncTransport) => ({
  clock: { now: () => NOW },
  transport,
  syncState: syncStateStore(),
  attempts: attemptStore(),
  schedule: scheduleStore(),
  sessions: sessionStore(),
  settings: settingsStore(),
  vault: vault(),
});

const aRegisteredDevice = async (transport: SyncTransport) => {
  const device = aDevice(transport);
  await device.sessions.create(done);
  await syncNow({ label: "Laptop" }, device);
  return device;
};

describe("requestPairCode", () => {
  it("registers a device that has not yet registered, since asking for a code is asking to sync", async () => {
    const device = aDevice(fakeServer().transport("secret-a"));

    const { code } = await requestPairCode({ label: "Laptop" }, device);

    expect(code).toMatch(/^CODE/);
    expect((await device.syncState.state()).identity).not.toBeNull();
  });

  it("does not register again when the device already has an identity", async () => {
    const device = await aRegisteredDevice(fakeServer().transport("secret-a"));
    const register = vi.spyOn(device.transport, "registerDevice");

    await requestPairCode({ label: "Laptop" }, device);

    expect(register).not.toHaveBeenCalled();
  });
});

describe("pairDevice", () => {
  it("joins the code's account, then pulls its progress and pushes this device's own", async () => {
    const server = fakeServer();
    const a = await aRegisteredDevice(server.transport("secret-a"));
    await a.attempts.append(anAttempt("from-a"));
    await syncNow({ label: "Laptop" }, a);
    const { code } = await requestPairCode({ label: "Laptop" }, a);
    const b = aDevice(server.transport("secret-b"));
    await b.attempts.append(anAttempt("from-b"));

    const outcome = await pairDevice({ code, label: "Phone" }, b);

    expect(outcome).toMatchObject({ status: "synced", pushed: 1 });
    expect(server.accountOf("secret-b")).toBe(server.accountOf("secret-a"));
    expect((await b.attempts.all()).map((x) => x.id).sort()).toEqual(["from-a", "from-b"]);
    await syncNow({ label: "Laptop" }, a);
    expect((await a.attempts.all()).map((x) => x.id).sort()).toEqual(["from-a", "from-b"]);
  });

  it("forgets the old account's ledger and switches sync on", async () => {
    const server = fakeServer();
    const a = await aRegisteredDevice(server.transport("secret-a"));
    const { code } = await requestPairCode({ label: "Laptop" }, a);
    const b = await aRegisteredDevice(server.transport("secret-b"));
    await b.syncState.update({ enabled: false });
    const reset = vi.spyOn(b.syncState, "resetLedger");

    await pairDevice({ code, label: "Phone" }, b);

    expect(reset).toHaveBeenCalled();
    expect((await b.syncState.state()).enabled).toBe(true);
  });

  it("forgets its account when a redeem's answer is lost, so the next sync learns which account it is in", async () => {
    const server = fakeServer();
    const a = await aRegisteredDevice(server.transport("secret-a"));
    await a.attempts.append(anAttempt("from-a"));
    await syncNow({ label: "Laptop" }, a);
    const { code } = await requestPairCode({ label: "Laptop" }, a);
    const b = await aRegisteredDevice(server.transport("secret-b"));
    await b.attempts.append(anAttempt("from-b"));
    await syncNow({ label: "Phone" }, b);
    const transport = b.transport;
    const lostAnswer: SyncTransport = {
      ...transport,
      redeemPairCode: async (c, label) => {
        await transport.redeemPairCode(c, label);
        throw new SyncUnavailableError("response lost");
      },
    };

    await expect(pairDevice({ code, label: "Phone" }, { ...b, transport: lostAnswer })).rejects.toThrow(SyncUnavailableError);
    await syncNow({ label: "Phone" }, b);

    expect((await b.syncState.state()).identity?.accountId).toBe(server.accountOf("secret-a"));
    expect((await b.attempts.all()).map((x) => x.id).sort()).toEqual(["from-a", "from-b"]);
  });

  it("lets a rejected code through and leaves the device as it was", async () => {
    const b = aDevice(fakeServer().transport("secret-b"));

    await expect(pairDevice({ code: "WRONG1", label: "Phone" }, b)).rejects.toThrow(PairCodeRejectedError);
    expect((await b.syncState.state()).identity).toBeNull();
  });
});

describe("listDevices and removeDevice", () => {
  it("lists nothing for a device that has not registered, without asking the server", async () => {
    const device = aDevice(fakeServer().transport("secret-a"));
    const list = vi.spyOn(device.transport, "listDevices");

    expect(await listDevices(device)).toEqual([]);
    expect(list).not.toHaveBeenCalled();
  });

  it("lists the account's devices, marking this one", async () => {
    const device = await aRegisteredDevice(fakeServer().transport("secret-a"));

    expect(await listDevices(device)).toEqual([
      expect.objectContaining({ label: "Laptop", current: true }),
    ]);
  });

  it("removes another device and stays in the account", async () => {
    const server = fakeServer();
    const a = await aRegisteredDevice(server.transport("secret-a"));
    const { code } = await requestPairCode({ label: "Laptop" }, a);
    const b = aDevice(server.transport("secret-b"));
    await pairDevice({ code, label: "Phone" }, b);
    const phone = (await listDevices(a)).find((d) => !d.current);

    await removeDevice({ id: phone?.id ?? deviceId("") }, a);

    expect(server.accountOf("secret-b")).toBeUndefined();
    expect((await a.syncState.state()).identity).not.toBeNull();
  });

  it("leaves the account when removing this device, and turns sync off rather than re-registering", async () => {
    const device = await aRegisteredDevice(fakeServer().transport("secret-a"));
    const self = (await device.syncState.state()).identity?.deviceId ?? deviceId("");

    await removeDevice({ id: self }, device);

    expect(await device.syncState.state()).toMatchObject({ identity: null, enabled: false });
  });
});

describe("setSyncEnabled", () => {
  it("turning sync on forgets the ledger, so the full local set is pushed next (§9.4)", async () => {
    const device = await aRegisteredDevice(fakeServer().transport("secret-a"));
    await setSyncEnabled({ enabled: false }, device);

    await setSyncEnabled({ enabled: true }, device);

    expect(await device.syncState.ledger()).toEqual([]);
    expect(await device.syncState.state()).toMatchObject({ enabled: true, watermark: 0 });
  });

  it("turning sync off keeps the identity and the server copy unless asked to delete it", async () => {
    const server = fakeServer();
    const device = await aRegisteredDevice(server.transport("secret-a"));

    await setSyncEnabled({ enabled: false }, device);

    expect(await device.syncState.state()).toMatchObject({ enabled: false });
    expect((await device.syncState.state()).identity).not.toBeNull();
    expect(server.accountOf("secret-a")).toBeDefined();
  });

  it("turning sync off with deletion deletes the server copy and forgets the identity", async () => {
    const server = fakeServer();
    const device = await aRegisteredDevice(server.transport("secret-a"));

    await setSyncEnabled({ enabled: false, deleteFromServer: true }, device);

    expect(server.accountOf("secret-a")).toBeUndefined();
    expect(await device.syncState.state()).toMatchObject({ enabled: false, identity: null });
  });

  it("has nothing to delete for a device that never registered", async () => {
    const device = aDevice(fakeServer().transport("secret-a"));
    const del = vi.spyOn(device.transport, "deleteAccount");

    await setSyncEnabled({ enabled: false, deleteFromServer: true }, device);

    expect(del).not.toHaveBeenCalled();
  });
});

describe("deleteEverywhere", () => {
  it("deletes the server copy, then everything on this device, then the sync bookkeeping", async () => {
    const server = fakeServer();
    const device = await aRegisteredDevice(server.transport("secret-a"));
    await device.attempts.append(anAttempt("a"));

    await deleteEverywhere(device);

    expect(server.accountOf("secret-a")).toBeUndefined();
    expect(await device.attempts.all()).toEqual([]);
    expect(await device.sessions.all()).toEqual([]);
    expect((await device.syncState.state()).identity).toBeNull();
  });

  it("touches nothing local when the server cannot be reached", async () => {
    const device = await aRegisteredDevice(fakeServer().transport("secret-a"));
    vi.spyOn(device.transport, "deleteAccount").mockRejectedValue(new SyncUnavailableError("offline"));

    await expect(deleteEverywhere(device)).rejects.toThrow(SyncUnavailableError);
    expect(await device.sessions.all()).toHaveLength(1);
  });

  it("only wipes locally for a device that never registered", async () => {
    const device = aDevice(fakeServer().transport("secret-a"));
    const del = vi.spyOn(device.transport, "deleteAccount");
    await device.attempts.append(anAttempt("a"));

    await deleteEverywhere(device);

    expect(del).not.toHaveBeenCalled();
    expect(await device.attempts.all()).toEqual([]);
  });
});
