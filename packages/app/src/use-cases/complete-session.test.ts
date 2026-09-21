import { sessionId } from "@palier/domain";
import { describe, expect, it, vi } from "vitest";

import type { Clock, ISO, Session, SessionStore } from "../ports/index.js";
import {
  type CompleteSessionDeps,
  UnknownSessionError,
  completeSession,
} from "./complete-session.js";

// Local stubs rather than @palier/testing (progress.md D37).

const NOW = "2026-03-01T18:00:00.000Z";
const SESSION_ID = sessionId("01HSESSIONTODAY00000001");

const clockOf = (iso = NOW): Clock => ({ now: vi.fn(() => iso) });

const aSession = (over: Partial<Session> = {}): Session => ({
  id: SESSION_ID,
  mode: "drill",
  startedAt: "2026-03-01T09:00:00.000Z",
  completedAt: null,
  ...over,
});

/**
 * A stateful sessions stub whose `complete` is keep-first-write, mirroring the port
 * contract: closing an already-closed session returns the original instant.
 */
const sessionsOf = (initial: Session | null = aSession()): SessionStore => {
  let stored = initial;
  return {
    create: vi.fn(() => Promise.resolve()),
    latest: vi.fn(() => Promise.resolve(stored)),
    complete: vi.fn((_id, at: ISO) => {
      if (stored === null) return Promise.resolve(null);
      stored = stored.completedAt === null ? { ...stored, completedAt: at } : stored;
      return Promise.resolve(stored);
    }),
  };
};

const depsWith = (over: Partial<CompleteSessionDeps> = {}): CompleteSessionDeps => ({
  clock: clockOf(),
  sessions: sessionsOf(),
  ...over,
});

describe("completeSession", () => {
  it("stamps completedAt from the clock and returns the closed session", async () => {
    const result = await completeSession({ sessionId: SESSION_ID }, depsWith());

    expect(result.session.completedAt).toBe(NOW);
  });

  it("throws UnknownSessionError when the session does not exist", async () => {
    await expect(
      completeSession({ sessionId: SESSION_ID }, depsWith({ sessions: sessionsOf(null) })),
    ).rejects.toThrow(UnknownSessionError);
  });

  it("names the session in the UnknownSessionError, so the failure is diagnosable", async () => {
    const error: unknown = await completeSession(
      { sessionId: SESSION_ID },
      depsWith({ sessions: sessionsOf(null) }),
    ).then(
      () => null,
      (e: unknown) => e,
    );

    expect(error).toBeInstanceOf(UnknownSessionError);
    expect((error as UnknownSessionError).sessionId).toBe(SESSION_ID);
    expect((error as UnknownSessionError).message).toContain(SESSION_ID);
  });

  it("keeps the first completion instant when the same session is completed twice", async () => {
    const deps = depsWith();

    const first = await completeSession({ sessionId: SESSION_ID }, deps);
    const second = await completeSession(
      { sessionId: SESSION_ID },
      { ...deps, clock: clockOf("2026-03-02T09:00:00.000Z") },
    );

    expect(first.session.completedAt).toBe(NOW);
    expect(second.session.completedAt).toBe(NOW);
  });
});
