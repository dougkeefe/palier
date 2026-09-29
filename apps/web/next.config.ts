import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

import { buildVersionFrom } from "./src/lib/build-info";

// Points the plugin at the per-request i18n config (src/i18n/request.ts).
const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

/**
 * The baseline security headers from architecture.md §12, on every response (progress.md
 * D78): HSTS, no MIME sniffing, no referrer, and the microphone allowed on this origin
 * only (the oral phases' need, and nobody else's). The strict CSP §6.4 asks for needs
 * nonces for Next's inline scripts, so it is Phase 7's, with tier 11's check on the built
 * output.
 */
const SECURITY_HEADERS = [
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "no-referrer" },
  { key: "Permissions-Policy", value: "microphone=(self), camera=(), geolocation=()" },
];

const nextConfig: NextConfig = {
  // Which build this is, inlined for the server and the client alike (src/lib/build-info.ts, D140).
  env: { PALIER_BUILD_VERSION: buildVersionFrom(process.env) },
  async headers() {
    return [
      { source: "/:path*", headers: SECURITY_HEADERS },
      {
        // The service worker must never be served from the HTTP cache, or a deploy
        // would not reach users until that cache expired (Next's PWA guide; the
        // registration also sets `updateViaCache: "none"`).
        source: "/sw.js",
        headers: [
          { key: "Content-Type", value: "application/javascript; charset=utf-8" },
          { key: "Cache-Control", value: "no-cache, no-store, must-revalidate" },
          { key: "Content-Security-Policy", value: "default-src 'self'; script-src 'self'" },
        ],
      },
      {
        // Shard, passage and form files are named by their content hash, so a copy
        // is valid forever (architecture.md §5.5).
        source: "/content/bank/:path*",
        headers: [{ key: "Cache-Control", value: "public, max-age=31536000, immutable" }],
      },
      {
        // …but a manifest's name is fixed per bank version, and a version can be
        // rebuilt in place while the bank is still baseline content (D56). Revalidate
        // it. Listed after the rule above, so it wins for this key.
        source: "/content/bank/:version/manifest.json",
        headers: [{ key: "Cache-Control", value: "no-cache" }],
      },
    ];
  },
};

export default withNextIntl(nextConfig);
