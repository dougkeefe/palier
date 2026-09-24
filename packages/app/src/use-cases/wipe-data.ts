import type {
  AttemptStore,
  KeyVault,
  ScheduleStore,
  SessionStore,
  SettingsStore,
} from "../ports/index.js";

/**
 * Delete everything on this device in one action [R11] (implementation-plan.md 3.2,
 * `WipeData`): every attempt, schedule entry, session and setting, and the stored
 * API key.
 *
 * The **device secret survives**. `KeyVault.clear` removes the API key and leaves the
 * secret and its wrapping key (progress.md D50), because the secret is this device's
 * sync identity, not the user's progress. Deleting server-side progress is a separate,
 * explicit action in the sync settings (product-requirements.md §8.11), and it needs
 * that credential to be carried out. The confirmation step is the UI's job; this is
 * the action behind it.
 */

export type WipeDataDeps = {
  readonly attempts: AttemptStore;
  readonly schedule: ScheduleStore;
  readonly sessions: SessionStore;
  readonly settings: SettingsStore;
  readonly vault: KeyVault;
};

export const wipeData = async (deps: WipeDataDeps): Promise<void> => {
  await Promise.all([
    deps.attempts.clear(),
    deps.schedule.clear(),
    deps.sessions.clear(),
    deps.settings.clear(),
    deps.vault.clear(),
  ]);
};
