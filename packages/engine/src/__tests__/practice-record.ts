import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import type { Attempt, Item, TargetBand } from "@palier/domain";
import { READING_SUB_SKILLS, attemptId, itemId } from "@palier/domain";

import { anAttempt, anItem } from "./fixtures.js";

/**
 * The recorded practice history in `__fixtures__/practice-record.golden.json`, turned
 * into engine inputs. The JSON holds both the inputs and the outputs the engine
 * produced; the golden tests replay the one and compare the other (§5).
 */
type Golden = {
  readonly now: string;
  readonly items: ReadonlyArray<{ readonly id: string; readonly band: TargetBand; readonly subSkill: string }>;
  readonly responses: ReadonlyArray<{
    readonly item: string;
    readonly correct: boolean;
    readonly changedAnswer: boolean;
    readonly slow: boolean;
    readonly ts: string;
  }>;
  readonly expected: {
    readonly schedule: ReadonlyArray<{ readonly item: string; readonly box: number; readonly due: string | null }>;
    readonly trend: unknown;
    readonly selection: { readonly seed: number; readonly targetBand: TargetBand; readonly count: number; readonly ids: readonly string[] };
    readonly plan: {
      readonly seed: number;
      readonly targetBand: TargetBand;
      readonly sessionSize: number;
      readonly dueItems: readonly string[];
      readonly reviews: readonly string[];
      readonly newItems: readonly string[];
      readonly maintenance: readonly string[];
    };
  };
};

export const golden = JSON.parse(
  readFileSync(fileURLToPath(new URL("../__fixtures__/practice-record.golden.json", import.meta.url)), "utf8"),
) as Golden;

const subSkill = (name: string) => READING_SUB_SKILLS.find((s) => s === name) ?? READING_SUB_SKILLS[0];

export const items: readonly Item[] = golden.items.map((spec) =>
  anItem({ id: itemId(spec.id), targetBand: spec.band, subSkill: subSkill(spec.subSkill), key: "a" }),
);

export const attempts: readonly Attempt[] = golden.responses.map((r, i) =>
  anAttempt({
    id: attemptId(`01HGOLDATT${String(i).padStart(14, "0")}`),
    itemId: itemId(r.item),
    correct: r.correct,
    chosen: r.correct ? "a" : "b",
    changedAnswer: r.changedAnswer,
    ts: r.ts,
  }),
);

/** mulberry32, the generator the fixture was recorded with (`@palier/testing` would cycle). */
export const mulberry32 = (seed: number): (() => number) => {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};
