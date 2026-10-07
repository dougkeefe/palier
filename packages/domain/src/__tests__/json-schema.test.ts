import { describe, expect, it } from "vitest";
import * as z from "zod";

import { CONTENT_SCHEMAS } from "../schemas/index.js";

/**
 * Generates `docs/schemas/*.schema.json` **and** guards it against drift, in
 * one mechanism.
 *
 * A separate generator script would need a TypeScript runner in a repository
 * that pins everything, plus its own "did you forget to regenerate?" check.
 * `toMatchFileSnapshot` gives both inside a gate that already runs. To
 * regenerate after changing a schema: `pnpm run test -u`.
 *
 * These are the plain shapes, not the `.readonly()` exports, so the published
 * documents describe the artefact rather than stamping `"readOnly": true` on it.
 */
describe("the published JSON Schemas", () => {
  it.each(Object.entries(CONTENT_SCHEMAS))(
    "docs/schemas/%s.schema.json matches its Zod schema",
    async (name, schema) => {
      const json = z.toJSONSchema(schema, {
        target: "draft-2020-12",
        io: "input",
      });

      await expect(`${JSON.stringify(json, null, 2)}\n`).toMatchFileSnapshot(
        `../../../../docs/schemas/${name}.schema.json`,
      );
    },
  );

  it("publishes a schema for every content artefact, so none can be added quietly", () => {
    expect(Object.keys(CONTENT_SCHEMAS).sort()).toEqual([
      "attempt",
      "exam-form",
      "exam-profile",
      "item",
      "library-article",
      "oral-fillers",
      "oral-scenario",
      "passage",
      "pointer",
      "writing-prompt",
    ]);
  });
});
