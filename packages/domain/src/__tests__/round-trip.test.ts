import { describe, expect, it } from "vitest";

import {
  attemptSchema,
  examFormSchema,
  itemSchema,
  oralScenarioSchema,
  passageSchema,
} from "../index.js";
import {
  aValidAttempt,
  aValidExamForm,
  aValidItem,
  aValidOralScenario,
  aValidPassage,
} from "./fixtures.js";
import { readProfile } from "./read-profile.js";
import { examProfileSchema } from "../profile/schema.js";

/**
 * "JSON round trip for every domain object" (implementation-plan.md 6.2, tier
 * 2). It matters because the bank ships as static JSON, sync payloads are the
 * client's own record shapes (architecture.md 9.2), and export/import must give
 * a user back exactly what they had [R11].
 *
 * The subtlety this guards: a field set to an explicit `undefined` does not
 * survive `JSON.stringify` and comes back absent, so a type whose optional
 * fields are written as `undefined` rather than omitted would fail here. The
 * fixtures omit; this asserts that they must.
 */
const cases = [
  ["item", itemSchema, aValidItem()],
  ["passage", passageSchema, aValidPassage()],
  ["oral scenario", oralScenarioSchema, aValidOralScenario()],
  ["exam form", examFormSchema, aValidExamForm()],
  ["attempt", attemptSchema, aValidAttempt()],
] as const;

describe.each(cases)("%s", (_name, schema, fixture) => {
  it("survives JSON serialisation unchanged", () => {
    expect(JSON.parse(JSON.stringify(fixture))).toEqual(fixture);
  });

  it("still validates after a round trip", () => {
    expect(schema.safeParse(JSON.parse(JSON.stringify(fixture))).success).toBe(true);
  });

  it("parses to the same value it serialised from", () => {
    const parsed = schema.parse(fixture);
    expect(JSON.parse(JSON.stringify(parsed))).toEqual(fixture);
  });
});

describe("exam profile", () => {
  it("survives JSON serialisation unchanged", () => {
    const profile = readProfile();
    expect(JSON.parse(JSON.stringify(profile))).toEqual(profile);
  });

  it("parses to the same value it serialised from", () => {
    const parsed = examProfileSchema.parse(readProfile());
    expect(JSON.parse(JSON.stringify(parsed))).toEqual(readProfile());
  });
});
