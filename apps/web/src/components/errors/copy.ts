import globalErrorCopy from "./global-error-copy.json";

/**
 * The words an error screen needs, handed in rather than read from next-intl, because
 * `global-error.tsx` replaces the root layout and so has no provider (progress.md D141).
 * `[locale]/error.tsx` fills this from `useTranslations("errors")`; `global-error.tsx` from
 * `global-error-copy.json`, which `scripts/prepare-public.mjs` writes from the same
 * namespace.
 */
export type ErrorCopy = {
  readonly title: string;
  readonly body: string;
  readonly retry: string;
  readonly home: string;
  readonly reportHeading: string;
  readonly reportBody: string;
  readonly details: string;
  readonly copy: string;
  readonly copied: string;
  readonly copyFailed: string;
  readonly openIssue: string;
};

/** A key of the `errors` namespace. */
export type ErrorKey = keyof (typeof globalErrorCopy)["en"];

/** An `errors` namespace, read through `lookup`, as a screen's copy: the route's heading or the global one. */
export const errorCopyOf = (lookup: (key: ErrorKey) => string, scope: "route" | "global"): ErrorCopy => ({
  title: lookup(scope === "route" ? "routeTitle" : "globalTitle"),
  body: lookup(scope === "route" ? "routeBody" : "globalBody"),
  retry: lookup("retry"),
  home: lookup("home"),
  reportHeading: lookup("reportHeading"),
  reportBody: lookup("reportBody"),
  details: lookup("details"),
  copy: lookup("copy"),
  copied: lookup("copied"),
  copyFailed: lookup("copyFailed"),
  openIssue: lookup("openIssue"),
});

export type ErrorLocale = keyof typeof globalErrorCopy;

/** The locale a path names, as `[locale]` routes it; English when it names neither. */
export const localeOfPath = (path: string | null): ErrorLocale => (path?.split("/")[1] === "fr" ? "fr" : "en");

/** The global error screen's copy in a locale. */
export const globalErrorCopyFor = (locale: ErrorLocale): ErrorCopy => errorCopyOf((key) => globalErrorCopy[locale][key], "global");
