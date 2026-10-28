import { beforeEach, describe, expect, it, vi } from "vitest";

import { html } from "../../../__tests__/render";
import SettingsLayout from "./layout";

const nav = vi.hoisted(() => ({ pathname: "/settings" }));
vi.mock("../../../i18n/navigation", async () => (await import("../../../__tests__/render")).fakeNavigation(nav));

const page = <section data-stub="page" />;
const props = { params: Promise.resolve({ locale: "en" }) } as Omit<LayoutProps<"/[locale]/settings">, "children">;

describe("the settings area's layout (D264)", () => {
  beforeEach(() => {
    nav.pathname = "/settings/sync";
  });

  it("puts the settings menu above every screen", () => {
    const markup = html(<SettingsLayout {...props}>{page}</SettingsLayout>);
    expect(markup).toMatch(/^<nav class="app-settings-nav"[^>]*>.*<\/nav><section data-stub="page"><\/section>$/s);
  });

  it("renders the overview alone, since its cards are the menu", () => {
    nav.pathname = "/settings";
    expect(html(<SettingsLayout {...props}>{page}</SettingsLayout>)).toBe('<section data-stub="page"></section>');
  });
});
