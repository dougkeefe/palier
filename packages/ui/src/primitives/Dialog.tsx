"use client";

import { type JSX, type ReactNode, useEffect, useId, useRef } from "react";

import { type DialogPlacement, dialogClass } from "./logic.js";

export type DialogProps = {
  readonly open: boolean;
  /** Called when the dialog closes itself: Escape, or a form with `method="dialog"`. */
  readonly onClose: () => void;
  readonly heading: string;
  readonly placement?: DialogPlacement;
  readonly children: ReactNode;
  /** The dialog's actions, after its body. */
  readonly actions?: ReactNode;
};

/**
 * A modal dialog over the native `<dialog>` element, opened with `showModal()`.
 * The platform does the hard parts: the page behind it is inert, focus is held
 * inside it, and Escape closes it. It is labelled by its heading. On close, focus
 * goes back to whatever held it before the dialog opened (§11: "focus is never
 * lost when a panel opens").
 *
 * `open` is the caller's state. The component opens and closes the element to
 * match, and reports a close the element made itself through `onClose`.
 */
export const Dialog = ({
  open,
  onClose,
  heading,
  placement = "center",
  children,
  actions,
}: DialogProps): JSX.Element => {
  const ref = useRef<HTMLDialogElement>(null);
  const opener = useRef<HTMLElement | null>(null);
  const headingId = useId();

  useEffect(() => {
    const dialog = ref.current;
    if (dialog === null) return;
    if (open && !dialog.open) {
      opener.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
      dialog.showModal();
    } else if (!open && dialog.open) {
      dialog.close();
    }
  }, [open]);

  useEffect(() => {
    const dialog = ref.current;
    if (dialog === null) return;
    const closed = (): void => {
      opener.current?.focus();
      opener.current = null;
      onClose();
    };
    dialog.addEventListener("close", closed);
    return () => dialog.removeEventListener("close", closed);
  }, [onClose]);

  return (
    <dialog ref={ref} className={dialogClass(placement)} aria-labelledby={headingId}>
      <h2 id={headingId} className="pl-dialog__heading">
        {heading}
      </h2>
      <div className="pl-dialog__body">{children}</div>
      {actions === undefined ? null : <div className="pl-dialog__actions">{actions}</div>}
    </dialog>
  );
};
