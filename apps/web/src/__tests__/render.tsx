import { NextIntlClientProvider } from "next-intl";
import type { ComponentProps, ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { prerenderToNodeStream } from "react-dom/static";

import en from "../../messages/en.json";
import fr from "../../messages/fr.json";

/**
 * Renders the app's chrome and pages to HTML in Node for their unit tests (progress.md D264): through the real
 * messages, with `../i18n/navigation` replaced by `fakeNavigation`, since next-intl's navigation needs Next's router.
 * Not a test file; `__tests__` keeps it out of the coverage and the lint carve-outs match it.
 */

export type Locale = "en" | "fr";

const MESSAGES = { en, fr } as const;

/** The node inside next-intl's provider, with the real messages; `dom.tsx` renders through it too. */
export const provided = (node: ReactNode, locale: Locale) => (
  <NextIntlClientProvider locale={locale} messages={MESSAGES[locale]} timeZone="America/Toronto">
    {node}
  </NextIntlClientProvider>
);

/** A component that renders synchronously, as HTML. */
export const html = (node: ReactNode, locale: Locale = "en"): string => renderToStaticMarkup(provided(node, locale));

/** A server page that awaits its `params` (React's `use`), as HTML once everything has resolved. */
export const htmlOnceResolved = async (node: ReactNode, locale: Locale = "en"): Promise<string> => {
  const { prelude } = await prerenderToNodeStream(provided(node, locale));
  let out = "";
  for await (const chunk of prelude) out += String(chunk);
  return out;
};

/**
 * Stands in for `src/i18n/navigation`: a plain `<a>` for next-intl's `Link`, and the pathname a test sets, without the
 * locale, as next-intl's `usePathname` gives it. Use it from a `vi.mock` factory over a `vi.hoisted` state.
 */
export const fakeNavigation = (state: { pathname: string }) => ({
  Link: ({ href, children, ...rest }: ComponentProps<"a"> & { href: string }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
  usePathname: () => state.pathname,
});

/** Every `<a>` in the HTML, as its `href` and its text with tags removed, in document order. */
export const links = (markup: string): { href: string; text: string; tag: string }[] =>
  [...markup.matchAll(/<a\b([^>]*)>(.*?)<\/a>/gs)].map(([, attributes = "", inner = ""]) => ({
    href: /\bhref="([^"]*)"/.exec(attributes)?.[1] ?? "",
    text: inner.replace(/<[^>]*>/g, ""),
    tag: `<a${attributes}>`,
  }));
