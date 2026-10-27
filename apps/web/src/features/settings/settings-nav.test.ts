import { describe, expect, it } from "vitest";

import { isCurrent } from "../nav/nav";
import { SETTINGS_HREF, SETTINGS_ITEMS, showsSettingsNav } from "./settings-nav";

describe("SETTINGS_ITEMS", () => {
  it("are the four settings screens, levels first, each under the settings area (D264)", () => {
    expect(SETTINGS_ITEMS.map((item) => item.key)).toEqual(["levels", "key", "data", "sync"]);
    expect(SETTINGS_ITEMS.map((item) => item.href)).toEqual([
      "/settings/study",
      "/settings/key",
      "/settings/data",
      "/settings/sync",
    ]);
    for (const item of SETTINGS_ITEMS) expect(isCurrent(item.href, SETTINGS_HREF)).toBe(true);
  });

  it("mark the key as the current screen on the key's guide", () => {
    const current = SETTINGS_ITEMS.filter((item) => isCurrent("/settings/key/guide", item.href));
    expect(current.map((item) => item.key)).toEqual(["key"]);
  });
});

describe("showsSettingsNav", () => {
  it("is hidden on the overview, whose cards are the menu", () => {
    expect(showsSettingsNav("/settings")).toBe(false);
  });

  it("is shown on every settings screen", () => {
    for (const item of SETTINGS_ITEMS) expect(showsSettingsNav(item.href)).toBe(true);
  });

  it("is shown on a page inside a screen, such as the key's guide", () => {
    expect(showsSettingsNav("/settings/key/guide")).toBe(true);
  });
});
