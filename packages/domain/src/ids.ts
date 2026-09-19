import type { Brand } from "./brand.js";

/**
 * Identifiers are ULIDs in practice (architecture.md 5.1: "ULID, stable
 * forever"), but this package does not generate them: minting an id needs
 * randomness, and @palier/domain is pure. The adapters mint; domain only names.
 */
export type ItemId = Brand<string, "ItemId">;
export type PassageId = Brand<string, "PassageId">;
export type FormId = Brand<string, "FormId">;
export type ScenarioId = Brand<string, "ScenarioId">;
export type AttemptId = Brand<string, "AttemptId">;
export type SessionId = Brand<string, "SessionId">;
export type DeviceId = Brand<string, "DeviceId">;

/**
 * The constructors are unchecked casts on purpose. Validation is the Zod
 * schemas' job and happens once, at the boundary; re-checking here would be a
 * second source of truth about what an id looks like.
 */
export const itemId = (value: string): ItemId => value as ItemId;
export const passageId = (value: string): PassageId => value as PassageId;
export const formId = (value: string): FormId => value as FormId;
export const scenarioId = (value: string): ScenarioId => value as ScenarioId;
export const attemptId = (value: string): AttemptId => value as AttemptId;
export const sessionId = (value: string): SessionId => value as SessionId;
export const deviceId = (value: string): DeviceId => value as DeviceId;
