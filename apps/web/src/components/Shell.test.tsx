import { describe, expect, it, vi } from "vitest";

import { html } from "../__tests__/render";
import { Shell } from "./Shell";

const nav = vi.hoisted(() => ({ pathname: "/home" }));
vi.mock("../i18n/navigation", async () => (await import("../__tests__/render")).fakeNavigation(nav));
vi.mock("./OnboardingGate", () => ({ OnboardingGate: () => <i data-slot="gate" /> }));

const shell = (pathname: string) => {
  nav.pathname = pathname;
  return html(
    <Shell
      header={<i data-slot="header" />}
      footer={<i data-slot="footer" />}
      focusHeader={<i data-slot="focus-header" />}
      focusFooter={<i data-slot="focus-footer" />}
    >
      <p data-slot="page" />
    </Shell>,
  );
};

const slots = (markup: string) => [...markup.matchAll(/data-slot="([^"]+)"/g)].map((m) => m[1]);

describe("Shell (D201, D269)", () => {
  it("wraps an app page in the app's header and footer, around main", () => {
    const markup = shell("/home");
    expect(slots(markup)).toEqual(["header", "page", "gate", "footer"]);
    expect(markup).toContain('<main id="main" tabindex="-1" class="app-main">');
  });

  it("frames onboarding in the focus header and footer: no navigation, sync status or settings", () => {
    const markup = shell("/start");
    // Onboarding needs no gate: it is where the gate sends a visitor.
    expect(slots(markup)).toEqual(["focus-header", "page", "focus-footer"]);
    // The skip link's target is still there.
    expect(markup).toContain('<main id="main" tabindex="-1" class="app-main app-main--focus">');
  });

  it("leaves the landing page to bring its own, with no main of the shell's", () => {
    const markup = shell("/");
    expect(slots(markup)).toEqual(["page"]);
    expect(markup).not.toContain("<main");
  });
});
