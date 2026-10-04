import { describe, expect, it } from "vitest";

import type { Item } from "@palier/domain";
import { itemId } from "@palier/domain";

import { existsSync } from "node:fs";

import {
  REALTIME_ROUTE_SOURCE,
  REALTIME_ROUTE_SOURCE_URL,
  REPORT_REASONS,
  REPOSITORY_URL,
  SELFHOST_GUIDE,
  SELFHOST_GUIDE_URL,
  contributeIssueUrl,
  errorIssueUrl,
  exportFileName,
  provenanceLine,
  reportIssueUrl,
} from "./report";

describe("reportIssueUrl", () => {
  const url = new URL(
    reportIssueUrl({ itemId: "01HITEM0000000000000001", reason: "key-wrong", reasonLabel: "The key looks wrong", bankVersion: 1 }),
  );

  it("opens a new issue on the project's repository", () => {
    expect(`${url.origin}${url.pathname}`).toBe(`${REPOSITORY_URL}/issues/new`);
  });

  it("names the reason code and the item in the title, which is what the retirement rule counts", () => {
    expect(url.searchParams.get("title")).toBe("Item report: key-wrong (01HITEM0000000000000001)");
  });

  it("carries the item, the reason in words and the bank version in the body", () => {
    const body = url.searchParams.get("body") ?? "";
    expect(body).toContain("`01HITEM0000000000000001`");
    expect(body).toContain("The key looks wrong (`key-wrong`)");
    expect(body).toContain("**Bank version:** 1");
  });

  it("labels the issue so reports can be filtered by reason", () => {
    expect(url.searchParams.get("labels")).toBe("item-report,reason:key-wrong");
  });

  it("says so when the bank version is not known", () => {
    const body = new URL(reportIssueUrl({ itemId: "x", reason: "unclear", reasonLabel: "Unclear", bankVersion: null })).searchParams.get("body");
    expect(body).toContain("**Bank version:** unknown");
  });

  it("offers exactly §13.0's four reasons", () => {
    expect(REPORT_REASONS).toEqual(["key-wrong", "multiple-answers", "french-off", "unclear"]);
  });
});

const generated: Item = {
  id: itemId("gen-01HGEN"),
  version: 1,
  skill: "writing",
  lang: "fr",
  type: "cloze",
  stem: { en: "Fill the blank.", fr: "Les dossiers ___ traités." },
  blankIndex: 0,
  options: [
    { id: "a", text: "seront", rationale: { en: "Future.", fr: "Futur." } },
    { id: "b", text: "sera", rationale: { en: "Singular.", fr: "Singulier." } },
    { id: "c", text: "serons", rationale: { en: "First person.", fr: "Première personne." } },
    { id: "d", text: "soient", rationale: { en: "Subjunctive.", fr: "Subjonctif." } },
  ],
  key: "a",
  explanation: { en: "Agreement with dossiers.", fr: "Accord avec dossiers." },
  subSkill: "agreement",
  targetBand: "C",
  topic: "procurement",
  tags: [],
  provenance: { origin: "generated", generator: { model: "gpt-6-luna", promptVersion: "3", date: "2026-09-26T10:00:00.000Z" } },
  status: "published",
  createdAt: "2026-09-26T10:00:00.000Z",
  updatedAt: "2026-09-26T10:00:00.000Z",
};

