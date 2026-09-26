import { describe, expect, it } from "vitest";

import { capNotice, capShare, estimateText, moneyText, parseCap } from "./spend-view";

describe("moneyText", () => {
  it("writes US dollars to the cent, the English way and the French way", () => {
    expect(moneyText(1.254, "en")).toEqual({ underCent: false, text: "US$1.25" });
    expect(moneyText(1.254, "fr").text.replace(/\s/g, " ")).toBe("1,25 $ US");
  });

  it("writes nothing spent as zero", () => {
    expect(moneyText(0, "en")).toEqual({ underCent: false, text: "US$0.00" });
  });

  it("says under a cent for a spend too small to round to one, never a zero that reads as free", () => {
    expect(moneyText(0.0012, "en")).toEqual({ underCent: true, text: "US$0.01" });
    expect(moneyText(0.005, "en")).toEqual({ underCent: false, text: "US$0.01" });
  });
});

describe("estimateText", () => {
  it("writes an estimate of a cent or more to the cent", () => {
    expect(estimateText(0.066, "en")).toBe("US$0.07");
  });

  it("writes a smaller estimate to four places, so it still reads", () => {
    expect(estimateText(0.0021, "en")).toBe("US$0.0021");
  });
});

describe("capShare", () => {
  it("rounds down, so a month just short of 80 percent never reads 80", () => {
    expect(capShare(3.995, 5)).toBe(79);
    expect(capShare(4, 5)).toBe(80);
    expect(capShare(6, 5)).toBe(120);
  });
});

describe("parseCap", () => {
  it.each([
    ["5", 5],
    ["12.50", 12.5],
    ["12,50", 12.5],
    ["$20", 20],
    ["20 $", 20],
    ["20 $ US", 20],
    [" 7 ", 7],
    [".5", 0.5],
    ["3.", 3],
  ])("reads %j as %d dollars", (typed, capUsd) => {
    expect(parseCap(typed)).toEqual({ ok: true, capUsd });
  });

  it("asks for an amount when nothing was typed", () => {
    expect(parseCap("  ")).toEqual({ ok: false, error: "capBlank" });
  });

  it.each(["five", "1.2.3", "-3", "1e3", "10%"])("refuses %j as not a number", (typed) => {
    expect(parseCap(typed)).toEqual({ ok: false, error: "capNotNumber" });
  });

  it("refuses zero, which would warn on every call", () => {
    expect(parseCap("0")).toEqual({ ok: false, error: "capNotPositive" });
    expect(parseCap("0.00")).toEqual({ ok: false, error: "capNotPositive" });
  });
});

describe("capNotice", () => {
  it("warns near the cap, and more strongly past it", () => {
    expect(capNotice("near")).toEqual({ key: "capNear", tone: "info" });
    expect(capNotice("over")).toEqual({ key: "capOver", tone: "incorrect" });
  });

  it("says nothing under the cap, or with no cap", () => {
    expect(capNotice("under")).toBeNull();
    expect(capNotice("none")).toBeNull();
  });
});
