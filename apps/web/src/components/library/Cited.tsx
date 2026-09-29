import type { Lang } from "@palier/domain";

import { citedRuns } from "../../features/library/cited";

/** A library paragraph, with each cited run in italics and in the article's language (D162). */
export function Cited({ text, lang }: { text: string; lang: Lang }) {
  return (
    <>
      {citedRuns(text).map((run, index) =>
        run.cited ? (
          <i key={index} lang={lang}>
            {run.text}
          </i>
        ) : (
          run.text
        ),
      )}
    </>
  );
}
