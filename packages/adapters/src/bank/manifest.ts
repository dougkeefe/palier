/**
 * The bank *delivery* manifest — the shape `apps/factory` writes at
 * `bank/v{n}/manifest.json` (its `BankManifest` in `pipeline/bank-build.ts`).
 * This is a deliberate, small re-declaration of that contract: the adapter may
 * import only `@palier/app` and `@palier/domain` (§3.1), never the factory, so
 * the two ends of the delivery contract are stated twice. Consolidating both onto
 * one shared schema in `@palier/domain` is a future slice, not this one.
 *
 * Validated by hand rather than with Zod: this package is deliberately
 * zod-free — the OpenAI adapter re-uses `@palier/domain`'s pre-built schemas so
 * it never imports `zod`, and the manifest is a delivery artefact `@palier/domain`
 * has no schema for. A hand guard keeps the "no new dependency" rule intact.
 */

/** One shard the manifest lists. `skill` is `"reading"`/`"writing"` for item shards, `"passage"` for passage shards. */
export type ManifestShard = {
  readonly path: string;
  readonly hash: string;
  readonly count: number;
  readonly lang: string;
  readonly skill: string;
};

export type ManifestForm = {
  readonly id: string;
  readonly path: string;
  readonly hash: string;
};

/** The oral scenarios file (progress.md D114). One per bank, listed so a cache can take it. */
export type ManifestScenarios = {
  readonly path: string;
  readonly hash: string;
};

export type BankManifest = {
  readonly version: number;
  readonly shards: readonly ManifestShard[];
  readonly passageShards: readonly ManifestShard[];
  readonly forms: readonly ManifestForm[];
  /**
   * Null when the bank ships no scenarios. Banks v1 and v2 predate the entry and carry
   * no key at all, which reads the same way: neither ever held a scenario.
   */
  readonly scenarios: ManifestScenarios | null;
};

const isObject = (v: unknown): v is Record<string, unknown> =>
  typeof v === "object" && v !== null;

const asShard = (v: unknown, where: string): ManifestShard => {
  if (!isObject(v)) throw new Error(`${where} is not an object`);
  const { path, hash, count, lang, skill } = v;
  if (typeof path !== "string") throw new Error(`${where}.path is not a string`);
  if (typeof hash !== "string") throw new Error(`${where}.hash is not a string`);
  if (typeof count !== "number") throw new Error(`${where}.count is not a number`);
  if (typeof lang !== "string") throw new Error(`${where}.lang is not a string`);
  if (typeof skill !== "string") throw new Error(`${where}.skill is not a string`);
  return { path, hash, count, lang, skill };
};

const asForm = (v: unknown, where: string): ManifestForm => {
  if (!isObject(v)) throw new Error(`${where} is not an object`);
  const { id, path, hash } = v;
  if (typeof id !== "string") throw new Error(`${where}.id is not a string`);
  if (typeof path !== "string") throw new Error(`${where}.path is not a string`);
  if (typeof hash !== "string") throw new Error(`${where}.hash is not a string`);
  return { id, path, hash };
};

const asScenarios = (v: unknown): ManifestScenarios | null => {
  if (v === undefined || v === null) return null;
  if (!isObject(v)) throw new Error("manifest.scenarios is not an object");
  const { path, hash } = v;
  if (typeof path !== "string") throw new Error("manifest.scenarios.path is not a string");
  if (typeof hash !== "string") throw new Error("manifest.scenarios.hash is not a string");
  return { path, hash };
};

const asArray = (v: unknown, where: string): readonly unknown[] => {
  if (!Array.isArray(v)) throw new Error(`${where} is not an array`);
  return v;
};

/**
 * Validate an untyped manifest body into a `BankManifest`, or throw. The caller
 * (the repository) turns the throw into a `BankContentError` so nothing but our
 * types crosses the boundary.
 */
export const parseManifest = (raw: unknown): BankManifest => {
  if (!isObject(raw)) throw new Error("manifest is not an object");
  const { version, shards, passageShards, forms, scenarios } = raw;
  if (typeof version !== "number") throw new Error("manifest.version is not a number");
  return {
    version,
    shards: asArray(shards, "manifest.shards").map((s, i) => asShard(s, `shards[${String(i)}]`)),
    passageShards: asArray(passageShards, "manifest.passageShards").map((s, i) =>
      asShard(s, `passageShards[${String(i)}]`),
    ),
    forms: asArray(forms, "manifest.forms").map((f, i) => asForm(f, `forms[${String(i)}]`)),
    scenarios: asScenarios(scenarios),
  };
};
