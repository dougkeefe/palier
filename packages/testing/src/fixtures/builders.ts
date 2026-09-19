/**
 * Fixture builders with sensible defaults and overrides, so no test hand-writes
 * an object literal (implementation-plan.md 6.4): `anItem({ targetBand: 'C' })`.
 *
 * Only the generic machinery exists today. The real builders — and the 60-item
 * canonical fixture bank — need the domain types, and land with them.
 */
export type Builder<T> = (overrides?: Partial<T>) => T;

export const buildWith = <T extends object>(defaults: T): Builder<T> =>
  (overrides = {}) => ({ ...defaults, ...overrides });
