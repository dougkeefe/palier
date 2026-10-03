import type { ButtonHTMLAttributes, JSX, Ref } from "react";

import { type ButtonArrow, type ButtonVariant, buttonClass } from "./logic.js";

export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  readonly variant?: ButtonVariant;
  /** The arrow disc at the end (D202), drawn by the stylesheet. */
  readonly arrow?: ButtonArrow;
  readonly ref?: Ref<HTMLButtonElement>;
};

/**
 * The button variants (§10.4, and `light` from D202), with an optional arrow disc. Text arrives as `children` so it goes
 * through i18n. `type` defaults to `button` so a button in a form does not
 * submit it by accident.
 */
export const Button = ({
  variant = "primary",
  arrow,
  className,
  type = "button",
  ...rest
}: ButtonProps): JSX.Element => {
  const base = buttonClass(variant, arrow);
  const cls = className === undefined ? base : `${base} ${className}`;
  return <button className={cls} type={type} {...rest} />;
};
