// @vitest-environment jsdom
import { cleanup, fireEvent, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { renderIsland, sectionIds } from "../../__tests__/dom";
import { SpendSettings } from "./SpendSettings";

afterEach(cleanup);

describe("SpendSettings (D101–D104, D266)", () => {
  it("draws its three cards once the ledger is read, each under the id the key screen's links name", async () => {
    renderIsland(<SpendSettings />);
    await screen.findByRole("heading", { name: "What you have spent" });
    expect(sectionIds()).toEqual(["settings-key-spend", "settings-key-cap", "settings-key-features"]);
    expect(document.getElementById("settings-key-cap")?.querySelector("h2")?.textContent).toBe("A monthly cap");
  });

  it("sets a cap from what is typed, then removes it", async () => {
    renderIsland(<SpendSettings />);
    expect(await screen.findByText("No cap is set.")).toBeTruthy();
    fireEvent.change(screen.getByLabelText(/Monthly cap, in US dollars/), { target: { value: "5" } });
    fireEvent.click(screen.getByRole("button", { name: "Set the cap" }));
    expect(await screen.findByText("The cap is set.")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Remove the cap" }));
    expect(await screen.findByText("The cap has been removed.")).toBeTruthy();
    expect(screen.getByText("No cap is set.")).toBeTruthy();
  });
});
