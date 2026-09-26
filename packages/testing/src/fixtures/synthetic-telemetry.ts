import type { Item, ItemId, RestBucket, TelemetryEvent } from "@palier/domain";
import { itemId } from "@palier/domain";

import { seededRandom } from "../random/seeded-random.js";
import { anItem } from "./builders.js";

/**
 * A seeded synthetic telemetry set with two known defects, for Phase 3's exit
 * criterion 3: "the statistics job flags and retires a seeded reversed-key item on
 * synthetic data".
 *
 * `respondents` people of normally distributed ability each sit the same exam: 20
 * ordinary items of moderate difficulty, plus two defective ones.
 *
 * - **`tooEasy`** is answered wrongly by exactly the weakest 2% and by no one else, so
 *   its proportion correct is known exactly (0.98), above the profile's 0.95, and its
 *   point-biserial is positive: it retires for being too easy, and only that.
 * - **`reversedKey`** is answered "right" by exactly the people an ordinary item of
 *   middling difficulty would mark wrong — a key pointing at the wrong option. Its
 *   proportion correct is ordinary and its point-biserial strongly negative: it
 *   retires for low discrimination, and only that.
 *
 * Every event's `restBucket` is the respondent's quintile on the other 21 items,
 * computed as `restBucket` in `@palier/engine` does (this package cannot import the
 * engine). The events are shuffled, as telemetry from many devices would arrive.
 */
export type SyntheticTelemetry = {
  readonly items: readonly Item[];
  readonly events: readonly TelemetryEvent[];
  readonly tooEasy: ItemId;
  readonly reversedKey: ItemId;
};

export type SyntheticTelemetryOptions = {
  readonly seed?: number;
  readonly respondents?: number;
  readonly bankVersion?: number;
};

const ORDINARY = 20;

export const syntheticTelemetry = (options: SyntheticTelemetryOptions = {}): SyntheticTelemetry => {
  const random = seededRandom(options.seed ?? 20_260_925);
  const respondents = options.respondents ?? 300;
  const bankVersion = options.bankVersion ?? 2;

  const ordinary = Array.from({ length: ORDINARY }, (_, i) => itemId(`syn-${String(i + 1).padStart(2, "0")}`));
  const tooEasy = itemId("syn-too-easy");
  const reversedKey = itemId("syn-reversed-key");
  const ids = [...ordinary, tooEasy, reversedKey];
  // Difficulties spread evenly over [-1, 1], so every ordinary item is answered by
  // between roughly a quarter and three quarters of people.
  const difficulty = ordinary.map((_, i) => -1 + (2 * i) / (ORDINARY - 1));

  /** Sum of twelve uniforms, less six: close enough to a standard normal. */
  const normal = (): number => Array.from({ length: 12 }, () => random.next()).reduce((a, b) => a + b, 0) - 6;
  const chance = (ability: number, b: number): number => 1 / (1 + Math.exp(-1.7 * (ability - b)));

  const abilities = Array.from({ length: respondents }, normal);
  const weakest = new Set(
    abilities
      .map((ability, person) => ({ ability, person }))
      .sort((a, b) => a.ability - b.ability)
      .slice(0, Math.round(respondents * 0.02))
      .map(({ person }) => person),
  );

  const events: TelemetryEvent[] = [];
  abilities.forEach((ability, person) => {
    const right = new Map<ItemId, boolean>(ordinary.map((id, i) => [id, random.next() < chance(ability, difficulty[i] ?? 0)]));
    right.set(tooEasy, !weakest.has(person));
    right.set(reversedKey, !(random.next() < chance(ability, 0)));

    const total = [...right.values()].filter(Boolean).length;
    for (const id of ids) {
      const correct = right.get(id) === true;
      const rest = total - (correct ? 1 : 0);
      const restBucket = Math.min(4, Math.floor((5 * rest) / (ids.length - 1))) as RestBucket;
      events.push({ itemId: id, correct, responseMs: 20_000 + Math.floor(random.next() * 40_000), bankVersion, restBucket });
    }
  });

  // Fisher–Yates, seeded, so the set arrives in no particular order.
  for (let i = events.length - 1; i > 0; i -= 1) {
    const j = Math.floor(random.next() * (i + 1));
    [events[i], events[j]] = [events[j] as TelemetryEvent, events[i] as TelemetryEvent];
  }

  return { items: ids.map((id) => anItem({ id })), events, tooEasy, reversedKey };
};
