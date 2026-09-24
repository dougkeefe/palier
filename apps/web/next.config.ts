import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

// Points the plugin at the per-request i18n config (src/i18n/request.ts).
const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

const nextConfig: NextConfig = {
  async headers() {
    return [
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
