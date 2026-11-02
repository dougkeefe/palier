import routes from "../../lib/routes.json";

/**
 * Which chrome wraps a page (progress.md D201, D269). `pathname` is next-intl's, without the locale prefix.
 *
 * - `app`: the shared header, `main` and footer, on every page not named below;
 * - `own`: none, since the page brings its own as designed. The landing page (D201);
 * - `focus`: a slim frame with no navigation, sync status or settings, around a flow a first-time user goes through
 *   on its own. Onboarding (D269): the wordmark, the language and, below, the statement (R5) and the shortcut sheet.
 */
export type Chrome = "app" | "own" | "focus";

const CHROME: Readonly<Record<string, Chrome>> = {
  "/": "own",
  "/start": "focus",
};

export const chromeFor = (pathname: string): Chrome => CHROME[pathname] ?? "app";

/**
 * The pages a visitor may open before onboarding (D270): the landing page, onboarding itself, the reference pages
 * (about, privacy, the library and its articles) and the translator. Every other page of the app sends a visitor with
 * no study profile to `/start`, the key guide among them since onboarding's key step no longer links it (D272).
 */
const OPEN_BEFORE_ONBOARDING: ReadonlySet<string> = new Set([
  "/",
  "/start",
  "/about",
  "/privacy",
  "/practice/writing/translate",
]);
const OPEN_SECTIONS_BEFORE_ONBOARDING: readonly string[] = ["/library"];

const KNOWN_PAGES: ReadonlySet<string> = new Set(routes.map((route) => `/${route}`));

/**
 * Whether a page needs onboarding done first (D270): one of the app's pages, from `routes.json`, and not one open
 * before it. A path the app does not know is left to the 404.
 */
export const needsOnboarding = (pathname: string): boolean =>
  KNOWN_PAGES.has(pathname) &&
  !OPEN_BEFORE_ONBOARDING.has(pathname) &&
  !OPEN_SECTIONS_BEFORE_ONBOARDING.some((section) => pathname === section || pathname.startsWith(`${section}/`));
