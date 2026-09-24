"use client";

import { createContext, type ReactNode, useContext, useEffect, useState } from "react";

import type { Container } from "../lib/container";

export type ContainerState =
  | { readonly status: "loading" }
  | { readonly status: "ready"; readonly container: Container }
  | { readonly status: "failed" };

const ContainerContext = createContext<ContainerState>({ status: "loading" });

/**
 * Builds the composition root's container **once, in the browser**, after hydration,
 * and hands it to every island below (progress.md D59). The production graph is
 * browser-only (IndexedDB, an origin-relative bank URL), so it cannot be built during
 * server rendering. The server passes only `hermetic`, which it reads from the
 * environment.
 *
 * The container module is imported lazily, so the adapters and the use-case graph
 * load after the page, in their own chunk, and stay out of the shared first-load JS
 * the bundle budget measures (architecture.md §13). The provider sits in the layout,
 * so the one container survives client-side navigation between routes.
 */
export function ContainerProvider({ hermetic, children }: { hermetic: boolean; children: ReactNode }) {
  const [state, setState] = useState<ContainerState>({ status: "loading" });

  useEffect(() => {
    let live = true;
    import("../lib/container").then(
      ({ createContainer }) => {
        if (live) setState({ status: "ready", container: createContainer({ hermetic }) });
      },
      () => {
        if (live) setState({ status: "failed" });
      },
    );
    return () => {
      live = false;
    };
  }, [hermetic]);

  return <ContainerContext value={state}>{children}</ContainerContext>;
}

/** The container, once it is ready. Islands render their loading state until then. */
export const useContainer = (): ContainerState => useContext(ContainerContext);
