// @vitest-environment jsdom
import { cleanup, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { renderIsland } from "../../__tests__/dom";
import { OralStorageSettings } from "./OralStorageSettings";

afterEach(cleanup);

describe("OralStorageSettings (D121, D266)", () => {
  it("is the data screen's recordings section, under its own id", async () => {
    renderIsland(<OralStorageSettings />);
    await screen.findByText("No recordings are kept on this device.");
    const card = document.getElementById("settings-data-oral");
    expect(card?.querySelector("h2")?.textContent).toBe("Recordings of your spoken practice");
  });

  it("says nothing is kept, and offers nothing to clean up, before any spoken session", async () => {
    renderIsland(<OralStorageSettings />);
    expect(await screen.findByText("No recordings are kept on this device.")).toBeTruthy();
    expect(screen.queryByRole("button")).toBeNull();
  });
});
