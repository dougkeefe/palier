/**
 * Sharing a milestone's card (product-requirements.md §9: "a shareable card with no personal
 * data on it", progress.md D159). The card is text and the app's address: no image, so no new
 * dependency and nothing drawn from the user's data. The text is fixed copy per milestone; it
 * names the milestone and nothing about the person.
 *
 * - **The Web Share API** where the browser offers it for this text, which on a phone opens the
 *   system's share sheet.
 * - **Otherwise the clipboard**, with a status saying it was copied.
 * - **Otherwise no button.** A share control that cannot share is a dead end.
 */

export type ShareCard = { readonly text: string; readonly url: string };

/** The part of `navigator` sharing reads, so a test can hand in its own. */
export type ShareNavigator = {
  readonly share?: (data: ShareData) => Promise<void>;
  readonly canShare?: (data: ShareData) => boolean;
  readonly clipboard?: { readonly writeText: (text: string) => Promise<void> };
};

export type ShareRoute = "share" | "copy" | "none";

export type ShareOutcome = "shared" | "copied" | "cancelled" | "failed";

/** How this browser can share the card, if at all. */
export const shareRoute = (nav: ShareNavigator | undefined, card: ShareCard): ShareRoute => {
  if (nav?.share !== undefined && (nav.canShare?.(card) ?? true)) return "share";
  if (nav?.clipboard !== undefined) return "copy";
  return "none";
};

/** Share the card by the browser's best route. Dismissing the share sheet is not a failure. */
export const shareCard = async (nav: ShareNavigator | undefined, card: ShareCard): Promise<ShareOutcome> => {
  const route = shareRoute(nav, card);
  try {
    if (route === "share" && nav?.share !== undefined) {
      await nav.share(card);
      return "shared";
    }
    if (route === "copy" && nav?.clipboard !== undefined) {
      await nav.clipboard.writeText(`${card.text} ${card.url}`);
      return "copied";
    }
    return "failed";
  } catch (error) {
    return error instanceof Error && error.name === "AbortError" ? "cancelled" : "failed";
  }
};
