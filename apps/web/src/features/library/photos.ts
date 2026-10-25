import type { LibrarySubSkill } from "@palier/domain";
import { LIBRARY_SUB_SKILLS } from "@palier/domain";

/** The library's photographs (progress.md D256, D257): the index's own, and one per article. */
export type LibraryPhotoName = "library" | LibrarySubSkill;

/** Who took a photograph, and the Unsplash page its credit links to. */
export type PhotoCredit = { readonly photographer: string; readonly url: string };

/**
 * Each photograph's credit, as Unsplash asks: the photographer's name, linked to the photo. The
 * files are WebP copies served from this origin (`components/library/images/`, D201's way), since
 * the CSP's `img-src 'self'` refuses a hotlink; `images/SOURCES.md` records where each came from.
 */
export const LIBRARY_PHOTOS: Readonly<Record<LibraryPhotoName, PhotoCredit>> = {
  library: { photographer: "Fang-Wei Lin", url: "https://unsplash.com/photos/H1IRUS1vEFA" },
  "main-idea": { photographer: "Jordan Madrid", url: "https://unsplash.com/photos/iDzKdNI7Qgc" },
  "specific-detail": { photographer: "Markus Winkler", url: "https://unsplash.com/photos/afW1hht0NSs" },
  "inference": { photographer: "Daniel Schludi", url: "https://unsplash.com/photos/q3bw5vrQrO4" },
  "vocabulary-in-context": { photographer: "Mathias Reding", url: "https://unsplash.com/photos/sY_9Y4gu4ps" },
  "cohesion-and-reference": { photographer: "Edge2Edge Media", url: "https://unsplash.com/photos/t1OalCBUYRc" },
  "tone-and-intent": { photographer: "Lucas George Wendt", url: "https://unsplash.com/photos/C4SaNxZs0g0" },
  "text-structure": { photographer: "Ilya Semenov", url: "https://unsplash.com/photos/fCnYbTnJASs" },
  "numerical-and-tabular-detail": { photographer: "Isaac Smith", url: "https://unsplash.com/photos/AT77Q0Njnt0" },
  "verb-tense-and-mood": { photographer: "Gaelle Marcel", url: "https://unsplash.com/photos/Xd_H7iOwKN0" },
  "agreement": { photographer: "Mockup Graphics", url: "https://unsplash.com/photos/2KwO5KWCeag" },
  "prepositions-and-government": { photographer: "Amol Tyagi", url: "https://unsplash.com/photos/0juktkOTkpU" },
  "pronouns": { photographer: "Randy Fath", url: "https://unsplash.com/photos/G1yhU1Ej-9A" },
  "connectors-and-discourse-markers": { photographer: "Pierre Châtel-Innocenti", url: "https://unsplash.com/photos/6BqbZjy1AoY" },
  "register-and-formality": { photographer: "Diana Light", url: "https://unsplash.com/photos/Fcd6LJ4HDNk" },
  "word-choice-precision": { photographer: "RoonZ nl", url: "https://unsplash.com/photos/H3UKvdu3GQE" },
  "false-friends-and-anglicisms": { photographer: "Dmytro Koplyk", url: "https://unsplash.com/photos/0gTN2mU8EyA" },
  "punctuation-and-mechanics": { photographer: "Debby Hudson", url: "https://unsplash.com/photos/oVQBn0X2oEk" },
  "sentence-structure": { photographer: "Loegunn Lai", url: "https://unsplash.com/photos/-JYD8-AZ5pw" },
};

/**
 * The photographs a page shows, in the order it shows them, so its credit names those and no
 * others: the index shows its own and every article's; an article its own, then its Read next
 * cards' (D257).
 */
export const photosFor = (
  page: "index" | { readonly subSkill: LibrarySubSkill; readonly related?: readonly LibrarySubSkill[] | undefined },
): readonly LibraryPhotoName[] =>
  page === "index" ? ["library", ...LIBRARY_SUB_SKILLS] : [page.subSkill, ...(page.related ?? [])];
