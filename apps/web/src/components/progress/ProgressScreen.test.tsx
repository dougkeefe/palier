// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { provided } from "../../__tests__/render";
import { type Container, createContainer } from "../../lib/container";
import { writeStudyProfile } from "../../lib/study";
import { ProgressScreen } from "./ProgressScreen";

const nav = vi.hoisted(() => ({ pathname: "/progress" }));
vi.mock("../../i18n/navigation", async () => (await import("../../__tests__/render")).fakeNavigation(nav));
// One state object, as the real provider holds: a new one each render would re-run the screen's effect.
const held = vi.hoisted(() => ({ container: null as Container | null, state: null as unknown }));
vi.mock("../ContainerProvider", () => ({ useContainer: () => held.state }));

beforeEach(() => {
  held.container = createContainer({ hermetic: true });
  held.state = { status: "ready", container: held.container };
  // jsdom has no matchMedia; the screen asks it whether it is printing.
  window.matchMedia ??= (() => ({ matches: false, addEventListener() {}, removeEventListener() {} })) as never;
});
afterEach(cleanup);

const onboarded = () =>
  writeStudyProfile(held.container!.settings, {
    targets: { reading: "C", writing: "B", oral: "C" },
    current: { reading: null, writing: null, oral: null },
    dailyGoalMinutes: 20,
    testDate: null,
  });

describe("ProgressScreen (§8.9, D270)", () => {
  it("with no study profile reads no report and stays loading, while the gate sends the visitor to onboarding", async () => {
    const progressReport = vi.spyOn(held.container!.useCases, "progressReport");
    render(provided(<ProgressScreen />, "en"));
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(progressReport).not.toHaveBeenCalled();
    expect(screen.getByRole("status").textContent).toBe("Loading…");
  });

  it("with a profile reads each scored skill's report and draws the detail's tabs", async () => {
    await onboarded();
    const progressReport = vi.spyOn(held.container!.useCases, "progressReport");
    render(provided(<ProgressScreen />, "en"));
    expect(await screen.findAllByRole("tab")).not.toHaveLength(0);
    expect(progressReport.mock.calls.map(([request]) => request.skill)).toEqual(["reading", "writing"]);
  });

  it("says so when a report cannot be read", async () => {
    await onboarded();
    vi.spyOn(held.container!.useCases, "progressReport").mockRejectedValue(new Error("no bank"));
    render(provided(<ProgressScreen />, "en"));
    expect(await screen.findByText(/Something went wrong loading your study data/)).toBeTruthy();
  });
});
