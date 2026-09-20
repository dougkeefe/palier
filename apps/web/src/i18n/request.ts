import { hasLocale } from "next-intl";
import { getRequestConfig } from "next-intl/server";

import { routing } from "./routing";

/**
 * Per-request i18n config, loaded by the next-intl plugin wired in
 * `next.config.ts`. The plugin imports this file's default export, which is why
 * `src/i18n/request.ts` is on the framework default-export exemption list in the
 * root `eslint.config.mjs` (there is no named alternative — deviation D11).
 *
 * `hasLocale` narrows an untrusted string to a supported `Locale`, so an
 * unknown prefix falls back rather than throwing.
 */
export default getRequestConfig(async ({ requestLocale }) => {
  const requested = await requestLocale;
  const locale = hasLocale(routing.locales, requested)
    ? requested
    : routing.defaultLocale;

  return {
    locale,
    messages: (await import(`../../messages/${locale}.json`)).default,
  };
});
