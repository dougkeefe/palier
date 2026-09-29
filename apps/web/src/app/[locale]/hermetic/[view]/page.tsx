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
export default async function HermeticErrorPage({ params }: PageProps<"/[locale]/hermetic/[view]">) {
  const { view } = await params;
  if (!isHermetic(process.env) || (view !== "route" && view !== "global")) return <NotFoundView titled />;
  return <HermeticThrower view={view} />;
}
