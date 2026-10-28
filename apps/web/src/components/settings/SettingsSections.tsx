import { useTranslations } from "next-intl";

import {
  SETTINGS_SECTIONS,
  type SettingsScreen,
  type SettingsSection,
  sectionId,
} from "../../features/settings/settings-sections";

/**
 * "On this page" at the top of a settings screen (progress.md D266): a link to each of its sections, on a smaller pill
 * track than the settings menu above it. Plain fragment links, since each is a place on this page, so none is ever
 * `aria-current`. Each island renders it first once loaded, so a link never points at a card not yet drawn.
 */
export function SettingsSections({ screen }: { readonly screen: SettingsScreen }) {
  const t = useTranslations("settings");
  const sections: readonly SettingsSection<SettingsScreen>[] = SETTINGS_SECTIONS[screen];

  return (
    <nav className="app-settings-sections" aria-label={t("sectionsLabel")}>
      {sections.map((section) => (
        <a key={section} href={`#${sectionId(screen, section)}`} className="app-settings-sections__link pl-focusable">
          {t(`sections.${screen}.${section}`)}
        </a>
      ))}
    </nav>
  );
}
