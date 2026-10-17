import { elapsedText } from "../writing/workshop-view";

/**
 * A slow wait's decisions (progress.md D237), kept out of the `.tsx` so each is tested: the time
 * waited as the screen shows it, the whole minutes a screen reader hears, and when to say the
 * wait is taking longer than the minute the screens promise.
 */

/** Past this, the wait has outrun "This can take up to a minute", so the screen says so. */
export const SLOW_WAIT_MS = 60_000;

export type WaitView = {
  /** `m:ss`, ticking every second; shown and never announced. */
  readonly elapsed: string;
  /** Whole minutes waited, which change once a minute: what a screen reader hears, from the first. */
  readonly minutes: number;
  readonly slow: boolean;
};

export const waitView = (elapsedMs: number): WaitView => {
  const ms = Math.max(0, elapsedMs);
  return { elapsed: elapsedText(ms), minutes: Math.floor(ms / 60_000), slow: ms >= SLOW_WAIT_MS };
};
