import type { ScoredSkill } from "@palier/domain";

/** The library's three photographs (progress.md D256): the index's own, and one per skill. */
export type LibraryPhotoName = "library" | ScoredSkill;

/** Who took a photograph, and the Unsplash page its credit links to. */
export type PhotoCredit = { readonly photographer: string; readonly url: string };

/**
 * Each photograph's credit, as Unsplash asks: the photographer's name, linked to the photo. The
 * files are WebP copies served from this origin (`components/library/images/`, D201's way), since
 * the CSP's `img-src 'self'` refuses a hotlink; `images/SOURCES.md` records where each came from.
 */
export const LIBRARY_PHOTOS: Readonly<Record<LibraryPhotoName, PhotoCredit>> = {
  library: { photographer: "Fang-Wei Lin", url: "https://unsplash.com/photos/H1IRUS1vEFA" },
  reading: { photographer: "Praise Judah", url: "https://unsplash.com/photos/FIDYni5UiIs" },
  writing: { photographer: "Marcos Paulo Prado", url: "https://unsplash.com/photos/tcyW6Im5Uug" },
};

/**
 * The photographs a page shows, in the order it shows them, so its credit names those and no
 * others: the index shows all three, an article only its skill's.
 */
export const photosFor = (page: "index" | ScoredSkill): readonly LibraryPhotoName[] =>
  page === "index" ? ["library", "reading", "writing"] : [page];
