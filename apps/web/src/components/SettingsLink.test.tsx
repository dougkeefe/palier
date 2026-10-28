import { beforeEach, describe, expect, it, vi } from "vitest";

import { html, links } from "../__tests__/render";
import { SettingsLink } from "./SettingsLink";

const nav = vi.hoisted(() => ({ pathname: "/" }));
vi.mock("../i18n/navigation", async () => (await import("../__tests__/render")).fakeNavigation(nav));

describe("SettingsLink, the header's gear (D264)", () => {
  beforeEach(() => {
    nav.pathname = "/review";
  });

  it("leads to the settings overview, named and titled in words, its glyph hidden", () => {
    const markup = html(<SettingsLink />);
    const [gear] = links(markup);
    expect(gear?.href).toBe("/settings");
    expect(gear?.tag).toContain('aria-label="Settings"');
    expect(gear?.tag).toContain('title="Settings"');
    expect(markup).toMatch(/<svg[^>]*aria-hidden="true"/);
  });

  it("is named in French in French", () => {
    const [gear] = links(html(<SettingsLink />, "fr"));
    expect(gear?.tag).toContain('aria-label="Paramètres"');
  });

  it("is not the current page outside the settings area", () => {
    const [gear] = links(html(<SettingsLink />));
    expect(gear?.tag).not.toContain("aria-current");
  });

  it("is the current page on the overview and on every screen inside it", () => {
    for (const pathname of ["/settings", "/settings/key", "/settings/key/guide"]) {
      nav.pathname = pathname;
      const [gear] = links(html(<SettingsLink />));
      expect(gear?.tag).toContain('aria-current="page"');
    }
  });

  it("is not current on a page that only shares the start of the name", () => {
    nav.pathname = "/settingsish";
    const [gear] = links(html(<SettingsLink />));
    expect(gear?.tag).not.toContain("aria-current");
  });
});
