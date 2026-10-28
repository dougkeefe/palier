import type { SETTINGS_ITEMS } from "./settings-nav";

export type SettingsScreen = (typeof SETTINGS_ITEMS)[number]["key"];

/**
 * The sections of each settings screen (progress.md D266), in the order the screen shows them: the "On this page" row at
 * the top of each screen links to each by its id. A new card on a settings screen is an entry here and
 * `id={sectionId(screen, section)}` on the card. Sync's unheaded card, the export reminder beside its danger zone, is
 * not a section of its own.
 */
export const SETTINGS_SECTIONS = {
  levels: ["results", "targets", "goal"],
  key: ["entry", "where", "realtime", "spend", "cap", "features"],
  data: ["export", "import", "telemetry", "oral", "delete"],
  sync: ["switch", "status", "what", "devices", "add", "join", "danger"],
} as const satisfies Record<SettingsScreen, readonly string[]>;

export type SettingsSection<S extends SettingsScreen> = (typeof SETTINGS_SECTIONS)[S][number];

/** A section's element id, stable rather than `useId`'s, so the row and the card agree and a spec can find it. */
export const sectionId = <S extends SettingsScreen>(screen: S, section: SettingsSection<S>): string =>
  `settings-${screen}-${section}`;
