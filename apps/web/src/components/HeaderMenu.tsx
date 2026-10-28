"use client";

import { type KeyboardEvent, type MouseEvent, type ReactNode, useEffect, useRef, useState } from "react";

import { type MenuEvent, menuOpenAfter } from "../features/nav/menu";
import { usePathname } from "../i18n/navigation";

/**
 * A header's menu on a narrow screen, the landing page's (D232) and the app's (D267): a button that shows and hides
 * the panel its header hands in. It is a disclosure, not an ARIA menu, so its links stay links. Open, it closes when
 * focus or a tap lands anywhere else, so Tab out of it never leaves it drawn over the page, and when one of its links
 * is followed, or when the page changes under it, as the browser's Back does, since the app header outlives a soft
 * navigation. On a wide screen each header's stylesheet hides the button and lays the panel's children out in the
 * header's row (`display: contents`), so they are rendered once, never one copy per width.
 */
export function HeaderMenu({
  label,
  panelId,
  buttonClassName,
  panelClassName,
  children,
}: {
  readonly label: string;
  readonly panelId: string;
  readonly buttonClassName: string;
  readonly panelClassName: string;
  readonly children: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const button = useRef<HTMLButtonElement>(null);
  const panel = useRef<HTMLDivElement>(null);
  const after = (event: MenuEvent) => setOpen((current) => menuOpenAfter(current, event));

  // A navigation the menu did not start closes it, adjusted while rendering rather than in an effect, so the new page
  // never paints with the panel over it. A landing link changes only the hash, never the pathname.
  const pathname = usePathname();
  const [shownAt, setShownAt] = useState(pathname);
  if (pathname !== shownAt) {
    setShownAt(pathname);
    setOpen(menuOpenAfter(open, "navigate"));
  }

  useEffect(() => {
    if (!open) return;
    const leave = (event: Event) => {
      const target = event.target;
      if (!(target instanceof Node)) return;
      if (button.current?.contains(target) === true || panel.current?.contains(target) === true) return;
      setOpen((current) => menuOpenAfter(current, "leave"));
    };
    document.addEventListener("pointerdown", leave);
    document.addEventListener("focusin", leave);
    return () => {
      document.removeEventListener("pointerdown", leave);
      document.removeEventListener("focusin", leave);
    };
  }, [open]);

  const closeOnEscape = (event: KeyboardEvent) => {
    if (event.key !== "Escape" || !open) return;
    after("escape");
    button.current?.focus();
  };

  const closeOnFollow = (event: MouseEvent) => {
    if (event.target instanceof Element && event.target.closest("a") !== null) after("follow");
  };

  return (
    <>
      <button
        ref={button}
        type="button"
        className={`${buttonClassName} pl-focusable`}
        aria-label={label}
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => after("toggle")}
        onKeyDown={closeOnEscape}
      >
        <svg
          aria-hidden="true"
          viewBox="0 0 24 24"
          width="24"
          height="24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
        >
          {open ? <path d="M6 6l12 12M18 6L6 18" /> : <path d="M4 7h16M4 12h16M4 17h16" />}
        </svg>
      </button>
      {/* Clicks and keys bubble here from the links inside; the panel itself is not interactive. */}
      <div
        ref={panel}
        id={panelId}
        className={panelClassName}
        data-open={open ? "" : undefined}
        onClick={closeOnFollow}
        onKeyDown={closeOnEscape}
      >
        {children}
      </div>
    </>
  );
}
