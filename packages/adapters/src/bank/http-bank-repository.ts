import type { ItemCriteria, ItemRepository } from "@palier/app";
import type {
  ExamForm,
  FormId,
  Item,
  ItemId,
  OralScenario,
  Passage,
  PassageId,
  ScenarioId,
} from "@palier/domain";
import { BankContentError, BankUnavailableError } from "./errors.js";
import type { BankManifest } from "./manifest.js";
import { parseManifest } from "./manifest.js";

/**
 * The `ItemRepository` (implementation-plan.md §3.3, §7 Phase 2) over the
 * content-hashed bank shards the factory produced (`content/bank/v{n}/`). Read
 * only: the bank is static and versioned, so there is no write side — authoring
 * is the factory's job, delivery is a fetch.
 *
 * **Lazy and content-hash cached.** The manifest is fetched once; a `query`
 * fetches only the shards whose `skill` it needs (a reading query never pulls the
 * writing shard); each shard is fetched at most once, keyed by its path — which
 * *contains the content hash*, so the entry is immutable forever and the cache
 * never invalidates. This is the "service worker cache keyed by content hash" of
 * §7 expressed at the data layer; the service-worker registration itself is
 * `apps/web` wiring.
 *
 * **Vendor-free, structure-checked at the edge.** Deliberately over `fetch`
 * (there is no vendor here — `fetch` is the platform). The bank is *our own*
 * content, validated field-by-field at build time by the factory's deterministic
 * validation stage, so the read path does not re-run the domain Zod schemas — it
 * checks the delivered *shape* (the manifest's control fields; that a shard is an
 * array and a form a record) and turns a truncated or non-JSON body into a
 * `BankContentError`. Full per-field re-validation is reserved for genuine vendor
 * payloads (the OpenAI adapter, `architecture.md` §8.2); the shared
 * `itemRepositoryContract` is served the same schema-light fixtures the in-memory
 * repo is, which a full re-validation would reject (progress.md D55).
 */

type FetchResponse = {
  readonly ok: boolean;
  readonly status: number;
  json: () => Promise<unknown>;
};
/** GET-only; defined here rather than shared with the OpenAI adapter, which a cross-adapter import would violate. */
export type FetchLike = (url: string) => Promise<FetchResponse>;

export type HttpBankConfig = {
  /** Root under which `bank/` is served (e.g. `/content` or an origin). */
  readonly baseUrl: string;
  /** The bank directory version to read — locates `bank/v{version}/manifest.json`. Default 1. */
  readonly version?: number;
  /** Injectable for tests; defaults to the platform `fetch`. */
  readonly fetchImpl?: FetchLike;
};

const defaultFetch: FetchLike = (url) => fetch(url) as unknown as Promise<FetchResponse>;

/** Conjunction semantics, identical to the in-memory repository (progress.md D20). */
const matches = (item: Item, c: ItemCriteria): boolean => {
  if (c.skill !== undefined && item.skill !== c.skill) return false;
  if (c.subSkill !== undefined && item.subSkill !== c.subSkill) return false;
  if (c.band !== undefined && item.targetBand !== c.band) return false;
  if (c.exclude !== undefined && c.exclude.includes(item.id)) return false;
  return true;
};

/** A 404 on an optional resource (the un-manifested scenarios file) is "not present", not a failure. */
const NOT_FOUND = Symbol("not-found");

