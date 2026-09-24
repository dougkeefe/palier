/** The slice of `navigator.serviceWorker` registration uses. */
export type ServiceWorkerHost = {
  readonly serviceWorker?: {
    register: (url: string, options: { scope: string; updateViaCache: "none" }) => Promise<unknown>;
  };
};

export type RegistrationOutcome = "registered" | "skipped-dev" | "unsupported" | "failed";

/**
 * Register `/sw.js`, in production builds only.
 *
 * Never under `next dev`: a worker that serves `/_next/static/` cache-first would
 * pin stale hot-reload chunks and break the dev server, including the hermetic
 * Playwright lane that runs on it. The offline lane runs `next build && next start`,
 * which is where the worker belongs (Next's offline guide: "dev mode is not a
 * reliable reference for offline behavior").
 *
 * A failure is reported, never thrown: the app works without the worker, it just
 * does not work offline, and study must never be interrupted for that
 * (product-requirements.md §14).
 */
export const registerServiceWorker = async (
  host: ServiceWorkerHost,
  nodeEnv: string | undefined,
): Promise<RegistrationOutcome> => {
  if (nodeEnv !== "production") return "skipped-dev";
  if (host.serviceWorker === undefined) return "unsupported";
  try {
    await host.serviceWorker.register("/sw.js", { scope: "/", updateViaCache: "none" });
    return "registered";
  } catch {
    return "failed";
  }
};
