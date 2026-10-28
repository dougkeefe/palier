import { describe, expect, it, vi } from "vitest";

import { html, links } from "../__tests__/render";
import { Footer } from "./Footer";

const nav = vi.hoisted(() => ({ pathname: "/review" }));
vi.mock("../i18n/navigation", async () => (await import("../__tests__/render")).fakeNavigation(nav));
vi.mock("./ShortcutSheet", () => ({ ShortcutSheet: () => <span data-stub="shortcut-sheet" /> }));

describe("Footer (D145, D264)", () => {
  it("links the settings area once, then the library, about and privacy", () => {
    expect(links(html(<Footer />)).map(({ href, text }) => [href, text])).toEqual([
      ["/settings", "Settings"],
      ["/library", "Library"],
      ["/about", "About"],
      ["/privacy", "Privacy"],
    ]);
  });

  it("no longer links a settings screen directly: they are one step further, on the overview", () => {
    const direct = links(html(<Footer />)).filter(({ href }) => href.startsWith("/settings/"));
    expect(direct).toEqual([]);
  });

  it("keeps the non-affiliation statement and the shortcut sheet (R5, PRD §11)", () => {
    const markup = html(<Footer />);
    expect(markup).toContain("app-footer__disclaimer");
    expect(markup).toContain("not affiliated with");
    expect(markup).toContain('data-stub="shortcut-sheet"');
  });

  it("names the settings link in French in French", () => {
    expect(links(html(<Footer />, "fr"))[0]?.text).toBe("Paramètres");
  });
});
