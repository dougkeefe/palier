import { existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { DEFAULT_BANK_VERSION } from "./cli.js";
import { AUTHORED_DIR, loadAuthored, loadProfile, loadPublishedBank } from "./io.js";
import { authoredIssues } from "./__tests__/authored-checks.js";
import {
  anAuthoredComprehensionItem,
  anAuthoredItem,
  anAuthoredPassage,
} from "./__tests__/authored-fixtures.js";

/**
 * The contributions under `content/authored/` (content-factory.md §5, CONTRIBUTING.md). This
 * is the check a contributor's `pnpm verify` runs on their file: it parses with the domain
 * schemas, is clean by the domain's `validate()` and stage 5's per-item rules, is credited,
 * and takes no id the committed bank already holds. Passing it is not acceptance: the model
 * review at the next bank build still decides.
 */

const REPO = process.cwd();
const profile = loadProfile(REPO);

const committedBank = () => {
  const bank = loadPublishedBank(REPO, DEFAULT_BANK_VERSION);
  if (bank === null) throw new Error(`content/bank/v${String(DEFAULT_BANK_VERSION)} is missing`);
  return bank;
};

describe("the committed contributions (content/authored)", () => {
  it("reads the directory, which holds only contributions and its .gitkeep, no code (ADR 18)", () => {
    const dir = join(REPO, AUTHORED_DIR);
    expect(existsSync(dir)).toBe(true);
    const entries = readdirSync(dir);
    expect(entries).toContain(".gitkeep");
    expect(entries.filter((name) => name !== ".gitkeep" && !name.endsWith(".json"))).toEqual([]);
  });

  it("parses every contribution with the domain schemas", () => {
    expect(() => loadAuthored(REPO)).not.toThrow();
  });

  it("credits every item and passage, is validate()-clean, and takes no id the bank holds", () => {
    expect(authoredIssues(loadAuthored(REPO), committedBank(), profile)).toEqual([]);
  });
});

describe("authoredIssues, the checks a contribution must pass", () => {
  const bank = committedBank();
  const clean = { items: [anAuthoredItem(), anAuthoredComprehensionItem()], passages: [anAuthoredPassage()] };

  it("passes a credited, clean contribution", () => {
    expect(authoredIssues(clean, bank, profile)).toEqual([]);
  });

  it("flags an item that names no contributor, by the domain's validate()", () => {
    const issues = authoredIssues({ items: [anAuthoredItem({ provenance: { origin: "authored" } })], passages: [] }, bank, profile);
    expect(issues.join(" ")).toMatch(/authored-without-contributor/);
  });

  it("flags an item whose origin is not authored", () => {
    const issues = authoredIssues({ items: [anAuthoredItem({ provenance: { origin: "generated", contributor: "octocat" } })], passages: [] }, bank, profile);
    expect(issues).toContain('item authored-octocat-1: provenance.origin is "generated", and a contribution is "authored"');
  });

  it("flags a passage that names no contributor", () => {
    const passage = anAuthoredPassage({ source: { kind: "original" } });
    const issues = authoredIssues({ items: [anAuthoredComprehensionItem()], passages: [passage] }, bank, profile);
    expect(issues).toEqual([`passage ${passage.id}: names no contributor in source.contributor`]);
  });

  it("flags an item the stage-5 rules reject, such as a sub-skill outside the taxonomy", () => {
    const issues = authoredIssues({ items: [anAuthoredItem({ subSkill: "main-idea" })], passages: [] }, bank, profile);
    expect(issues.join(" ")).toMatch(/not in the profile taxonomy/);
  });

  it("flags an item id or passage id the committed bank already holds", () => {
    const taken = bank.items[0]!.id;
    const takenPassage = bank.passages[0]!.id;
    const issues = authoredIssues(
      { items: [anAuthoredItem({ id: taken })], passages: [anAuthoredPassage({ id: takenPassage })] },
      bank,
      profile,
    );
    expect(issues).toContain(`item ${taken}: the id is already in the committed bank; choose another`);
    expect(issues).toContain(`passage ${takenPassage}: the id is already in the committed bank; choose another`);
  });

  it("flags two contributions that use the same id", () => {
    const issues = authoredIssues({ items: [anAuthoredItem(), anAuthoredItem()], passages: [] }, bank, profile);
    expect(issues).toContain("item authored-octocat-1: two contributions use the same id");
  });

  it("flags a comprehension item whose passage is nowhere to be found", () => {
    const orphan = anAuthoredComprehensionItem();
    const issues = authoredIssues({ items: [orphan], passages: [] }, bank, profile);
    expect(issues).toContain(`item ${orphan.id}: passage ${String(orphan.passageId)} is neither in the contribution nor in the bank`);
  });
});

describe("the example in CONTRIBUTING.md", () => {
  it("is a contribution that loads and passes every check, so the guide cannot go stale", () => {
    const guide = readFileSync(join(REPO, "CONTRIBUTING.md"), "utf8");
    const example = /### A minimal example\s+```json\n([\s\S]*?)\n```/.exec(guide)?.[1];
    expect(example).toBeDefined();
    const root = mkdtempSync(join(tmpdir(), "palier-guide-"));
    mkdirSync(join(root, AUTHORED_DIR), { recursive: true });
    writeFileSync(join(root, AUTHORED_DIR, "example.json"), example ?? "");
    const authored = loadAuthored(root);
    expect(authored.items).toHaveLength(1);
    expect(authoredIssues(authored, committedBank(), profile)).toEqual([]);
  });
});
