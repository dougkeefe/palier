import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

import { isHermetic } from "@palier/testing/in-memory";

import { HermeticThrower } from "../../../../components/errors/HermeticThrower";
import { NotFoundView } from "../../../../components/errors/NotFoundView";

/**
 * The E2E hook for the error states (progress.md D142), and the 404 anywhere but the hermetic
 * lane, rendered as an unknown path renders it (D141). `route` throws once in the browser, with the key-leak sentinel from `?leak=` in its
 * message and stack, so `e2e/errors.spec.ts` can prove the bundle never carries it. `global`
 * shows the global error screen's view inside this page, because `global-error.tsx` cannot
 * be reached while the root layout works. A dynamic segment, so the service worker's route
 * list never precaches it (`routesFrom`).
 */
/** Outside the hermetic lane, titled and unindexed as every unknown path is (D141). */
export async function generateMetadata({ params }: PageProps<"/[locale]/hermetic/[view]">): Promise<Metadata> {
  if (isHermetic(process.env)) return {};
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "errors" });
  return { title: t("notFoundTitle"), robots: { index: false } };
}

export default async function HermeticErrorPage({ params }: PageProps<"/[locale]/hermetic/[view]">) {
  const { view } = await params;
  if (!isHermetic(process.env)) return <NotFoundView />;
  if (view !== "route" && view !== "global") return <NotFoundView titled />;
  return <HermeticThrower view={view} />;
}
