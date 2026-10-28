// @vitest-environment jsdom
import { cleanup, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { renderIsland, sectionIds, sectionLinks } from "../../__tests__/dom";
import { DataSettings } from "./DataSettings";

const nav = vi.hoisted(() => ({ pathname: "/settings/data" }));
vi.mock("../../i18n/navigation", async () => (await import("../../__tests__/render")).fakeNavigation(nav));

afterEach(cleanup);

describe("DataSettings (D266)", () => {
  it("opens with a link to each of its five sections, each landing on its card, in order", async () => {
    renderIsland(<DataSettings />);
    const onThisPage = await screen.findByRole("navigation", { name: "On this page" });
    expect(sectionLinks(onThisPage)).toEqual([
      "settings-data-export",
      "settings-data-import",
      "settings-data-telemetry",
      "settings-data-oral",
      "settings-data-delete",
    ]);
    expect(sectionIds()).toEqual(sectionLinks(onThisPage));
  });

  it("puts each section's heading inside the card its link names", async () => {
    renderIsland(<DataSettings />);
    await screen.findByRole("navigation", { name: "On this page" });
    const heading = (id: string) => document.getElementById(id)?.querySelector("h2")?.textContent;
    expect(heading("settings-data-export")).toBe("Export");
    expect(heading("settings-data-import")).toBe("Import");
    expect(heading("settings-data-delete")).toBe("Delete everything");
  });
});
