/**
 * The header's destinations, in order, and which one the page is (progress.md D202). The header marks
 * the current one as a white pill with `aria-current="page"`, as designed.
 */
export const NAV_ITEMS = [
  { key: "home", href: "/home" },
  { key: "review", href: "/review" },
  { key: "oral", href: "/practice/oral" },
  { key: "progress", href: "/progress" },
  { key: "about", href: "/about" },
] as const;

export type NavKey = (typeof NAV_ITEMS)[number]["key"];

/**
 * Whether the page at `pathname` (next-intl's, without the locale) is under `href`: the destination
 * itself, or a page inside it, such as the oral report under oral practice. A page that only shares
 * a prefix of the name is not.
 */
export const isCurrent = (pathname: string, href: string): boolean => pathname === href || pathname.startsWith(`${href}/`);
