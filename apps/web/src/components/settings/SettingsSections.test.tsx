import { describe, expect, it } from "vitest";

import { html, links } from "../../__tests__/render";
import { SETTINGS_SECTIONS, sectionId } from "../../features/settings/settings-sections";
import { SettingsSections } from "./SettingsSections";

describe("SettingsSections, the links at the top of a settings screen (D266)", () => {
  it("is a navigation landmark named On this page, apart from the settings menu", () => {
    expect(html(<SettingsSections screen="key" />)).toMatch(/^<nav[^>]*aria-label="On this page"/);
  });

  it("links each of the screen's sections in order, by the id its card carries", () => {
    expect(links(html(<SettingsSections screen="key" />)).map(({ href, text }) => [href, text])).toEqual([
      [`#${sectionId("key", "entry")}`, "Your key"],
      [`#${sectionId("key", "where")}`, "Where it is kept"],
      [`#${sectionId("key", "realtime")}`, "Studio mode"],
      [`#${sectionId("key", "spend")}`, "Spending"],
      [`#${sectionId("key", "cap")}`, "Monthly cap"],
      [`#${sectionId("key", "features")}`, "Cost per feature"],
    ]);
  });

  it("links every screen's sections, and marks none current, since they are places on one page", () => {
    for (const screen of ["levels", "key", "data", "sync"] as const) {
      const found = links(html(<SettingsSections screen={screen} />));
      expect(found.map(({ href }) => href)).toEqual(SETTINGS_SECTIONS[screen].map((section) => `#settings-${screen}-${section}`));
      expect(found.filter(({ tag }) => tag.includes("aria-current"))).toEqual([]);
    }
  });

  it("is named and labelled in French in French", () => {
    const markup = html(<SettingsSections screen="sync" />, "fr");
    expect(markup).toMatch(/^<nav[^>]*aria-label="Sur cette page"/);
    expect(links(markup).map(({ text }) => text)).toEqual([
      "Activer ou désactiver",
      "État",
      "Ce qui est synchronisé",
      "Vos appareils",
      "Ajouter un appareil",
      "Utiliser un code",
      "Zone à risque",
    ]);
  });
});
