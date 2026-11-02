// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { provided } from "../../__tests__/render";
import { type Container, createContainer } from "../../lib/container";
import { writeStudyProfile } from "../../lib/study";
import { ReviewScreen } from "./ReviewScreen";

const nav = vi.hoisted(() => ({ pathname: "/review" }));
vi.mock("../../i18n/navigation", async () => (await import("../../__tests__/render")).fakeNavigation(nav));
vi.mock("../practice/PracticeSession", () => ({ PracticeSession: () => <p>session</p> }));
const held = vi.hoisted(() => ({ container: null as Container | null }));
vi.mock("../ContainerProvider", () => ({
  useContainer: () => (held.container === null ? { status: "loading" } : { status: "ready", container: held.container }),
}));

beforeEach(() => {
  held.container = createContainer({ hermetic: true });
});
afterEach(cleanup);

describe("ReviewScreen (§8.8, D270)", () => {
  it("with no study profile reads no queue and stays loading, while the gate sends the visitor to onboarding", async () => {
    const reviewQueue = vi.spyOn(held.container!.useCases, "reviewQueue");
    render(provided(<ReviewScreen />, "en"));
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(reviewQueue).not.toHaveBeenCalled();
    expect(screen.getByRole("status").textContent).toBe("Loading…");
  });

  it("with a profile and nothing due, shows the reward state", async () => {
    await writeStudyProfile(held.container!.settings, {
      targets: { reading: "C", writing: "C", oral: "C" },
      current: { reading: null, writing: null, oral: null },
      dailyGoalMinutes: 20,
      testDate: null,
    });
    render(provided(<ReviewScreen />, "en"));
    expect(await screen.findByRole("link", { name: "Do a set anyway" })).toBeTruthy();
    expect(screen.queryByRole("status")).toBeNull();
  });

  it("says so when the queue cannot be read", async () => {
    await writeStudyProfile(held.container!.settings, {
      targets: { reading: "C", writing: "C", oral: "C" },
      current: { reading: null, writing: null, oral: null },
      dailyGoalMinutes: 20,
      testDate: null,
    });
    vi.spyOn(held.container!.useCases, "reviewQueue").mockRejectedValue(new Error("no bank"));
    render(provided(<ReviewScreen />, "en"));
    expect(await screen.findByText(/Something went wrong loading your study data/)).toBeTruthy();
  });
});
