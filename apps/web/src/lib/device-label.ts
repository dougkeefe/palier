/**
 * The friendly label a device registers under (product-requirements.md §8.11: "a friendly
 * label per device"), read off the user agent: browser and system, joined by a middle
 * dot. That joiner is language-neutral on purpose. The label is stored once and shown on
 * every paired device in either language, so it holds only proper nouns (R8).
 */
const BROWSERS: readonly [RegExp, string][] = [
  [/Edg\//, "Edge"],
  [/OPR\/|Opera/, "Opera"],
  [/Firefox\/|FxiOS/, "Firefox"],
  [/Chrome\/|CriOS/, "Chrome"],
  [/Safari\//, "Safari"],
];

const SYSTEMS: readonly [RegExp, string][] = [
  [/iPhone|iPad|iPod/, "iOS"],
  [/Android/, "Android"],
  [/CrOS/, "ChromeOS"],
  [/Mac OS X|Macintosh/, "macOS"],
  [/Windows/, "Windows"],
  [/Linux/, "Linux"],
];

const first = (ua: string, table: readonly [RegExp, string][]): string | null =>
  table.find(([pattern]) => pattern.test(ua))?.[1] ?? null;

export const deviceLabel = (userAgent: string): string =>
  [first(userAgent, BROWSERS), first(userAgent, SYSTEMS)].filter((part) => part !== null).join(" · ") || "Web";
