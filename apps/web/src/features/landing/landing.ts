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
