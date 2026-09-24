import type {
  AttemptStore,
  ScheduleStore,
  SessionStore,
  SettingsStore,
} from "../ports/index.js";
import { parseExportDocument } from "./export-document.js";

/**
 * Import an export [R11] (implementation-plan.md 3.2, `ImportData`).
 *
 * The whole file is validated before anything is written (`parseExportDocument`), so
 * a bad file changes nothing. Then it merges, and **import never overwrites a local
 * record**:
 *
 * - Attempts merge as a union. They are append-only and keyed by ULID, so an attempt
 *   already present is the store's duplicate no-op (ADR 16, D44). This is the one
 *   aggregate whose merge is already decided.
 * - Schedule entries, sessions and settings are added **only where the device has no
 *   record of that key**; the local copy wins. Anything smarter is a merge rule, and
 *   the schedule's merge rule is exactly the open Gate B question (progress.md D43).
 *   Import must not answer it by accident. Keep-local is the rule that decides
 *   nothing.
 *
 * So importing into a wiped device restores everything, importing the same file
 * twice changes nothing, and importing onto a device with history keeps that history
 * (progress.md D62).
 */

export type ImportDataRequest = {
  /** The export file's text, exactly as read. */
  readonly json: string;
};

export type ImportDataDeps = {
  readonly attempts: AttemptStore;
  readonly schedule: ScheduleStore;
  readonly sessions: SessionStore;
  readonly settings: SettingsStore;
};

/** Per aggregate: records written, and records skipped because the device already had them. */
export type ImportCount = { readonly added: number; readonly kept: number };

export type ImportDataResult = {
  readonly attempts: ImportCount;
  readonly schedule: ImportCount;
  readonly sessions: ImportCount;
  readonly settings: ImportCount;
};

export const importData = async (
  request: ImportDataRequest,
  deps: ImportDataDeps,
): Promise<ImportDataResult> => {
  const doc = parseExportDocument(request.json);

  let attemptsAdded = 0;
  for (const attempt of doc.attempts) {
    if (await deps.attempts.append(attempt)) attemptsAdded++;
  }

  let scheduleAdded = 0;
  for (const entry of doc.schedule) {
    if ((await deps.schedule.get(entry.itemId)) !== null) continue;
    await deps.schedule.put(entry);
    scheduleAdded++;
  }

  const localSessionIds = new Set((await deps.sessions.all()).map((s) => s.id));
  let sessionsAdded = 0;
  for (const session of doc.sessions) {
    if (localSessionIds.has(session.id)) continue;
    await deps.sessions.create(session);
    localSessionIds.add(session.id);
    sessionsAdded++;
  }

  // Keys, not `get() !== null`: a stored null is still a local record.
  const localKeys = new Set((await deps.settings.all()).map((s) => s.key));
  let settingsAdded = 0;
  for (const setting of doc.settings) {
    if (localKeys.has(setting.key)) continue;
    await deps.settings.set(setting.key, setting.value);
    localKeys.add(setting.key);
    settingsAdded++;
  }

  const count = (added: number, total: number): ImportCount => ({ added, kept: total - added });
  return {
    attempts: count(attemptsAdded, doc.attempts.length),
    schedule: count(scheduleAdded, doc.schedule.length),
    sessions: count(sessionsAdded, doc.sessions.length),
    settings: count(settingsAdded, doc.settings.length),
  };
};
