import type {
  DeviceIdentity,
  DeviceSummary,
  PullResult,
  PushResult,
  SyncDocument,
  SyncTransport,
} from "@palier/app";
import {
  PairCodeRejectedError,
  SYNC_DOC_TYPES,
  SyncUnauthorizedError,
  SyncUnavailableError,
  deviceId,
} from "@palier/app";

/**
 * The HTTP `SyncTransport` (architecture.md §9.4, §10): the device's side of the sync
 * wire protocol, over the platform `fetch`. There is no vendor behind it, so there is
 * no vendor type to leak, and nothing of HTTP crosses the boundary: every status and
 * fault becomes one of the port's own errors.
 *
 * - **The credential is the device secret**, sent as `Authorization: Bearer` to our own
 *   origin only (§9.3). The composition root hands in `credentials` — in production
 *   `KeyVault.deviceSecret` — so this adapter never imports `/dexie` (no cross-adapter
 *   imports, ADR 10).
 * - **Errors:** a network fault, 429 and any 5xx become `SyncUnavailableError`, which
 *   `syncNow` turns into a quiet "not syncing" rather than an interruption (§11). 401 is
 *   `SyncUnauthorizedError`, and a rejected pairing code is `PairCodeRejectedError`.
 *   Anything else, a 400 or 413, is a bug in the request and throws as one.
 * - **One retry** after a short pause for a network fault or a 502/503/504, on every call
 *   but redeeming a code. A code works once, so a retry after a lost response would spend
 *   it twice. A retried push is safe: its base revision is now stale, so it comes back as
 *   a conflict holding the device's own write, which merges to itself.
 * - **Responses are structure-checked**, like the bank adapter (D55). A captive portal's
 *   HTML or a truncated body is "unavailable", never a plausible-looking document.
 */

type FetchResponse = { readonly ok: boolean; readonly status: number; json: () => Promise<unknown> };
export type FetchLike = (url: string, init: { method: string; headers: Record<string, string>; body?: string }) => Promise<FetchResponse>;

export type HttpSyncConfig = {
  /** The origin the API is served from; `""` for same-origin. */
  readonly baseUrl: string;
  /** The device secret to present, read per request. */
  readonly credentials: () => Promise<string>;
  readonly fetchImpl?: FetchLike;
  /** Pause before the one retry. */
  readonly retryDelayMs?: number;
  readonly sleep?: (ms: number) => Promise<void>;
};

/** A request the server refused as malformed: ours to fix, not the network's. */
export class SyncProtocolError extends Error {
  constructor(readonly status: number) {
    super(`The sync service refused a request as malformed (HTTP ${String(status)}).`);
    this.name = "SyncProtocolError";
  }
}

const RETRYABLE = new Set([502, 503, 504]);

const defaultFetch: FetchLike = (url, init) => fetch(url, init) as unknown as Promise<FetchResponse>;
const defaultSleep = (ms: number) =>
  new Promise<void>((resolve) => {
    setTimeout(resolve, ms);
  });

const isRecord = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v);
const isString = (v: unknown): v is string => typeof v === "string";
const isRevision = (v: unknown): v is number => Number.isInteger(v) && (v as number) >= 0;
const isDocType = (v: unknown): v is SyncDocument["type"] => SYNC_DOC_TYPES.includes(v as SyncDocument["type"]);

const malformed = (): never => {
  throw new SyncUnavailableError("the sync service sent a malformed response");
};

const asIdentity = (raw: unknown): DeviceIdentity =>
  isRecord(raw) && isString(raw.accountId) && isString(raw.deviceId)
    ? { accountId: raw.accountId, deviceId: deviceId(raw.deviceId) }
    : malformed();

const asDocument = (raw: unknown): SyncDocument =>
  isRecord(raw) && isDocType(raw.type) && isString(raw.id) && isRevision(raw.revision) && "payload" in raw
    ? { type: raw.type, id: raw.id, revision: raw.revision, payload: raw.payload }
    : malformed();

const asList = <T>(raw: unknown, each: (v: unknown) => T): T[] => (Array.isArray(raw) ? raw.map(each) : malformed());

const asPull = (raw: unknown): PullResult =>
  isRecord(raw) && isRevision(raw.watermark) && typeof raw.more === "boolean"
    ? { docs: asList(raw.docs, asDocument), watermark: raw.watermark, more: raw.more }
    : malformed();

