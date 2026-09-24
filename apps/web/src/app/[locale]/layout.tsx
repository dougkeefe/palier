import type { Metadata } from "next";
import { NextIntlClientProvider, hasLocale } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";

import { isHermetic } from "@palier/testing/in-memory";

import { ContainerProvider } from "../../components/ContainerProvider";
import { Footer } from "../../components/Footer";
import { Header } from "../../components/Header";
import { ServiceWorkerRegistrar } from "../../components/ServiceWorkerRegistrar";
import { SyncRunner } from "../../components/sync/SyncRunner";
import { routing } from "../../i18n/routing";

// The design system of record. Imported once here, ahead of the app's own
// globals, so the token custom properties exist before any rule uses them.
import "@palier/ui/tokens.css";
import "@palier/ui/components.css";
import "../globals.css";

// Every route lives under [locale], so this is the app's root layout. Both
// locales are prerendered.
export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

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

  // Opt this request into static rendering with the resolved locale.
  setRequestLocale(locale);

  const t = await getTranslations("nav");

  return (
    <html lang={locale}>
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
