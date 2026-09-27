import type { GeneratedSet } from "@palier/app";
import type { Preflight } from "@palier/engine";
import { describe, expect, it } from "vitest";

import {
  failureMessage,
  generateFailure,
  generator,
  initialGenerator,
  resultSummary,
} from "./generate-view";

const named = (name: string, extra: object = {}) => Object.assign(new Error(name), { name, ...extra });

const PREFLIGHT: Preflight = { estimateUsd: 0.05, before: "under", after: "under" };
const SET: GeneratedSet = { id: "set-1", skill: "writing", createdAt: "2026-09-26T10:00:00.000Z", items: [] };

describe("generateFailure (D111)", () => {
  it.each([
    ["InvalidApiKeyError", "invalid-key"],
    ["RateLimitError", "out-of-credit"],
    ["ProviderTimeoutError", "timeout"],
    ["ProviderUnavailableError", "unreachable"],
    ["InvalidResponseError", "unexpected"],
    ["NoApiKeyError", "no-key"],
    ["ProviderRequestError", "failed"],
    ["SomethingElse", "failed"],
  ])("reads %s as %s", (name, failure) => {
    expect(generateFailure(named(name, { status: 500 }))).toBe(failure);
  });

  it("gives every failure its own message key", () => {
    const failures = ["invalid-key", "out-of-credit", "timeout", "unreachable", "unexpected", "no-key", "failed"] as const;
    const keys = failures.map(failureMessage);
    expect(new Set(keys).size).toBe(failures.length);
    expect(keys.every((k) => k.startsWith("fail"))).toBe(true);
  });
});

describe("generator", () => {
  const choosing = initialGenerator("agreement");

  it("starts choosing, with the given sub-skill and nothing in flight", () => {
    expect(choosing).toEqual({ phase: "choosing", subSkill: "agreement", request: { kind: "idle" } });
  });

  it("takes the pre-flight, then sending, then a result", () => {
    const confirming = generator(choosing, { type: "preflighted", preflight: PREFLIGHT });
    expect(confirming).toMatchObject({ request: { kind: "confirming", preflight: PREFLIGHT } });
    const sending = generator(confirming, { type: "sending" });
    expect(sending).toMatchObject({ request: { kind: "sending" } });
    const result = { set: SET, drafted: 5, discarded: 4 };
    expect(generator(sending, { type: "generated", result })).toEqual({ phase: "result", subSkill: "agreement", result });
  });

  it("goes back to choosing on cancel, keeping the sub-skill", () => {
    const confirming = generator(choosing, { type: "preflighted", preflight: PREFLIGHT });
    expect(generator(confirming, { type: "cancel" })).toEqual(choosing);
  });

  it("keeps the sub-skill through a failure, so trying again asks for the same thing", () => {
    const failed = generator(generator(choosing, { type: "sending" }), { type: "failed", failure: "timeout" });
    expect(failed).toEqual({ phase: "choosing", subSkill: "agreement", request: { kind: "failed", failure: "timeout" } });
  });

  it("changes the sub-skill while idle or after a failure, never mid-request", () => {
    expect(generator(choosing, { type: "choose-sub-skill", subSkill: "pronouns" })).toMatchObject({ subSkill: "pronouns" });
    const sending = generator(choosing, { type: "sending" });
    expect(generator(sending, { type: "choose-sub-skill", subSkill: "pronouns" })).toBe(sending);
  });

  it("practises a set, and comes back to choosing with the same sub-skill", () => {
    const practising = generator(choosing, { type: "practise", set: SET });
    expect(practising).toEqual({ phase: "practising", subSkill: "agreement", set: SET });
    expect(generator(practising, { type: "back" })).toEqual(choosing);
  });

  it("ignores request events outside choosing", () => {
    const practising = generator(choosing, { type: "practise", set: SET });
    for (const action of [
      { type: "preflighted", preflight: PREFLIGHT },
      { type: "cancel" },
      { type: "sending" },
      { type: "failed", failure: "timeout" },
      { type: "choose-sub-skill", subSkill: "pronouns" },
    ] as const) {
      expect(generator(practising, action)).toBe(practising);
    }
  });
});

describe("resultSummary", () => {
  it("says how many drafts passed the check", () => {
    const set = { ...SET, items: [{}, {}, {}] as unknown as GeneratedSet["items"] };
    expect(resultSummary({ set, drafted: 5, discarded: 2 })).toEqual({ key: "resultSome", kept: 3, drafted: 5 });
  });

  it("says so when none did", () => {
    expect(resultSummary({ set: null, drafted: 5, discarded: 5 })).toEqual({ key: "resultNone", kept: 0, drafted: 5 });
  });
});
