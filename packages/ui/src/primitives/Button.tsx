import type { ButtonHTMLAttributes, JSX, Ref } from "react";

import { type ButtonVariant, buttonClass } from "./logic.js";

export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  readonly variant?: ButtonVariant;
  readonly ref?: Ref<HTMLButtonElement>;
};

/**
 * The four button variants (§10.4). Text arrives as `children` so it goes
 * through i18n. `type` defaults to `button` so a button in a form does not
 * submit it by accident.
 */
export const Button = ({
  variant = "primary",
  className,
  type = "button",
  ...rest
}: ButtonProps): JSX.Element => {
  const cls = className === undefined ? buttonClass(variant) : `${buttonClass(variant)} ${className}`;
  return <button className={cls} type={type} {...rest} />;
};
