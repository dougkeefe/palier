import * as z from "zod";

import { BAND_RANK, BANDS, bandRank } from "../bands.js";
import { SKILLS } from "../skills.js";
import { SUB_SKILLS_BY_SKILL } from "../sub-skills.js";
import { TOPICS } from "../topics.js";
import {
  bandSchema,
  examModeSchema,
  localisedSchema,
  scoredSkillSchema,
  skillSchema,
  subSkillSchema,
  topicSchema,
} from "../schemas/primitives.js";

const cutRangeShape = z
  .tuple([z.number().int().nonnegative(), z.number().int().nonnegative()])
  .check((ctx) => {
    const [min, max] = ctx.value;
    if (min > max) {
      ctx.issues.push({
        code: "custom",
        input: ctx.value,
        path: [],
        message: `A cut range runs from min to max, but this one is [${min}, ${max}].`,
      });
    }
  });

const examVariantShape = z
  .strictObject({
    skill: scoredSkillSchema,
    mode: examModeSchema,
    testNumbers: z.array(z.string().min(1)),
    items: z.number().int().positive(),
    scored: z.number().int().positive(),
    minutes: z.number().int().positive(),
    cuts: z.partialRecord(bandSchema, cutRangeShape),
  })
  .check((ctx) => {
    const variant = ctx.value;
    const push = (message: string, path: PropertyKey[] = ["cuts"]): void => {
      ctx.issues.push({ code: "custom", input: variant, path, message });
    };

    // The difference between administered and scored is the pilot set. Assert
    // the relation rather than the constant 10, so a PSC change to the pilot
    // count is a data edit and not a code change (ADR 9).
    if (variant.scored > variant.items) {
      push(
        `A variant cannot score more items (${variant.scored}) than it administers (${variant.items}).`,
        ["scored"],
      );
    }

    const entries = Object.entries(variant.cuts) as [
      keyof typeof BAND_RANK,
      readonly [number, number],
    ][];

    if (entries.length === 0) {
      push("A variant with no cut table cannot be scored.");
      return;
    }

    const ordered = [...entries].sort((a, b) => bandRank(a[0]) - bandRank(b[0]));

    /**
     * The check the band mapping property test depends on, and the one that
     * catches a typo the day someone edits this file: the ranges must exactly
     * partition [0, scored] with no gap and no overlap, in band-rank order.
     */
    const first = ordered[0];
    if (first !== undefined && first[1][0] !== 0) {
      push(
        `The lowest band on this variant starts at ${first[1][0]}, so raw scores 0 to ${first[1][0] - 1} map to no band at all.`,
      );
    }

    let previous: (typeof ordered)[number] | null = null;
    for (const current of ordered) {
      if (previous !== null) {
        const expected = previous[1][1] + 1;
        if (current[1][0] !== expected) {
          push(
            current[1][0] > expected
              ? `Raw scores ${expected} to ${current[1][0] - 1} are covered by no band: ${previous[0]} ends at ${previous[1][1]} and ${current[0]} starts at ${current[1][0]}.`
              : `Bands ${previous[0]} and ${current[0]} overlap: ${previous[0]} ends at ${previous[1][1]} and ${current[0]} starts at ${current[1][0]}.`,
          );
        }
      }
      previous = current;
    }

    const last = ordered[ordered.length - 1];
    if (last !== undefined && last[1][1] !== variant.scored) {
      push(
        `The cut table tops out at ${last[1][1]} but this variant has ${variant.scored} scored items, so a perfect score maps to no band.`,
      );
    }
  });

const oralFormatShape = z.strictObject({
  bands: z.array(bandSchema).min(1),
  minutes: cutRangeShape,
  validityYears: z.number().int().positive(),
  minimumDaysBetweenAttempts: z.number().int().positive(),
  // Not `.optional()`: the absence of a cut table for oral is a fact about the
  // exam, stated explicitly, not a field someone forgot (ADR 9).
  cuts: z.null(),
  descriptors: z.strictObject({
    A: localisedSchema,
    B: localisedSchema,
    C: localisedSchema,
  }),
});

