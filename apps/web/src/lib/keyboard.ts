/**
 * The guards every page-wide key handler shares (product-requirements.md §11: "full keyboard
 * operation … with a documented shortcut sheet at `?`"). The drill, the exam runner and the
 * shortcut sheet each listen on `window`, so each must leave alone what is not theirs:
 * - a **chord** or a held key: Ctrl+F searches the passage, Cmd+1 switches tabs, and a key
 *   held down repeats. None is an answer, a flag or a request for help;
 * - a key **typed into a field**: a digit in the pair-code box is not a choice;
 * - **Enter on a real button or link**, which is that control's own click. Handling it as well
 *   would act twice. An option is a `<button role="radio">`, and Enter there is the page's.
 *
 * Structural types rather than DOM ones, so the rules are tested without a document.
 */

export type KeyTarget = {
  readonly tagName: string;
  readonly isContentEditable: boolean;
  getAttribute(name: string): string | null;
};

export type KeyPress = {
  readonly key: string;
  readonly metaKey: boolean;
  readonly ctrlKey: boolean;
  readonly altKey: boolean;
  readonly repeat: boolean;
};

export const isChord = (event: KeyPress): boolean => event.metaKey || event.ctrlKey || event.altKey || event.repeat;

export const typedIntoField = (target: KeyTarget | null): boolean =>
  target !== null && (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.tagName === "SELECT" || target.isContentEditable);

export const enterIsControlsOwn = (key: string, target: KeyTarget | null): boolean =>
  key === "Enter" &&
  target !== null &&
  (target.tagName === "BUTTON" || target.tagName === "A") &&
  target.getAttribute("role") !== "radio";

/** A page-wide handler's single question: is this key press the page's to act on? */
export const isPageKey = (event: KeyPress, target: KeyTarget | null): boolean =>
  !isChord(event) && !typedIntoField(target) && !enterIsControlsOwn(event.key, target);
