import { useFormatter, useTranslations } from "next-intl";

import { LIBRARY_PHOTOS, type LibraryPhotoName } from "../../features/library/photos";

/**
 * The credit for the photographs a page shows (D256): each photographer's name, linked to the
 * photo on Unsplash, joined as the page's language joins a list.
 */
export function PhotoCredit({ photos }: { photos: readonly LibraryPhotoName[] }) {
  const t = useTranslations("library");
  const format = useFormatter();
  const names = format.list(
    photos.map((photo) => (
      <a key={photo} href={LIBRARY_PHOTOS[photo].url} className="pl-focusable" rel="noopener noreferrer">
        {LIBRARY_PHOTOS[photo].photographer}
      </a>
    )),
    { type: "conjunction" },
  );

  return (
    <p className="app-library__credit">
      {t("photosBy", { count: photos.length })} {names} {t("onUnsplash")}
    </p>
  );
}
