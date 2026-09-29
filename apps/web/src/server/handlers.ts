import { PAIR_CODE_TTL_MS, SYNC_DOC_TYPES, normalizePairCode } from "@palier/app";
import { z } from "zod";

import type { DeviceRecord, SyncRepository } from "./repository";
import { clientIp, error, handle, json, readJson, refuse } from "./http";
import { isDeviceSecret, pairCodeFrom, rateLimitKey, sha256 } from "./secrets";

/**
 * The sync service's request handlers (architecture.md §10, ADR 21), as plain
 * `Request → Response` functions over a `SyncRepository`, so the route files are one-line
 * bindings and every branch here is unit-tested against the in-memory repository.
 *
 * The wire protocol is the table in `@palier/testing`'s `sync-handlers.ts`, which serves
 * the same protocol from memory. The HTTP adapter is held to `syncTransportContract`
 * against both.
 *
 * - **Every request carries `Authorization: Bearer <device secret>`.** A missing,
 *   malformed, unknown or revoked secret is 401 on every route.
 * - **Every body is validated** before anything is read from it (implementation-plan.md
 *   §6.2: "input validation on every server route"). A bad body is 400; an oversized one
 *   is 413.
 * - **Another account's things are not found, not forbidden** (tier 11). Nothing here
 *   can even name another account's documents, and revoking a device the caller's account
 *   does not hold is 404.
 * - **Registration, pairing codes and redeeming are rate-limited per IP hash** (§11).
 */

/**
 * What `GET /api/health` reports (architecture.md §10, D140): the build and the bank this
 * deployment serves, and whether its database answers. `database` is `null` when none is
 * configured. Nothing here identifies a person, a device or the request.
 */
export type Health = { readonly build: string; readonly bank: number; readonly database: boolean | null };

/**
 * The health response. 200 when the service is as configured (a deployment with no
 * database is working as intended, ADR 21), and 503 only when a configured database does
 * not answer. Never cached, since a cached "ok" would hide an outage.
 */
export const healthResponse = (health: Health): Response => {
  const database = health.database === null ? "not-configured" : health.database ? "ok" : "unreachable";
  return Response.json(
    { build: health.build, bank: health.bank, database },
    { status: database === "unreachable" ? 503 : 200, headers: { "cache-control": "no-store" } },
  );
};

export const MAX_PUSH_ITEMS = 500;
export const PULL_PAGE = 500;
const MAX_BODY_BYTES = 1_000_000;

/** Requests per window, per IP hash. Generous for people; a wall for a script. */
export const RATE_LIMITS = {
  register: { max: 20, windowMs: 60 * 60 * 1000 },
  pairCode: { max: 20, windowMs: 60 * 60 * 1000 },
  // Redeeming is where a guesser would work, so it is tightest: ten tries in ten minutes
  // against ~887 million codes.
  pair: { max: 10, windowMs: 10 * 60 * 1000 },
} as const;

export type SyncApiDeps = {
  readonly repo: SyncRepository;
  readonly now: () => Date;
  readonly randomBytes: (n: number) => Uint8Array;
  /** The server secret the IP hash is keyed with. */
  readonly rateLimitSalt: string;
};

export type SyncApi = {
  readonly registerDevice: (request: Request) => Promise<Response>;
  readonly requestPairCode: (request: Request) => Promise<Response>;
  readonly redeemPairCode: (request: Request) => Promise<Response>;
  readonly listDevices: (request: Request) => Promise<Response>;
  readonly revokeDevice: (request: Request, deviceId: string) => Promise<Response>;
  readonly deleteAccount: (request: Request) => Promise<Response>;
  readonly pull: (request: Request) => Promise<Response>;
  readonly push: (request: Request) => Promise<Response>;
};

const label = z.string().trim().min(1).max(80);
const registerBody = z.object({ label });
const pairBody = z.object({ code: z.string().max(32), label });
const pushBody = z.object({
  items: z.array(
    z.object({
      type: z.enum(SYNC_DOC_TYPES),
      id: z.string().min(1).max(200),
      baseRevision: z.number().int().nonnegative().nullable(),
      payload: z.record(z.string(), z.unknown()),
    }),
  ),
});
const watermarkParam = z.coerce.number().int().nonnegative();
/** Device ids are UUIDs (`devices.id`); anything else cannot name one, so it is not found. */
const deviceIdParam = z.uuid();

