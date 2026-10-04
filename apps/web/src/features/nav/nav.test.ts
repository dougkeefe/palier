import { describe, expect, it } from "vitest";

import { NAV_ITEMS, isCurrent } from "./nav";

describe("isCurrent", () => {
  it("is the destination itself", () => {
    expect(isCurrent("/review", "/review")).toBe(true);
  });

  it("is a page inside the destination", () => {
    expect(isCurrent("/practice/oral/report", "/practice/oral")).toBe(true);
  });

  it("is not a page that only shares the start of the name", () => {
    expect(isCurrent("/progressive", "/progress")).toBe(false);
  });

  it("is not another destination", () => {
    expect(isCurrent("/home", "/review")).toBe(false);
  });
});

describe("NAV_ITEMS", () => {
  it("are the five destinations in the design's order", () => {
    expect(NAV_ITEMS.map((item) => item.key)).toEqual(["home", "review", "oral", "progress", "about"]);
  });
});
