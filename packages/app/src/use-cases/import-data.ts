import type {
  AttemptStore,
  ExamRunStore,
  ScheduleStore,
  SessionStore,
  SettingsStore,
} from "../ports/index.js";
import { mergeRecord } from "../sync/merge.js";
import {
  type SyncRecord,
  attemptRecord,
  collectRecords,
  examRunRecord,
  keyOf,
  scheduleRecord,
  sessionRecord,
  settingRecord,
  stableJson,
  writeRecord,
} from "../sync/records.js";
import { parseExportDocument } from "./export-document.js";

/**
 * Import an export [R11] (implementation-plan.md 3.2, `ImportData`).
 *
 * The whole file is validated before anything is written (`parseExportDocument`), so
 * a bad file changes nothing. Then every record is merged with the device's copy by
 * **the same rule sync uses** (`mergeRecord`, progress.md D69):
 *
 * - A record the device does not have is added.
 * - Attempts merge as a union. They are append-only and keyed by ULID, so an attempt
 *   already present is the store's duplicate no-op (ADR 16, D44).
 * - A schedule entry keeps the **lower Leitner box** (Gate B, D43); a session keeps the
 *   completed copy; an exam run keeps the submitted copy; a setting keeps the local
 *   value.
 *
 * A file carries no causal history — it cannot say whether it was exported before or
 * after the device's own edits — so every record already present is treated as a
 * concurrent edit. That fails safe: an old file can send an item back for an early
 * review, which costs seconds, and can never skip one.
 *
 * So importing into a wiped device restores everything, importing the same file twice
 * changes nothing, and importing onto a device with history keeps what it learned
 * (progress.md D62, amended by D69).
 */

export type ImportDataRequest = {
  /** The export file's text, exactly as read. */
  readonly json: string;
};

export type ImportDataDeps = {
  readonly attempts: AttemptStore;
  readonly schedule: ScheduleStore;
  readonly sessions: SessionStore;
  readonly examRuns: ExamRunStore;
  readonly settings: SettingsStore;
};

/**
 * Per aggregate: records the device did not have, records whose merge changed the
 * device's copy, and records the device's copy already covered.
 */
export type ImportCount = { readonly added: number; readonly merged: number; readonly kept: number };

export type ImportDataResult = {
  readonly attempts: ImportCount;
  readonly schedule: ImportCount;
  readonly sessions: ImportCount;
  readonly examRuns: ImportCount;
  readonly settings: ImportCount;
};

export const importData = async (
  request: ImportDataRequest,
  deps: ImportDataDeps,
): Promise<ImportDataResult> => {
  const doc = parseExportDocument(request.json);
  const local = await collectRecords(deps);

  const importAll = async (records: readonly SyncRecord[]): Promise<ImportCount> => {
    let added = 0;
    let merged = 0;
    for (const incoming of records) {
      const key = keyOf(incoming.type, incoming.id);
      const mine = local.get(key);
      const next = mine === undefined ? incoming : mergeRecord(mine, incoming);
      if (mine !== undefined && stableJson(next.value) === stableJson(mine.value)) continue;
      await writeRecord(next, deps);
      local.set(key, next);
      if (mine === undefined) added++;
      else merged++;
    }
    return { added, merged, kept: records.length - added - merged };
  };

  return {
    attempts: await importAll(doc.attempts.map(attemptRecord)),
    schedule: await importAll(doc.schedule.map(scheduleRecord)),
    sessions: await importAll(doc.sessions.map(sessionRecord)),
    examRuns: await importAll(doc.examRuns.map(examRunRecord)),
    settings: await importAll(doc.settings.map(settingRecord)),
  };
};
