import { http, HttpResponse } from "msw";

import type { ExamForm, Item, OralScenario, Passage } from "@palier/domain";

import type { ItemRepositoryBank } from "../contracts/item-repository.contract.js";

/**
 * MSW handlers that serve an `ItemRepositoryBank` as the manifest + content-hashed
 * shards the real bank ships, so the HTTP `ItemRepository` adapter is held to the
 * *same* `itemRepositoryContract` the in-memory repo passes — and so a later
 * `apps/web` test can serve a bank the same way. It re-implements the tiny
 * grouping that `apps/factory`'s `buildBank` does; `@palier/testing` may import
 * only `@palier/app` and `@palier/domain`, never the factory, so this is a small
 * deliberate second copy.
 *
 * The shard **paths** are stable but not real content hashes — the adapter reads
 * only `entry.path`/`skill`/`lang` from the manifest, never the hash value, so a
 * deterministic path is all it needs (and keeps the cache key stable across a run).
 * The `version` in the URL is the directory version; the `version` in the manifest
 * body is `bank.bankVersion`, which is what `bankVersion()` reports — the two are
 * allowed to differ, which is how the contract asserts a specific bank version.
 *
 * The oral scenarios file is listed in the manifest's `scenarios` entry, as the
 * factory lists it (progress.md D114), and a bank with none lists `null` and serves
 * an explicit **404** there, mirroring the factory not writing the file.
 */
export type BankHandlerOptions = {
  readonly baseUrl: string;
  readonly version: number;
};

export const bankHandlers = (bank: ItemRepositoryBank, opts: BankHandlerOptions) => {
  const base = opts.baseUrl.replace(/\/+$/, "");
  const root = `bank/v${String(opts.version)}`;

  const groups = new Map<string, { lang: string; skill: string; items: Item[] }>();
  for (const item of bank.items) {
    const key = `${item.lang}|${item.skill}`;
    const group = groups.get(key) ?? { lang: item.lang, skill: item.skill, items: [] };
    group.items.push(item);
    groups.set(key, group);
  }

  const shards: {
    readonly path: string;
    readonly hash: string;
    readonly count: number;
    readonly lang: string;
    readonly skill: string;
  }[] = [];
  const handlers = [];

  for (const group of groups.values()) {
    const path = `${root}/${group.lang}/${group.skill}/${group.lang}-${group.skill}.json`;
    shards.push({ path, hash: `${group.lang}-${group.skill}`, count: group.items.length, lang: group.lang, skill: group.skill });
    const items: readonly Item[] = group.items;
    handlers.push(http.get(`${base}/${path}`, () => HttpResponse.json(items)));
  }

  const passagePath = `${root}/passages/passages.json`;
  const passageShards =
    bank.passages.length > 0
      ? [{ path: passagePath, hash: "passages", count: bank.passages.length, lang: "*", skill: "passage" }]
      : [];
  if (bank.passages.length > 0) {
    const passages: readonly Passage[] = bank.passages;
    handlers.push(http.get(`${base}/${passagePath}`, () => HttpResponse.json(passages)));
  }

  const forms = bank.forms.map((form) => ({ id: form.id, path: `${root}/forms/${form.id}.json`, hash: form.id }));
  for (const form of bank.forms) {
    const body: ExamForm = form;
    handlers.push(http.get(`${base}/${root}/forms/${form.id}.json`, () => HttpResponse.json(body)));
  }

  const scenarios: readonly OralScenario[] = bank.scenarios;
  const scenarioPath = `${root}/oral/scenarios.json`;
  handlers.push(
    http.get(`${base}/${scenarioPath}`, () =>
      scenarios.length > 0 ? HttpResponse.json(scenarios) : new HttpResponse(null, { status: 404 }),
    ),
  );

  const manifest = {
    version: bank.bankVersion,
    counts: {
      items: bank.items.length,
      passages: bank.passages.length,
      forms: bank.forms.length,
      scenarios: scenarios.length,
    },
    shards,
    passageShards,
    forms,
    scenarios: scenarios.length > 0 ? { path: scenarioPath, hash: "scenarios" } : null,
  };
  handlers.unshift(http.get(`${base}/${root}/manifest.json`, () => HttpResponse.json(manifest)));

  return handlers;
};
