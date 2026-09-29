/**
 * The one Trusted Types policy the CSP allows (`trusted-types default`, `csp.ts`;
 * progress.md D134). With `require-trusted-types-for 'script'` enforced, every write to a
 * DOM sink goes through it:
 *
 * - **A script URL** passes only if it is this origin's `/_next/static/` (the bundler's
 *   chunk loader) or `/sw.js` (the service worker's registration). Anything else throws.
 *   It passes **exactly as given**: Turbopack finds a loaded chunk by its `src` attribute's
 *   text, so a policy that returned the URL made absolute left every lazily imported chunk
 *   waiting forever, the container among them (D134).
 * - **HTML and script strings have no factory**, so `innerHTML`, `eval` and `Function`
 *   are refused outright. Nothing in the app writes HTML (React sets text and
 *   attributes), and zod's code generation is off (`jitless`, `instrumentation-client.ts`).
 *
 * It must exist before the chunk loader's first write. The chunks the page ships are
 * `<script>` tags Next renders, which need no sink; the first write is a lazy import after
 * hydration. The layout renders it in `<head>`, inline and nonced, so it runs as the head
 * is parsed, before the body React hydrates. The function is serialised with `toString()`,
 * so it references nothing outside itself.
 */
export interface TrustedTypesWindow {
  readonly trustedTypes?: {
    readonly defaultPolicy: unknown;
    createPolicy(name: string, rules: { createScriptURL(input: string): string }): unknown;
  };
  readonly location: { readonly href: string; readonly origin: string };
}

export function installTrustedTypesPolicy(win: TrustedTypesWindow): void {
  const types = win.trustedTypes;
  // A browser without Trusted Types ignores the directive, and one policy per page.
  if (types === undefined || types.defaultPolicy !== null) return;
  types.createPolicy("default", {
    createScriptURL(input) {
      const url = new URL(input, win.location.href);
      const allowed =
        url.origin === win.location.origin &&
        (url.pathname.startsWith("/_next/static/") || url.pathname === "/sw.js");
      if (!allowed) throw new TypeError(`Trusted Types: script URL refused: ${input}`);
      return input;
    },
  });
}

/** The inline script the layout renders, nonced, in `<head>`. */
export const TRUSTED_TYPES_SCRIPT = `(${installTrustedTypesPolicy.toString()})(window);`;
