import { beforeEach, describe, expect, it, vi } from "vitest";

import { html, links } from "../../__tests__/render";
import { SettingsNav } from "./SettingsNav";

const nav = vi.hoisted(() => ({ pathname: "/" }));
vi.mock("../../i18n/navigation", async () => (await import("../../__tests__/render")).fakeNavigation(nav));

describe("SettingsNav, the menu above every settings screen (D264)", () => {
  beforeEach(() => {
    nav.pathname = "/settings/data";
  });

  it("renders nothing on the overview, whose cards are the menu", () => {
    nav.pathname = "/settings";
    expect(html(<SettingsNav />)).toBe("");
  });

  it("is a navigation landmark named Settings, with the four screens in order", () => {
    const markup = html(<SettingsNav />);
    expect(markup).toMatch(/^<nav[^>]*aria-label="Settings"/);
    expect(links(markup).map(({ href, text }) => [href, text])).toEqual([
      ["/settings/study", "Your levels"],
      ["/settings/key", "Your API key"],
      ["/settings/data", "Your data"],
      ["/settings/sync", "Sync"],
    ]);
  });

  it("marks the screen you are on, and only that one", () => {
    const current = links(html(<SettingsNav />)).filter(({ tag }) => tag.includes('aria-current="page"'));
    expect(current.map(({ href }) => href)).toEqual(["/settings/data"]);
  });

  it("marks the key on the key's guide", () => {
    nav.pathname = "/settings/key/guide";
    const current = links(html(<SettingsNav />)).filter(({ tag }) => tag.includes('aria-current="page"'));
    expect(current.map(({ href }) => href)).toEqual(["/settings/key"]);
  });

  it("is named and labelled in French in French", () => {
    const markup = html(<SettingsNav />, "fr");
    expect(markup).toMatch(/^<nav[^>]*aria-label="Paramètres"/);
    expect(links(markup).map(({ text }) => text)).toEqual(["Vos niveaux", "Votre clé d’API", "Vos données", "Synchronisation"]);
  });
});
