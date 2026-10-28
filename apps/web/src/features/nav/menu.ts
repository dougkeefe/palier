/** What can happen to a header's menu on a narrow screen: the landing page's (D232) and the app's (D267). */
export type MenuEvent = "toggle" | "escape" | "follow" | "leave" | "navigate";

/**
 * Whether a header's menu is open after `event`: the button toggles it, and Escape, following one of its links, focus
 * or a tap landing outside it, or the page changing under it closes it. A followed link must close it: the landing
 * page's are in-page anchors, and the app header outlives a soft navigation, so either way the menu would otherwise stay
 * open over the page. So must a navigation it did not start, such as the browser's Back, for the same reason.
 */
export const menuOpenAfter = (open: boolean, event: MenuEvent): boolean => (event === "toggle" ? !open : false);
