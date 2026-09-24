/**
 * The `@palier/adapters/sync` public surface: one factory returning the `SyncTransport`
 * port, its config, and the one error type it adds to the port's own. `FetchLike` stays
 * internal, so no fetch type crosses the boundary (adapters/CLAUDE.md).
 */
export { SyncProtocolError, httpSyncTransport } from "./http-sync-transport.js";
export type { HttpSyncConfig } from "./http-sync-transport.js";
