/**
 * The key screen's own-endpoint form (ADR 3's self-hosted escape, architecture.md §6.3, progress.md D192), kept out
 * of the `.tsx` so each decision is tested. The address is checked by `@palier/app`'s `parseRealtimeEndpoint` when it
 * is saved; this turns what came back into the sentence shown, in the `key` namespace.
 */

/** What the form says under the field after a save: kept, cleared, or why not. */
export type EndpointNotice =
  | "realtimeOwnSaved"
  | "realtimeOwnCleared"
  | "realtimeOwnNotUrl"
  | "realtimeOwnNotHttps"
  | "realtimeOwnCredentials"
  | "realtimeOwnFailed";

const PROBLEMS: Readonly<Record<string, EndpointNotice>> = {
  "not-a-url": "realtimeOwnNotUrl",
  "not-https": "realtimeOwnNotHttps",
  "has-credentials": "realtimeOwnCredentials",
};

/** A save's outcome: what was kept (`null` when it was cleared) is the notice. */
export const endpointSaved = (kept: string | null): EndpointNotice => (kept === null ? "realtimeOwnCleared" : "realtimeOwnSaved");

/**
 * Why a save was refused, by the error's name and problem (the error crossed the container's lazily loaded chunk, so
 * it is compared by name, as `key-view.ts` does). Anything else is the device failing to keep it.
 */
export const endpointRefused = (error: unknown): EndpointNotice => {
  const { name, problem } = (error ?? {}) as { name?: unknown; problem?: unknown };
  if (name !== "InvalidRealtimeEndpointError" || typeof problem !== "string") return "realtimeOwnFailed";
  return PROBLEMS[problem] ?? "realtimeOwnFailed";
};

/** A refusal is shown as an error on the field; a save or a clear as information. */
export const endpointNoticeIsError = (notice: EndpointNotice): boolean =>
  notice !== "realtimeOwnSaved" && notice !== "realtimeOwnCleared";