describe("contributeIssueUrl (D111)", () => {
  const url = new URL(contributeIssueUrl(generated));
  const body = url.searchParams.get("body") ?? "";

  it("opens a new issue on the project's repository, labelled as a contribution", () => {
    expect(`${url.origin}${url.pathname}`).toBe(`${REPOSITORY_URL}/issues/new`);
    expect(url.searchParams.get("labels")).toBe("item-contribution");
  });

  it("names the sub-skill, the band and the type in the title", () => {
    expect(url.searchParams.get("title")).toBe("Item contribution: agreement, band C (cloze)");
  });

  it("carries the whole item as JSON, with its key, rationales and provenance", () => {
    const json = /```json\n([\s\S]*?)\n```/.exec(body)?.[1] ?? "{}";
    expect(JSON.parse(json)).toEqual({
      type: "cloze",
      lang: "fr",
      stem: generated.stem,
      blankIndex: 0,
      options: generated.options,
      key: "a",
      explanation: generated.explanation,
      subSkill: "agreement",
      targetBand: "C",
      topic: "procurement",
      provenance: generated.provenance,
    });
  });

  it("says what the item is, and carries no bank version or id, since it never came from the bank", () => {
    expect(body).toContain("reviewed by one automated check");
    expect(body).toContain("not calibrated");
    expect(body).not.toContain("Bank version");
    expect(body).not.toContain("gen-01HGEN");
  });

  it("leaves out a blank a type does not have", () => {
    const { blankIndex: _, ...rest } = generated;
    const plain = new URL(contributeIssueUrl({ ...rest, type: "error-id" })).searchParams.get("body") ?? "";
    expect(plain).not.toContain("blankIndex");
  });
});

describe("exportFileName", () => {
  it("dates the file by the export's own timestamp", () => {
    expect(exportFileName("2026-09-24T18:30:00.000Z")).toBe("palier-export-2026-09-24.json");
  });
});

describe("errorIssueUrl", () => {
  const bundle = "Palier diagnostic bundle\nBuild: d9fbed6\nError: TypeError";
  const url = new URL(errorIssueUrl({ errorName: "TypeError", bundle }));

  it("opens a new issue on the project's repository, titled by the error's name", () => {
    expect(`${url.origin}${url.pathname}`).toBe(`${REPOSITORY_URL}/issues/new`);
    expect(url.searchParams.get("title")).toBe("Error report: TypeError");
  });

  it("carries the bundle exactly as shown, fenced, and asks what the user was doing", () => {
    const body = url.searchParams.get("body") ?? "";
    expect(body).toContain(`\`\`\`\n${bundle}\n\`\`\``);
    expect(body).toContain("**What were you doing when it happened (optional):**");
  });

  it("labels the issue as an error report", () => {
    expect(url.searchParams.get("labels")).toBe("error-report");
  });
});

describe("REALTIME_ROUTE_SOURCE_URL (D186)", () => {
  it("names a file this repository holds, so the key settings' link never points at nothing", () => {
    expect(existsSync(new URL(`../../../../${REALTIME_ROUTE_SOURCE}`, import.meta.url))).toBe(true);
  });

  it("links it on the repository's main branch", () => {
    expect(REALTIME_ROUTE_SOURCE_URL).toBe(`${REPOSITORY_URL}/blob/main/apps/web/src/server/realtime-handlers.ts`);
  });
});

describe("SELFHOST_GUIDE_URL (D192)", () => {
  it("names a file this repository holds, so the own-endpoint form's link never points at nothing", () => {
    expect(existsSync(new URL(`../../../../${SELFHOST_GUIDE}`, import.meta.url))).toBe(true);
  });

  it("links it on the repository's main branch", () => {
    expect(SELFHOST_GUIDE_URL).toBe(`${REPOSITORY_URL}/blob/main/selfhost/README.md`);
  });
});

describe("provenanceLine (D203)", () => {
  const generator = { model: "claude-opus-5-5", promptVersion: "authoring-brief-v4", date: "2026-10-04T00:00:00.000Z" };

  it("reads an authored item that names the model that wrote it as machine-generated", () => {
    expect(provenanceLine({ provenance: { origin: "authored", contributor: "claude-opus-5-5", generator } })).toBe("generated");
  });

  it("reads an item a person wrote as authored", () => {
    expect(provenanceLine({ provenance: { origin: "authored", contributor: "octocat" } })).toBe("authored");
  });

  it("leaves every other origin as it is", () => {
    expect(provenanceLine({ provenance: { origin: "generated", generator } })).toBe("generated");
    expect(provenanceLine({ provenance: { origin: "adapted" } })).toBe("adapted");
  });
});
