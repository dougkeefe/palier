"use client";

import { useTranslations } from "next-intl";
import type { ReactNode } from "react";

import { HeaderMenu } from "../HeaderMenu";

/**
 * The landing header's menu on a narrow screen (D232): a button at the top right that shows and hides the page's
 * sections, the language toggle and the way in, which `LandingHeader` passes in. The behaviour is `HeaderMenu`'s,
 * shared with the app's header since D267; on a wide screen `landing.css` hides the button and lays the panel's
 * children out in the header's row, as designed (D201).
 */
export function LandingMenu({ children }: { children: ReactNode }) {
  const t = useTranslations("landing");

  return (
    <HeaderMenu
      label={t("menu")}
      panelId="landing-menu"
      buttonClassName="landing-header__menu-button"
      panelClassName="landing-header__panel"
    >
      {children}
    </HeaderMenu>
  );
}
