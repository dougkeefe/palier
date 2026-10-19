import type { Item, ItemId } from "@palier/domain";
import { itemId } from "@palier/domain";
import { describe, expect, it, vi } from "vitest";

import type { ScheduleEntry } from "../ports/index.js";
import { type DueItemsDeps, dueLiveItems } from "./due-items.js";

// Local stubs rather than @palier/testing (progress.md D37).

const NOW = "2026-10-18T12:00:00.000Z";

const makeItem = (id: string, status: Item["status"] = "published"): Item => ({
  id: itemId(id),
  version: 1,
  skill: "reading",
  lang: "fr",
  type: "cloze",
  stem: { en: "s", fr: "s" },
  options: [
    { id: "a", text: "a", rationale: { en: "x", fr: "x" } },
    { id: "b", text: "b", rationale: { en: "x", fr: "x" } },
    { id: "c", text: "c", rationale: { en: "x", fr: "x" } },
    { id: "d", text: "d", rationale: { en: "x", fr: "x" } },
  ],
  key: "a",
  explanation: { en: "e", fr: "e" },
  subSkill: "main-idea",
  targetBand: "B",
  topic: "human-resources",
  tags: [],
  provenance: { origin: "generated" },
  status,
  createdAt: NOW,
  updatedAt: NOW,
});

const entry = (id: string): ScheduleEntry => ({ itemId: itemId(id), due: NOW, skill: "reading", box: 1 });

/** A schedule that honours `limit` as the real stores do, soonest first, over a bank of items. */
const depsOf = (order: readonly string[], bank: readonly Item[]): DueItemsDeps => ({
  schedule: { due: vi.fn((_now, limit: number) => Promise.resolve(order.slice(0, limit).map(entry))) },
  items: {
    byIds: vi.fn((ids: readonly ItemId[]) =>
      Promise.resolve(ids.map((id) => bank.find((i) => i.id === id)).filter((i): i is Item => i !== undefined)),
    ),
  },
});

describe("dueLiveItems", () => {
  it("never serves a retired item that is due", async () => {
    const deps = depsOf(["old", "a"], [makeItem("old", "retired"), makeItem("a")]);
    expect((await dueLiveItems(deps, NOW, 10)).map((i) => i.id)).toEqual(["a"]);
  });

  it("reads past retired entries at the head of the schedule to the live items behind them", async () => {
    const deps = depsOf(
      ["r1", "r2", "r3", "a", "b", "c"],
      [makeItem("r1", "retired"), makeItem("r2", "retired"), makeItem("r3", "retired"), makeItem("a"), makeItem("b"), makeItem("c")],
    );
    expect((await dueLiveItems(deps, NOW, 2)).map((i) => i.id)).toEqual(["a", "b"]);
    expect(vi.mocked(deps.schedule.due).mock.calls.map(([, limit]) => limit)).toEqual([2, 4, 7]);
  });

  it("reads past an item that has left the bank the same way", async () => {
    const deps = depsOf(["gone", "a"], [makeItem("a")]);
    expect((await dueLiveItems(deps, NOW, 1)).map((i) => i.id)).toEqual(["a"]);
  });

  it("stops when the schedule runs out, with fewer than asked for", async () => {
    const deps = depsOf(["r1", "r2", "a"], [makeItem("r1", "retired"), makeItem("r2", "retired"), makeItem("a")]);
    expect((await dueLiveItems(deps, NOW, 5)).map((i) => i.id)).toEqual(["a"]);
    expect(deps.schedule.due).toHaveBeenCalledTimes(1);
  });

  it("returns nothing, in a bounded number of reads, when every due item is retired", async () => {
    const order = ["r1", "r2", "r3", "r4"];
    const deps = depsOf(order, order.map((id) => makeItem(id, "retired")));
    expect(await dueLiveItems(deps, NOW, 2)).toEqual([]);
    expect(vi.mocked(deps.schedule.due).mock.calls.length).toBeLessThanOrEqual(order.length);
  });

  it("asks for nothing when the limit is not positive", async () => {
    const deps = depsOf(["a"], [makeItem("a")]);
    expect(await dueLiveItems(deps, NOW, 0)).toEqual([]);
    expect(deps.schedule.due).not.toHaveBeenCalled();
  });
});
