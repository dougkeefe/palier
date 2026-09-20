/**
 * Small, typed key/value settings (implementation-plan.md 3.3): the sync switch,
 * the interface locale, the do-not-remember-my-key preference. `get` returns
 * `null` for an absent key rather than throwing, so a first run is not an error.
 */
export type SettingsStore = {
  get: <T>(key: string) => Promise<T | null>;
  set: <T>(key: string, value: T) => Promise<void>;
};
