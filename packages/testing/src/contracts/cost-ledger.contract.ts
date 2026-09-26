import { describe, expect, it } from "vitest";

import type { CostEntry, CostLedger } from "@palier/app";

const anEntry = (ts: string, over: Partial<CostEntry> = {}): CostEntry => ({
  ts,
  feature: "writing-feedback",
  model: "gpt-test",
  inputTokens: 1_200,
  outputTokens: 800,
  costUsd: 0.0088,
  ...over,
});

/**
 * The device-local cost ledger (progress.md D101): append-only, read back from an instant
 * onward, oldest first. It holds exactly what it was given, `null` prices included, since
 * the meter must be able to say its total is a floor.
 */
export const costLedgerContract = (name: string, make: () => Promise<CostLedger>): void => {
  describe(`CostLedger contract: ${name}`, () => {
    it("holds nothing on a fresh device", async () => {
      const ledger = await make();

      expect(await ledger.since("1970-01-01T00:00:00.000Z")).toEqual([]);
    });

    it("returns an entry exactly as it was appended, an unpriced one included", async () => {
      const ledger = await make();
      const priced = anEntry("2026-09-26T10:00:00.000Z");
      const unpriced = anEntry("2026-09-26T10:01:00.000Z", { feature: "item-generation", costUsd: null });
      await ledger.append(priced);
      await ledger.append(unpriced);

      expect(await ledger.since("2026-09-26T00:00:00.000Z")).toEqual([priced, unpriced]);
    });

    it("returns entries at or after the instant, not before", async () => {
      const ledger = await make();
      await ledger.append(anEntry("2026-09-25T23:59:59.999Z"));
      await ledger.append(anEntry("2026-09-26T00:00:00.000Z"));
      await ledger.append(anEntry("2026-09-27T08:00:00.000Z"));

      const since = await ledger.since("2026-09-26T00:00:00.000Z");
      expect(since.map((e) => e.ts)).toEqual(["2026-09-26T00:00:00.000Z", "2026-09-27T08:00:00.000Z"]);
    });

    it("returns entries oldest first, whatever order they were appended in", async () => {
      const ledger = await make();
      await ledger.append(anEntry("2026-09-26T12:00:00.000Z"));
      await ledger.append(anEntry("2026-09-26T09:00:00.000Z"));
      await ledger.append(anEntry("2026-09-26T10:30:00.000Z"));

      const since = await ledger.since("2026-09-01T00:00:00.000Z");
      expect(since.map((e) => e.ts)).toEqual([
        "2026-09-26T09:00:00.000Z",
        "2026-09-26T10:30:00.000Z",
        "2026-09-26T12:00:00.000Z",
      ]);
    });

    it("keeps two entries at the same instant, in the order they were appended", async () => {
      const ledger = await make();
      await ledger.append(anEntry("2026-09-26T10:00:00.000Z", { model: "first" }));
      await ledger.append(anEntry("2026-09-26T10:00:00.000Z", { model: "second" }));

      const since = await ledger.since("2026-09-26T10:00:00.000Z");
      expect(since.map((e) => e.model)).toEqual(["first", "second"]);
    });

    it("holds nothing after clear", async () => {
      const ledger = await make();
      await ledger.append(anEntry("2026-09-26T10:00:00.000Z"));
      await ledger.clear();

      expect(await ledger.since("1970-01-01T00:00:00.000Z")).toEqual([]);
    });
  });
};
