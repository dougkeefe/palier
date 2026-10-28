// @vitest-environment jsdom
import { cleanup, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { renderIsland, sectionIds, sectionLinks } from "../../__tests__/dom";
import { KeySettings } from "./KeySettings";

const nav = vi.hoisted(() => ({ pathname: "/settings/key" }));
vi.mock("../../i18n/navigation", async () => (await import("../../__tests__/render")).fakeNavigation(nav));

afterEach(cleanup);

describe("KeySettings (D100, D266)", () => {
  it("opens with a link to each of its six sections, and every one lands on a card once the spend has loaded", async () => {
    renderIsland(<KeySettings />);
    const onThisPage = await screen.findByRole("navigation", { name: "On this page" });
    expect(sectionLinks(onThisPage)).toEqual([
      "settings-key-entry",
      "settings-key-where",
      "settings-key-realtime",
      "settings-key-spend",
      "settings-key-cap",
      "settings-key-features",
    ]);
    await waitFor(() => expect(sectionIds()).toEqual(sectionLinks(onThisPage)));
  });

  it("puts the key's own form, shared with onboarding, inside the first section", async () => {
    renderIsland(<KeySettings />);
    await screen.findByRole("navigation", { name: "On this page" });
    expect(document.getElementById("settings-key-entry")?.querySelector("h2")?.textContent).toBe("Add a key");
    expect(document.getElementById("settings-key-where")?.querySelector("h2")?.textContent).toBe("Where your key is kept");
  });
});
