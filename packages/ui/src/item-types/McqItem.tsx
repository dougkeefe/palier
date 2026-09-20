"use client";

import { type JSX, useId, useRef, useState } from "react";
import type { Item, OptionId } from "@palier/domain";

import { OptionRow } from "../primitives/OptionRow.js";
import { optionRowKeydown } from "../primitives/logic.js";

/**
 * The render member of the item type registry (implementation-plan.md §3.4,
 * ADR 17), which lives here rather than in the domain definition because a
 * renderer is a React component and nothing below `apps/web` may import
 * `@palier/ui` (§3.1). The composition root asserts this map and the domain
 * definitions cover the same `ItemType` union.
 *
 * Every user-visible string arrives through props (R8, no JSX literals); the
 * item's own content carries a `lang` attribute so a screen reader pronounces
 * the French correctly on an English interface.
 */
export type ItemRendererProps = {
  readonly item: Item;
  /** The option the user has chosen, or null before they answer. */
  readonly selected: OptionId | null;
  readonly onSelect: (id: OptionId) => void;
  /** Once true, the answer is shown and the options are locked. */
  readonly revealed?: boolean;
  /** The correct/incorrect labels, so colour is never the only signal (§10.2). */
  readonly statusLabels: { readonly correct: string; readonly incorrect: string };
};

export type ItemRenderer = (props: ItemRendererProps) => JSX.Element;

/**
 * The shared multiple-choice renderer. Every current item type presents as a
 * question stem and a radio group of four options, so the four registry entries
 * share this component today; per-type presentation (a cloze's marked blank, a
 * comprehension passage) is Phase-2 work and gives each entry its own component
 * then (ADR 17).
 */
export const McqItem: ItemRenderer = ({
  item,
  selected,
  onSelect,
  revealed = false,
  statusLabels,
}: ItemRendererProps): JSX.Element => {
  const stemId = useId();
  const groupRef = useRef<HTMLDivElement>(null);
  const selectedIndex = item.options.findIndex((o) => o.id === selected);
  const [rovingIndex, setRovingIndex] = useState(selectedIndex === -1 ? 0 : selectedIndex);

  const onKeyDown = (event: React.KeyboardEvent<HTMLDivElement>): void => {
    const intent = optionRowKeydown(event.key, rovingIndex, item.options.length);
    if (intent.type === "move") {
      event.preventDefault();
      setRovingIndex(intent.to);
      const radios = groupRef.current?.querySelectorAll<HTMLElement>("[role='radio']");
      radios?.item(intent.to)?.focus();
    }
  };

  const outcomeFor = (id: OptionId): "correct" | "incorrect" | undefined => {
    if (!revealed) {
      return undefined;
    }
    if (id === item.key) {
      return "correct";
    }
    return id === selected ? "incorrect" : undefined;
  };

  return (
    <div className="pl-item">
      <p id={stemId} className="pl-item__stem" lang={item.lang}>
        {item.stem[item.lang]}
      </p>
      <div role="radiogroup" aria-labelledby={stemId} onKeyDown={onKeyDown} ref={groupRef}>
        {item.options.map((option, index) => {
          const outcome = outcomeFor(option.id);
          const statusLabel =
            outcome === "correct"
              ? statusLabels.correct
              : outcome === "incorrect"
                ? statusLabels.incorrect
                : undefined;
          return (
            <OptionRow
              key={option.id}
              selected={selected === option.id}
              active={rovingIndex === index}
              disabled={revealed}
              {...(outcome === undefined ? {} : { outcome })}
              {...(statusLabel === undefined ? {} : { statusLabel })}
              onSelect={() => {
                setRovingIndex(index);
                onSelect(option.id);
              }}
            >
              <span lang={item.lang}>{option.text}</span>
            </OptionRow>
          );
        })}
      </div>
    </div>
  );
};
