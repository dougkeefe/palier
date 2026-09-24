import { describe, expect, it } from "vitest";

import { registerServiceWorker } from "./register";

describe("registerServiceWorker", () => {
  const hostRecording = () => {
    const calls: { url: string; options: unknown }[] = [];
    return {
      calls,
      host: {
        serviceWorker: {
          register: (url: string, options: unknown) => {
            calls.push({ url, options });
            return Promise.resolve({});
          },
        },
      },
    };
  };

  it("registers /sw.js at the origin root, bypassing the HTTP cache, in production", async () => {
    const { host, calls } = hostRecording();
    expect(await registerServiceWorker(host, "production")).toBe("registered");
    expect(calls).toEqual([{ url: "/sw.js", options: { scope: "/", updateViaCache: "none" } }]);
  });

  it("never registers under the dev server, where it would pin stale hot-reload chunks", async () => {
    const { host, calls } = hostRecording();
    expect(await registerServiceWorker(host, "development")).toBe("skipped-dev");
    expect(await registerServiceWorker(host, undefined)).toBe("skipped-dev");
    expect(calls).toEqual([]);
  });

  it("does nothing in a browser without service workers", async () => {
    expect(await registerServiceWorker({}, "production")).toBe("unsupported");
  });

  it("reports a failed registration instead of throwing, so the app still runs online", async () => {
    const host = { serviceWorker: { register: () => Promise.reject(new Error("SecurityError")) } };
    expect(await registerServiceWorker(host, "production")).toBe("failed");
  });
});
