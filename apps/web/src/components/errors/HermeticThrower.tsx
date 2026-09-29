"use client";

import { useLocale, useTranslations } from "next-intl";

import { globalErrorCopyFor, localeOfPath } from "./copy";
import { ErrorView } from "./ErrorView";
import { useInBrowser } from "./in-browser";

/**
 * An error carrying `leak` everywhere a careless dependency might put it: the message, a
 * message line that imitates a stack frame, and a frame outside the app's chunks.
 */
const poisoned = (leak: string): Error => {
  const origin = window.location.origin;
  const error = new Error(`Refused input "${leak}"`);
  error.stack = [
    `Error: Refused input "${leak}"`,
    `while reading (${origin}/_next/static/chunks/${leak}.js:1:1)`,
    `    at render (${origin}/_next/static/chunks/0e2e1hermetic._.js:1:1)`,
    `    at fetch (https://api.openai.com/v1/responses?key=${leak}:1:1)`,
  ].join("\n");
  return error;
};

/**
 * The hermetic lane's error hook (`[locale]/hermetic/[view]`, progress.md D142). `route`
 * throws in the browser until the URL's fragment is `#recover`, which the spec sets before
 * pressing Try again, so the boundary can be seen to recover.
 */
export function HermeticThrower({ view }: { view: "route" | "global" }) {
  const t = useTranslations("errors");
  const locale = useLocale();
  if (!useInBrowser()) return null;

  const leak = new URLSearchParams(window.location.search).get("leak") ?? "";
  if (view === "global") {
    return (
      <ErrorView
        copy={globalErrorCopyFor(localeOfPath(`/${locale}`))}
        error={poisoned(leak)}
        onRetry={() => undefined}
        homeHref={`/${locale}/home`}
      />
    );
  }
  if (window.location.hash !== "#recover") throw poisoned(leak);
  return (
    <p className="app-muted" data-testid="recovered">
      {t("retry")}
    </p>
  );
}
