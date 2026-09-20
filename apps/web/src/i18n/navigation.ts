import { createNavigation } from "next-intl/navigation";

import { routing } from "./routing";

/**
 * Locale-aware navigation helpers. `Link` and `redirect` carry the active
 * locale prefix automatically, so no component ever hand-builds a `/en/...`
 * path. Use these instead of `next/link` and `next/navigation` throughout the
 * app.
 */
export const { Link, redirect, usePathname, useRouter, getPathname } =
  createNavigation(routing);
