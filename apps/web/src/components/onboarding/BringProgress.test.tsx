// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";

import { provided } from "../../__tests__/render";
import { BringProgress, type Restored } from "./BringProgress";

vi.mock("../data/ImportForm", () => ({ ImportForm: () => <p>import form</p> }));
vi.mock("../sync/JoinForm", () => ({
  JoinForm: ({ onJoined }: { onJoined: (synced: boolean) => unknown }) => (
    <p>
      join form
      <button type="button" onClick={() => onJoined(false)}>
        link unavailable
      </button>
      <button type="button" onClick={() => onJoined(true)}>
        link synced
      </button>
    </p>
  ),
}));

beforeAll(() => {
  // jsdom has no modal dialogs; these stand in for the platform's.
  HTMLDialogElement.prototype.showModal = function showModal(this: HTMLDialogElement) {
    this.setAttribute("open", "");
  };
  HTMLDialogElement.prototype.close = function close(this: HTMLDialogElement) {
    this.removeAttribute("open");
  };
});
afterEach(cleanup);

const bring = (restored: Restored = "none") => {
  const calls = { onToday: vi.fn(), onContinue: vi.fn(), onRestored: vi.fn(() => Promise.resolve()) };
  render(
    provided(
      <BringProgress restored={restored} onRestored={calls.onRestored} onToday={calls.onToday} onContinue={calls.onContinue} />,
      "en",
    ),
  );
  return calls;
};

describe("BringProgress (D271)", () => {
  it("offers the two ways in as small links, with nothing open", () => {
    bring();
    expect(screen.getByText("Already use Palier?")).toBeTruthy();
    expect(screen.getByRole("button", { name: "I have a file I exported" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "I use Palier on another device" })).toBeTruthy();
    expect(screen.queryByText("import form")).toBeNull();
    expect(screen.queryByText(/^join form/)).toBeNull();
  });

  it("opens the import in a dialog of its own, so the welcome never grows", () => {
    bring();
    fireEvent.click(screen.getByRole("button", { name: "I have a file I exported" }));
    expect(screen.getByRole("heading", { name: "Bring in a file you exported" })).toBeTruthy();
    expect(screen.getByText("import form")).toBeTruthy();
    expect(screen.queryByText(/^join form/)).toBeNull();
  });

  it("opens the pairing with where to find the code on the other device", () => {
    bring();
    fireEvent.click(screen.getByRole("button", { name: "I use Palier on another device" }));
    expect(screen.getByRole("heading", { name: "Link this device to another" })).toBeTruthy();
    expect(screen.getByText(/^join form/)).toBeTruthy();
    expect(screen.getByText(/open Settings, then Sync/)).toBeTruthy();
  });

  it("once a profile has come over, offers today straight away, or the questions", () => {
    const { onToday, onContinue } = bring("profile");
    fireEvent.click(screen.getByRole("button", { name: "I have a file I exported" }));
    expect(screen.getByText(/Your levels and goals came over/)).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Go to today" }));
    expect(onToday).toHaveBeenCalledOnce();
    fireEvent.click(screen.getByRole("button", { name: "Continue setting up" }));
    expect(onContinue).toHaveBeenCalledOnce();
  });

  it("with progress but no profile, says the questions set up the plan, and offers only to close", () => {
    bring("data");
    fireEvent.click(screen.getByRole("button", { name: "I use Palier on another device" }));
    expect(screen.getByText(/The next questions set up your plan/)).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Go to today" })).toBeNull();
    expect(screen.getByRole("button", { name: "Close" })).toBeTruthy();
  });

  it("reads what came over only after a link that synced, never after an unavailable one", () => {
    const { onRestored } = bring();
    fireEvent.click(screen.getByRole("button", { name: "I use Palier on another device" }));
    fireEvent.click(screen.getByRole("button", { name: "link unavailable" }));
    expect(onRestored).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "link synced" }));
    expect(onRestored).toHaveBeenCalledOnce();
  });
});
