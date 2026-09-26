import { describe, expect, it } from "vitest";

import type { TelemetrySink } from "@palier/app";
import { TelemetryUnavailableError } from "@palier/app";
import type { TelemetryEvent } from "@palier/domain";
import { itemId } from "@palier/domain";

/** A sink wired to a receiving end the test can read and take down. */
export type TelemetrySinkHarness = {
  readonly sink: TelemetrySink;
  readonly received: () => readonly TelemetryEvent[];
  readonly setAvailable: (available: boolean) => void;
};

const batch: readonly TelemetryEvent[] = [
  { itemId: itemId("fr-read-0001"), correct: true, responseMs: 41_000, bankVersion: 2, restBucket: 4 },
  { itemId: itemId("fr-read-0002"), correct: false, responseMs: 9_500, bankVersion: 2, restBucket: 1 },
];

/**
 * The network half of telemetry (progress.md D92). A delivered batch arrives exactly as
 * sent, carrying nothing the caller did not put in it, and an undeliverable one rejects
 * with `TelemetryUnavailableError`, so the caller keeps it queued.
 */
export const telemetrySinkContract = (name: string, make: () => Promise<TelemetrySinkHarness>): void => {
  describe(`TelemetrySink contract: ${name}`, () => {
    it("delivers a batch exactly as sent", async () => {
      const harness = await make();
      await harness.sink.send(batch);

      expect(harness.received()).toEqual(batch);
    });

    it("delivers two batches in order", async () => {
      const harness = await make();
      await harness.sink.send(batch.slice(0, 1));
      await harness.sink.send(batch.slice(1));

      expect(harness.received()).toEqual(batch);
    });

    it("rejects as unavailable when the service cannot take it, and delivers nothing", async () => {
      const harness = await make();
      harness.setAvailable(false);

      await expect(harness.sink.send(batch)).rejects.toBeInstanceOf(TelemetryUnavailableError);
      expect(harness.received()).toEqual([]);
    });

    it("delivers once the service is back", async () => {
      const harness = await make();
      harness.setAvailable(false);
      await expect(harness.sink.send(batch)).rejects.toBeInstanceOf(TelemetryUnavailableError);
      harness.setAvailable(true);
      await harness.sink.send(batch);

      expect(harness.received()).toEqual(batch);
    });
  });
};
