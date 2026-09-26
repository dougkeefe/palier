import type { PushResult, SyncDocType, SyncDocument } from "@palier/app";
import { and, asc, count, eq, gt, inArray, isNull, sql } from "drizzle-orm";
import type { PgDatabase, PgQueryResultHKT } from "drizzle-orm/pg-core";

import type { DeviceRecord, SyncRepository } from "./repository";
import { accounts, devices, pairCodes, rateLimits, syncDocuments } from "./schema";

/**
 * `SyncRepository` over Drizzle, for any Postgres driver: postgres.js in production,
 * PGlite in the hermetic lane and the integration tests (ADR 21). Every query filters by
 * the account id it was handed. No method lists across accounts (architecture.md §9.2).
 */
type Db<H extends PgQueryResultHKT> = PgDatabase<H>;

const toDevice = (row: typeof devices.$inferSelect): DeviceRecord => ({
  id: row.id,
  accountId: row.accountId,
  label: row.label,
  lastSeenAt: new Date(row.lastSeenAt).toISOString(),
  revokedAt: row.revokedAt === null ? null : new Date(row.revokedAt).toISOString(),
});

const toDocument = (row: { docType: string; docId: string; revision: number; payload: unknown }): SyncDocument => ({
  type: row.docType as SyncDocType,
  id: row.docId,
  revision: Number(row.revision),
  payload: row.payload,
});

