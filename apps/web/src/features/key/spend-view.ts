import type { CapState } from "@palier/engine";

/**
 * The spend section's decisions (product-requirements.md §8.10, §14; progress.md D101–D104),
 * kept out of the `.tsx` so each is tested.
 */

/** The locale's way of writing US dollars: "US$1.25" in English, "1,25 $ US" in French. */
const dollars = (locale: string, digits: number) =>
  new Intl.NumberFormat(locale === "fr" ? "fr-CA" : "en-CA", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });

/**
 * An amount as the meter shows it: to the cent, or, for a spend too small to round to a
 * cent, "under a cent" rather than a zero that reads as free.
 */
export type MoneyText = { readonly underCent: boolean; readonly text: string };

export const moneyText = (usd: number, locale: string): MoneyText =>
  usd > 0 && usd < 0.005
    ? { underCent: true, text: dollars(locale, 2).format(0.01) }
    : { underCent: false, text: dollars(locale, 2).format(usd) };

/** A typical use's estimate, which is often a fraction of a cent: to four places, so it reads. */
export const estimateText = (usd: number, locale: string): string =>
  dollars(locale, usd >= 0.01 ? 2 : 4).format(usd);

/** How much of the cap this month has used, in whole percent, rounded down so 79.9% never reads 80. */
export const capShare = (monthUsd: number, capUsd: number): number => Math.floor((monthUsd / capUsd) * 100);

export type CapInput =
  | { readonly ok: true; readonly capUsd: number }
  | { readonly ok: false; readonly error: "capBlank" | "capNotNumber" | "capNotPositive" };

/**
 * What the user typed in the cap field, as dollars. A French decimal comma is a decimal
 * point, and a dollar sign or spaces are ignored, since people type what they read.
 */
export const parseCap = (typed: string): CapInput => {
  const cleaned = typed.replace(/[$\s\u00a0\u202f]|US/g, "").replace(",", ".");
  if (cleaned === "") return { ok: false, error: "capBlank" };
  if (!/^\d*\.?\d+$|^\d+\.$/.test(cleaned)) return { ok: false, error: "capNotNumber" };
  const capUsd = Number(cleaned);
  if (!(capUsd > 0)) return { ok: false, error: "capNotPositive" };
  return { ok: true, capUsd };
};

/** The warning beside the meter, if the month is near the cap or past it; never a block. */
export const capNotice = (
  cap: CapState,
): { readonly key: "capNear" | "capOver"; readonly tone: "info" | "incorrect" } | null => {
  if (cap === "near") return { key: "capNear", tone: "info" };
  if (cap === "over") return { key: "capOver", tone: "incorrect" };
  return null;
};
