import { describe, expect, it } from "vitest";

import { menuOpenAfter } from "./menu";

describe("menuOpenAfter", () => {
  it("opens a closed menu, and closes an open one, when the button is pressed", () => {
    expect(menuOpenAfter(false, "toggle")).toBe(true);
    expect(menuOpenAfter(true, "toggle")).toBe(false);
  });

  it("closes on Escape, and stays closed", () => {
    expect(menuOpenAfter(true, "escape")).toBe(false);
    expect(menuOpenAfter(false, "escape")).toBe(false);
  });

  it("closes once a section link is followed, so the section is not under the menu", () => {
    expect(menuOpenAfter(true, "follow")).toBe(false);
    expect(menuOpenAfter(false, "follow")).toBe(false);
  });

  it("closes when focus or a tap lands outside it, so it is never left over the page", () => {
    expect(menuOpenAfter(true, "leave")).toBe(false);
    expect(menuOpenAfter(false, "leave")).toBe(false);
  });

  it("closes when the page changes under it, as the browser's Back does, since the app header outlives it (D267)", () => {
    expect(menuOpenAfter(true, "navigate")).toBe(false);
    expect(menuOpenAfter(false, "navigate")).toBe(false);
  });
});
