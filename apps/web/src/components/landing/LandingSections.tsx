import { useTranslations } from "next-intl";

import { Link } from "../../i18n/navigation";

import { SampleQuestion } from "./SampleQuestion";

/**
 * The landing page's sections, top to bottom, as designed (`docs/Palier landing page`, v4; D201).
 * Server components over the `landing` messages; the sample question is the one island. Every
 * photograph is a CSS background in `landing.css`, decorative, so none needs a text alternative.
 */

/** The round call to action with its arrow, in the two colourways the design uses. */
function Cta({ href, tone }: { href: "/home"; tone: "light" | "dark" }) {
  const t = useTranslations("landing.hero");
  return (
    <Link href={href} className={`landing-cta landing-cta--${tone} pl-focusable`}>
      {t("cta")}
      <span className="landing-cta__icon" aria-hidden="true" />
    </Link>
  );
}

/** A small dot and a label above a section's heading. */
function Eyebrow({ children }: { children: string }) {
  return <p className="landing-eyebrow">{children}</p>;
}

export function Hero() {
  const t = useTranslations("landing.hero");
  return (
    <section id="top" className="landing-hero">
      <div className="landing-hero__content">
        <p className="landing-chip landing-chip--glass">{t("tag")}</p>
        <h1 className="landing-hero__title">{t("title")}</h1>
        <p className="landing-hero__lede">{t("lede")}</p>
        <Cta href="/home" tone="light" />
        <a href="#try" className="landing-hero__secondary pl-focusable">
          {t("trySample")}
        </a>
      </div>
    </section>
  );
}

const STRIP = ["feedback", "oral", "noAccount", "source"] as const;

export function Strip() {
  const t = useTranslations("landing.strip");
  return (
    <section className="landing-wrap landing-strip">
      <ul className="landing-strip__list">
        {STRIP.map((key) => (
          <li key={key}>{t(key)}</li>
        ))}
      </ul>
    </section>
  );
}

const FEATURES = ["open", "ai", "estimate"] as const;

export function Features() {
  const t = useTranslations("landing.features");
  return (
    <section className="landing-wrap landing-section">
      <h2 className="landing-h2 landing-h2--center">{t("title")}</h2>
      <div className="landing-features">
        {FEATURES.map((key) => (
          <div key={key} className={`landing-feature landing-feature--${key}`}>
            <div>
              <h3 className="landing-h3">{t(`${key}.title`)}</h3>
              <p className="landing-feature__body">{t(`${key}.body`)}</p>
            </div>
            <p className="landing-chip landing-feature__chip">{t(`${key}.tag`)}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

const TESTS = [
  { key: "reading", href: "/practice/reading" },
  { key: "writing", href: "/practice/writing" },
  { key: "oral", href: "/practice/oral" },
] as const;

export function Tests() {
  const t = useTranslations("landing.tests");
  return (
    <section id="tests" className="landing-wrap landing-section landing-tests">
      <div className="landing-tests__intro">
        <Eyebrow>{t("eyebrow")}</Eyebrow>
        <h2 className="landing-h2 landing-tests__title">{t("title")}</h2>
        <Cta href="/home" tone="dark" />
        <SampleQuestion />
      </div>
      <ul className="landing-tests__list">
        {TESTS.map(({ key, href }) => (
          <li key={key}>
            <Link href={href} className="landing-test pl-focusable">
              <span className="landing-test__kicker">{t(`${key}.kicker`)}</span>
              <h3 className="landing-h3 landing-test__name">{t(`${key}.name`)}</h3>
              <p className="landing-test__body">{t(`${key}.body`)}</p>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

export function OralBanner() {
  const t = useTranslations("landing.oral");
  return (
    <section className="landing-wrap">
      <div className="landing-oral">
        <p className="landing-chip landing-chip--glass">{t("tag")}</p>
        <div className="landing-oral__text">
          <h2 className="landing-oral__title">{t("title")}</h2>
          <p className="landing-oral__body">{t("body")}</p>
        </div>
      </div>
    </section>
  );
}

const STEPS = ["open", "key", "estimate"] as const;

export function HowItWorks() {
  const t = useTranslations("landing.how");
  return (
    <section id="how" className="landing-wrap landing-how">
      <div className="landing-center">
        <Eyebrow>{t("eyebrow")}</Eyebrow>
        <h2 className="landing-h2 landing-how__title">{t("title")}</h2>
        <p className="landing-how__body">{t("body")}</p>
      </div>
      <ol className="landing-steps">
        {STEPS.map((key) => (
          <li key={key} className="landing-step">
            <div className={`landing-step__photo landing-step__photo--${key}`} />
            <h3 className="landing-step__title">
              <span className="landing-step__number">{t(`${key}.number`)}</span>
              <span aria-hidden="true" className="landing-step__dot" />
              {t(`${key}.title`)}
            </h3>
            <p className="landing-step__body">{t(`${key}.body`)}</p>
          </li>
        ))}
      </ol>
    </section>
  );
}

const QUESTIONS = ["official", "account", "key", "cost", "source", "privacy"] as const;

/** Native disclosure, no script: the first answer starts open, as designed. */
export function Faq() {
  const t = useTranslations("landing.faq");
  return (
    <section id="faq" className="landing-faq">
      <div className="landing-center">
        <Eyebrow>{t("eyebrow")}</Eyebrow>
        <h2 className="landing-h2 landing-faq__title">{t("title")}</h2>
      </div>
      <div className="landing-faq__list">
        {QUESTIONS.map((key, i) => (
          <details key={key} className="landing-faq__item" open={i === 0}>
            <summary className="landing-faq__question pl-focusable">{t(`${key}.q`)}</summary>
            <p className="landing-faq__answer">{t(`${key}.a`)}</p>
          </details>
        ))}
      </div>
    </section>
  );
}

export function CloseCta() {
  const t = useTranslations("landing.close");
  return (
    <section className="landing-close">
      <div className="landing-close__content">
        <h2 className="landing-close__title">{t("title")}</h2>
        <p className="landing-close__body">{t("body")}</p>
        <Cta href="/home" tone="light" />
      </div>
    </section>
  );
}
