// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { HeaderMenu } from "./HeaderMenu";

const nav = vi.hoisted(() => ({ pathname: "/review" }));
vi.mock("../i18n/navigation", async () => (await import("../__tests__/render")).fakeNavigation(nav));

const menu = () => (
  <HeaderMenu label="Menu" panelId="test-menu" buttonClassName="test-button" panelClassName="test-panel">
    <a href="#progress">Progress</a>
  </HeaderMenu>
);

const button = () => screen.getByRole("button", { name: "Menu" });
const panel = () => document.getElementById("test-menu")!;
const isOpen = () => button().getAttribute("aria-expanded") === "true" && panel().hasAttribute("data-open");

beforeEach(() => {
  nav.pathname = "/review";
});
afterEach(cleanup);

describe("HeaderMenu (D232, D267)", () => {
  it("is a collapsed disclosure button controlling its panel, with the classes its header styles", () => {
    render(menu());
    expect(button().getAttribute("aria-expanded")).toBe("false");
    expect(button().getAttribute("aria-controls")).toBe("test-menu");
    expect(button().className).toBe("test-button pl-focusable");
    expect(panel().className).toBe("test-panel");
    expect(panel().hasAttribute("data-open")).toBe(false);
  });

  it("opens and closes on the button", () => {
    render(menu());
    fireEvent.click(button());
    expect(isOpen()).toBe(true);
    fireEvent.click(button());
    expect(isOpen()).toBe(false);
  });

  it("closes on Escape from inside the panel, and gives focus back to the button", () => {
    render(menu());
    fireEvent.click(button());
    fireEvent.keyDown(screen.getByRole("link", { name: "Progress" }), { key: "Escape" });
    expect(isOpen()).toBe(false);
    expect(document.activeElement).toBe(button());
  });

  it("ignores other keys", () => {
    render(menu());
    fireEvent.click(button());
    fireEvent.keyDown(screen.getByRole("link", { name: "Progress" }), { key: "Enter" });
    expect(isOpen()).toBe(true);
  });

  it("closes when one of its links is followed", () => {
    render(menu());
    fireEvent.click(button());
    fireEvent.click(screen.getByRole("link", { name: "Progress" }));
    expect(isOpen()).toBe(false);
  });

  it("stays open for a tap inside the panel that is not on a link", () => {
    render(menu());
    fireEvent.click(button());
    fireEvent.pointerDown(panel());
    fireEvent.click(panel());
    expect(isOpen()).toBe(true);
  });

  it("closes when a tap or focus lands outside it", () => {
    render(
      <>
        {menu()}
        <button type="button">Elsewhere</button>
      </>,
    );
    fireEvent.click(button());
    fireEvent.pointerDown(document.body);
    expect(isOpen()).toBe(false);

    fireEvent.click(button());
    act(() => screen.getByRole("button", { name: "Elsewhere" }).focus());
    expect(isOpen()).toBe(false);
  });

  it("closes when the page changes under it, as the browser's Back does, and not on a render that keeps the page", () => {
    const { rerender } = render(menu());
    fireEvent.click(button());
    rerender(menu());
    expect(isOpen()).toBe(true);
    nav.pathname = "/progress";
    rerender(menu());
    expect(isOpen()).toBe(false);
  });
});
