/**
 * Our error types at the edge. A failed manifest/shard fetch or a body that does
 * not survive re-validation against our domain schema is translated into one of
 * these before it leaves the adapter, so no HTTP or fetch shape crosses the
 * boundary (adapters/CLAUDE.md, §2.4). A *missing* optional resource is not an
 * error — `passage`/`form`/`scenario` return `null`, and an absent scenarios
 * file (HTTP 404) is `null` too. These fire only when the bank itself cannot be
 * read or is malformed.
 *
 * Each class names itself with a string literal, because a production build minifies class
 * names (progress.md D158).
 */
export class BankError extends Error {
  override name = "BankError";
}

/**
 * A required fetch failed — a network fault, or a non-ok status (other than the
 * 404 that makes an optional resource `null`). The manifest and any shard the
 * manifest lists are required: if one is unreachable the bank cannot be served.
 */
export class BankUnavailableError extends BankError {
  override name = "BankUnavailableError";
}

/**
 * The manifest or a shard was fetched but its body did not survive re-validation
 * against our schema. This is the check that stops a corrupted or truncated shard
 * from becoming a plausible-looking `Item` in a drill.
 */
export class BankContentError extends BankError {
  override name = "BankContentError";
}
