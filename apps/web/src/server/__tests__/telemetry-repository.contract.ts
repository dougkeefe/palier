import { itemId } from "@palier/domain";
import { describe, expect, it } from "vitest";

import type { TelemetryRepository } from "../telemetry-repository";

const AT = "2026-09-25T12:00:00.000Z";
const LATER = "2026-09-25T13:00:00.000Z";

const events = [
  { itemId: itemId("fr-read-0001"), correct: true, responseMs: 41_000, bankVersion: 2, restBucket: 4 },
  { itemId: itemId("fr-read-0002"), correct: false, responseMs: 0, bankVersion: 2, restBucket: 0 },
] as const;

/**
 * The `TelemetryRepository` contract: in memory in the fast lane, and Drizzle on PGlite
 * with the real migrations in the integration lane (implementation-plan.md §6.2 tier 4).
 */
export const telemetryRepositoryContract = (name: string, make: () => Promise<TelemetryRepository>): void => {
  describe(`TelemetryRepository contract: ${name}`, () => {
    it("reads back nothing from an empty table", async () => {
      expect(await (await make()).events()).toEqual([]);
    });

    it("reads back every stored event exactly, in arrival order, across batches", async () => {
      const repo = await make();
      await repo.insertEvents(events.slice(0, 1), "2026-09-25");
      await repo.insertEvents(events.slice(1), "2026-09-26");

      expect(await repo.events()).toEqual(events);
    });

    it("keeps two identical events as two, since two people can answer alike", async () => {
      const repo = await make();
      await repo.insertEvents([events[0], events[0]], "2026-09-25");

      expect(await repo.events()).toHaveLength(2);
    });

    it("counts rate-limit hits per key within a window, and starts again in the next", async () => {
      const repo = await make();

      expect(await repo.hit("k", AT)).toBe(1);
      expect(await repo.hit("k", AT)).toBe(2);
      expect(await repo.hit("other", AT)).toBe(1);
      expect(await repo.hit("k", LATER)).toBe(1);
    });
  });
};
