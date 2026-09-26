/**
 * The `@palier/adapters/telemetry` public surface: one factory returning the
 * `TelemetrySink` port, and its config. `FetchLike` stays internal, so no fetch type
 * crosses the boundary (adapters/CLAUDE.md).
 */
export { httpTelemetrySink } from "./http-telemetry-sink.js";
export type { HttpTelemetryConfig } from "./http-telemetry-sink.js";
