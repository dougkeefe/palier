/**
 * TEMPORARY. These are placeholders for the port interfaces in
 * implementation-plan.md 3.3, which belong to `@palier/app` and do not exist
 * yet.
 *
 * They live here so the in-memory implementations and the contract suites can
 * be typed today. **When `@palier/app` lands, delete this file** and import the
 * real ports from `@palier/app`; the contract suites should need no other
 * change, which is the point of writing them against an interface rather than
 * against an implementation.
 *
 * Only the ports whose signatures 3.3 actually specifies are stubbed. The two
 * it leaves as comments — `SessionStore` and `OralStore` — are stubbed as empty
 * interfaces on purpose, so that nobody mistakes an invention here for a
 * specified contract.
 */
import type { ISO } from "./clock/fake-clock.js";

export type { ISO };

export type Skill = "reading" | "writing" | "oral";
export type Lang = "en" | "fr";

/** Branded ids arrive with `@palier/domain`; these are structural placeholders. */
export type ItemId = string;
export type PassageId = string;
export type FormId = string;
export type ScenarioId = string;
export type DeviceId = string;

export type Attempt = {
  readonly id: string;
  readonly itemId: ItemId;
  readonly skill: Skill;
  readonly ts: ISO;
};

export type ScheduleEntry = {
  readonly itemId: ItemId;
  readonly due: ISO;
  readonly skill: Skill;
};

export type AttemptStore = {
  append: (attempt: Attempt) => Promise<void>;
  recent: (skill: Skill, n: number) => Promise<readonly Attempt[]>;
  since: (t: ISO) => Promise<readonly Attempt[]>;
  forItem: (id: ItemId) => Promise<readonly Attempt[]>;
};

export type ScheduleStore = {
  due: (now: ISO, limit: number) => Promise<readonly ScheduleEntry[]>;
  put: (entry: ScheduleEntry) => Promise<void>;
};

export type SettingsStore = {
  get: <T>(key: string) => Promise<T | null>;
  set: <T>(key: string, value: T) => Promise<void>;
};

export type KeyVault = {
  putApiKey: (key: string) => Promise<void>;
  /** Hands the key to a callback and never returns it (implementation-plan.md 3.3). */
  withApiKey: <T>(fn: (key: string) => Promise<T>) => Promise<T>;
  hasApiKey: () => Promise<boolean>;
  clear: () => Promise<void>;
  deviceSecret: () => Promise<string>;
};
