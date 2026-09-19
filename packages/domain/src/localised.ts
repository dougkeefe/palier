/**
 * Both official languages, always. [R8] requires equal prominence, and the
 * content validator fails on a missing locale rather than falling back
 * (architecture.md 5.1).
 */
export type Localised = {
  readonly en: string;
  readonly fr: string;
};

/** The same, where light markdown is permitted (a stem, a passage body). */
export type LocalisedRich = Localised;
