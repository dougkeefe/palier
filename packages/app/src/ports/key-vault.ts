/**
 * Custody of the user's OpenAI key and the device secret (implementation-plan.md
 * 3.3, ADR 2, ADR 3).
 *
 * `withApiKey` hands the key to a callback and never returns it, so there is no
 * ergonomic way to park it in a variable that ends up in state, a log or an
 * error report [R12]. **Do not add a `getApiKey`** — the shape is the control.
 */
export type KeyVault = {
  putApiKey: (key: string) => Promise<void>;
  withApiKey: <T>(fn: (key: string) => Promise<T>) => Promise<T>;
  hasApiKey: () => Promise<boolean>;
  clear: () => Promise<void>;
  deviceSecret: () => Promise<string>;
};
