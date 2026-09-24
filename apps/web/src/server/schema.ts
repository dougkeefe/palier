import { sql } from "drizzle-orm";
import {
  bigint,
  boolean,
  index,
  integer,
  jsonb,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";

/**
 * The sync backend's tables (architecture.md §9.2, amended by ADR 21 and progress.md
 * D69/D70). Nothing here identifies a person: an account is a random id, a device is a
 * hashed secret, and a document's payload is the client's own record, opaque to the
 * server.
 *
 * Departures from the §9.2 sketch:
 * - `accounts.revision` is the per-account counter every accepted write increments. It
 *   stamps `sync_documents.revision` and is the pull watermark (D69).
 * - `devices.secret_hash` is **SHA-256** of the 256-bit device secret, unique and
 *   indexed, so the bearer alone finds its device (D70). A random 256-bit secret needs no
 *   slow hash: nothing about it is guessable.
 * - `accounts` drops `locale`, `target_lang` and `target_band`. Nothing sends them, and
 *   a setting that syncs rides in `sync_documents` like every other record.
 * - `pair_codes` and `rate_limits` are new. §9.3 specifies both behaviours, but §9.2 gave
 *   them no table.
 */

const instant = (name: string) => timestamp(name, { withTimezone: true, mode: "string" });

export const accounts = pgTable("accounts", {
  id: uuid("id").primaryKey(),
  createdAt: instant("created_at").notNull(),
  lastActiveAt: instant("last_active_at").notNull(),
  revision: bigint("revision", { mode: "number" }).notNull().default(0),
});

export const devices = pgTable(
  "devices",
  {
    id: uuid("id").primaryKey(),
    accountId: uuid("account_id")
      .notNull()
      .references(() => accounts.id, { onDelete: "cascade" }),
    label: text("label").notNull(),
    secretHash: text("secret_hash").notNull().unique(),
    createdAt: instant("created_at").notNull(),
    lastSeenAt: instant("last_seen_at").notNull(),
    revokedAt: instant("revoked_at"),
  },
  (t) => [index("devices_account_idx").on(t.accountId)],
);

export const syncDocuments = pgTable(
  "sync_documents",
  {
    accountId: uuid("account_id")
      .notNull()
      .references(() => accounts.id, { onDelete: "cascade" }),
    docType: text("doc_type").notNull(),
    docId: text("doc_id").notNull(),
    payload: jsonb("payload").notNull(),
    revision: bigint("revision", { mode: "number" }).notNull(),
    updatedAt: instant("updated_at").notNull(),
    deviceId: uuid("device_id"),
    // Tombstones (§9.4) are deferred until something deletes a single record (D69).
    deleted: boolean("deleted").notNull().default(false),
  },
  (t) => [
    primaryKey({ columns: [t.accountId, t.docType, t.docId] }),
    index("sync_documents_revision_idx").on(t.accountId, t.revision),
  ],
);

export const pairCodes = pgTable("pair_codes", {
  // A code is short-lived, but stored hashed all the same: a database reader cannot redeem it.
  codeHash: text("code_hash").primaryKey(),
  accountId: uuid("account_id")
    .notNull()
    .references(() => accounts.id, { onDelete: "cascade" }),
  expiresAt: instant("expires_at").notNull(),
  usedAt: instant("used_at"),
});

export const rateLimits = pgTable("rate_limits", {
  // An HMAC of the route, the IP and the day under a server secret — never the IP (§12).
  key: text("key").primaryKey(),
  windowStart: instant("window_start").notNull(),
  count: integer("count").notNull().default(sql`0`),
});
