import { describe, expect, it, vi } from "vitest";

import { html, links } from "../__tests__/render";
import { FocusFooter } from "./FocusFooter";

const nav = vi.hoisted(() => ({ pathname: "/start" }));
vi.mock("../i18n/navigation", async () => (await import("../__tests__/render")).fakeNavigation(nav));
vi.mock("./ShortcutSheet", () => ({ ShortcutSheet: () => <span data-stub="shortcut-sheet" /> }));

describe("FocusFooter (D269)", () => {
  it("keeps the non-affiliation statement, in the footer's own class (R5)", () => {
    const markup = html(<FocusFooter />);
    expect(markup).toContain("app-footer__disclaimer");
    expect(markup).toContain("not affiliated with");
  });

  it("links about and privacy, then the shortcut sheet, in the app footer's order (WCAG 3.2.6)", () => {
    const markup = html(<FocusFooter />);
    expect(links(markup).map(({ href }) => href)).toEqual(["/about", "/privacy"]);
    expect(markup.indexOf("/privacy")).toBeLessThan(markup.indexOf('data-stub="shortcut-sheet"'));
  });

  it("leaves out the settings link: there is nothing to set before onboarding", () => {
    expect(links(html(<FocusFooter />)).some(({ href }) => href.startsWith("/settings"))).toBe(false);
  });

  it("names its links in French in French", () => {
    expect(links(html(<FocusFooter />, "fr")).map(({ text }) => text)).toEqual(["À propos", "Confidentialité"]);
  });
});
