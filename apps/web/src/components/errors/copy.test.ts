import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import { globalErrorCopyOf } from "../../../scripts/prepare-public.mjs";
import { errorCopyOf, globalErrorCopyFor, localeOfPath } from "./copy";

const WEB_ROOT = join(dirname(fileURLToPath(import.meta.url)), "../../..");
const read = (path: string) => readFileSync(join(WEB_ROOT, path), "utf8");
const messages = (locale: string) => JSON.parse(read(`messages/${locale}.json`)) as { errors: Record<string, string> };

describe("global-error-copy.json", () => {
  it("is exactly the messages' errors namespace in each locale, as prepare-public writes it (D141)", () => {
    // If this fails, run `pnpm --filter @palier/web dev` or `build` once: prepare-public rewrites the file.
    expect(read("src/components/errors/global-error-copy.json")).toBe(globalErrorCopyOf({ en: messages("en"), fr: messages("fr") }));
  });
});

describe("globalErrorCopyOf", () => {
  it("refuses a message file with no errors namespace", () => {
    expect(() => globalErrorCopyOf({ en: {} })).toThrow(/messages\/en.json has no errors namespace/);
  });
});

describe("errorCopyOf", () => {
  const lookup = (key: string) => `<${key}>`;

  it("titles a route's error with the route's words", () => {
    expect(errorCopyOf(lookup, "route")).toMatchObject({ title: "<routeTitle>", body: "<routeBody>", retry: "<retry>" });
  });

  it("titles the global error with its own words, and shares the rest", () => {
    expect(errorCopyOf(lookup, "global")).toMatchObject({ title: "<globalTitle>", body: "<globalBody>", openIssue: "<openIssue>" });
  });
});

describe("localeOfPath", () => {
  it("reads the locale a path is routed under", () => {
    expect(localeOfPath("/fr/practice/oral")).toBe("fr");
    expect(localeOfPath("/en/home")).toBe("en");
  });

  it("falls back to English for any other path, or none", () => {
    expect(localeOfPath("/")).toBe("en");
    expect(localeOfPath("/frites")).toBe("en");
    expect(localeOfPath(null)).toBe("en");
  });
});

describe("globalErrorCopyFor", () => {
  it("speaks each locale's words", () => {
    expect(globalErrorCopyFor("en").title).toBe(messages("en").errors.globalTitle);
    expect(globalErrorCopyFor("fr").title).toBe(messages("fr").errors.globalTitle);
  });
});