export const drizzleSyncRepository = <H extends PgQueryResultHKT>(db: Db<H>): SyncRepository => {
  const dropIfOrphaned = async (tx: Db<H>, accountId: string) => {
    const [live] = await tx
      .select({ n: count() })
      .from(devices)
      .where(and(eq(devices.accountId, accountId), isNull(devices.revokedAt)));
    if ((live?.n ?? 0) === 0) await tx.delete(accounts).where(eq(accounts.id, accountId));
  };

  return {
    deviceBySecretHash: async (hash) => {
      const [row] = await db.select().from(devices).where(eq(devices.secretHash, hash));
      return row === undefined ? null : toDevice(row);
    },

    touchDevice: async (deviceId, at) => {
      await db.update(devices).set({ lastSeenAt: at }).where(eq(devices.id, deviceId));
    },

    createAccount: (device) =>
      db.transaction(async (tx) => {
        const accountId = crypto.randomUUID();
        const deviceId = crypto.randomUUID();
        await tx.delete(devices).where(eq(devices.secretHash, device.hash));
        await tx.insert(accounts).values({ id: accountId, createdAt: device.at, lastActiveAt: device.at });
        await tx.insert(devices).values({
          id: deviceId,
          accountId,
          label: device.label,
          secretHash: device.hash,
          createdAt: device.at,
          lastSeenAt: device.at,
        });
        return { accountId, deviceId };
      }),

    attachDevice: (accountId, device) =>
      db.transaction(async (tx) => {
        const deviceId = crypto.randomUUID();
        const [previous] = await tx
          .delete(devices)
          .where(eq(devices.secretHash, device.hash))
          .returning({ accountId: devices.accountId });
        await tx.insert(devices).values({
          id: deviceId,
          accountId,
          label: device.label,
          secretHash: device.hash,
          createdAt: device.at,
          lastSeenAt: device.at,
        });
        if (previous !== undefined && previous.accountId !== accountId) await dropIfOrphaned(tx, previous.accountId);
        return { deviceId };
      }),

    createPairCode: async (accountId, code) => {
      await db.insert(pairCodes).values({ codeHash: code.hash, accountId, expiresAt: code.expiresAt });
    },

    redeemPairCode: async (code) => {
      // One statement, so two devices racing for one code cannot both win it.
      const [row] = await db
        .update(pairCodes)
        .set({ usedAt: code.at })
        .where(and(eq(pairCodes.codeHash, code.hash), isNull(pairCodes.usedAt), gt(pairCodes.expiresAt, code.at)))
        .returning({ accountId: pairCodes.accountId });
      return row?.accountId ?? null;
    },

    listDevices: async (accountId) =>
      (
        await db
          .select()
          .from(devices)
          .where(and(eq(devices.accountId, accountId), isNull(devices.revokedAt)))
          .orderBy(asc(devices.createdAt))
      ).map(toDevice),

    revokeDevice: async (accountId, deviceId, at) => {
      const revoked = await db
        .update(devices)
        .set({ revokedAt: at })
        .where(and(eq(devices.accountId, accountId), eq(devices.id, deviceId), isNull(devices.revokedAt)))
        .returning({ id: devices.id });
      return revoked.length > 0;
    },

    deleteAccount: async (accountId) => {
      await db.delete(accounts).where(eq(accounts.id, accountId));
    },

    pull: async (accountId, watermark, limit) => {
      const rows = await db
        .select({
          docType: syncDocuments.docType,
          docId: syncDocuments.docId,
          revision: syncDocuments.revision,
          payload: syncDocuments.payload,
        })
        .from(syncDocuments)
        .where(and(eq(syncDocuments.accountId, accountId), gt(syncDocuments.revision, watermark)))
        .orderBy(asc(syncDocuments.revision))
        .limit(limit + 1);
      return { docs: rows.slice(0, limit).map(toDocument), more: rows.length > limit };
    },

    push: (accountId, deviceId, items, at) =>
      db.transaction(async (tx) => {
        // The row lock serialises pushes per account, so revisions never interleave.
        const [locked] = await tx
          .select({ revision: accounts.revision })
          .from(accounts)
          .where(eq(accounts.id, accountId))
          .for("update");
        let revision = Number(locked?.revision ?? 0);

        const ids = [...new Set(items.map((i) => i.id))];
        const current = new Map<string, SyncDocument>();
        if (ids.length > 0) {
          const rows = await tx
            .select({
              docType: syncDocuments.docType,
              docId: syncDocuments.docId,
              revision: syncDocuments.revision,
              payload: syncDocuments.payload,
            })
            .from(syncDocuments)
            .where(and(eq(syncDocuments.accountId, accountId), inArray(syncDocuments.docId, ids)));
          for (const row of rows) current.set(`${row.docType}:${row.docId}`, toDocument(row));
        }

        const accepted: PushResult["accepted"][number][] = [];
        const conflicts: SyncDocument[] = [];
        const writes: (typeof syncDocuments.$inferInsert)[] = [];
        for (const item of items) {
          const key = `${item.type}:${item.id}`;
          const existing = current.get(key);
          if (existing !== undefined && existing.revision !== item.baseRevision) {
            conflicts.push(existing);
            continue;
          }
          revision++;
          const doc: SyncDocument = { type: item.type, id: item.id, revision, payload: item.payload };
          current.set(key, doc);
          writes.push({
            accountId,
            docType: item.type,
            docId: item.id,
            payload: item.payload,
            revision,
            updatedAt: at,
            deviceId,
          });
          accepted.push({ type: item.type, id: item.id, revision });
        }

        if (writes.length > 0) {
          await tx
            .insert(syncDocuments)
            .values(writes)
            .onConflictDoUpdate({
              target: [syncDocuments.accountId, syncDocuments.docType, syncDocuments.docId],
              set: {
                payload: sql`excluded.payload`,
                revision: sql`excluded.revision`,
                updatedAt: sql`excluded.updated_at`,
                deviceId: sql`excluded.device_id`,
              },
            });
        }
        await tx.update(accounts).set({ revision, lastActiveAt: at }).where(eq(accounts.id, accountId));
        return { accepted, conflicts };
      }),

    hit: rateLimitHit(db),
  };
};

/**
 * Count one hit on a rate-limit key within its window, starting again in a new window.
 * One upsert, so two concurrent hits cannot both read the old count. Shared by the sync
 * and telemetry repositories, which limit on the same table.
 */
export const rateLimitHit =
  <H extends PgQueryResultHKT>(db: Db<H>) =>
  async (key: string, windowStart: string): Promise<number> => {
    const [row] = await db
      .insert(rateLimits)
      .values({ key, windowStart, count: 1 })
      .onConflictDoUpdate({
        target: rateLimits.key,
        set: {
          count: sql`case when ${rateLimits.windowStart} = excluded.window_start then ${rateLimits.count} + 1 else 1 end`,
          windowStart: sql`excluded.window_start`,
        },
      })
      .returning({ count: rateLimits.count });
    return row?.count ?? 1;
  };
