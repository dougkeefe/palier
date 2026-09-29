import { describe, expect, it } from "vitest";

import { enterIsControlsOwn, isChord, isPageKey, typedIntoField, type KeyTarget } from "./keyboard";

const press = (key: string, extra: Partial<{ metaKey: boolean; ctrlKey: boolean; altKey: boolean; repeat: boolean }> = {}) => ({
  key,
  metaKey: false,
  ctrlKey: false,
  altKey: false,
  repeat: false,
  ...extra,
});

const el = (tagName: string, { role = null, editable = false }: { role?: string | null; editable?: boolean } = {}): KeyTarget => ({
  tagName,
  isContentEditable: editable,
  getAttribute: (name) => (name === "role" ? role : null),
});

describe("isChord", () => {
  it("is a chord with Meta, Ctrl or Alt held, or when a held key repeats", () => {
    expect(isChord(press("1", { metaKey: true }))).toBe(true);
    expect(isChord(press("f", { ctrlKey: true }))).toBe(true);
    expect(isChord(press("1", { altKey: true }))).toBe(true);
    expect(isChord(press("1", { repeat: true }))).toBe(true);
  });

  it("is not a chord for a plain key, Shift included, since ? needs Shift", () => {
    expect(isChord(press("?"))).toBe(false);
  });
});

describe("typedIntoField", () => {
  it("is typing in an input, a textarea, a select or an editable region", () => {
    expect(typedIntoField(el("INPUT"))).toBe(true);
    expect(typedIntoField(el("TEXTAREA"))).toBe(true);
    expect(typedIntoField(el("SELECT"))).toBe(true);
    expect(typedIntoField(el("DIV", { editable: true }))).toBe(true);
  });

  it("is not typing on a button, the page, or with no target", () => {
    expect(typedIntoField(el("BUTTON"))).toBe(false);
    expect(typedIntoField(el("BODY"))).toBe(false);
    expect(typedIntoField(null)).toBe(false);
  });
});

describe("enterIsControlsOwn", () => {
  it("leaves Enter on a button or a link to that control", () => {
    expect(enterIsControlsOwn("Enter", el("BUTTON"))).toBe(true);
    expect(enterIsControlsOwn("Enter", el("A"))).toBe(true);
  });

  it("keeps Enter on an option radio for the page, and any other key", () => {
    expect(enterIsControlsOwn("Enter", el("BUTTON", { role: "radio" }))).toBe(false);
    expect(enterIsControlsOwn("1", el("BUTTON"))).toBe(false);
    expect(enterIsControlsOwn("Enter", el("BODY"))).toBe(false);
    expect(enterIsControlsOwn("Enter", null)).toBe(false);
  });
});

describe("isPageKey", () => {
  it("is the page's for a plain key on the page or an option", () => {
    expect(isPageKey(press("2"), el("BODY"))).toBe(true);
    expect(isPageKey(press("Enter"), el("BUTTON", { role: "radio" }))).toBe(true);
  });

  it("is not the page's for a chord, a field or a button's own Enter", () => {
    expect(isPageKey(press("1", { metaKey: true }), el("BODY"))).toBe(false);
    expect(isPageKey(press("1"), el("INPUT"))).toBe(false);
    expect(isPageKey(press("Enter"), el("BUTTON"))).toBe(false);
  });
});
