/**
 * The PSC's result levels (product-requirements.md 5.3): X, A, B, C, E.
 *
 * X is below A. **E is above C** — it is the exemption level, awarded at the top
 * of the supervised range, not an error or a failure. Sorting these strings
 * alphabetically silently puts E between C and X and produces a band mapping
 * that is monotonic in the wrong direction, so the order is stated here as data
 * and every comparison goes through `BAND_RANK`.
 */
export const BANDS = ["X", "A", "B", "C", "E"] as const;
export type Band = (typeof BANDS)[number];

/**
 * `satisfies` rather than a type annotation, so adding a band to `BANDS`
 * without ranking it is a compile error rather than an `undefined` at runtime.
 */
export const BAND_RANK = {
  X: 0,
  A: 1,
  B: 2,
  C: 3,
  E: 4,
} as const satisfies Record<Band, number>;

export const bandRank = (band: Band): number => BAND_RANK[band];

/** Negative, zero or positive, for use as a comparator. */
export const compareBands = (a: Band, b: Band): number => bandRank(a) - bandRank(b);

export const isBand = (value: unknown): value is Band =>
  typeof value === "string" && (BANDS as readonly string[]).includes(value);

/**
 * The bands an item can be tagged with. There is no internal difficulty scale
 * beyond this (product-requirements.md 5.4), and nothing is authored at X or E:
 * X is "below the lowest level tested" and E is an exemption, neither of which
 * describes an item.
 */
export const TARGET_BANDS = ["A", "B", "C"] as const;
export type TargetBand = (typeof TARGET_BANDS)[number];
