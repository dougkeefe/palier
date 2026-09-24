import { createHash } from "node:crypto";

/**
 * Canonical JSON: object keys sorted at every depth, so the same data serialises
 * to the same bytes on every run. The bank build depends on this — a bank that
 * is not byte-reproducible cannot be audited (content-factory.md §4.6).
 */
export const canonicalStringify = (value: unknown): string =>
  JSON.stringify(sortDeep(value), null, 2) + "\n";

const sortDeep = (value: unknown): unknown => {
  if (Array.isArray(value)) return value.map(sortDeep);
  if (value !== null && typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>)
      .filter(([, v]) => v !== undefined)
      .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));
    return Object.fromEntries(entries.map(([k, v]) => [k, sortDeep(v)]));
  }
  return value;
};

/** A short, deterministic base32 digest of `value`'s canonical form. */
export const contentHash = (value: unknown): string =>
  createHash("sha256").update(canonicalStringify(value)).digest("hex");

/** A Crockford-ish base32 id derived from content — stable and reproducible. */
export const contentId = (value: unknown): string => {
  const hex = contentHash(value).slice(0, 26);
  return BigInt(`0x${hex}`).toString(32).padStart(20, "0").slice(0, 20).toUpperCase();
};
