/**
 * Spending calls that outlive their screen (progress.md D127, D143). A call to OpenAI cannot
 * be taken back once sent, and leaving the screen does not stop it, so:
 *
 * - **A request still out is joined, never repeated.** Coming back to the screen, or asking
 *   again, gets the same promise, so the user never pays twice for one answer; the screen
 *   reads the held request on mount and shows it as still being made.
 * - **A wipe forgets them, and their writes.** A call started before "Delete everything"
 *   must not write the user's text back when it settles, so each call's stores drop their
 *   writes once a wipe has happened since the call began. The cost ledger is not guarded:
 *   the call was billed, and the meter should say so.
 *
 * Both live at module scope in the composition root, so a container built again (a change of
 * language remounts the layout) still finds what the last one started.
 */

export type Held<R, V> = { readonly request: R; readonly result: Promise<V> };

export type InFlight<K, R, V> = {
  /** The request still out under `key`, or else `start`'s, held until it settles. */
  readonly join: (key: K, request: R, start: () => Promise<V>) => Promise<V>;
  readonly get: (key: K) => Held<R, V> | null;
  /** Every request still out. */
  readonly all: () => readonly Held<R, V>[];
  /** Forget every request; each still settles, but no longer answers a join. */
  readonly clear: () => void;
};

export const inFlight = <K, R, V>(): InFlight<K, R, V> => {
  const held = new Map<K, Held<R, V>>();
  return {
    join: (key, request, start) => {
      const current = held.get(key);
      if (current !== undefined) return current.result;
      const result = start().finally(() => {
        // Only its own entry: after a clear, a newer request may hold the key.
        if (held.get(key)?.result === result) held.delete(key);
      });
      held.set(key, { request, result });
      return result;
    },
    get: (key) => held.get(key) ?? null,
    all: () => [...held.values()],
    clear: () => held.clear(),
  };
};

export type WipeCount = {
  readonly now: () => number;
  readonly bump: () => void;
};

/** How many wipes this page has made, so a call can tell whether one happened since it began. */
export const wipeCount = (): WipeCount => {
  let count = 0;
  return {
    now: () => count,
    bump: () => {
      count += 1;
    },
  };
};

type Write = (...args: never[]) => Promise<void>;

/**
 * `store`, with `method`'s writes dropped once `wipes` has moved past `since`. Every other
 * method passes through, so a call can still read what it needs.
 */
export const writesUntilWiped = <S extends { readonly [M in K]: Write }, K extends keyof S>(
  store: S,
  method: K,
  wipes: WipeCount,
  since: number,
): S => {
  const write = store[method] as unknown as (...args: unknown[]) => Promise<void>;
  return { ...store, [method]: (...args: unknown[]) => (wipes.now() === since ? write(...args) : Promise.resolve()) };
};