const bearerOf = (request: Request): string | null => {
  const header = request.headers.get("authorization") ?? "";
  const secret = header.startsWith("Bearer ") ? header.slice("Bearer ".length).trim() : "";
  return isDeviceSecret(secret) ? secret : null;
};

const summary = (device: DeviceRecord, self: string) => ({
  id: device.id,
  label: device.label,
  lastSeenAt: device.lastSeenAt,
  current: device.id === self,
});

export const createSyncApi = (deps: SyncApiDeps): SyncApi => {
  const { repo } = deps;
  const at = () => deps.now().toISOString();

  const limit = async (request: Request, route: keyof typeof RATE_LIMITS) => {
    const { max, windowMs } = RATE_LIMITS[route];
    const now = deps.now();
    const windowStart = new Date(Math.floor(now.getTime() / windowMs) * windowMs).toISOString();
    const count = await repo.hit(rateLimitKey(deps.rateLimitSalt, route, clientIp(request), now), windowStart);
    if (count > max) refuse("rate-limited", 429);
  };

  /** The live device the bearer names, stamped as seen now; otherwise 401. */
  const authenticate = async (request: Request): Promise<DeviceRecord> => {
    const secret = bearerOf(request);
    const device = secret === null ? null : await repo.deviceBySecretHash(sha256(secret));
    if (device === null || device.revokedAt !== null) return refuse("unauthorized", 401);
    await repo.touchDevice(device.id, at());
    return device;
  };

  return {
    registerDevice: handle(async (request) => {
      const secret = bearerOf(request) ?? refuse("unauthorized", 401);
      const body = await readJson(request, registerBody, MAX_BODY_BYTES);
      const hash = sha256(secret);
      const existing = await repo.deviceBySecretHash(hash);
      if (existing !== null && existing.revokedAt === null) {
        await repo.touchDevice(existing.id, at());
        return json({ accountId: existing.accountId, deviceId: existing.id });
      }
      await limit(request, "register");
      return json(await repo.createAccount({ hash, label: body.label, at: at() }));
    }),

    requestPairCode: handle(async (request) => {
      const device = await authenticate(request);
      await limit(request, "pairCode");
      const code = pairCodeFrom(deps.randomBytes);
      const expiresAt = new Date(deps.now().getTime() + PAIR_CODE_TTL_MS).toISOString();
      await repo.createPairCode(device.accountId, { hash: sha256(code), expiresAt });
      return json({ code, expiresAt });
    }),

    redeemPairCode: handle(async (request) => {
      const secret = bearerOf(request) ?? refuse("unauthorized", 401);
      const body = await readJson(request, pairBody, MAX_BODY_BYTES);
      await limit(request, "pair");
      const code = normalizePairCode(body.code);
      const accountId = code === null ? null : await repo.redeemPairCode({ hash: sha256(code), at: at() });
      if (accountId === null) return error("pair-code-rejected", 404);
      const { deviceId } = await repo.attachDevice(accountId, { hash: sha256(secret), label: body.label, at: at() });
      return json({ accountId, deviceId });
    }),

    listDevices: handle(async (request) => {
      const device = await authenticate(request);
      const devices = await repo.listDevices(device.accountId);
      return json({ devices: devices.map((d) => summary(d, device.id)) });
    }),

    revokeDevice: handle(async (request, deviceId: string) => {
      const device = await authenticate(request);
      if (!deviceIdParam.safeParse(deviceId).success) return error("not-found", 404);
      const revoked = await repo.revokeDevice(device.accountId, deviceId, at());
      return revoked ? new Response(null, { status: 204 }) : error("not-found", 404);
    }),

    deleteAccount: handle(async (request) => {
      const device = await authenticate(request);
      await repo.deleteAccount(device.accountId);
      return json({ deleted: true });
    }),

    pull: handle(async (request) => {
      const device = await authenticate(request);
      const raw = new URL(request.url).searchParams.get("watermark") ?? "0";
      const parsed = watermarkParam.safeParse(raw);
      const watermark = parsed.success ? parsed.data : refuse("invalid-watermark", 400);
      const { docs, more } = await repo.pull(device.accountId, watermark, PULL_PAGE);
      return json({ docs, watermark: docs.at(-1)?.revision ?? watermark, more });
    }),

    push: handle(async (request) => {
      const device = await authenticate(request);
      const { items } = await readJson(request, pushBody, MAX_BODY_BYTES);
      if (items.length > MAX_PUSH_ITEMS) refuse("too-many-items", 413);
      return json(await repo.push(device.accountId, device.id, items, at()));
    }),
  };
};
