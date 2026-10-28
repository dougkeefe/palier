// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { provided } from "../../__tests__/render";
import { LandingMenu } from "./LandingMenu";

const nav = vi.hoisted(() => ({ pathname: "/" }));
vi.mock("../../i18n/navigation", async () => (await import("../../__tests__/render")).fakeNavigation(nav));

afterEach(cleanup);

describe("LandingMenu (D232, D267)", () => {
  it("is HeaderMenu named Menu, controlling landing-menu, with the landing header's own classes around its children", () => {
    render(provided(<LandingMenu><a href="#how">How it works</a></LandingMenu>, "en"));
    const button = screen.getByRole("button", { name: "Menu" });
    expect(button.getAttribute("aria-controls")).toBe("landing-menu");
    expect(button.className).toBe("landing-header__menu-button pl-focusable");
    const panel = document.getElementById("landing-menu");
    expect(panel?.className).toBe("landing-header__panel");
    expect(panel?.contains(screen.getByRole("link", { name: "How it works" }))).toBe(true);
  });

  it("is named in French in French", () => {
    render(provided(<LandingMenu><a href="#how">Comment ça marche</a></LandingMenu>, "fr"));
    expect(screen.getByRole("button", { name: "Menu" })).toBeTruthy();
  });
});
