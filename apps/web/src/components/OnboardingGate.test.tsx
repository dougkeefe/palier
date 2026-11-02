// @vitest-environment jsdom
import { cleanup, render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { provided } from "../__tests__/render";
import { type Container, createContainer } from "../lib/container";
import { writeStudyProfile } from "../lib/study";
import { OnboardingGate } from "./OnboardingGate";

const nav = vi.hoisted(() => ({ pathname: "/review", replace: vi.fn() }));
vi.mock("../i18n/navigation", async () => ({
  ...(await import("../__tests__/render")).fakeNavigation(nav),
  useRouter: () => ({ replace: nav.replace }),
}));
const held = vi.hoisted(() => ({ container: null as Container | null }));
vi.mock("./ContainerProvider", () => ({
  useContainer: () => (held.container === null ? { status: "loading" } : { status: "ready", container: held.container }),
}));

beforeEach(() => {
  held.container = createContainer({ hermetic: true });
  nav.replace.mockReset();
});
afterEach(cleanup);

const gate = (pathname: string) => {
  nav.pathname = pathname;
  render(provided(<OnboardingGate />, "en"));
};

describe("OnboardingGate (D270)", () => {
  it("sends a visitor with no study profile from an app page to onboarding, replacing the page", async () => {
    gate("/review");
    await vi.waitFor(() => expect(nav.replace).toHaveBeenCalledWith("/start"));
  });

  it("leaves a visitor who has been through onboarding where they are", async () => {
    await writeStudyProfile(held.container!.settings, {
      targets: { reading: "C", writing: "C", oral: "C" },
      current: { reading: null, writing: null, oral: null },
      dailyGoalMinutes: 20,
      testDate: null,
    });
    gate("/settings/data");
    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(nav.replace).not.toHaveBeenCalled();
  });

  it("leaves the pages open before onboarding alone, with no profile", async () => {
    gate("/practice/writing/translate");
    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(nav.replace).not.toHaveBeenCalled();
  });

  it("waits for the container before deciding", async () => {
    held.container = null;
    gate("/progress");
    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(nav.replace).not.toHaveBeenCalled();
  });
});
