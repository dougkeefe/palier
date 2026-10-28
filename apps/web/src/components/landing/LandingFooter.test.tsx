import { describe, expect, it, vi } from "vitest";

import { html, links } from "../../__tests__/render";
import { LandingFooter } from "./LandingFooter";

const nav = vi.hoisted(() => ({ pathname: "/" }));
vi.mock("../../i18n/navigation", async () => (await import("../../__tests__/render")).fakeNavigation(nav));
vi.mock("../ShortcutSheet", () => ({ ShortcutSheet: () => <span data-stub="shortcut-sheet" /> }));

/** The column under the heading `heading`, up to the next column. */
const column = (markup: string, heading: string) =>
  new RegExp(`<h2 class="landing-footer__heading">${heading}</h2>(.*?)</div>`, "s").exec(markup)?.[1] ?? "";

describe("LandingFooter (D201, D264)", () => {
  it("keeps one settings link under Your device, where the data, sync and key links were", () => {
    expect(links(column(html(<LandingFooter />), "Your device")).map(({ href, text }) => [href, text])).toEqual([
      ["/settings", "Settings"],
    ]);
  });

  it("links no settings screen directly", () => {
    const direct = links(html(<LandingFooter />)).filter(({ href }) => href.startsWith("/settings/"));
    expect(direct).toEqual([]);
  });

  it("keeps everything else the app's footer promises: the statement, about, privacy, the library and the shortcut sheet", () => {
    const markup = html(<LandingFooter />);
    const hrefs = links(markup).map(({ href }) => href);
    expect(hrefs).toEqual(expect.arrayContaining(["/about", "/privacy", "/library"]));
    expect(markup).toContain("not affiliated with");
    expect(markup).toContain('data-stub="shortcut-sheet"');
  });

  it("names the settings link in French in French", () => {
    const [settings] = links(html(<LandingFooter />, "fr")).filter(({ href }) => href === "/settings");
    expect(settings?.text).toBe("Paramètres");
  });
});
