import { describe, expect, it, vi } from "vitest";

import { html, links } from "../__tests__/render";
import { FocusHeader } from "./FocusHeader";

const nav = vi.hoisted(() => ({ pathname: "/start" }));
vi.mock("../i18n/navigation", async () => (await import("../__tests__/render")).fakeNavigation(nav));
vi.mock("./LanguageToggle", () => ({ LanguageToggle: () => <span data-stub="language-toggle" /> }));

describe("FocusHeader (D269)", () => {
  it("is the wordmark home and the language, and nothing else", () => {
    const markup = html(<FocusHeader />);
    expect(links(markup).map(({ href, text }) => [href, text])).toEqual([["/", "Palier"]]);
    expect(markup).toContain('data-stub="language-toggle"');
  });

  it("leaves out the destinations, the sync status, the menu and the settings gear", () => {
    const markup = html(<FocusHeader />);
    expect(markup).not.toContain("<nav");
    expect(markup).not.toContain('aria-label="Settings"');
    expect(markup).not.toContain("app-sync");
    expect(markup).not.toContain("app-header__menu-button");
  });
});
