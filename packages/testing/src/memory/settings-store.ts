import type { SettingsStore } from "@palier/app";

export const memorySettingsStore = (): SettingsStore => {
  const values = new Map<string, unknown>();

  return {
    get: <T>(key: string) => Promise.resolve((values.get(key) ?? null) as T | null),
    set: <T>(key: string, value: T) => {
      values.set(key, value);
      return Promise.resolve();
    },
    all: () => Promise.resolve([...values].map(([key, value]) => ({ key, value }))),
    clear: () => {
      values.clear();
      return Promise.resolve();
    },
  };
};
