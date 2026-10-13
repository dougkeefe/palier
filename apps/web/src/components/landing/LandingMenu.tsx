"use client";

import { useTranslations } from "next-intl";
import { type KeyboardEvent, type MouseEvent, type ReactNode, useEffect, useRef, useState } from "react";

import { type MenuEvent, menuOpenAfter } from "../../features/landing/landing";

const PANEL_ID = "landing-menu";

/**
 * The landing header's menu on a narrow screen (D232): a button at the top right that shows and
 * hides the page's sections, the language toggle and the way in, which `LandingHeader` passes in.
 * It is a disclosure, not an ARIA menu, so its links stay links. Open, it closes when focus or a tap
 * lands anywhere else, so Tab out of it never leaves it drawn over the page. On a wide screen the
 * button is hidden and the panel lays its children out in the header's row, as designed (D201).
 */
export function LandingMenu({ children }: { children: ReactNode }) {
  const t = useTranslations("landing");
  const [open, setOpen] = useState(false);
  const button = useRef<HTMLButtonElement>(null);
  const panel = useRef<HTMLDivElement>(null);
  const after = (event: MenuEvent) => setOpen((current) => menuOpenAfter(current, event));

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
        className="landing-header__menu-button pl-focusable"
        aria-label={t("menu")}
        aria-expanded={open}
        aria-controls={PANEL_ID}
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
        id={PANEL_ID}
        className="landing-header__panel"
        data-open={open ? "" : undefined}
        onClick={closeOnFollow}
        onKeyDown={closeOnEscape}
      >
        {children}
      </div>
    </>
  );
}
