import { useSyncExternalStore } from "react";

const subscribe = () => () => undefined;

/**
 * `false` on the server and through hydration, `true` after it: for a view that reads the
 * browser (the user agent, the path, the clock) and must not render differently from the
 * server's HTML while hydrating.
 */
export const useInBrowser = (): boolean =>
  useSyncExternalStore(
    subscribe,
    () => true,
    () => false,
  );
