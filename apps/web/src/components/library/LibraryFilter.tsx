"use client";

import { LIBRARY_TOPICS } from "@palier/domain";
import { useTranslations } from "next-intl";
import { Fragment, type ReactNode, useEffect, useRef, useSyncExternalStore } from "react";

import { type FilterOption, type LibraryFilterId, filterFromHash, hashFor, matches } from "../../features/library/filter";

const subscribe = (onChange: () => void): (() => void) => {
  window.addEventListener("hashchange", onChange);
  return () => window.removeEventListener("hashchange", onChange);
};

/** A rule sets the topics apart from everything and the skills. */
const FIRST_TOPIC: LibraryFilterId = LIBRARY_TOPICS[0];

/**
 * The library index's filter (D257): a row of pills, one pressed at a time, over the cards the
 * server rendered, which arrive as `children` so no article reaches this component's JavaScript.
 * The pressed pill is the URL's hash (`features/library/filter.ts`), so a filter can be linked, and
 * the article's breadcrumb can open the index on its skill. Hiding a card sets `hidden` on it; a
 * polite status says how many are shown. Before hydration, and without JavaScript, every card
 * shows, which is what "All" shows.
 */
export function LibraryFilter({ options, children }: { options: readonly FilterOption[]; children: ReactNode }) {
  const t = useTranslations("library");
  const active = useSyncExternalStore(subscribe, () => filterFromHash(window.location.hash), () => "all" as const);
  const grid = useRef<HTMLDivElement>(null);

  useEffect(() => {
    for (const card of grid.current?.querySelectorAll<HTMLElement>("[data-tags]") ?? []) {
      card.hidden = !matches((card.dataset.tags ?? "").split(" "), active);
    }
  }, [active]);

  const choose = (id: LibraryFilterId): void => {
    const { pathname, search } = window.location;
    window.history.replaceState(window.history.state, "", `${pathname}${search}${hashFor(id)}`);
    window.dispatchEvent(new HashChangeEvent("hashchange"));
  };

  const shown = options.find(({ id }) => id === active)?.count ?? 0;

  return (
    <div className="app-library__browse">
      <div role="group" aria-label={t("filterLabel")} className="app-library__filter">
        {options.map(({ id, count }) => (
          <Fragment key={id}>
            {id === FIRST_TOPIC ? <span className="app-library__filter-rule" aria-hidden="true" /> : null}
            <button
              type="button"
              aria-pressed={active === id}
              onClick={() => choose(id)}
              className="app-library__pill pl-focusable"
            >
              {id === "all" ? t("all") : id === "reading" ? t("skillReading") : id === "writing" ? t("skillWriting") : t(`topics.${id}`)}
              <span className="app-library__pill-count">{count}</span>
            </button>
          </Fragment>
        ))}
      </div>
      <p className="pl-visually-hidden" role="status">
        {t("shown", { count: shown })}
      </p>
      <div ref={grid}>{children}</div>
    </div>
  );
}
