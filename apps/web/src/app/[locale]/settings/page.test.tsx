import { beforeEach, describe, expect, it, vi } from "vitest";

import { htmlOnceResolved, links } from "../../../__tests__/render";
import SettingsPage, { generateMetadata } from "./page";

const server = vi.hoisted(() => ({ requested: [] as string[] }));
vi.mock("../../../i18n/navigation", async () => (await import("../../../__tests__/render")).fakeNavigation({ pathname: "/settings" }));
// next-intl's server half needs Next's request scope; the page needs only its translator and the locale it sets.
vi.mock("next-intl/server", async () => {
  const { createTranslator } = await import("next-intl");
  const messages = { en: (await import("../../../../messages/en.json")).default, fr: (await import("../../../../messages/fr.json")).default };
  return {
    setRequestLocale: (locale: string) => {
      server.requested.push(locale);
    },
    // The page asks for one namespace, `settings`, the only one this stand-in answers.
    getTranslations: async ({ locale }: { locale: "en" | "fr" }) =>
      createTranslator({ locale, messages: messages[locale], namespace: "settings" }),
  };
});

const propsFor = (locale: "en" | "fr") =>
  ({ params: Promise.resolve({ locale }), searchParams: Promise.resolve({}) }) as PageProps<"/[locale]/settings">;

describe("the settings overview (D264)", () => {
  beforeEach(() => {
    server.requested = [];
  });

  it("is titled Settings, in either language", async () => {
    expect((await generateMetadata(propsFor("en"))).title).toBe("Settings");
    expect((await generateMetadata(propsFor("fr"))).title).toBe("Paramètres");
  });

  it("sets the request's locale", async () => {
    await htmlOnceResolved(<SettingsPage {...propsFor("fr")} />, "fr");
    expect(server.requested).toEqual(["fr"]);
  });

  it("is a card for each settings screen, its name a heading linking the screen, in the menu's order", async () => {
    const markup = await htmlOnceResolved(<SettingsPage {...propsFor("en")} />);
    expect(markup).toMatch(/<h1 class="app-hero__title">Settings<\/h1>/);
    expect(links(markup).map(({ href, text }) => [href, text])).toEqual([
      ["/settings/study", "Your levels"],
      ["/settings/key", "Your API key"],
      ["/settings/data", "Your data"],
      ["/settings/sync", "Sync"],
    ]);
    expect(markup.match(/<h2 class="app-settings-card__title"><a /g)).toHaveLength(4);
  });

  it("says what each screen holds", async () => {
    const markup = await htmlOnceResolved(<SettingsPage {...propsFor("en")} />);
    expect(markup.match(/<p class="app-settings-card__description">[^<]+<\/p>/g)).toHaveLength(4);
    expect(markup).toContain("Export everything, import an export, delete everything");
  });

  it("is the island-free page it claims, so it needs no .app-island", async () => {
    expect(await htmlOnceResolved(<SettingsPage {...propsFor("en")} />)).not.toContain("app-island");
  });
});
