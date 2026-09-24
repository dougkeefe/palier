import type { Attempt } from "@palier/domain";
import { itemId } from "@palier/domain";

import type {
  AttemptStore,
  ScheduleEntry,
  ScheduleStore,
  Session,
  SessionStore,
  SettingEntry,
  SettingsStore,
  SyncDocType,
} from "../ports/index.js";
import {
  parseAttempt,
  parseScheduleEntry,
  parseSession,
  parseSetting,
} from "../use-cases/export-document.js";

/**
 * One progress record, tagged with the aggregate it belongs to and its key in that
 * aggregate — the unit that sync and import both merge (progress.md D69). A setting's
 * id is its key and its value is the whole `{ key, value }` entry, so every record's
 * payload is exactly what its store holds.
 */
export type SyncRecord =
  | { readonly type: "attempt"; readonly id: string; readonly value: Attempt }
  | { readonly type: "schedule"; readonly id: string; readonly value: ScheduleEntry }
  | { readonly type: "session"; readonly id: string; readonly value: Session }
  | { readonly type: "setting"; readonly id: string; readonly value: SettingEntry };

export type ProgressStores = {
  readonly attempts: AttemptStore;
  readonly schedule: ScheduleStore;
  readonly sessions: SessionStore;
  readonly settings: SettingsStore;
};

export const keyOf = (type: SyncDocType, id: string): string => `${type}:${id}`;

export const attemptRecord = (value: Attempt): SyncRecord => ({ type: "attempt", id: value.id, value });
export const scheduleRecord = (value: ScheduleEntry): SyncRecord => ({ type: "schedule", id: value.itemId, value });
export const sessionRecord = (value: Session): SyncRecord => ({ type: "session", id: value.id, value });
export const settingRecord = (value: SettingEntry): SyncRecord => ({ type: "setting", id: value.key, value });

/**
 * JSON with object keys sorted at every depth, so two equal records always serialise
 * identically whatever order their fields were written in. `undefined` fields are
 * dropped, exactly as `JSON.stringify` drops them.
 */
export const stableJson = (value: unknown): string => JSON.stringify(sortKeys(value));

const sortKeys = (value: unknown): unknown => {
  if (Array.isArray(value)) return value.map(sortKeys);
  if (typeof value !== "object" || value === null) return value;
  const out: Record<string, unknown> = {};
  for (const key of Object.keys(value).sort()) out[key] = sortKeys((value as Record<string, unknown>)[key]);
  return out;
};

const fnv1a = (text: string, basis: number): number => {
  let hash = basis;
  for (let i = 0; i < text.length; i++) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
};

/**
 * A 64-bit fingerprint of a record: two FNV-1a passes with different offset bases over
 * its stable JSON (the same dependency-free hash `selectionSeedFor` uses). It decides
 * only "has this record changed since it last synced" — a collision would delay one
 * push until the record next changes, never corrupt anything.
 */
export const recordHash = (value: unknown): string => {
  const text = stableJson(value);
  const hex = (n: number) => n.toString(16).padStart(8, "0");
  return hex(fnv1a(text, 0x811c9dc5)) + hex(fnv1a(text, 0x050c5d1f));
};

/**
 * Read a record out of an untrusted payload — a pulled document or a conflict copy —
 * with the same validation an import applies. Null when the payload is not a valid
 * record of its type, or names a different id than the document it came in, so a
 * malformed document is skipped rather than written.
 */
export const decodeRecord = (type: SyncDocType, id: string, payload: unknown): SyncRecord | null => {
  let record: SyncRecord;
  try {
    record = parseByType(type, payload);
  } catch {
    return null;
  }
  return record.id === id ? record : null;
};

const parseByType = (type: SyncDocType, payload: unknown): SyncRecord => {
  const at = `a synced ${type}`;
  switch (type) {
    case "attempt":
      return attemptRecord(parseAttempt(payload, at));
    case "schedule":
      return scheduleRecord(parseScheduleEntry(payload, at));
    case "session":
      return sessionRecord(parseSession(payload, at));
    case "setting":
      return settingRecord(parseSetting(payload, at));
  }
};

/** Every progress record on the device, keyed by `keyOf(type, id)`. */
export const collectRecords = async (stores: ProgressStores): Promise<Map<string, SyncRecord>> => {
  const [attempts, schedule, sessions, settings] = await Promise.all([
    stores.attempts.all(),
    stores.schedule.all(),
    stores.sessions.all(),
    stores.settings.all(),
  ]);
  const records = [
    ...attempts.map(attemptRecord),
    ...schedule.map(scheduleRecord),
    ...sessions.map(sessionRecord),
    ...settings.map(settingRecord),
  ];
  return new Map(records.map((r) => [keyOf(r.type, r.id), r]));
};

/**
 * The record a device holds under one key *right now* — for a sync that read its
 * snapshot a network round trip ago, while study carried on (progress.md D75). Null
 * when the device holds none. Attempts are never re-read: they are immutable, so the
 * snapshot's copy is still the live one.
 */
export const readRecord = async (type: SyncDocType, id: string, stores: ProgressStores): Promise<SyncRecord | null> => {
  switch (type) {
    case "attempt":
      return null;
    case "schedule": {
      const entry = await stores.schedule.get(itemId(id));
      return entry === null ? null : scheduleRecord(entry);
    }
    case "session": {
      const session = (await stores.sessions.all()).find((s) => s.id === id);
      return session === undefined ? null : sessionRecord(session);
    }
    case "setting": {
      const value = await stores.settings.get<unknown>(id);
      return value === null ? null : settingRecord({ key: id, value });
    }
  }
};

/**
 * Write one record into its store, replacing whatever the store held under that key.
 * An attempt is append-only, so writing one that exists is the store's no-op — which
 * is right, because attempts never change (ADR 16).
 */
export const writeRecord = async (record: SyncRecord, stores: ProgressStores): Promise<void> => {
  switch (record.type) {
    case "attempt":
      await stores.attempts.append(record.value);
      return;
    case "schedule":
      await stores.schedule.put(record.value);
      return;
    case "session":
      await stores.sessions.create(record.value);
      return;
    case "setting":
      await stores.settings.set(record.value.key, record.value.value);
      return;
  }
};
