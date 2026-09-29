import type { Metadata } from "next";
import { NextIntlClientProvider, hasLocale } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { headers } from "next/headers";
import { notFound } from "next/navigation";

import { isHermetic } from "@palier/testing/in-memory";

import { ContainerProvider } from "../../components/ContainerProvider";
import { Footer } from "../../components/Footer";
import { Header } from "../../components/Header";
import { ServiceWorkerRegistrar } from "../../components/ServiceWorkerRegistrar";
import { SyncRunner } from "../../components/sync/SyncRunner";
import { routing } from "../../i18n/routing";
import { NONCE_HEADER } from "../../lib/csp";
import { fontVariables } from "../../fonts/fonts";
import { TRUSTED_TYPES_SCRIPT } from "../../lib/trusted-types";

// The design system of record. Imported once here, ahead of the app's own
// globals, so the token custom properties exist before any rule uses them.
import "@palier/ui/tokens.css";
import "@palier/ui/components.css";
import "../globals.css";

// Every route lives under [locale], so this is the app's root layout. Every page renders
// per request, because the strict CSP's nonce is fresh per response (ADR 22, progress.md
// D133), so no locale is prerendered.
export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "metadata" });
  // Each page names itself ahead of the product (WCAG 2.4.2: a title that says what the
  // page is for); a page that sets no title of its own gets the product's.
  return { title: { template: `%s · ${t("title")}`, default: t("title") }, description: t("description") };
}

export default async function LocaleLayout({
  children,
  params,
}: LayoutProps<"/[locale]">) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();

  // Hands next-intl the resolved locale, so no component has to read it from a header.
  setRequestLocale(locale);
  // The proxy's nonce, for the one inline script this app writes (lib/trusted-types.ts).
  const nonce = (await headers()).get(NONCE_HEADER) ?? undefined;

  const t = await getTranslations("nav");

  return (
    <html lang={locale} className={fontVariables}>
      <head>
        {/* In the head, so the Trusted Types policy exists before the chunk loader's first write. */}
        <script nonce={nonce} dangerouslySetInnerHTML={{ __html: TRUSTED_TYPES_SCRIPT }} />
      </head>
      <body>
        <a href="#main" className="app-skip-link pl-focusable">
          {t("skipToContent")}
        </a>
        <NextIntlClientProvider>
          <ContainerProvider hermetic={isHermetic(process.env)}>
            <SyncRunner>
              <Header />
              <main id="main" tabIndex={-1} className="app-main">
                {children}
              </main>
              <Footer />
            </SyncRunner>
          </ContainerProvider>
        </NextIntlClientProvider>
        <ServiceWorkerRegistrar />
      </body>
    </html>
  );
}
