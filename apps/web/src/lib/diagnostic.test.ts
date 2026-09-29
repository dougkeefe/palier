import { describe, expect, it } from "vitest";

import { copyBundle, diagnosticBundle, pagePath, sanitiseError } from "./diagnostic";

/** The key-leak sentinel's shape (e2e/leak-guard.ts), and a sentence only a user would write. */
const KEY = "sk-palier-sentinel-5e17c0de9a1b4f6e8d2c7b3a";
const USER_TEXT = "Je voudrais rencontrer mon gestionnaire demain";
const CHUNK = "http://localhost:3100/_next/static/chunks/0abc123._.js:1:2345";
const MAC_CHROME = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36";

/** An error that carries the key and the user's words everywhere it can. */
const poisoned = (): Error & { digest: string } => {
  const error = new Error(`Invalid input: expected "${USER_TEXT}" with ${KEY}`) as Error & { digest: string };
  error.stack = [
    `Error: Invalid input: expected "${USER_TEXT}" with ${KEY}`,
    // A message line that imitates a frame, the key in its chunk's name.
    `and more (http://localhost:3100/_next/static/chunks/${KEY}.js:1:1)`,
    `    at assess (${CHUNK})`,
    `    at https://api.openai.com/v1/chat/completions?key=${KEY}:1:1`,
    `    at eval (webpack-internal:///(app-pages-browser)/./src/${USER_TEXT}.ts:3:9)`,
  ].join("\n");
  error.digest = KEY;
  return error;
};

describe("sanitiseError", () => {
  it("keeps the class name, a digest of digits, and the app's own chunk locations", () => {
    const error = new TypeError("anything") as TypeError & { digest: string };
    error.stack = `TypeError: anything\n    at f (${CHUNK})`;
    error.digest = "2345678901";

    expect(sanitiseError(error)).toEqual({ name: "TypeError", digest: "2345678901", frames: ["/_next/static/chunks/0abc123._.js:1:2345"] });
  });

  it("drops the message, and every frame outside the app's chunks", () => {
    const result = sanitiseError(poisoned());

    expect(result.frames).toEqual(["/_next/static/chunks/0abc123._.js:1:2345"]);
    expect(JSON.stringify(result)).not.toContain("Invalid input");
  });

  it("refuses a digest or a name that is not the shape Next and JavaScript give them", () => {
    const error = { name: `${USER_TEXT}!`, digest: KEY, stack: 42 };

    expect(sanitiseError(error)).toEqual({ name: "Error", digest: null, frames: [] });
  });

  it("reads anything thrown, not only an Error", () => {
    expect(sanitiseError(KEY)).toEqual({ name: "Error", digest: null, frames: [] });
    expect(sanitiseError(null)).toEqual({ name: "Error", digest: null, frames: [] });
  });

  it("reads Firefox's and Safari's frame lines too", () => {
    const stack = `render@${CHUNK}\nnotAFrame ${CHUNK}`;

    expect(sanitiseError({ name: "TypeError", stack }).frames).toEqual(["/_next/static/chunks/0abc123._.js:1:2345"]);
  });

  it("keeps at most ten frames", () => {
    const stack = Array.from({ length: 15 }, (_, i) => `    at f${String(i)} (/_next/static/chunks/a.js:1:${String(i)})`).join("\n");

    expect(sanitiseError({ name: "Error", stack }).frames).toHaveLength(10);
  });
});

describe("pagePath", () => {
  it("drops the query and the fragment, which can name a session or a run", () => {
    expect(pagePath("/en/practice/oral/report?session=01HSESSION#turn-3")).toBe("/en/practice/oral/report");
    expect(pagePath("/fr/home")).toBe("/fr/home");
  });
});

describe("diagnosticBundle", () => {
  const input = {
    build: "d9fbed6",
    bank: 3,
    userAgent: MAC_CHROME,
    path: "/en/practice/writing/workshop?prompt=x",
    at: new Date("2026-09-28T12:00:00.000Z"),
  };

  it("names the build, the bank, the browser, the page, the time and the error", () => {
    const error = new RangeError("anything") as RangeError & { digest: string };
    error.stack = `RangeError: anything\n    at f (${CHUNK})`;
    error.digest = "99";

    expect(diagnosticBundle({ ...input, error })).toBe(
      [
        "Palier diagnostic bundle",
        "Build: d9fbed6",
        "Bank: v3",
        "Browser: Chrome · macOS",
        "Page: /en/practice/writing/workshop",
        "Time: 2026-09-28T12:00:00.000Z",
        "Error: RangeError (digest 99)",
        "Stack:",
        "  /_next/static/chunks/0abc123._.js:1:2345",
      ].join("\n"),
    );
  });

  it("never carries the key or the user's words, wherever the error held them (tier 11)", () => {
    const bundle = diagnosticBundle({ ...input, path: `/en/home?q=${KEY}#${USER_TEXT}`, error: poisoned() });

    expect(bundle).not.toContain(KEY);
    expect(bundle).not.toContain(USER_TEXT);
    expect(bundle).not.toContain("api.openai.com");
  });

  it("says when the stack has nothing in the app's own code", () => {
    expect(diagnosticBundle({ ...input, error: "thrown" })).toContain("Error: Error\nStack: none in the app's own code");
  });
});

describe("copyBundle", () => {
  it("copies the text", async () => {
    const written: string[] = [];
    const clipboard = { writeText: (text: string) => Promise.resolve(void written.push(text)) };

    expect(await copyBundle(clipboard, "bundle")).toBe("copied");
    expect(written).toEqual(["bundle"]);
  });

  it("fails when the browser offers no clipboard", async () => {
    expect(await copyBundle(undefined, "bundle")).toBe("failed");
  });

  it("fails when the browser refuses the write", async () => {
    expect(await copyBundle({ writeText: () => Promise.reject(new Error("denied")) }, "bundle")).toBe("failed");
  });
});