export const httpBankRepository = (config: HttpBankConfig): ItemRepository => {
  const version = config.version ?? 1;
  const base = config.baseUrl.replace(/\/+$/, "");
  const doFetch = config.fetchImpl ?? defaultFetch;
  const root = `${base}/bank/v${String(version)}`;

  /**
   * Fetch and JSON-parse one URL. A network fault or a non-ok status is a
   * `BankUnavailableError`; a body that is not JSON is a `BankContentError`. When
   * `optional`, a 404 returns the `NOT_FOUND` sentinel instead of throwing.
   */
  const fetchJson = async (url: string, optional = false): Promise<unknown> => {
    let res: FetchResponse;
    try {
      res = await doFetch(url);
    } catch (cause) {
      throw new BankUnavailableError(`Could not reach the bank at ${url}.`, { cause });
    }
    if (optional && res.status === 404) return NOT_FOUND;
    if (!res.ok) {
      throw new BankUnavailableError(`Bank fetch failed (${String(res.status)}) for ${url}.`);
    }
    try {
      return await res.json();
    } catch (cause) {
      throw new BankContentError(`Bank response was not valid JSON: ${url}.`, { cause });
    }
  };

  /** A shard is a JSON array; anything else is a corrupt delivery, not content we can serve. */
  const asArray = <T>(raw: unknown, url: string): readonly T[] => {
    if (!Array.isArray(raw)) throw new BankContentError(`Expected an array of records at ${url}.`);
    return raw as readonly T[];
  };

  /** A form file is a single JSON record. */
  const asRecord = <T>(raw: unknown, url: string): T => {
    if (typeof raw !== "object" || raw === null || Array.isArray(raw)) {
      throw new BankContentError(`Expected a record at ${url}.`);
    }
    return raw as T;
  };

  // --- caches. Keyed by content-hashed path, so a hit is a hit forever. ---
  let manifestPromise: Promise<BankManifest> | undefined;
  const itemShards = new Map<string, Promise<readonly Item[]>>();
  const passageShardCache = new Map<string, Promise<readonly Passage[]>>();
  const formCache = new Map<string, Promise<ExamForm>>();
  let scenariosPromise: Promise<readonly OralScenario[]> | undefined;

  // A cached promise is only ever a *fulfilled* one: on rejection each loader
  // clears its own slot, so a transient fault (a 5xx, or an offline first read on
  // the one long-lived instance the composition root builds) is retried on the
  // next call rather than poisoning the instance until a page reload. The
  // content-hash reasoning above is about a *hit* being immutable, not a miss.

  const getManifest = (): Promise<BankManifest> => {
    manifestPromise ??= (async () => {
      const raw = await fetchJson(`${root}/manifest.json`);
      try {
        return parseManifest(raw);
      } catch (cause) {
        throw new BankContentError(
          `Bank manifest is malformed: ${cause instanceof Error ? cause.message : String(cause)}`,
          { cause },
        );
      }
    })().catch((err: unknown) => {
      manifestPromise = undefined;
      throw err;
    });
    return manifestPromise;
  };

  const loadItemShard = (path: string): Promise<readonly Item[]> => {
    let p = itemShards.get(path);
    if (p === undefined) {
      p = (async () => asArray<Item>(await fetchJson(`${base}/${path}`), path))().catch((err: unknown) => {
        itemShards.delete(path);
        throw err;
      });
      itemShards.set(path, p);
    }
    return p;
  };

  const loadPassageShard = (path: string): Promise<readonly Passage[]> => {
    let p = passageShardCache.get(path);
    if (p === undefined) {
      p = (async () => asArray<Passage>(await fetchJson(`${base}/${path}`), path))().catch((err: unknown) => {
        passageShardCache.delete(path);
        throw err;
      });
      passageShardCache.set(path, p);
    }
    return p;
  };

  const loadForm = (path: string): Promise<ExamForm> => {
    let p = formCache.get(path);
    if (p === undefined) {
      p = (async () => asRecord<ExamForm>(await fetchJson(`${base}/${path}`), path))().catch((err: unknown) => {
        formCache.delete(path);
        throw err;
      });
      formCache.set(path, p);
    }
    return p;
  };

  /**
   * The oral scenarios file is written by the factory only when scenarios exist
   * and is **not** listed in the manifest (bank-build.ts). Its absence (HTTP 404)
   * is therefore normal, not an error: it means the bank has no scenarios.
   */
  const getScenarios = (): Promise<readonly OralScenario[]> => {
    scenariosPromise ??= (async () => {
      const url = `${root}/oral/scenarios.json`;
      const raw = await fetchJson(url, true);
      if (raw === NOT_FOUND) return [];
      return asArray<OralScenario>(raw, url);
    })().catch((err: unknown) => {
      scenariosPromise = undefined;
      throw err;
    });
    return scenariosPromise;
  };

  return {
    byIds: async (ids: readonly ItemId[]) => {
      // The manifest carries no id→shard index, so this loads every item shard
      // (cached). A query that also names a skill is the lazy path; byIds is not.
      const manifest = await getManifest();
      const loaded = await Promise.all(manifest.shards.map((s) => loadItemShard(s.path)));
      const byId = new Map(loaded.flat().map((item) => [item.id, item]));
      return ids.map((id) => byId.get(id)).filter((item): item is Item => item !== undefined);
    },

    query: async (criteria: ItemCriteria) => {
      const manifest = await getManifest();
      const wanted =
        criteria.skill === undefined
          ? manifest.shards
          : manifest.shards.filter((s) => s.skill === criteria.skill);
      const loaded = await Promise.all(wanted.map((s) => loadItemShard(s.path)));
      const hits = loaded.flat().filter((item) => matches(item, criteria));
      return criteria.limit === undefined ? hits : hits.slice(0, criteria.limit);
    },

    passage: async (id: PassageId) => {
      const manifest = await getManifest();
      const loaded = await Promise.all(manifest.passageShards.map((s) => loadPassageShard(s.path)));
      return loaded.flat().find((p) => p.id === id) ?? null;
    },

    form: async (id: FormId) => {
      const manifest = await getManifest();
      const entry = manifest.forms.find((f) => f.id === id);
      if (entry === undefined) return null;
      return loadForm(entry.path);
    },

    scenario: async (id: ScenarioId) => {
      const scenarios = await getScenarios();
      return scenarios.find((s) => s.id === id) ?? null;
    },

    bankVersion: async () => (await getManifest()).version,
  };
};
