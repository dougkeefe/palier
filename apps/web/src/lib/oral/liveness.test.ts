import { sessionId } from "@palier/domain";
import { describe, expect, it } from "vitest";

import { type LockKit, ORAL_LOCK_PREFIX, webLocksLiveness } from "./liveness";

/** Web Locks as a map of held names: a lock is held while its callback's promise is pending. */
const fakeLocks = (others: readonly string[] = []) => {
  const held = new Set(others);
  const locks = {
    request: async (name: string, callback: () => Promise<void>) => {
      held.add(name);
      try {
        await callback();
      } finally {
        held.delete(name);
      }
    },
    query: () => Promise.resolve({ held: [...held].map((name) => ({ name, mode: "exclusive" as const })), pending: [] }),
  } as unknown as LockKit;
  return { locks, held };
};

const settle = () => new Promise((resolve) => setTimeout(resolve, 0));

describe("webLocksLiveness (D144)", () => {
  it("holds a session's lock until it is released", async () => {
    const { locks, held } = fakeLocks();
    const liveness = webLocksLiveness(locks);
    const release = liveness.hold(sessionId("s1"));
    await settle();

    expect(held).toEqual(new Set([`${ORAL_LOCK_PREFIX}s1`]));
    expect(await liveness.live()).toEqual(new Set([sessionId("s1")]));

    release();
    await settle();
    expect(await liveness.live()).toEqual(new Set());
  });

  it("reads only this app's session locks, whoever holds them", async () => {
    const { locks } = fakeLocks([`${ORAL_LOCK_PREFIX}other-tab`, "someone-else", "palier:another-lock"]);

    expect(await webLocksLiveness(locks).live()).toEqual(new Set([sessionId("other-tab")]));
  });

  it("holds nothing and finds nothing live without Web Locks", async () => {
    const liveness = webLocksLiveness(undefined);
    liveness.hold(sessionId("s1"))();

    expect(await liveness.live()).toEqual(new Set());
  });

  it("counts a lock still waiting to be granted as live", async () => {
    const locks = {
      request: () => Promise.resolve(),
      query: () => Promise.resolve({ held: [], pending: [{ name: `${ORAL_LOCK_PREFIX}asking`, mode: "exclusive" }] }),
    } as unknown as LockKit;

    expect(await webLocksLiveness(locks).live()).toEqual(new Set([sessionId("asking")]));
  });

  it("finds nothing live when the browser refuses to say, so a session can still start", async () => {
    const locks = { request: () => Promise.resolve(), query: () => Promise.reject(new Error("SecurityError")) } as unknown as LockKit;

    expect(await webLocksLiveness(locks).live()).toEqual(new Set());
  });

  it("never lets a refused lock request escape", async () => {
    const locks = { request: () => Promise.reject(new Error("SecurityError")), query: () => Promise.resolve({}) } as unknown as LockKit;
    const liveness = webLocksLiveness(locks);
    liveness.hold(sessionId("s1"));
    await settle();

    expect(await liveness.live()).toEqual(new Set());
  });
});
