// @vitest-environment jsdom
import { cleanup, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { renderIsland, sectionIds, sectionLinks } from "../../__tests__/dom";
import { SyncSettings } from "./SyncSettings";

const nav = vi.hoisted(() => ({ pathname: "/settings/sync" }));
vi.mock("../../i18n/navigation", async () => (await import("../../__tests__/render")).fakeNavigation(nav));

afterEach(cleanup);

describe("SyncSettings (D71, D266)", () => {
  it("opens with a link to each of its seven sections, each landing on its card, in order", async () => {
    renderIsland(<SyncSettings />);
    const onThisPage = await screen.findByRole("navigation", { name: "On this page" });
    expect(sectionLinks(onThisPage)).toEqual([
      "settings-sync-switch",
      "settings-sync-status",
      "settings-sync-what",
      "settings-sync-devices",
      "settings-sync-add",
      "settings-sync-join",
      "settings-sync-danger",
    ]);
    expect(sectionIds()).toEqual(sectionLinks(onThisPage));
  });

  it("puts the switch in its first section and the export reminder in none, since it has no heading", async () => {
    renderIsland(<SyncSettings />);
    await screen.findByRole("navigation", { name: "On this page" });
    expect(document.getElementById("settings-sync-switch")?.querySelector('[role="switch"]')).not.toBeNull();
    const reminder = screen.getByText("If you lose every device on this list, the copy on our server goes with them, so keep an export.");
    expect(reminder.closest('[id^="settings-"]')).toBeNull();
  });
});
