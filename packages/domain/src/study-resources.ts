import * as z from "zod";

import { studyResourceSchema } from "./schemas/content.js";
import type { StudyResource } from "./study-resource.js";
import { STUDY_RESOURCE_HOSTS } from "./study-resource.js";
import { WRITING_SUB_SKILLS } from "./sub-skills.js";

/**
 * Parses **already-read** study resources, as `parsePointers` parses the pointers: no I/O here, the
 * composition root imports the JSON (progress.md D248). Ids and addresses are unique, every address
 * is `https` on its source's own host with no credentials, and **every written-expression sub-skill
 * has at least one resource**, so every correction the translator explains has somewhere to study it.
 */

export type StudyResourcesParseResult =
  | { readonly ok: true; readonly resources: readonly StudyResource[] }
  | { readonly ok: false; readonly errors: readonly string[] };

/** Why `url` is not a safe address for `host`, or `null` when it is. */
const addressProblem = (url: string, host: string): string | null => {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return "is not an address";
  }
  if (parsed.protocol !== "https:") return "is not https";
  if (parsed.username !== "" || parsed.password !== "") return "carries credentials";
  if (parsed.hostname !== host) return `is not on ${host}`;
  return null;
};

const resourcesSchema = z.array(studyResourceSchema).superRefine((resources, ctx) => {
  const ids = new Set<string>();
  const urls = new Set<string>();
  const covered = new Set<string>();
  for (const [index, resource] of resources.entries()) {
    if (ids.has(resource.id)) ctx.addIssue({ code: "custom", path: [index, "id"], message: `"${resource.id}" is used twice` });
    ids.add(resource.id);
    if (urls.has(resource.url)) ctx.addIssue({ code: "custom", path: [index, "url"], message: `"${resource.url}" is listed twice` });
    urls.add(resource.url);
    const problem = addressProblem(resource.url, STUDY_RESOURCE_HOSTS[resource.source]);
    if (problem !== null) ctx.addIssue({ code: "custom", path: [index, "url"], message: `"${resource.url}" ${problem}` });
    covered.add(resource.subSkill);
  }
  for (const subSkill of WRITING_SUB_SKILLS) {
    if (!covered.has(subSkill)) ctx.addIssue({ code: "custom", path: [], message: `"${subSkill}" has no resource` });
  }
});

const formatIssue = (issue: z.core.$ZodIssue): string => {
  const path = issue.path.length > 0 ? issue.path.join(".") : "(root)";
  return `${path}: ${issue.message}`;
};

export const parseStudyResources = (value: unknown): StudyResourcesParseResult => {
  const result = resourcesSchema.safeParse(value);
  if (!result.success) return { ok: false, errors: result.error.issues.map(formatIssue) };
  return { ok: true, resources: result.data };
};

/** The throwing form, for the composition root, where a bad list is a build defect. */
export const parseStudyResourcesOrThrow = (value: unknown): readonly StudyResource[] => {
  const result = parseStudyResources(value);
  if (!result.ok) throw new Error(`The study resources are not valid:\n  ${result.errors.join("\n  ")}`);
  return result.resources;
};
