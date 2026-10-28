import { describe, expect, it, vi } from "vitest";

import { html, links } from "../__tests__/render";
import { Header } from "./Header";

const nav = vi.hoisted(() => ({ pathname: "/review" }));
vi.mock("../i18n/navigation", async () => (await import("../__tests__/render")).fakeNavigation(nav));
// The sync status reads the sync runner's context and the toggle builds the other locale's address; neither is under
// test here, only where each sits.
vi.mock("./SyncStatus", () => ({ SyncStatus: () => <span data-stub="sync-status" /> }));
vi.mock("./LanguageToggle", () => ({ LanguageToggle: () => <span data-stub="language-toggle" /> }));

const tools = (markup: string) => /<div class="app-header__tools">(.*)<\/div><\/header>$/s.exec(markup)?.[1] ?? "";

describe("Header (D202, D264)", () => {
  it("ends with the settings gear, after the sync status and the language toggle", () => {
    const inTools = tools(html(<Header />));
    const order = ["sync-status", "language-toggle", 'aria-label="Settings"'].map((mark) => inTools.indexOf(mark));
    expect(order.every((at) => at >= 0)).toBe(true);
    expect([...order].sort((a, b) => a - b)).toEqual(order);
    expect(links(inTools).map(({ href }) => href)).toEqual(["/settings"]);
  });

  it("keeps the wordmark home and the five destinations before the tools", () => {
    const markup = html(<Header />);
    const hrefs = links(markup).map(({ href }) => href);
    expect(hrefs).toEqual(["/", "/home", "/review", "/practice/oral", "/progress", "/practice/writing/translate", "/settings"]);
  });
});
