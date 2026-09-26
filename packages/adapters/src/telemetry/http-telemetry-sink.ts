import type { TelemetrySink } from "@palier/app";
import { TelemetryRejectedError, TelemetryUnavailableError } from "@palier/app";

/**
 * The HTTP `TelemetrySink` (architecture.md §10, progress.md D92): `POST /api/telemetry`
 * with `{ events }`, over the platform `fetch`.
 *
 * - **No credential, no cookie.** The request carries no `Authorization` header and is
 *   sent with `credentials: "omit"`, so not even the locale cookie travels with it:
 *   an event is detached from every identity, the request included (PRD §15).
 * - **Errors:** a network fault, 429 and any 5xx are `TelemetryUnavailableError`, so the
 *   batch stays queued. Any other refusal, a 400 or 413, is `TelemetryRejectedError`,
 *   and the caller drops the batch rather than retry it forever.
 * - **No retry here.** The queue is persisted, and the next sync trigger flushes again.
 */
type FetchResponse = { readonly ok: boolean; readonly status: number };
export type FetchLike = (
  url: string,
  init: { method: string; headers: Record<string, string>; body: string; credentials: "omit" },
) => Promise<FetchResponse>;

export type HttpTelemetryConfig = {
  /** The origin the API is served from; `""` for same-origin. */
  readonly baseUrl: string;
  readonly fetchImpl?: FetchLike;
};

const defaultFetch: FetchLike = (url, init) => fetch(url, init) as unknown as Promise<FetchResponse>;

export const httpTelemetrySink = (config: HttpTelemetryConfig): TelemetrySink => {
  const fetchImpl = config.fetchImpl ?? defaultFetch;
  return {
    send: async (batch) => {
      let response: FetchResponse;
      try {
        response = await fetchImpl(`${config.baseUrl}/api/telemetry`, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ events: batch }),
          credentials: "omit",
        });
      } catch {
        throw new TelemetryUnavailableError("the network is unreachable");
      }
      if (response.ok) return;
      if (response.status === 429 || response.status >= 500) {
        throw new TelemetryUnavailableError(`the service answered HTTP ${String(response.status)}`);
      }
      throw new TelemetryRejectedError(response.status);
    },
  };
};
