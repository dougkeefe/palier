/**
 * Small, typed key/value settings (implementation-plan.md 3.3): the sync switch,
 * the interface locale, the do-not-remember-my-key preference. `get` returns
 * `null` for an absent key rather than throwing, so a first run is not an error.
 *
 * `all` and `clear` serve export and wipe [R11], the same pair every store port
 * gains (progress.md D61). `all` returns every stored key with its value, in no
 * promised order.
 */
export type SettingEntry = {
  readonly key: string;
  readonly value: unknown;
};

export type SettingsStore = {
  get: <T>(key: string) => Promise<T | null>;
  set: <T>(key: string, value: T) => Promise<void>;
  all: () => Promise<readonly SettingEntry[]>;
  clear: () => Promise<void>;
};
