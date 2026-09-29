import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import { SHORTCUTS, SHORTCUT_SCOPES, shortcutGroups, shouldOpenSheet } from "./shortcuts";

const press = (key: string, extra: Partial<{ metaKey: boolean; ctrlKey: boolean; altKey: boolean; repeat: boolean }> = {}) => ({
  key,
  metaKey: false,
  ctrlKey: false,
  altKey: false,
  repeat: false,
  ...extra,
});
const el = (tagName: string) => ({ tagName, isContentEditable: false, getAttribute: () => null });

describe("shouldOpenSheet", () => {
  it("opens on ? anywhere on the page", () => {
    expect(shouldOpenSheet(press("?"), el("BODY"), false)).toBe(true);
    expect(shouldOpenSheet(press("?"), el("BUTTON"), false)).toBe(true);
  });

  it("leaves a ? typed into a field to the field", () => {
    expect(shouldOpenSheet(press("?"), el("TEXTAREA"), false)).toBe(false);
  });

  it("does not open over another open dialog", () => {
    expect(shouldOpenSheet(press("?"), el("BODY"), true)).toBe(false);
  });

  it("ignores a chord, a held key, and any other key", () => {
    expect(shouldOpenSheet(press("?", { ctrlKey: true }), el("BODY"), false)).toBe(false);
    expect(shouldOpenSheet(press("?", { repeat: true }), el("BODY"), false)).toBe(false);
    expect(shouldOpenSheet(press("/"), el("BODY"), false)).toBe(false);
  });
});

describe("shortcutGroups", () => {
  it("groups the registry by scope in the sheet's order", () => {
    expect(shortcutGroups().map((g) => g.scope)).toEqual(SHORTCUT_SCOPES);
    expect(shortcutGroups().flatMap((g) => g.shortcuts)).toHaveLength(SHORTCUTS.length);
  });

  it("leaves out a scope nothing is registered in", () => {
    expect(shortcutGroups([{ scope: "exam", keys: ["f"], does: "doesFlag" }]).map((g) => g.scope)).toEqual(["exam"]);
  });

  it("names every scope, key and action in the messages, so the sheet has no gap", () => {
    const en = JSON.parse(readFileSync(fileURLToPath(new URL("../../../messages/en.json", import.meta.url)), "utf8")) as {
      shortcuts: Record<string, string>;
    };
    const messages = en.shortcuts;
    for (const scope of SHORTCUT_SCOPES) expect(messages[`scope_${scope}`]).toBeTypeOf("string");
    for (const s of SHORTCUTS) {
      expect(messages[s.does]).toBeTypeOf("string");
      for (const key of s.keys) expect(messages[`key_${key}`]).toBeTypeOf("string");
    }
  });
});
