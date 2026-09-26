import { syncApi, telemetryApi } from "./db";
import type { SyncApi } from "./handlers";
import type { TelemetryApi } from "./telemetry-handlers";

/**
 * Bind a route to one `SyncApi` handler, answering 503 when no sync database is
 * configured. Every route file under `src/app/api/` is one `serve(...)` call, so the
 * routes hold no logic of their own to test beyond the binding.
 */
export const serve =
  <A extends unknown[]>(run: (api: SyncApi, request: Request, ...args: A) => Promise<Response>) =>
  async (request: Request, ...args: A): Promise<Response> => {
    const api = await syncApi();
    if (api === null) return Response.json({ error: "sync-unavailable" }, { status: 503 });
    return run(api, request, ...args);
  };

/**
 * Bind the telemetry route to the `TelemetryApi`, answering 503 with no database. The
 * client reads that as "unavailable" and keeps its batch queued (progress.md D92).
 */
export const serveTelemetry =
  (run: (api: TelemetryApi, request: Request) => Promise<Response>) =>
  async (request: Request): Promise<Response> => {
    const api = await telemetryApi();
    if (api === null) return Response.json({ error: "telemetry-unavailable" }, { status: 503 });
    return run(api, request);
  };
