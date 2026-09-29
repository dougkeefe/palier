import { deviceLabel } from "./device-label";

/**
 * The client diagnostic bundle (architecture.md §16, ADR 15, progress.md D141): what an
 * error screen offers to copy, and what its prefilled issue carries. The user sees all of
 * it before anything leaves the device, and nothing leaves unless they send it themselves.
 *
 * **It carries no free text at all**, which is stronger than redacting it. An error's
 * message can hold anything: a Zod error quotes the value it refused, a network error the
 * URL it called, and either could be the user's writing, a transcript or the key. So the
 * message is dropped whole. What is kept is chosen by shape, never by filtering:
 * - the error's `name`, only if it looks like a class name;
 * - Next's `digest`, only if it is digits, as Next writes it;
 * - the stack's locations inside the app's own chunks (`/_next/static/…:line:col`), read
 *   only from frame lines (V8's `at …`, or Firefox's and Safari's `name@url`), and only after
 *   the stack's own `name: message` header is cut away, so a message that imitates a frame,
 *   however many lines it runs to, is still dropped. Nothing else from the stack is kept.
 * Around that go the build, the bank, the browser's family and system (the label a device
 * pairs under), the page's path without its query or fragment, and the time.
 *
 * The bundle is written in English, like the item-report issue: it is addressed to the
 * maintainers, and the screen around it explains it in the user's language.
 */

export type SanitisedError = {
  readonly name: string;
  readonly digest: string | null;
  readonly frames: readonly string[];
};

const NAME = /^[A-Za-z][A-Za-z0-9_]{0,63}$/;
const DIGEST = /^\d{1,20}$/;
const FRAME = /\/_next\/static\/[A-Za-z0-9._\-/]+:\d+:\d+/g;
/** A stack line that is a frame: V8's `    at …`, or Firefox's and Safari's `name@url`. */
const FRAME_LINE = /^\s+at\s|^[^\s@"'`]*@\S+:\d+:\d+$/;
const MAX_FRAMES = 10;

const field = (error: unknown, key: string): unknown =>
  typeof error === "object" && error !== null ? (error as Record<string, unknown>)[key] : undefined;

/**
 * The stack without V8's header, which repeats the name and the whole message, a multi-line one
 * included. Firefox and Safari write no header, so their stacks start with the first frame.
 */
const framesPart = (stack: string, name: unknown, message: unknown): string => {
  const title = typeof name === "string" ? name : "Error";
  const text = typeof message === "string" ? message : "";
  const header = text === "" ? title : `${title}: ${text}`;
  return stack.startsWith(header) ? stack.slice(header.length) : stack;
};

/** The error, reduced to what cannot carry user text. Pure. */
export const sanitiseError = (error: unknown): SanitisedError => {
  const name = field(error, "name");
  const digest = field(error, "digest");
  const raw = field(error, "stack");
  const stack = typeof raw === "string" ? framesPart(raw, name, field(error, "message")) : raw;
  return {
    name: typeof name === "string" && NAME.test(name) ? name : "Error",
    digest: typeof digest === "string" && DIGEST.test(digest) ? digest : null,
    frames:
      typeof stack === "string"
        ? stack
            .split("\n")
            .filter((line) => FRAME_LINE.test(line))
            .flatMap((line) => line.match(FRAME) ?? [])
            .slice(0, MAX_FRAMES)
        : [],
  };
};

/** A path with its query and fragment removed: a query can name a session or a run. */
export const pagePath = (path: string): string => path.split(/[?#]/, 1)[0] ?? "";

export type DiagnosticInput = {
  readonly build: string;
  readonly bank: number;
  readonly userAgent: string;
  readonly path: string;
  readonly at: Date;
  readonly error: unknown;
};

/** The bundle, as the text the screen shows and copies. Pure. */
export const diagnosticBundle = (input: DiagnosticInput): string => {
  const error = sanitiseError(input.error);
  return [
    "Palier diagnostic bundle",
    `Build: ${input.build}`,
    `Bank: v${String(input.bank)}`,
    `Browser: ${deviceLabel(input.userAgent)}`,
    `Page: ${pagePath(input.path)}`,
    `Time: ${input.at.toISOString()}`,
    `Error: ${error.name}${error.digest === null ? "" : ` (digest ${error.digest})`}`,
    ...(error.frames.length === 0 ? ["Stack: none in the app's own code"] : ["Stack:", ...error.frames.map((frame) => `  ${frame}`)]),
  ].join("\n");
};

export type CopyResult = "copied" | "failed";

/**
 * Copy the bundle. `failed` when the browser offers no clipboard or refuses the write (an
 * insecure origin, a denied permission); the screen then says to select the text shown.
 */
export const copyBundle = async (clipboard: Pick<Clipboard, "writeText"> | undefined, text: string): Promise<CopyResult> => {
  if (clipboard === undefined) return "failed";
  try {
    await clipboard.writeText(text);
    return "copied";
  } catch {
    return "failed";
  }
};
