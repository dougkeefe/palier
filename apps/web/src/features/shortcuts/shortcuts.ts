import { type KeyPress, type KeyTarget, isChord, typedIntoField } from "../../lib/keyboard";

/**
 * The shortcut sheet's content (product-requirements.md §11, "a documented shortcut sheet at
 * `?`"), as data: each screen's keys and what they do. A screen that gains a key registers a
 * row here; the sheet renders whatever is registered. The drill's and the exam's keys are the
 * ones their handlers act on (`PracticeSession`, `ExamRunner`); the option keys are
 * `@palier/ui`'s `optionRowKeydown`. The digits read "1 to 4" because every item has four
 * options, as the screens' own hints say.
 *
 * Key names, not key labels: the label is a message (`shortcuts.key_*`), so French reads
 * "Entrée" where English reads "Enter".
 */

export const SHORTCUT_SCOPES = ["everywhere", "options", "drill", "exam"] as const;
export type ShortcutScope = (typeof SHORTCUT_SCOPES)[number];

export type ShortcutKey = "question" | "escape" | "digits" | "enter" | "space" | "arrows" | "homeEnd" | "f";

export type Shortcut = {
  readonly scope: ShortcutScope;
  readonly keys: readonly ShortcutKey[];
  /** Its `shortcuts.*` message: what the keys do. */
  readonly does: string;
};

export const SHORTCUTS: readonly Shortcut[] = [
  { scope: "everywhere", keys: ["question"], does: "doesOpen" },
  { scope: "everywhere", keys: ["escape"], does: "doesClose" },
  { scope: "options", keys: ["arrows"], does: "doesMove" },
  { scope: "options", keys: ["homeEnd"], does: "doesEnds" },
  { scope: "options", keys: ["space", "enter"], does: "doesChooseFocused" },
  { scope: "drill", keys: ["digits"], does: "doesChoose" },
  { scope: "drill", keys: ["enter"], does: "doesConfirm" },
  { scope: "exam", keys: ["digits"], does: "doesChoose" },
  { scope: "exam", keys: ["enter"], does: "doesNext" },
  { scope: "exam", keys: ["f"], does: "doesFlag" },
];

/** The registered shortcuts by scope, in the sheet's order, leaving out a scope with none. */
export const shortcutGroups = (
  shortcuts: readonly Shortcut[] = SHORTCUTS,
): readonly { readonly scope: ShortcutScope; readonly shortcuts: readonly Shortcut[] }[] =>
  SHORTCUT_SCOPES.map((scope) => ({ scope, shortcuts: shortcuts.filter((s) => s.scope === scope) })).filter(
    (group) => group.shortcuts.length > 0,
  );

/**
 * Whether a key press opens the sheet: `?`, however the layout makes it (Shift is not a
 * chord), not typed into a field, and not while another dialog is open, where the page
 * behind is inert and a second modal would stack on the first.
 */
export const shouldOpenSheet = (event: KeyPress, target: KeyTarget | null, dialogOpen: boolean): boolean =>
  event.key === "?" && !isChord(event) && !typedIntoField(target) && !dialogOpen;
