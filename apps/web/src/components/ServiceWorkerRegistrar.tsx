"use client";

import { useEffect } from "react";

import { registerServiceWorker } from "../sw/register";

/**
 * Registers the offline service worker once, after hydration. Renders nothing, so
 * it adds no nodes to the accessibility tree. The decision logic, and its tests,
 * live in `src/sw/register.ts`.
 */
export function ServiceWorkerRegistrar() {
  useEffect(() => {
    void registerServiceWorker(navigator, process.env.NODE_ENV);
  }, []);
  return null;
}
