import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import * as inMemory from "./index.js";

const HERE = dirname(fileURLToPath(import.meta.url));

/** The only packages a browser bundle of this subpath may reach. */
const ALLOWED_BARE = new Set(["@palier/app", "@palier/domain"]);

const SPECIFIER = /(?:import|export)\s[^"']*?from\s+["']([^"']+)["']/g;

/**
 * Every bare specifier reachable from `entry` through relative imports. Type-only
 * imports are included on purpose: they are erased, but a type-only import of a
 * forbidden package still means the module was written against it.
 */
const bareSpecifiersReachableFrom = (entry: string): Set<string> => {
  const seen = new Set<string>();
  const bare = new Set<string>();
  const visit = (file: string) => {
    if (seen.has(file)) return;
    seen.add(file);
    for (const [, spec] of readFileSync(file, "utf8").matchAll(SPECIFIER)) {
      if (spec === undefined) continue;
      if (spec.startsWith(".")) {
        visit(resolve(dirname(file), spec.replace(/\.js$/, ".ts")));
      } else {
        bare.add(spec);
      }
    }
  };
  visit(entry);
  return bare;
};

describe("@palier/testing/in-memory", () => {
  it("reaches no package but @palier/app and @palier/domain, so a browser can bundle it", () => {
    const reached = bareSpecifiersReachableFrom(resolve(HERE, "index.ts"));
    const forbidden = [...reached].filter((spec) => !ALLOWED_BARE.has(spec));
    expect(forbidden).toEqual([]);
  });

  it("exports every in-memory port the hermetic composition root wires", () => {
    expect(Object.keys(inMemory).sort()).toEqual(
      [
        "FIXTURE_BANK",
        "HERMETIC_ENV_FLAG",
        "counterIdGenerator",
        "fakeClock",
        "fixtureBankRepository",
        "isHermetic",
        "memoryAttemptStore",
        "memoryCostLedger",
        "memoryExamRunStore",
        "memoryItemRepository",
        "memoryKeyVault",
        "memoryScheduleStore",
        "memorySessionStore",
        "memorySettingsStore",
        "memorySyncServer",
        "memorySyncStateStore",
        "memoryTelemetryCollector",
        "memoryTelemetryStore",
        "seededRandom",
      ].sort(),
    );
  });
});
