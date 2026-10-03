import type { MetadataRoute } from "next";

import { siteUrlFrom } from "../lib/build-info";
import { sitemapEntries } from "../lib/discoverability";
import routes from "../lib/routes.json";

// `sitemap.xml` (progress.md D199): every route in both locales, each with its `hreflang` alternates.
export default function sitemap(): MetadataRoute.Sitemap {
  return sitemapEntries(routes, siteUrlFrom(process.env));
}
