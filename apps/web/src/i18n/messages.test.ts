import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import { routing } from "./routing";

/**
 * The i18n key-parity gate [R8, product-requirements.md §12]: "a key present in
 * one locale file and missing from the other" must fail the build. This is the
 * fast-lane half of tier 8; the no-hardcoded-string-in-JSX half is already
 * enforced by the `NO_JSX_LITERALS` ESLint rule.
 */

type Json = string | number | boolean | null | { [k: string]: Json } | Json[];

const load = (locale: string): Record<string, Json> =>
  JSON.parse(
    readFileSync(
      fileURLToPath(new URL(`../../messages/${locale}.json`, import.meta.url)),
      "utf8",
    ),
  ) as Record<string, Json>;

/** Every leaf key path, e.g. "footer.nonAffiliation", sorted. */
const keyPaths = (value: Json, prefix = ""): string[] => {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    return [prefix];
  }
  return Object.keys(value)
    .flatMap((k) => keyPaths((value as Record<string, Json>)[k]!, prefix ? `${prefix}.${k}` : k))
    .sort();
};

const messages = Object.fromEntries(
  routing.locales.map((locale) => [locale, load(locale)] as const),
);

describe("message files", () => {
  it("cover exactly the two configured locales", () => {
    expect(Object.keys(messages).sort()).toEqual([...routing.locales].sort());
  });

  it("hold identical key paths across en and fr", () => {
    const [en, fr] = [keyPaths(messages.en!), keyPaths(messages.fr!)];
    expect(fr).toEqual(en);
  });

  it("carry a non-empty string at every leaf, in both locales", () => {
    for (const locale of routing.locales) {
      const tree = messages[locale]!;
      for (const path of keyPaths(tree)) {
        const value = path
          .split(".")
          .reduce<Json>((node, k) => (node as Record<string, Json>)[k]!, tree);
        expect(typeof value, `${locale}:${path}`).toBe("string");
        expect((value as string).trim().length, `${locale}:${path}`).toBeGreaterThan(0);
      }
    }
  });

  it("keep ICU placeholders balanced in both locales", () => {
    for (const locale of routing.locales) {
      const tree = messages[locale]!;
      for (const path of keyPaths(tree)) {
        const value = path
          .split(".")
          .reduce<Json>((node, k) => (node as Record<string, Json>)[k]!, tree) as string;
        let depth = 0;
        for (const ch of value) {
          if (ch === "{") depth += 1;
          if (ch === "}") depth -= 1;
          expect(depth, `${locale}:${path}`).toBeGreaterThanOrEqual(0);
        }
        expect(depth, `${locale}:${path}`).toBe(0);
      }
    }
  });
});

describe("the oral report's figures, in each locale's own format (D127)", () => {
  it("writes a pause with the locale's decimal mark: 1.5 s in English, 1,5 s in French", async () => {
    const { createTranslator } = await import("next-intl");
    const say = (locale: "en" | "fr") =>
      createTranslator({ locale, messages: load(locale) as never, namespace: "oralReport" as never }) as unknown as (
        key: string,
        values: Record<string, number>,
      ) => string;
    expect(say("en")("pauseValue", { seconds: 1.5 })).toBe("1.5 s");
    expect(say("fr")("pauseValue", { seconds: 1.5 })).toBe("1,5 s");
    expect(say("fr")("wordsPerMinuteValue", { count: 1234 })).toBe("1 234");
  });
});
