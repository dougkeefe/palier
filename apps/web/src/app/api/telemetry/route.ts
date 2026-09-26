import { serveTelemetry } from "../../../server/serve";

/** Opt-in anonymous item outcomes, in batches (architecture.md §10, progress.md D93). */
export const POST = serveTelemetry((api, request) => api.record(request));
