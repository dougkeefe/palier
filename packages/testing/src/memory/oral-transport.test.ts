import { describe, expect, it } from "vitest";

import type { OralTransportEvent } from "@palier/app";

import { anOralScenario } from "../fixtures/builders.js";
import { memoryOralTransport } from "./oral-transport.js";

/** What the shared contract does not reach: the fake's own options and edges. */
describe("memoryOralTransport", () => {
  it("says nothing before it is opened", async () => {
    const fake = memoryOralTransport([{ atMs: 0, kind: "difficulty", direction: "escalate" }]);
    await fake.advance(1_000);
    await fake.hangUp(false);

    expect(fake.directives()).toEqual([]);
  });

  it("says nothing more once hung up, however far time moves", async () => {
    const events: OralTransportEvent[] = [];
    const fake = memoryOralTransport([{ atMs: 5_000, kind: "difficulty", direction: "deescalate" }]);
    await fake.transport.open({ scenario: anOralScenario() }, (e) => void events.push(e));
    await fake.hangUp(true);
    await fake.advance(10_000);

    expect(events).toEqual([{ kind: "closed", failed: true }]);
  });

  it("delivers what it still had to say before closing, when asked to, but not when the line drops", async () => {
    const script = [{ atMs: 5_000, kind: "difficulty", direction: "escalate" } as const];
    const clean: OralTransportEvent[] = [];
    const dropped: OralTransportEvent[] = [];
    const a = memoryOralTransport(script, { deliverOnClose: true });
    const b = memoryOralTransport(script, { deliverOnClose: true });
    await a.transport.open({ scenario: anOralScenario() }, (e) => void clean.push(e));
    await b.transport.open({ scenario: anOralScenario() }, (e) => void dropped.push(e));
    await a.transport.close();
    await b.hangUp(true);

    expect(clean).toEqual([{ kind: "difficulty", direction: "escalate" }, { kind: "closed", failed: false }]);
    expect(dropped).toEqual([{ kind: "closed", failed: true }]);
  });
});

describe("memoryOralTransport — notes (D168)", () => {
  it("delivers a scripted note as the examiner's note, with no phase: the driver stamps it", async () => {
    const events: OralTransportEvent[] = [];
    const fake = memoryOralTransport([{ atMs: 1_000, kind: "note", criterion: "task", evidence: "a répondu à côté", severity: "major" }]);
    await fake.transport.open({ scenario: anOralScenario() }, (e) => void events.push(e));
    await fake.advance(1_000);

    expect(events).toEqual([{ kind: "note", criterion: "task", evidence: "a répondu à côté", severity: "major" }]);
  });
});
