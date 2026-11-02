// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { provided } from "../../__tests__/render";
import { type Container, createContainer } from "../../lib/container";
import { readStudyProfile, writeStudyProfile } from "../../lib/study";
import { OnboardingWizard } from "./OnboardingWizard";

const nav = vi.hoisted(() => ({ pathname: "/start", push: vi.fn() }));
vi.mock("../../i18n/navigation", async () => ({
  ...(await import("../../__tests__/render")).fakeNavigation(nav),
  useRouter: () => ({ push: nav.push }),
}));
// The container is built here rather than by the provider, so a test can store a profile or a key in it first.
const held = vi.hoisted(() => ({ container: null as Container | null }));
vi.mock("../ContainerProvider", () => ({
  useContainer: () => (held.container === null ? { status: "loading" } : { status: "ready", container: held.container }),
}));

beforeEach(() => {
  held.container = createContainer({ hermetic: true });
  nav.push.mockReset();
  // jsdom draws nothing, so it has no scrolling; the key step scrolls its video into view (D222).
  Element.prototype.scrollIntoView = vi.fn();
});
afterEach(cleanup);

const wizard = () => render(provided(<OnboardingWizard />, "en"));
const next = () => fireEvent.click(screen.getByRole("button", { name: "Continue" }));
const heading = (name: string) => screen.findByRole("heading", { level: 2, name });

describe("OnboardingWizard (D269)", () => {
  it("opens on the welcome: step 1 of 6, no Back and no Skip", async () => {
    wizard();
    expect(await heading("Welcome to Palier")).toBeTruthy();
    expect(screen.getByText("Step 1 of 6")).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Back" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Skip" })).toBeNull();
    // The statement heads onboarding (R5).
    expect(screen.getByText(/not affiliated with/)).toBeTruthy();
  });

  it("asks nothing about an assessment on the way: no step offers the diagnostic", async () => {
    wizard();
    await heading("Welcome to Palier");
    for (const name of [
      "What are you aiming for?",
      "Which SLE results do you hold now?",
      "How much time a day?",
    ]) {
      next();
      expect(await heading(name)).toBeTruthy();
      expect(screen.queryByText(/diagnostic/i)).toBeNull();
    }
  });

  it("offers Back from the target and Skip only from the results on", async () => {
    wizard();
    await heading("Welcome to Palier");
    next();
    await heading("What are you aiming for?");
    expect(screen.getByRole("button", { name: "Back" })).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Skip" })).toBeNull();
    next();
    await heading("Which SLE results do you hold now?");
    expect(screen.getByRole("button", { name: "Skip" })).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Back" }));
    expect(await heading("What are you aiming for?")).toBeTruthy();
  });

  it("skipping saves what was chosen, with the defaults for the rest, and lands on today", async () => {
    wizard();
    await heading("Welcome to Palier");
    next();
    fireEvent.click(await screen.findByRole("radio", { name: /^Level B\s?You/ }));
    next();
    await heading("Which SLE results do you hold now?");
    fireEvent.click(screen.getByRole("button", { name: "Skip" }));
    await vi.waitFor(() => expect(nav.push).toHaveBeenCalledWith("/home"));
    expect(await readStudyProfile(held.container!.settings)).toEqual({
      targets: { reading: "B", writing: "B", oral: "B" },
      current: { reading: null, writing: null, oral: null },
      dailyGoalMinutes: 20,
      testDate: null,
    });
  });

  it("ends on the ready card, which reads the choices back, then saves them and opens today", async () => {
    wizard();
    await heading("Welcome to Palier");
    next();
    await heading("What are you aiming for?");
    next();
    await heading("Which SLE results do you hold now?");
    next();
    fireEvent.click(await screen.findByRole("radio", { name: /30 minutes a day/ }));
    next();
    await heading("Add your OpenAI key");
    expect(screen.getByText("Step 5 of 6")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Not now, continue without a key" }));
    expect(await heading("You’re set")).toBeTruthy();
    expect(screen.getByText("Step 6 of 6")).toBeTruthy();
    expect(screen.getByText("Level C")).toBeTruthy();
    expect(screen.getByText("None declared")).toBeTruthy();
    expect(screen.getByText("30 minutes")).toBeTruthy();
    expect(screen.getByText("Not yet. Drills, review and mock exams need none.")).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Skip" })).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: "Start practising" }));
    await vi.waitFor(() => expect(nav.push).toHaveBeenCalledWith("/home"));
    expect((await readStudyProfile(held.container!.settings))?.dailyGoalMinutes).toBe(30);
  });

  it("with a key already held, counts five steps and goes from the goal to the ready card, which says the key is saved", async () => {
    await held.container!.useCases.saveApiKey({ key: "sk-test-held", remember: true });
    wizard();
    await heading("Welcome to Palier");
    expect(await screen.findByText("Step 1 of 5")).toBeTruthy();
    for (let i = 0; i < 4; i++) next();
    expect(await heading("You’re set")).toBeTruthy();
    expect(await screen.findByText("Saved on this device")).toBeTruthy();
  });

  it("starts from a saved profile, so coming back shows the choices rather than the defaults (WCAG 3.3.7)", async () => {
    await writeStudyProfile(held.container!.settings, {
      targets: { reading: "B", writing: "B", oral: "B" },
      current: { reading: null, writing: null, oral: null },
      dailyGoalMinutes: 10,
      testDate: null,
    });
    wizard();
    await heading("Welcome to Palier");
    next();
    await heading("What are you aiming for?");
    await vi.waitFor(() => expect((screen.getByRole("radio", { name: /^Level B\s?You/ }) as HTMLInputElement).checked).toBe(true));
  });

  it("brings a profile in from an export, from the welcome's quiet link, and then offers today straight away (D271)", async () => {
    HTMLDialogElement.prototype.showModal = function showModal(this: HTMLDialogElement) {
      this.setAttribute("open", "");
    };
    HTMLDialogElement.prototype.close = function close(this: HTMLDialogElement) {
      this.removeAttribute("open");
    };
    const source = createContainer({ hermetic: true });
    await writeStudyProfile(source.settings, {
      targets: { reading: "B", writing: "B", oral: "B" },
      current: { reading: "C", writing: null, oral: null },
      dailyGoalMinutes: 30,
      testDate: null,
    });
    const exported = await source.useCases.exportData();
    wizard();
    await heading("Welcome to Palier");
    fireEvent.click(screen.getByRole("button", { name: "I have a file I exported" }));
    const file = new File([JSON.stringify(exported)], "palier-export.json", { type: "application/json" });
    fireEvent.change(screen.getByLabelText("Choose an export file"), { target: { files: [file] } });
    fireEvent.click(screen.getByRole("button", { name: "Import" }));
    expect(await screen.findByText(/Your levels and goals came over/)).toBeTruthy();

    // Continuing sets up from what came over.
    fireEvent.click(screen.getByRole("button", { name: "Continue setting up" }));
    await heading("What are you aiming for?");
    expect((screen.getByRole("radio", { name: /^Level B\s?You/ }) as HTMLInputElement).checked).toBe(true);
    fireEvent.click(screen.getByRole("button", { name: "Back" }));
    await heading("Welcome to Palier");
    fireEvent.click(screen.getByRole("button", { name: "I have a file I exported" }));
    fireEvent.click(await screen.findByRole("button", { name: "Go to today" }));
    expect(nav.push).toHaveBeenCalledWith("/home");
  });
});