export const examProfileShape = z
  .strictObject({
    id: z.string().min(1),
    version: z.number().int().positive(),
    skills: z.array(skillSchema).min(1),
    bands: z.array(bandSchema).min(1),
    variants: z.record(z.string().min(1), examVariantShape),
    subSkills: z.strictObject({
      reading: z.array(subSkillSchema).min(1),
      writing: z.array(subSkillSchema).min(1),
      oral: z.array(subSkillSchema).min(1),
    }),
    topics: z.array(topicSchema).min(1),
    oral: oralFormatShape,
    leitnerIntervalDays: z.array(z.number().int().positive()),
  })
  .check((ctx) => {
    const profile = ctx.value;
    const push = (path: PropertyKey[], message: string): void => {
      ctx.issues.push({ code: "custom", input: profile, path, message });
    };

    if (Object.keys(profile.variants).length === 0) {
      push(["variants"], "A profile with no variants cannot score a mock exam.");
    }

    // Every band a variant uses must be declared at the profile level.
    for (const [name, variant] of Object.entries(profile.variants)) {
      for (const band of Object.keys(variant.cuts)) {
        if (!profile.bands.includes(band as (typeof BANDS)[number])) {
          push(
            ["variants", name, "cuts", band],
            `Variant "${name}" uses band ${band}, which this profile does not declare in "bands".`,
          );
        }
      }
    }

    const byRank = [...profile.bands].sort((a, b) => bandRank(a) - bandRank(b));
    if (profile.bands.join() !== byRank.join()) {
      push(
        ["bands"],
        `Bands must be listed lowest to highest (${byRank.join(", ")}). Ordering them any other way invites an alphabetical sort somewhere downstream, which puts E below X.`,
      );
    }

    // Four numbers, strictly increasing. Five Leitner boxes, and box 5 is
    // retirement from the queue, so it needs no interval (ADR 8).
    if (profile.leitnerIntervalDays.length !== 4) {
      push(
        ["leitnerIntervalDays"],
        `Expected exactly four intervals, for Leitner boxes 1 to 4; box 5 is retirement and needs none (ADR 8). Got ${profile.leitnerIntervalDays.length}.`,
      );
    }
    for (let i = 1; i < profile.leitnerIntervalDays.length; i += 1) {
      const previous = profile.leitnerIntervalDays[i - 1];
      const current = profile.leitnerIntervalDays[i];
      if (previous !== undefined && current !== undefined && current <= previous) {
        push(
          ["leitnerIntervalDays", i],
          `Leitner intervals must increase: box ${i + 1} waits ${current} days, which is not longer than box ${i}'s ${previous}.`,
        );
      }
    }

    // The profile's taxonomy is authoritative (ADR 9), but it must not name a
    // sub-skill the code has no union member for, or items become untaggable.
    for (const skill of SKILLS) {
      const declared = profile.subSkills[skill];
      const known: readonly string[] = SUB_SKILLS_BY_SKILL[skill];

      /**
       * `subSkillSchema` already rejects a name that is in no taxonomy, so the
       * defect left to catch is a real sub-skill filed under the wrong skill —
       * "main-idea" listed under writing, say. That one type-checks, validates,
       * and then quietly makes every writing item untaggable against it.
       */
      const misfiled = declared.filter((subSkill) => !known.includes(subSkill));
      if (misfiled.length > 0) {
        push(
          ["subSkills", skill],
          misfiled.length === 1
            ? `"${misfiled[0]}" is not a ${skill} sub-skill, though it is valid elsewhere in the taxonomy. Check product-requirements.md 13.2.`
            : `${misfiled.map((name) => `"${name}"`).join(", ")} are not ${skill} sub-skills, though they are valid elsewhere in the taxonomy. Check product-requirements.md 13.2.`,
        );
      }

      if (new Set(declared).size !== declared.length) {
        push(["subSkills", skill], `The ${skill} taxonomy names a sub-skill twice.`);
      }
    }

    if (new Set(profile.topics).size !== profile.topics.length) {
      push(["topics"], "The topic taxonomy names a topic twice.");
    }
    if (profile.topics.length !== TOPICS.length) {
      push(
        ["topics"],
        `The profile declares ${profile.topics.length} topics but the code knows ${TOPICS.length} (product-requirements.md 13.1).`,
      );
    }
  });

export const examProfileSchema = examProfileShape.readonly();
