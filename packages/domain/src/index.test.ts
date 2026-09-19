import { describe, expect, it } from "vitest";

import * as domain from "./index.js";

/**
 * Trivial in what it asserts, real in what it proves: that a test resolves a
 * sibling module through a `.js` specifier under NodeNext, which is the
 * assumption every later test in this repository rests on (AGENTS.md).
 */
describe("@palier/domain public surface", () => {
  it("resolves its own modules through .js specifiers under NodeNext", () => {
    expect(domain).toBeTypeOf("object");
  });

  it("exposes no default export", () => {
    expect(domain).not.toHaveProperty("default");
  });
});
