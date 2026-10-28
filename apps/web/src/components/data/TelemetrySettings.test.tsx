// @vitest-environment jsdom
import { cleanup, fireEvent, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { renderIsland } from "../../__tests__/dom";
import { TelemetrySettings } from "./TelemetrySettings";

afterEach(cleanup);

describe("TelemetrySettings (D92, D266)", () => {
  it("is the data screen's shared-answers section, under its own id", async () => {
    renderIsland(<TelemetrySettings />);
    await screen.findByText("This device shares nothing.");
    const card = document.getElementById("settings-data-telemetry");
    expect(card?.querySelector("h2")?.textContent).toBe("Share answers to improve items");
  });

  it("shares nothing until asked, then says sharing is on and offers to stop", async () => {
    renderIsland(<TelemetrySettings />);
    // The button stays disabled until the stored choice is read.
    await screen.findByText("This device shares nothing.");
    fireEvent.click(screen.getByRole("button", { name: "Share my answers" }));
    expect(await screen.findByText("Sharing is on. Your next mock exams’ answers will be sent.")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Stop sharing" })).toBeTruthy();
    expect(screen.queryByText("This device shares nothing.")).toBeNull();
  });
});
