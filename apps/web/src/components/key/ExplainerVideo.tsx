import { useTranslations } from "next-intl";
import { useId } from "react";

import poster from "./images/openai-explainer-poster.webp";

/**
 * Served from this origin under `public/media/`, which the service worker passes straight to the
 * network, since a video's range requests cannot be cached (progress.md D220).
 */
const EXPLAINER_VIDEO = { src: "/media/openai-explainer.mp4", width: 600, height: 338 } as const;

/**
 * The owner's video on getting an OpenAI key (progress.md D220), on the key guide and onboarding's key
 * step. It never plays by itself and loads nothing until asked (`preload="none"`), so it costs a page
 * only its poster. It is silent, with English captions burned in, so the note beneath says so, and the
 * same steps are always written out beside it (`KeyGuideSteps`), in the page's language.
 */
export function ExplainerVideo() {
  const t = useTranslations("key");
  const noteId = useId();
  return (
    <figure className="app-video">
      <video
        controls
        preload="none"
        playsInline
        poster={poster.src}
        width={EXPLAINER_VIDEO.width}
        height={EXPLAINER_VIDEO.height}
        aria-label={t("videoLabel")}
        aria-describedby={noteId}
      >
        <source src={EXPLAINER_VIDEO.src} type="video/mp4" />
        {t("videoFallback")}
      </video>
      <figcaption id={noteId} className="app-muted">
        {t("videoNote")}
      </figcaption>
    </figure>
  );
}
