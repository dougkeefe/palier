/**
 * The settings area (progress.md D264): one place for what the user sets, reached by the header's gear and the
 * footer's link. `/settings` lists the screens as cards, and every screen under it carries the same menu. A new
 * settings screen is an entry here, in the order the overview and the menu show it.
 */
export const SETTINGS_HREF = "/settings";

export const SETTINGS_ITEMS = [
  { key: "levels", href: "/settings/study" },
  { key: "key", href: "/settings/key" },
  { key: "data", href: "/settings/data" },
  { key: "sync", href: "/settings/sync" },
] as const;

export type SettingsKey = (typeof SETTINGS_ITEMS)[number]["key"];

/**
 * Whether the page at `pathname` (next-intl's, without the locale) shows the settings menu: every screen in the area,
 * but not the overview, whose cards are already the menu and would otherwise be every link twice.
 */
export const showsSettingsNav = (pathname: string): boolean => pathname !== SETTINGS_HREF;
