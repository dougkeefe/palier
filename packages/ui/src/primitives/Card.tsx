import type { HTMLAttributes, JSX, Ref } from "react";

import { type CardTone, cardClass } from "./logic.js";

export type CardProps = HTMLAttributes<HTMLDivElement> & {
  /** The card's fill (progress.md D202). White by default. */
  readonly tone?: CardTone;
  readonly ref?: Ref<HTMLDivElement>;
};

/** A flat panel: a fill, the §10.4 radius, and no border or shadow (D202). */
export const Card = ({ tone = "surface", className, ...rest }: CardProps): JSX.Element => {
  const base = cardClass(tone);
  const cls = className === undefined ? base : `${base} ${className}`;
  return <div className={cls} {...rest} />;
};
