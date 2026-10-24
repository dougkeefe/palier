import { describe, expect, it } from "vitest";

import { STUDY_RESOURCE_HOSTS } from "./study-resource.js";
import { parseStudyResources, parseStudyResourcesOrThrow } from "./study-resources.js";
import { WRITING_SUB_SKILLS } from "./sub-skills.js";

const aResource = (subSkill: string, over: Record<string, unknown> = {}) => ({
  id: `${subSkill}-1`,
  subSkill,
  source: "oqlf",
  lang: "fr",
  title: { en: "A page", fr: "Une page" },
  url: `https://${STUDY_RESOURCE_HOSTS.oqlf}/${subSkill}`,
  ...over,
});

const everySubSkill = () => WRITING_SUB_SKILLS.map((subSkill) => aResource(subSkill));
const withOne = (over: Record<string, unknown>) => [...everySubSkill(), aResource("agreement", { id: "extra", url: "https://vitrinelinguistique.oqlf.gouv.qc.ca/extra", ...over })];
const last = String(WRITING_SUB_SKILLS.length);

describe("parseStudyResources", () => {
  it("accepts a resource for every written-expression sub-skill", () => {
    const result = parseStudyResources(everySubSkill());
    expect(result.ok && result.resources.map((r) => r.subSkill)).toEqual([...WRITING_SUB_SKILLS]);
  });

  it("refuses a list missing a sub-skill, since a correction on it would have nowhere to study", () => {
    expect(parseStudyResources(everySubSkill().slice(1))).toEqual({
      ok: false,
      errors: [`(root): "${WRITING_SUB_SKILLS[0]}" has no resource`],
    });
  });

  it("refuses an id used twice", () => {
    expect(parseStudyResources(withOne({ id: "agreement-1" }))).toEqual({
      ok: false,
      errors: [`${last}.id: "agreement-1" is used twice`],
    });
  });

  it("refuses an address listed twice", () => {
    const url = `https://${STUDY_RESOURCE_HOSTS.oqlf}/agreement`;
    expect(parseStudyResources(withOne({ url }))).toEqual({ ok: false, errors: [`${last}.url: "${url}" is listed twice`] });
  });

  it("refuses a page off its source's own host, so no link can point anywhere else", () => {
    const url = "https://example.com/accord";
    expect(parseStudyResources(withOne({ url }))).toEqual({
      ok: false,
      errors: [`${last}.url: "${url}" is not on ${STUDY_RESOURCE_HOSTS.oqlf}`],
    });
    const portal = "https://vitrinelinguistique.oqlf.gouv.qc.ca/portal";
    expect(parseStudyResources(withOne({ source: "language-portal", url: portal }))).toEqual({
      ok: false,
      errors: [`${last}.url: "${portal}" is not on ${STUDY_RESOURCE_HOSTS["language-portal"]}`],
    });
  });

  it("refuses an address that is not https, carries credentials or is not an address", () => {
    const http = "http://vitrinelinguistique.oqlf.gouv.qc.ca/x";
    expect(parseStudyResources(withOne({ url: http }))).toEqual({ ok: false, errors: [`${last}.url: "${http}" is not https`] });
    const creds = "https://me:pw@vitrinelinguistique.oqlf.gouv.qc.ca/x";
    expect(parseStudyResources(withOne({ url: creds }))).toEqual({ ok: false, errors: [`${last}.url: "${creds}" carries credentials`] });
    expect(parseStudyResources(withOne({ url: "accord" }))).toEqual({ ok: false, errors: [`${last}.url: "accord" is not an address`] });
  });

  it("refuses a reading sub-skill, an unknown source and a title in one language", () => {
    expect(parseStudyResources(withOne({ subSkill: "main-idea" })).ok).toBe(false);
    expect(parseStudyResources(withOne({ source: "wikipedia" })).ok).toBe(false);
    expect(parseStudyResources(withOne({ title: { en: "Only English" } })).ok).toBe(false);
  });

  it("throws with every error named, for the composition root", () => {
    expect(() => parseStudyResourcesOrThrow([])).toThrow(/"verb-tense-and-mood" has no resource/);
    expect(parseStudyResourcesOrThrow(everySubSkill())).toHaveLength(WRITING_SUB_SKILLS.length);
  });
});
