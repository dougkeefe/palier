/**
 * The landing page's decisions (progress.md D201). The page and its two islands only render; what
 * they decide lives here, tested.
 */

/**
 * Whether the app's shared header, `main` and footer wrap a page. The landing page (`/`, under
 * either locale) brings its own, as designed; every other page has the app's. `pathname` is
 * next-intl's, without the locale prefix.
 */
export const showsAppChrome = (pathname: string): boolean => pathname !== "/";

/**
 * The language the sample question is written in: the one the visitor is practising, which is the
 * other one from the page's. An anglophone on `/en` is preparing for the French test, so the sample
 * is French; the tag, hint and verdict around it stay in the page's language.
 */
export const sampleLanguage = (locale: string): "en" | "fr" => (locale === "fr" ? "en" : "fr");

/**
 * The language of the explainer video a page shows: the page's own (D230). Unlike the sample question,
 * the video explains Palier itself, so a visitor watches it in the language they are reading.
 */
export const explainerLanguage = (locale: string): "en" | "fr" => (locale === "fr" ? "fr" : "en");

/** The sample question's four options, in the order shown. The first is the right answer. */
export const SAMPLE_OPTIONS = ["a", "b", "c", "d"] as const;
export type SampleOption = (typeof SAMPLE_OPTIONS)[number];
export const SAMPLE_ANSWER: SampleOption = "a";

/** What the sample question says under its options: a hint until one is picked, then a verdict. */
export const sampleFeedback = (picked: SampleOption | null): "hint" | "correct" | "incorrect" =>
  picked === null ? "hint" : picked === SAMPLE_ANSWER ? "correct" : "incorrect";

/**
 * How one option shows once an answer is picked: the right answer is always marked right, the
 * pick is marked wrong if it was, and the rest stay plain. Nothing is marked before a pick.
 */
export const sampleOptionState = (
  option: SampleOption,
  picked: SampleOption | null,
): "plain" | "correct" | "incorrect" => {
  if (picked === null) return "plain";
  if (option === SAMPLE_ANSWER) return "correct";
  return option === picked ? "incorrect" : "plain";
};

/** What can happen to the header's menu on a narrow screen (D232). */
export type MenuEvent = "toggle" | "escape" | "follow" | "leave";

/**
 * Whether the header's menu is open after `event`: the button toggles it, and Escape, following
 * one of its section links, or focus or a tap landing outside it closes it. The links are in-page
 * anchors, so the page would otherwise scroll to the section with the menu still open over it.
 */
export const menuOpenAfter = (open: boolean, event: MenuEvent): boolean => (event === "toggle" ? !open : false);
