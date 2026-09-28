/**
 * The microphone's decisions (product-requirements.md §14 "Mic permission denied", architecture.md
 * §8.5 step 1; progress.md D119), kept out of the `.tsx` so each is tested.
 */

/** Where the microphone check stands. */
export type MicState = "idle" | "listening" | "ok" | "quiet" | "denied" | "no-mic" | "unsupported" | "failed";

/**
 * Why the microphone could not be opened, from `getUserMedia`'s error, compared by name. A refusal
 * (the user's or a policy's) is `denied`; no device, or none that fits, is `no-mic`; a browser with
 * no `mediaDevices` at all (an insecure origin, an old browser) throws a `TypeError`, `unsupported`.
 */
export const micFailure = (error: unknown): Extract<MicState, "denied" | "no-mic" | "unsupported" | "failed"> => {
  const name = error instanceof Error ? error.name : "";
  if (name === "NotAllowedError" || name === "SecurityError") return "denied";
  if (name === "NotFoundError" || name === "OverconstrainedError") return "no-mic";
  if (name === "TypeError") return "unsupported";
  return "failed";
};

/**
 * Below this level, as the loudest root-mean-square sample of the three-second check, the
 * microphone heard next to nothing: it may be muted, or the wrong one. A product threshold, not an
 * exam rule (ADR 9). Speech at a normal distance reads well above it.
 */
export const QUIET_LEVEL = 0.01;

/** The level check's verdict (§8.5 step 1): heard, or next to nothing. */
export const levelVerdict = (peak: number): "ok" | "quiet" => (peak >= QUIET_LEVEL ? "ok" : "quiet");

/** How long the level check listens (§8.5 step 1: "a 3 second level check"). */
export const LEVEL_CHECK_MS = 3_000;

export type BrowserFamily = "edge" | "chrome" | "firefox" | "safari" | "other";

/** The browser, from its user agent, for recovery steps that name its own menus. Edge says Chrome too, so it is first. */
export const browserFamily = (userAgent: string): BrowserFamily => {
  if (/Edg\//u.test(userAgent)) return "edge";
  if (/Firefox\//u.test(userAgent)) return "firefox";
  if (/Chrome\/|CriOS\//u.test(userAgent)) return "chrome";
  if (/Safari\//u.test(userAgent)) return "safari";
  return "other";
};

/** The recovery steps for a refused microphone, as message keys in the `oral` namespace, in order. */
export const recoverySteps = (family: BrowserFamily): readonly string[] => {
  const count = family === "other" ? 2 : 3;
  return Array.from({ length: count }, (_, i) => `micSteps_${family}_${String(i + 1)}`);
};
