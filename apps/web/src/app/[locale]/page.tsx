import { setRequestLocale } from "next-intl/server";
import { use } from "react";

import { LandingFooter } from "../../components/landing/LandingFooter";
import { LandingHeader } from "../../components/landing/LandingHeader";
import {
  CloseCta,
  Faq,
  Features,
  Hero,
  HowItWorks,
  OralBanner,
  Strip,
  Tests,
} from "../../components/landing/LandingSections";
import hero from "../../components/landing/images/hero.webp";
import "../../components/landing/landing.css";

// The unauthenticated landing page (product-requirements.md §7: marketing plus the
// non-affiliation posture), as designed in `docs/Palier landing page` (D201). It brings its own
// header and footer, so the layout's `Shell` leaves it unwrapped, and its own `main`.
export default function LandingPage({ params }: PageProps<"/[locale]">) {
  // Unwrap the route param so this static segment renders per locale. `use`
  // keeps the component synchronous, so next-intl's `useTranslations` hook can
  // run (an async component would need `getTranslations` instead).
  const { locale } = use(params);
  setRequestLocale(locale);

  return (
    <div className="landing">
      {/* The hero's photograph is the largest paint, and as a CSS background the browser would find
          it only once the stylesheet had loaded. React hoists this into the head. */}
      <link rel="preload" as="image" href={hero.src} fetchPriority="high" />
      <LandingHeader />
      <main id="main" tabIndex={-1} className="landing-main">
        <Hero />
        <Strip />
        <Features />
        <Tests />
        <OralBanner />
        <HowItWorks />
        <Faq />
        <CloseCta />
      </main>
      <LandingFooter />
    </div>
  );
}
