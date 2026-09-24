/**
 * The `@palier/adapters/bank` public surface. One factory returning the
 * `ItemRepository` port, the config type it takes, and the error types it throws —
 * every one of ours, no HTTP/fetch type among them (adapters/CLAUDE.md). The
 * manifest and `FetchLike` types stay internal.
 */
export { httpBankRepository } from "./http-bank-repository.js";
export type { HttpBankConfig } from "./http-bank-repository.js";
export { BankContentError, BankError, BankUnavailableError } from "./errors.js";
