import { http, HttpResponse } from "msw";

import type { PushItem } from "@palier/app";
import { PairCodeRejectedError, SyncUnauthorizedError } from "@palier/app";

import type { MemorySyncServer } from "../memory/sync-server.js";

/**
 * MSW handlers that serve a `memorySyncServer` over the sync wire protocol, so the HTTP
 * `SyncTransport` adapter is held to the same `syncTransportContract` the in-memory
 * server passes (progress.md D69) — the `bankHandlers` pattern.
 *
 * This is a deliberate second copy of the protocol the real route handlers in
 * `apps/web/src/app/api/**` speak: `@palier/testing` may not import `apps/web`. The two
 * cannot drift silently, because `apps/web` runs the same contract through the HTTP
 * adapter against its real handlers.
 *
 * The protocol: every request carries `Authorization: Bearer <device secret>`.
 *
 * | Method and path | Body | Success |
 * | --- | --- | --- |
 * | `POST /api/account/device` | `{ label }` | 200 `DeviceIdentity` |
 * | `POST /api/account/pair-code` | — | 200 `{ code, expiresAt }` |
 * | `POST /api/account/pair` | `{ code, label }` | 200 `DeviceIdentity`, 404 on a bad code |
 * | `GET /api/account/devices` | — | 200 `{ devices }` |
 * | `DELETE /api/account/device/:id` | — | 204 |
 * | `DELETE /api/account` | — | 200 `{ deleted: true }` |
 * | `GET /api/sync?watermark=n` | — | 200 `PullResult` |
 * | `POST /api/sync` | `{ items }` | 200 `PushResult` |
 *
 * An unknown or removed secret is 401 on every route.
 */
export type SyncHandlerOptions = {
  readonly baseUrl: string;
};

const secretOf = (request: Request): string | null => {
  const header = request.headers.get("authorization") ?? "";
  return header.startsWith("Bearer ") ? header.slice("Bearer ".length) : null;
};

const answer = async (request: Request, run: (secret: string) => unknown | Promise<unknown>) => {
  const secret = secretOf(request);
  if (secret === null) return HttpResponse.json({ error: "unauthorized" }, { status: 401 });
  try {
    const body = await run(secret);
    return body === undefined ? new HttpResponse(null, { status: 204 }) : HttpResponse.json(body);
  } catch (error) {
    if (error instanceof SyncUnauthorizedError) return HttpResponse.json({ error: "unauthorized" }, { status: 401 });
    if (error instanceof PairCodeRejectedError) return HttpResponse.json({ error: "pair-code-rejected" }, { status: 404 });
    throw error;
  }
};

export const syncHandlers = (server: MemorySyncServer, options: SyncHandlerOptions) => {
  const at = (path: string) => `${options.baseUrl}${path}`;
  const { service } = server;
  return [
    http.post(at("/api/account/device"), ({ request }) =>
      answer(request, async (secret) => {
        const { label } = (await request.json()) as { label: string };
        return service.register(secret, label);
      }),
    ),
    http.post(at("/api/account/pair-code"), ({ request }) => answer(request, (secret) => service.pairCode(secret))),
    http.post(at("/api/account/pair"), ({ request }) =>
      answer(request, async (secret) => {
        const { code, label } = (await request.json()) as { code: string; label: string };
        return service.pair(secret, code, label);
      }),
    ),
    http.get(at("/api/account/devices"), ({ request }) =>
      answer(request, (secret) => ({ devices: service.devices(secret) })),
    ),
    http.delete(at("/api/account/device/:id"), ({ request, params }) =>
      answer(request, (secret) => {
        service.revoke(secret, String(params.id));
      }),
    ),
    http.delete(at("/api/account"), ({ request }) =>
      answer(request, (secret) => {
        service.deleteAccount(secret);
        return { deleted: true };
      }),
    ),
    http.get(at("/api/sync"), ({ request }) =>
      answer(request, (secret) => {
        const watermark = Number(new URL(request.url).searchParams.get("watermark") ?? "0");
        return service.pull(secret, watermark);
      }),
    ),
    http.post(at("/api/sync"), ({ request }) =>
      answer(request, async (secret) => {
        const { items } = (await request.json()) as { items: readonly PushItem[] };
        return service.push(secret, items);
      }),
    ),
  ];
};
