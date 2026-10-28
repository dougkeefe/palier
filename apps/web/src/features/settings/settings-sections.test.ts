import { describe, expect, it } from "vitest";

import { SETTINGS_ITEMS } from "./settings-nav";
import { SETTINGS_SECTIONS, sectionId } from "./settings-sections";

describe("SETTINGS_SECTIONS", () => {
  it("lists the sections of every settings screen in the menu, and no other (D266)", () => {
    expect(Object.keys(SETTINGS_SECTIONS)).toEqual(SETTINGS_ITEMS.map((item) => item.key));
    for (const sections of Object.values(SETTINGS_SECTIONS)) expect(sections.length).toBeGreaterThan(1);
  });

  it("gives every section in the area its own id", () => {
    const ids = Object.entries(SETTINGS_SECTIONS).flatMap(([screen, sections]) =>
      sections.map((section) => `settings-${screen}-${section}`),
    );
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe("sectionId", () => {
  it("names a section by its screen and its key, so the row and the card agree", () => {
    expect(sectionId("key", "cap")).toBe("settings-key-cap");
    expect(sectionId("sync", "danger")).toBe("settings-sync-danger");
  });
});
