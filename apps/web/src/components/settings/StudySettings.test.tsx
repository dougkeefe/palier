// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { sectionIds, sectionLinks } from "../../__tests__/dom";
import { provided } from "../../__tests__/render";
import { type Container, createContainer } from "../../lib/container";
import { writeStudyProfile } from "../../lib/study";
import { StudySettings } from "./StudySettings";

const nav = vi.hoisted(() => ({ pathname: "/settings/study" }));
vi.mock("../../i18n/navigation", async () => (await import("../../__tests__/render")).fakeNavigation(nav));
// The container is built here rather than by the provider, so a test can store a study profile in it first.
const held = vi.hoisted(() => ({ container: null as Container | null }));
vi.mock("../ContainerProvider", () => ({
  useContainer: () => (held.container === null ? { status: "loading" } : { status: "ready", container: held.container }),
}));

beforeEach(() => {
  held.container = createContainer({ hermetic: true });
});
afterEach(cleanup);

describe("StudySettings (D259, D266)", () => {
  it("offers onboarding before there is a profile, with no section links, since there are no sections", async () => {
    render(provided(<StudySettings />, "en"));
    expect(await screen.findByRole("link", { name: "Set up your practice" })).toBeTruthy();
    expect(screen.queryByRole("navigation", { name: "On this page" })).toBeNull();
    expect(sectionIds()).toEqual([]);
  });

  it("with a profile, opens with a link to each of its three sections, each landing on its card", async () => {
    await writeStudyProfile(held.container!.settings, {
      targets: { reading: "C", writing: "B", oral: "C" },
      current: { reading: null, writing: null, oral: null },
      dailyGoalMinutes: 20,
      testDate: null,
    });
    render(provided(<StudySettings />, "en"));
    const onThisPage = await screen.findByRole("navigation", { name: "On this page" });
    expect(sectionLinks(onThisPage)).toEqual(["settings-levels-results", "settings-levels-targets", "settings-levels-goal"]);
    expect(sectionIds()).toEqual(sectionLinks(onThisPage));
    expect(document.getElementById("settings-levels-goal")?.querySelector("h2")?.textContent).toBe("Your daily goal");
  });
});
