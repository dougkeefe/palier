import {
  ATTEMPT_MODES,
  type Attempt,
  type AttemptMode,
  SKILLS,
  type Skill,
  attemptId,
  attemptSchema,
  itemId,
  sessionId,
} from "@palier/domain";

import type { ISO, ScheduleEntry, Session, SettingEntry } from "../ports/index.js";

/**
 * The export file [R11]: everything this device knows about its user's progress, in
 * one versioned JSON document, which `exportData` writes and `importData` reads.
 *
 * It carries the four progress aggregates and **nothing from the key vault** — no
 * API key, no device secret. An export is a file a user can email, keep in a cloud
 * drive or hand to a colleague. The key never leaves the browser [R12], and the
 * device secret is a sync credential that would let whoever holds the file act as
 * this device (architecture.md §9.3). Band estimates are absent because nothing
 * stores them: each device recomputes them from the attempts (ADR 16).
 *
 * `version` names this shape. A future shape bumps it, and `parseExportDocument`
 * then has to accept both — an old export must stay importable.
 */
export const EXPORT_FORMAT = "palier-export";
export const EXPORT_VERSION = 1;

export type ExportDocument = {
  readonly format: typeof EXPORT_FORMAT;
  readonly version: typeof EXPORT_VERSION;
  readonly exportedAt: ISO;
  readonly attempts: readonly Attempt[];
  readonly schedule: readonly ScheduleEntry[];
  readonly sessions: readonly Session[];
  readonly settings: readonly SettingEntry[];
};

/** The file is not an export this build can read; nothing has been written. */
export class InvalidExportError extends Error {
  constructor(readonly reason: string) {
    super(`This file is not a Palier export this version can import: ${reason}.`);
    this.name = "InvalidExportError";
  }
}

// ISO-8601 instant with an explicit zone, the shape `Clock.now()` produces.
const ISO_INSTANT = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?(Z|[+-]\d{2}:\d{2})$/;

const isIso = (value: unknown): value is ISO =>
  typeof value === "string" && ISO_INSTANT.test(value) && !Number.isNaN(Date.parse(value));

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const nonEmptyString = (value: unknown): value is string =>
  typeof value === "string" && value.length > 0;

const arrayField = (doc: Record<string, unknown>, field: string): readonly unknown[] => {
  const value = doc[field];
  if (!Array.isArray(value)) throw new InvalidExportError(`"${field}" is missing or not a list`);
  return value;
};

const parseAttempt = (raw: unknown, at: string): Attempt => {
  const parsed = attemptSchema.safeParse(raw);
  if (!parsed.success) throw new InvalidExportError(`${at} is not a valid attempt`);
  const a = parsed.data;
  // The schema checks ids as non-empty strings; the brand is compile-time only.
  return { ...a, id: attemptId(a.id), itemId: itemId(a.itemId), sessionId: sessionId(a.sessionId) };
};

const parseScheduleEntry = (raw: unknown, at: string): ScheduleEntry => {
  if (
    !isRecord(raw) ||
    !nonEmptyString(raw.itemId) ||
    !(raw.due === null || isIso(raw.due)) ||
    !SKILLS.includes(raw.skill as Skill) ||
    !Number.isInteger(raw.box) ||
    (raw.box as number) < 1
  ) {
    throw new InvalidExportError(`${at} is not a valid schedule entry`);
  }
  return { itemId: itemId(raw.itemId), due: raw.due, skill: raw.skill as Skill, box: raw.box as number };
};

const parseSession = (raw: unknown, at: string): Session => {
  if (
    !isRecord(raw) ||
    !nonEmptyString(raw.id) ||
    !ATTEMPT_MODES.includes(raw.mode as AttemptMode) ||
    !isIso(raw.startedAt) ||
    !(raw.completedAt === null || isIso(raw.completedAt))
  ) {
    throw new InvalidExportError(`${at} is not a valid session`);
  }
  return {
    id: sessionId(raw.id),
    mode: raw.mode as AttemptMode,
    startedAt: raw.startedAt,
    completedAt: raw.completedAt,
  };
};

const parseSetting = (raw: unknown, at: string): SettingEntry => {
  if (!isRecord(raw) || !nonEmptyString(raw.key) || !("value" in raw)) {
    throw new InvalidExportError(`${at} is not a valid setting`);
  }
  return { key: raw.key, value: raw.value };
};

/**
 * Parse and validate an export's text, **all of it before any of it is used**, so a
 * file with one bad record is rejected whole rather than half-imported. Throws
 * `InvalidExportError` naming the first problem.
 */
export const parseExportDocument = (text: string): ExportDocument => {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    throw new InvalidExportError("it is not JSON");
  }
  if (!isRecord(raw) || raw.format !== EXPORT_FORMAT) {
    throw new InvalidExportError("it is not a Palier export");
  }
  if (raw.version !== EXPORT_VERSION) {
    throw new InvalidExportError(`its format version ${String(raw.version)} is not supported`);
  }
  if (!isIso(raw.exportedAt)) throw new InvalidExportError('"exportedAt" is not a date');

  return {
    format: EXPORT_FORMAT,
    version: EXPORT_VERSION,
    exportedAt: raw.exportedAt,
    attempts: arrayField(raw, "attempts").map((a, i) => parseAttempt(a, `attempts[${String(i)}]`)),
    schedule: arrayField(raw, "schedule").map((e, i) => parseScheduleEntry(e, `schedule[${String(i)}]`)),
    sessions: arrayField(raw, "sessions").map((s, i) => parseSession(s, `sessions[${String(i)}]`)),
    settings: arrayField(raw, "settings").map((s, i) => parseSetting(s, `settings[${String(i)}]`)),
  };
};
