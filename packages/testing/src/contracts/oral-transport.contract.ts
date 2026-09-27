import { describe, expect, it } from "vitest";

import type { OralDirective, OralTransport, OralTransportEvent } from "@palier/app";
import type { OralScenario } from "@palier/domain";

import { anOralScenario } from "../fixtures/builders.js";

/**
 * A transport wired to an examiner's side the test can drive (progress.md D116):
 * `advance` lets that side say whatever it would have said by `ms` after `open`,
 * `hangUp` ends the connection from the far end, and `directives` is what reached it.
 * The harness's examiner must say at least one thing by `SCRIPT_END_MS`.
 */
export type OralTransportHarness = {
  readonly transport: OralTransport;
  readonly advance: (ms: number) => Promise<void>;
  readonly hangUp: (failed: boolean) => Promise<void>;
  readonly directives: () => readonly OralDirective[];
};

/** By this long after `open`, a harness's examiner has said everything it will. */
export const SCRIPT_END_MS = 60 * 60_000;

const SCENARIO: OralScenario = anOralScenario();

const listen = () => {
  const events: OralTransportEvent[] = [];
  return { events, sink: (event: OralTransportEvent) => void events.push(event) };
};

const closedEvents = (events: readonly OralTransportEvent[]) => events.filter((e) => e.kind === "closed");

/**
 * The examiner's side of a spoken session, for both a turn-based and a full-duplex
 * transport (progress.md D116). A turn's times are sane, never reversed, and never
 * run backwards for one speaker, though the two speakers' turns may overlap. A
 * session hears `closed` exactly once, last, whoever ends it, and a directive after
 * that is a harmless no-op.
 */
export const oralTransportContract = (name: string, make: () => Promise<OralTransportHarness>): void => {
  describe(`OralTransport contract: ${name}`, () => {
    it("refuses a directive before it is open", async () => {
      const { transport } = await make();

      await expect(transport.direct({ phase: 0, register: "baseline" })).rejects.toThrow();
    });

    it("delivers whole turns whose times are sane and never run backwards for one speaker", async () => {
      const harness = await make();
      const { events, sink } = listen();
      await harness.transport.open({ scenario: SCENARIO }, sink);
      await harness.advance(SCRIPT_END_MS);

      const turns = events.flatMap((e) => (e.kind === "turn" ? [e] : []));
      expect(turns.length).toBeGreaterThan(0);
      for (const turn of turns) {
        expect(turn.startMs).toBeGreaterThanOrEqual(0);
        expect(turn.endMs).toBeGreaterThanOrEqual(turn.startMs);
      }
      for (const speaker of ["examiner", "candidate"] as const) {
        const starts = turns.filter((t) => t.speaker === speaker).map((t) => t.startMs);
        expect(starts).toEqual([...starts].sort((a, b) => a - b));
      }
      expect(closedEvents(events)).toEqual([]);
    });

    it("carries each directive to the examiner's side, in order", async () => {
      const harness = await make();
      await harness.transport.open({ scenario: SCENARIO }, listen().sink);
      await harness.transport.direct({ phase: 0, register: "baseline" });
      await harness.transport.direct({ phase: 0, register: "escalate" });
      await harness.transport.direct({ phase: 1, register: "baseline" });

      expect(harness.directives()).toEqual([
        { phase: 0, register: "baseline" },
        { phase: 0, register: "escalate" },
        { phase: 1, register: "baseline" },
      ]);
    });

    it("says closed exactly once and last when the client closes, however often it asks", async () => {
      const harness = await make();
      const { events, sink } = listen();
      await harness.transport.open({ scenario: SCENARIO }, sink);
      await harness.transport.close();
      await harness.transport.close();
      await harness.advance(SCRIPT_END_MS);

      expect(closedEvents(events)).toEqual([{ kind: "closed", failed: false }]);
      expect(events.at(-1)).toEqual({ kind: "closed", failed: false });
    });

    it("says closed, failed, once when the far end drops, and a later close adds nothing", async () => {
      const harness = await make();
      const { events, sink } = listen();
      await harness.transport.open({ scenario: SCENARIO }, sink);
      await harness.hangUp(true);
      await harness.transport.close();

      expect(closedEvents(events)).toEqual([{ kind: "closed", failed: true }]);
      expect(events.at(-1)).toEqual({ kind: "closed", failed: true });
    });

    it("treats a directive after closing as a no-op", async () => {
      const harness = await make();
      await harness.transport.open({ scenario: SCENARIO }, listen().sink);
      await harness.transport.close();

      await expect(harness.transport.direct({ phase: 1, register: "baseline" })).resolves.toBeUndefined();
      expect(harness.directives()).toEqual([]);
    });
  });
};
