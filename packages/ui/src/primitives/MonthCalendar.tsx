import type { JSX, ReactNode } from "react";

import { Glyph } from "./Glyph.js";
import { monthGrid } from "./logic.js";

/** What a day can be marked as. The caller names each in words, so colour is never the only signal. */
export type CalendarMark = "practised" | "kept" | "test";

export type MonthCalendarProps = {
  readonly year: number;
  /** 1–12. */
  readonly month: number;
  /** `YYYY-MM-DD`: drawn as today and marked `aria-current="date"`. */
  readonly today: string;
  readonly marks: ReadonlyMap<string, CalendarMark>;
  /** The month's name and year, e.g. "October 2026", through i18n. Names the table. */
  readonly title: string;
  /** The caller's heading for the month, drawn beside the buttons. */
  readonly heading: ReactNode;
  /** Seven weekdays, Sunday first: what is shown and what a screen reader hears. */
  readonly weekdays: readonly { readonly short: string; readonly long: string }[];
  /** Each mark's words, read with the day and shown in the legend. */
  readonly markLabels: Readonly<Record<CalendarMark, string>>;
  readonly todayLabel: string;
  readonly previous: { readonly label: string; readonly onClick: () => void };
  readonly next: { readonly label: string; readonly onClick: () => void };
};

const MARKS: readonly CalendarMark[] = ["practised", "kept", "test"];

/**
 * A month as a table (progress.md D219): weekdays as column headers, today ringed and announced,
 * and each marked day carrying its mark's words as well as its colour, which the legend below
 * repeats. The neighbouring months' days that fill the first and last weeks are shown quietly and
 * hidden from a screen reader, so each date is read once. Navigation is the caller's: the two
 * buttons only ask for the month before or after.
 */
export const MonthCalendar = ({
  year,
  month,
  today,
  marks,
  title,
  heading,
  weekdays,
  markLabels,
  todayLabel,
  previous,
  next,
}: MonthCalendarProps): JSX.Element => (
  <div className="pl-calendar">
    <div className="pl-calendar__head">
      {heading}
      <div className="pl-calendar__nav">
        <button type="button" className="pl-calendar__step pl-focusable" aria-label={previous.label} onClick={previous.onClick}>
          <Glyph name="chevron-left" />
        </button>
        <button type="button" className="pl-calendar__step pl-focusable" aria-label={next.label} onClick={next.onClick}>
          <Glyph name="chevron-right" />
        </button>
      </div>
    </div>
    <table className="pl-calendar__grid" aria-label={title}>
      <thead>
        <tr>
          {weekdays.map((w) => (
            <th key={w.long} scope="col" abbr={w.long}>
              {w.short}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {monthGrid(year, month).map((week) => (
          <tr key={week[0]?.day}>
            {week.map((cell) => {
              const mark = cell.inMonth ? marks.get(cell.day) : undefined;
              const isToday = cell.inMonth && cell.day === today;
              const cls = [
                "pl-calendar__day",
                cell.inMonth ? "" : "pl-calendar__day--outside",
                mark === undefined ? "" : `pl-calendar__day--${mark}`,
                isToday ? "pl-calendar__day--today" : "",
              ]
                .filter((c) => c !== "")
                .join(" ");
              return (
                <td key={cell.day} aria-current={isToday ? "date" : undefined}>
                  <span className={cls} aria-hidden={cell.inMonth ? undefined : true}>
                    {cell.date}
                    {isToday ? <span className="pl-visually-hidden">{`, ${todayLabel}`}</span> : null}
                    {mark === undefined ? null : <span className="pl-visually-hidden">{`, ${markLabels[mark]}`}</span>}
                  </span>
                </td>
              );
            })}
          </tr>
        ))}
      </tbody>
    </table>
    <ul className="pl-calendar__legend">
      {MARKS.map((mark) => (
        <li key={mark}>
          <span className={`pl-calendar__swatch pl-calendar__swatch--${mark}`} aria-hidden="true" />
          {markLabels[mark]}
        </li>
      ))}
    </ul>
  </div>
);
