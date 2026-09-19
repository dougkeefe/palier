/**
 * A deterministic `Random`, because "no test reads the system clock or calls
 * `Math.random`" (implementation-plan.md 6.4).
 *
 * mulberry32: a 32-bit generator that is four lines long, has no dependency,
 * and passes the statistical tests that matter for shuffling a list of items.
 * It is chosen for being auditable rather than for being strong — nothing here
 * is cryptographic, and `@palier/adapters/vault` uses Web Crypto for the things
 * that are.
 *
 * The engine takes a `Random` as a parameter (ADR 7), so production wires a
 * seeded one too; this is not a test-only escape hatch bolted onto pure code.
 */
export type Random = {
  /** A float in [0, 1), like `Math.random`. */
  next: () => number;
};

export const seededRandom = (seed: number): Random => {
  let state = seed >>> 0;
  return {
    next: () => {
      state = (state + 0x6d2b79f5) >>> 0;
      let t = state;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    },
  };
};
