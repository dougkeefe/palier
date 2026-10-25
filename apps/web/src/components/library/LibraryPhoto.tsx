import type { LibraryPhotoName } from "../../features/library/photos";

/**
 * A library photograph (D256), as decoration: a CSS background from `library.css`, so the file is
 * bundled from this origin and precached through the stylesheet (D201), and hidden from assistive
 * technology, since it says nothing the page's words do not. No text is ever laid over it.
 */
export function LibraryPhoto({ photo, className }: { photo: LibraryPhotoName; className: string }) {
  return <div aria-hidden="true" className={`app-library__photo app-library__photo--${photo} ${className}`} />;
}
