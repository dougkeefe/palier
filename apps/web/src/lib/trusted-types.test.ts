import { describe, expect, it } from "vitest";

import { TRUSTED_TYPES_SCRIPT, type TrustedTypesWindow, installTrustedTypesPolicy } from "./trusted-types";

type Rules = { createScriptURL(input: string): string };

/** A window with Trusted Types, recording the policies created on it. */
function fakeWindow(options: { defaultPolicy?: unknown; supported?: boolean } = {}) {
  const created: { name: string; rules: Rules }[] = [];
  const win: TrustedTypesWindow = {
    location: { href: "https://palier.example/en/home", origin: "https://palier.example" },
    ...(options.supported === false
      ? {}
      : {
          trustedTypes: {
            defaultPolicy: options.defaultPolicy ?? null,
            createPolicy(name: string, rules: Rules) {
              created.push({ name, rules });
              return {};
            },
          },
        }),
  };
  return { win, created };
}

function installedRules(): Rules {
  const { win, created } = fakeWindow();
  installTrustedTypesPolicy(win);
  const [policy] = created;
  if (policy === undefined) throw new Error("no policy");
  return policy.rules;
}

describe("installTrustedTypesPolicy", () => {
  it("creates one policy, named default, so every sink write goes through it", () => {
    const { win, created } = fakeWindow();
    installTrustedTypesPolicy(win);
    expect(created.map((p) => p.name)).toEqual(["default"]);
  });

  it("offers no HTML or script factory, so innerHTML, eval and Function stay refused", () => {
    expect(Object.keys(installedRules())).toEqual(["createScriptURL"]);
  });

  it("does nothing in a browser without Trusted Types", () => {
    const { win, created } = fakeWindow({ supported: false });
    expect(() => installTrustedTypesPolicy(win)).not.toThrow();
    expect(created).toEqual([]);
  });

  it("does not try to create a second default policy", () => {
    const { win, created } = fakeWindow({ defaultPolicy: {} });
    installTrustedTypesPolicy(win);
    expect(created).toEqual([]);
  });
});

describe("the default policy's script URLs", () => {
  const rules = installedRules();

  it("allows this origin's bundler chunks, relative or absolute, exactly as given, which is how Turbopack finds them again", () => {
    expect(rules.createScriptURL("/_next/static/chunks/abc.js")).toBe("/_next/static/chunks/abc.js");
    expect(rules.createScriptURL("https://palier.example/_next/static/chunks/abc.js")).toBe(
      "https://palier.example/_next/static/chunks/abc.js",
    );
  });

  it("allows the service worker's registration", () => {
    expect(rules.createScriptURL("/sw.js")).toBe("/sw.js");
  });

  it("refuses a chunk path on another origin", () => {
    expect(() => rules.createScriptURL("https://attacker.example/_next/static/chunks/abc.js")).toThrow(TypeError);
  });

  it("refuses any other path on this origin, such as an API route or a bank file", () => {
    expect(() => rules.createScriptURL("/api/sync")).toThrow(/script URL refused/);
    expect(() => rules.createScriptURL("/content/bank/v3/manifest.json")).toThrow(TypeError);
    expect(() => rules.createScriptURL("/sw.js.map")).toThrow(TypeError);
  });

  it("refuses a data: or blob: script", () => {
    expect(() => rules.createScriptURL("data:text/javascript,alert(1)")).toThrow(TypeError);
    expect(() => rules.createScriptURL("blob:https://palier.example/1234")).toThrow(TypeError);
  });
});

describe("TRUSTED_TYPES_SCRIPT", () => {
  it("is the installer, self-contained, run against window", () => {
    const { win, created } = fakeWindow();
    new Function("window", TRUSTED_TYPES_SCRIPT)(win);

    expect(created.map((p) => p.name)).toEqual(["default"]);
    expect(created[0]?.rules.createScriptURL("/sw.js")).toBe("/sw.js");
    expect(() => created[0]?.rules.createScriptURL("https://attacker.example/x.js")).toThrow(TypeError);
  });
});