const asPush = (raw: unknown): PushResult =>
  isRecord(raw)
    ? {
        accepted: asList(raw.accepted, (a) =>
          isRecord(a) && isDocType(a.type) && isString(a.id) && isRevision(a.revision)
            ? { type: a.type, id: a.id, revision: a.revision }
            : malformed(),
        ),
        conflicts: asList(raw.conflicts, asDocument),
      }
    : malformed();

const asDevices = (raw: unknown): DeviceSummary[] =>
  isRecord(raw)
    ? asList(raw.devices, (d) =>
        isRecord(d) && isString(d.id) && isString(d.label) && isString(d.lastSeenAt) && typeof d.current === "boolean"
          ? { id: deviceId(d.id), label: d.label, lastSeenAt: d.lastSeenAt, current: d.current }
          : malformed(),
      )
    : malformed();

const asPairCode = (raw: unknown): { code: string; expiresAt: string } =>
  isRecord(raw) && isString(raw.code) && isString(raw.expiresAt) ? { code: raw.code, expiresAt: raw.expiresAt } : malformed();

export const httpSyncTransport = (config: HttpSyncConfig): SyncTransport => {
  const fetchImpl = config.fetchImpl ?? defaultFetch;
  const sleep = config.sleep ?? defaultSleep;
  const retryDelayMs = config.retryDelayMs ?? 500;

  type Call = { method: string; path: string; body?: unknown; retry?: boolean; notFound?: () => never | undefined };

  const send = async (call: Call): Promise<FetchResponse> => {
    const secret = await config.credentials();
    const init = {
      method: call.method,
      headers: {
        authorization: `Bearer ${secret}`,
        ...(call.body === undefined ? {} : { "content-type": "application/json" }),
      },
      ...(call.body === undefined ? {} : { body: JSON.stringify(call.body) }),
    };
    const attempt = async (): Promise<FetchResponse | null> => {
      try {
        return await fetchImpl(`${config.baseUrl}${call.path}`, init);
      } catch {
        return null;
      }
    };
    let response = await attempt();
    if ((response === null || RETRYABLE.has(response.status)) && call.retry !== false) {
      await sleep(retryDelayMs);
      response = await attempt();
    }
    if (response === null) throw new SyncUnavailableError("the network is unreachable");
    return response;
  };

  /** Send, translate the status, and return the parsed body (or undefined for 204/404-as-no-op). */
  const request = async (call: Call): Promise<unknown> => {
    const response = await send(call);
    if (response.status === 401) throw new SyncUnauthorizedError();
    if (response.status === 404 && call.notFound !== undefined) return call.notFound();
    if (response.status === 429) throw new SyncUnavailableError("the sync service asked us to slow down");
    if (response.status >= 500) throw new SyncUnavailableError(`the sync service answered ${String(response.status)}`);
    if (!response.ok) throw new SyncProtocolError(response.status);
    if (response.status === 204) return undefined;
    try {
      return await response.json();
    } catch {
      return malformed();
    }
  };

  return {
    registerDevice: async (label) => asIdentity(await request({ method: "POST", path: "/api/account/device", body: { label } })),
    requestPairCode: async () => asPairCode(await request({ method: "POST", path: "/api/account/pair-code" })),
    redeemPairCode: async (code, label) =>
      asIdentity(
        await request({
          method: "POST",
          path: "/api/account/pair",
          body: { code, label },
          retry: false,
          notFound: () => {
            throw new PairCodeRejectedError();
          },
        }),
      ),
    listDevices: async () => asDevices(await request({ method: "GET", path: "/api/account/devices" })),
    revokeDevice: async (id) => {
      // A device the account does not hold is not found (tier 11), and revoking it is a no-op.
      await request({ method: "DELETE", path: `/api/account/device/${encodeURIComponent(id)}`, notFound: () => undefined });
    },
    deleteAccount: async () => {
      await request({ method: "DELETE", path: "/api/account" });
    },
    pull: async (watermark) => asPull(await request({ method: "GET", path: `/api/sync?watermark=${String(watermark)}` })),
    push: async (items) => asPush(await request({ method: "POST", path: "/api/sync", body: { items } })),
  };
};
