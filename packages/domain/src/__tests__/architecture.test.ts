import { describe, expect, it } from "vitest";

import { ITEM_TYPES } from "../skills.js";
import { ITEM_TYPE_DEFINITIONS } from "../item-types/registry.js";

/**
 * The architecture test implementation-plan.md §4.5 names. It asserts every item
 * type in the registry carries all of its members plus its a11y contract, so a
 * type added to the union without a full definition fails here rather than at
 * runtime in a session.
 *
 * "Five members plus the a11y contract" is `schema`, `render`, `score`,
 * `validate`, `generatePrompt`. Four of the five live in `@palier/domain` and
 * are checked below; `render` lives in `@palier/ui` as `itemRenderers`, so the
 * fifth member and the two maps' agreement are asserted in the composition root
 * (`apps/web/src/lib/item-types.test.ts`) — the only place that may see both
 * packages (ADR 17, §3.1).
 */
describe("item type registry (§4.5)", () => {
  it("registers exactly the item types in the union, no more and no fewer", () => {
    expect(Object.keys(ITEM_TYPE_DEFINITIONS).sort()).toEqual([...ITEM_TYPES].sort());
  });

  it("gives every item type all four domain-side members and an a11y contract", () => {
    for (const type of ITEM_TYPES) {
      const def = ITEM_TYPE_DEFINITIONS[type];
      expect(typeof def.schema.safeParse).toBe("function");
      expect(typeof def.score).toBe("function");
      expect(typeof def.validate).toBe("function");
      expect(typeof def.generatePrompt).toBe("function");
      expect(def.a11yContract.role).toBe("radiogroup");
      expect(def.a11yContract.optionRole).toBe("radio");
      expect(typeof def.a11yContract.requiresPassage).toBe("boolean");
    }
  });
});
