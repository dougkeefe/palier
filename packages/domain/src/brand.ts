/**
 * Nominal typing for ids, so "a function taking an `ItemId` must not accept a
 * `PassageId`" is a compile error rather than a code review comment
 * (implementation-plan.md 6.2, tier 0: make it unrepresentable).
 *
 * The brand is a phantom property rather than a `unique symbol`. A
 * non-exported unique symbol appearing in an exported type is TS4023 under
 * `declaration: true` with `composite: true`, which is exactly this package's
 * configuration.
 */
declare const BRAND: unique symbol;

export type Brand<T, B extends string> = T & { readonly [BRAND]: B };
