import type { MetadataRoute } from "next";

import { siteUrlFrom } from "../lib/build-info";
import { robotsFor } from "../lib/discoverability";

// `robots.txt` (progress.md D199): everything but the API and the E2E hook, and the sitemap's address.
export default function robots(): MetadataRoute.Robots {
  return robotsFor(siteUrlFrom(process.env));
}
