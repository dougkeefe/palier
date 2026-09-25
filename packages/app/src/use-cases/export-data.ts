import type {
  AttemptStore,
  Clock,
  ExamRunStore,
  ScheduleStore,
  SessionStore,
  SettingsStore,
} from "../ports/index.js";
import { EXPORT_FORMAT, EXPORT_VERSION, type ExportDocument } from "./export-document.js";

/**
 * Export everything to one JSON document [R11] (implementation-plan.md 3.2,
 * `ExportData`). Pure orchestration: read every record of the five progress stores
 * and stamp the document with the clock.
 *
 * Records are sorted by their key, so two exports of the same state are
 * byte-identical — a user can diff two exports, and the round-trip tests can compare
 * them. The key vault is not read at all (see `ExportDocument`).
 */

export type ExportDataDeps = {
  readonly clock: Clock;
  readonly attempts: AttemptStore;
  readonly schedule: ScheduleStore;
  readonly sessions: SessionStore;
  readonly examRuns: ExamRunStore;
  readonly settings: SettingsStore;
};

const byKey =
  <T>(key: (value: T) => string) =>
  (a: T, b: T): number =>
    key(a) < key(b) ? -1 : key(a) > key(b) ? 1 : 0;

export const exportData = async (deps: ExportDataDeps): Promise<ExportDocument> => {
  const [attempts, schedule, sessions, examRuns, settings] = await Promise.all([
    deps.attempts.all(),
    deps.schedule.all(),
    deps.sessions.all(),
    deps.examRuns.all(),
    deps.settings.all(),
  ]);
  return {
    format: EXPORT_FORMAT,
    version: EXPORT_VERSION,
    exportedAt: deps.clock.now(),
    attempts: [...attempts].sort(byKey((a) => a.id)),
    schedule: [...schedule].sort(byKey((e) => e.itemId)),
    sessions: [...sessions].sort(byKey((s) => s.id)),
    examRuns: [...examRuns].sort(byKey((r) => r.id)),
    settings: [...settings].sort(byKey((s) => s.key)),
  };
};
