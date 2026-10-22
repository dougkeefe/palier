"use client";

import { type JSX, type KeyboardEvent, type ReactNode, useRef } from "react";

import { Glyph } from "./Glyph.js";
import { type GlyphName, type TabTone, tabClass, tabIds, tabsKeydown } from "./logic.js";

export type TabItem<Id extends string> = {
  readonly id: Id;
  readonly label: string;
  /** A mark before the name, on a disc in `tone`. Decorative: the name always says which tab it is. */
  readonly glyph?: GlyphName;
  readonly tone?: TabTone;
};

export type TabsProps<Id extends string> = {
  /** Names the list for a screen reader, when no heading beside it does. */
  readonly label: string;
  readonly items: readonly TabItem<Id>[];
  readonly selected: Id;
  readonly onSelect: (id: Id) => void;
  /** Prefixes every id, so two lists on one page cannot collide; `TabPanel` takes the same. */
  readonly idPrefix: string;
};

/**
 * Several views of one place, one shown at a time (progress.md D247): WAI-ARIA's tabs, never a radio
 * group, which reads as a question to answer. Controlled, and **selection follows focus**: an arrow,
 * Home or End selects the tab it reaches, which suits panels that are already loaded. Only the
 * selected tab is in the tab order. The caller renders each panel in a `TabPanel` with the same
 * `idPrefix`, so the tab and its panel name each other.
 */
export const Tabs = <Id extends string>({ label, items, selected, onSelect, idPrefix }: TabsProps<Id>): JSX.Element => {
  const tabs = useRef<(HTMLButtonElement | null)[]>([]);
  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const index = items.findIndex((item) => item.id === selected);
    const to = tabsKeydown(event.key, index, items.length);
    const item = to === null ? undefined : items[to];
    if (to === null || item === undefined) return;
    event.preventDefault();
    onSelect(item.id);
    tabs.current[to]?.focus();
  };
  return (
    <div role="tablist" aria-label={label} className="pl-tabs" onKeyDown={onKeyDown}>
      {items.map((item, index) => {
        const on = item.id === selected;
        const ids = tabIds(idPrefix, item.id);
        return (
          <button
            key={item.id}
            ref={(node) => {
              tabs.current[index] = node;
            }}
            type="button"
            role="tab"
            id={ids.tab}
            aria-selected={on}
            aria-controls={ids.panel}
            tabIndex={on ? 0 : -1}
            className={tabClass(on)}
            onClick={() => onSelect(item.id)}
          >
            {item.glyph === undefined ? null : (
              <span className={`pl-tabs__mark pl-tabs__mark--${item.tone ?? "tint"}`}>
                <Glyph name={item.glyph} />
              </span>
            )}
            <span>{item.label}</span>
          </button>
        );
      })}
    </div>
  );
};

export type TabPanelProps = {
  readonly idPrefix: string;
  /** The tab this panel belongs to. */
  readonly id: string;
  readonly className?: string;
  readonly children: ReactNode;
};

/** The shown tab's panel, labelled by its tab, and itself a stop in the tab order, as WAI-ARIA asks. */
export const TabPanel = ({ idPrefix, id, className, children }: TabPanelProps): JSX.Element => {
  const ids = tabIds(idPrefix, id);
  return (
    <div role="tabpanel" id={ids.panel} aria-labelledby={ids.tab} tabIndex={0} className={className === undefined ? "pl-tab-panel" : `pl-tab-panel ${className}`}>
      {children}
    </div>
  );
};
