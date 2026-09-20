import type { HTMLAttributes, JSX, Ref } from "react";

export type CardProps = HTMLAttributes<HTMLDivElement> & {
  readonly ref?: Ref<HTMLDivElement>;
};

/** A surface with the §10.4 radius, border and two-soft-shadow elevation. */
export const Card = ({ className, ...rest }: CardProps): JSX.Element => {
  const cls = className === undefined ? "pl-card" : `pl-card ${className}`;
  return <div className={cls} {...rest} />;
};
