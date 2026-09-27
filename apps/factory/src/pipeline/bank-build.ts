import type { ExamForm, Item, OralScenario, Passage, ScoredSkill } from "@palier/domain";

import { canonicalStringify, contentHash } from "../lib/json.js";

/**
 * Bank build (content-factory.md §4.6, architecture.md §5.5). Compiles the
 * committed content into immutable, content-hashed shards with a manifest.
 * **Reproducible**: the same input produces byte-identical output — items are
 * sorted by id, JSON is canonical, and every shard's filename is its own content
 * hash — because a bank build that is not reproducible cannot be audited. Pure:
 * it returns the files to write, so the same call twice is trivially comparable
 * (the CI reproducibility test).
 */

export const SHARD_SIZE = 100;

export type BankFile = { readonly path: string; readonly content: string };

export type ShardEntry = {
  readonly path: string;
  readonly hash: string;
  readonly count: number;
  readonly lang: string;
  readonly skill: string;
};

export type BankManifest = {
  readonly version: number;
  readonly counts: {
    readonly items: number;
    readonly passages: number;
    readonly forms: number;
    readonly scenarios: number;
  };
  readonly shards: readonly ShardEntry[];
  readonly passageShards: readonly ShardEntry[];
  readonly forms: readonly { readonly id: string; readonly path: string; readonly hash: string }[];
  /**
   * The oral scenarios file, listed so a client and its service worker find it through the
   * manifest like every other file (progress.md D114); null when the bank has none. Banks
   * v1 and v2 were written before the entry and carry no key, which reads the same way.
   */
  readonly scenarios: { readonly path: string; readonly hash: string } | null;
};

export type BankBuild = { readonly version: number; readonly files: readonly BankFile[]; readonly manifest: BankManifest };

export type BankInput = {
  readonly items: readonly Item[];
  readonly passages: readonly Passage[];
  readonly forms: readonly ExamForm[];
  readonly scenarios: readonly OralScenario[];
  readonly version: number;
};

const byId = <T extends { id: string }>(rows: readonly T[]): T[] =>
  [...rows].sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));

const chunk = <T>(rows: readonly T[], size: number): T[][] => {
  const out: T[][] = [];
  for (let i = 0; i < rows.length; i += size) out.push(rows.slice(i, i + size));
  return out;
};

const shardFile = (
  dir: string,
  rows: readonly { id: string }[],
  lang: string,
  skill: string,
): { file: BankFile; entry: ShardEntry } => {
  const content = canonicalStringify(byId(rows));
  const hash = contentHash(byId(rows)).slice(0, 16);
  const path = `${dir}/${hash}.json`;
  return { file: { path, content }, entry: { path, hash, count: rows.length, lang, skill } };
};

export const buildBank = (input: BankInput): BankBuild => {
  const base = `bank/v${String(input.version)}`;
  const files: BankFile[] = [];
  const shards: ShardEntry[] = [];
  const passageShards: ShardEntry[] = [];
  const forms: BankManifest["forms"] = [];

  const langs = [...new Set(input.items.map((i) => i.lang))].sort();
  const skills: ScoredSkill[] = ["reading", "writing"];
  for (const lang of langs) {
    for (const skill of skills) {
      const rows = input.items.filter((i) => i.lang === lang && i.skill === skill);
      for (const group of chunk(byId(rows), SHARD_SIZE)) {
        const { file, entry } = shardFile(`${base}/${lang}/${skill}`, group, lang, skill);
        files.push(file);
        shards.push(entry);
      }
    }
  }

  for (const group of chunk(byId(input.passages), SHARD_SIZE)) {
    const { file, entry } = shardFile(`${base}/passages`, group, "*", "passage");
    files.push(file);
    passageShards.push(entry);
  }

  for (const form of byId(input.forms)) {
    const content = canonicalStringify(form);
    const hash = contentHash(form).slice(0, 16);
    const path = `${base}/forms/${form.id}.json`;
    files.push({ path, content });
    (forms as { id: string; path: string; hash: string }[]).push({ id: form.id, path, hash });
  }

  let scenarios: BankManifest["scenarios"] = null;
  if (input.scenarios.length > 0) {
    const path = `${base}/oral/scenarios.json`;
    files.push({ path, content: canonicalStringify(byId(input.scenarios)) });
    scenarios = { path, hash: contentHash(byId(input.scenarios)).slice(0, 16) };
  }

  const manifest: BankManifest = {
    version: input.version,
    counts: {
      items: input.items.length,
      passages: input.passages.length,
      forms: input.forms.length,
      scenarios: input.scenarios.length,
    },
    shards,
    passageShards,
    forms,
    scenarios,
  };
  files.push({ path: `${base}/manifest.json`, content: canonicalStringify(manifest) });

  return { version: input.version, files, manifest };
};
