import { INITIAL_SYNC_STATE, deviceId } from "@palier/app";
import { describe, expect, it } from "vitest";

import { INITIAL_VIEW, joinFailure, statusLine, viewFromOutcome, viewFromState, viewSyncing } from "./sync-view";

const identity = { accountId: "a", deviceId: deviceId("d") };

describe("viewFromState", () => {
  it("is off when the switch is off, whatever else is true", () => {
    expect(viewFromState({ ...INITIAL_SYNC_STATE, enabled: false }, false).indicator).toBe("off");
  });

  it("is offline, with the reason, when the browser is offline", () => {
    expect(viewFromState(INITIAL_SYNC_STATE, false)).toMatchObject({ indicator: "offline", reason: "offline" });
  });

  it("is on, not synced, until this device has a copy on the server", () => {
    expect(viewFromState(INITIAL_SYNC_STATE, true)).toEqual({ indicator: "on", reason: null, lastSyncedAt: null, paired: false });
  });

  it("is synced, and paired, once it has synced before", () => {
    const at = "2026-09-24T12:00:00.000Z";
    expect(viewFromState({ ...INITIAL_SYNC_STATE, identity, lastSyncedAt: at }, true)).toEqual({
      indicator: "synced",
      reason: null,
      lastSyncedAt: at,
      paired: true,
    });
  });
});

describe("viewFromOutcome", () => {
  it("is synced after an exchange, at the exchange's time", () => {
    expect(viewFromOutcome({ status: "synced", pulled: 0, pushed: 0, merged: 0, at: "t" }, INITIAL_VIEW, true)).toEqual({
      indicator: "synced",
      reason: null,
      lastSyncedAt: "t",
      paired: true,
    });
  });

  it("stays on while registration waits for a completed session", () => {
    expect(viewFromOutcome({ status: "waiting" }, viewSyncing(INITIAL_VIEW), true).indicator).toBe("on");
  });

  it("is off when sync was switched off, and off with a reason when the device was removed", () => {
    expect(viewFromOutcome({ status: "off" }, INITIAL_VIEW, true).indicator).toBe("off");
    expect(viewFromOutcome({ status: "removed" }, { ...INITIAL_VIEW, paired: true }, true)).toMatchObject({
      indicator: "off",
      reason: "removed",
      paired: false,
    });
  });

  it("shows an unreachable service as offline in the header, keeping the last sync time", () => {
    const before = { ...INITIAL_VIEW, lastSyncedAt: "t", indicator: "synced" as const };

    expect(viewFromOutcome({ status: "unavailable", reason: "x" }, before, true)).toMatchObject({
      indicator: "offline",
      reason: "unavailable",
      lastSyncedAt: "t",
    });
    expect(viewFromOutcome({ status: "unavailable", reason: "x" }, before, false).reason).toBe("offline");
  });
});

describe("statusLine", () => {
  const view = (over: Partial<typeof INITIAL_VIEW>) => ({ ...INITIAL_VIEW, ...over });

  it("names the reason sync is not running before anything else", () => {
    expect(statusLine(view({ indicator: "off", reason: "removed" }))).toBe("statusRemoved");
    expect(statusLine(view({ indicator: "off" }))).toBe("statusOff");
    expect(statusLine(view({ indicator: "offline", reason: "offline" }))).toBe("statusOffline");
    expect(statusLine(view({ indicator: "offline", reason: "unavailable" }))).toBe("statusUnavailable");
  });

  it("says it is syncing, when it last synced, or that it never has", () => {
    expect(statusLine(view({ indicator: "syncing" }))).toBe("statusSyncing");
    expect(statusLine(view({ indicator: "synced", lastSyncedAt: "t" }))).toBe("statusSynced");
    expect(statusLine(view({ indicator: "on" }))).toBe("statusNever");
  });
});

describe("joinFailure", () => {
  it("tells a rejected code from a service that could not be reached", () => {
    const rejected = Object.assign(new Error("no"), { name: "PairCodeRejectedError" });

    expect(joinFailure(rejected)).toBe("joinRejected");
    expect(joinFailure(new Error("network"))).toBe("unavailable");
    expect(joinFailure("thrown string")).toBe("unavailable");
  });
});
