import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { use } from "react";

import { NotFoundView } from "../../../components/errors/NotFoundView";

export async function generateMetadata({ params }: PageProps<"/[locale]/[...rest]">): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "errors" });
  return { title: t("notFoundTitle"), robots: { index: false } };
}

// Every unknown path under a locale renders the localised 404 here, inside the layout, rather than
// through `notFound()`: Next serves a `notFound()` under a dynamic root layout as its error shell,
// which carries neither the layout nor its Trusted Types policy, so under the strict CSP it renders
// blank (progress.md D141). The proxy answers the path with status 404 (D199); on a 404 Next takes
// the head from the layout, not this page, so the layout titles and unindexes it.
export default function UnknownPath({ params }: PageProps<"/[locale]/[...rest]">) {
  const { locale } = use(params);
  setRequestLocale(locale);
  return <NotFoundView />;
}
