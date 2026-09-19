/**
 * The architecture gate (implementation-plan.md 4.1).
 *
 * "An arrow may only point downward on this diagram, and dependency-cruiser
 * fails the build on any arrow that does not." (implementation-plan.md 3.1)
 *
 * Two notes on how this is wired, recorded as deviation D6 in docs/progress.md.
 *
 * It cruises `src`, not `dist`, so a violation is reported at
 * `packages/engine/src/leak.ts:3` rather than at a line in generated output.
 * But workspace *imports* still resolve through each package's `exports` map
 * into `dist`, because pnpm symlinks `@palier/domain` to the real package and
 * `preserveSymlinks` is false. That is why the `to` side of every arrow rule
 * matches `^packages/<name>/` without anchoring to `src` — it has to fire on
 * either side of the build. It also means **the packages must be built before
 * the cruise**, which `pnpm verify` guarantees by running `check-types` (and
 * therefore `^build`) first.
 *
 * There is deliberately no alias map pointing `@palier/*` at `src`. An alias is
 * a second source of truth that drifts from the `exports` map, and it would let
 * this gate bless an import that does not actually resolve at runtime.
 */

/** Packages permitted to hold each vendor dependency (implementation-plan.md 4.1). */
const VENDOR_BANS = [
  {
    name: "no-dexie-outside-adapters",
    module: "dexie",
    allowed: "^packages/adapters/",
    where: "packages/adapters/src/dexie",
  },
  {
    name: "no-openai-outside-adapters-and-factory",
    module: "openai",
    allowed: "^(packages/adapters/|apps/factory/)",
    where: "packages/adapters/src/openai, which apps/factory consumes",
  },
  {
    name: "no-react-outside-ui-and-web",
    module: "react(-dom)?",
    allowed: "^(packages/ui/|apps/web/)",
    where: "@palier/ui and apps/web",
  },
  {
    name: "no-next-outside-web",
    module: "next",
    allowed: "^apps/web/",
    where: "apps/web",
  },
  {
    name: "no-test-tooling-outside-testing",
    module: "msw|@electric-sql/pglite|fake-indexeddb|@playwright/test",
    allowed: "^(packages/testing/|apps/web/)",
    where: "@palier/testing, which every other package consumes the harness from",
  },
];

/**
 * The 3.1 arrows, as the set of workspaces each one may NOT reach.
 *
 * Two variants are generated from each entry. Production code gets the rule as
 * written. Test files get the same rule with `testing` removed from the
 * forbidden set, because implementation-plan.md 6.2 tier 3 requires exactly
 * that: the Dexie adapter's test imports `attemptStoreContract` from
 * `@palier/testing` and runs it against the real store. Forbidding that would
 * forbid the mechanism the ports layer exists for (ADR 10).
 */
const TEST_FILES = ["\\.test\\.tsx?$", "\\.test-d\\.ts$", "/__tests__/"];

const ARROWS = [
  {
    name: "domain-depends-on-nothing",
    from: "^packages/domain/",
    forbidden: ["engine", "app", "adapters", "ui", "testing"],
    forbidApps: true,
    comment:
      "@palier/domain sits at the bottom of the graph and depends on nothing (implementation-plan.md 3.1, ADR 10). If domain needs this, the thing it needs is in the wrong package.",
  },
  {
    name: "engine-depends-on-domain-only",
    from: "^packages/engine/",
    forbidden: ["app", "adapters", "ui", "testing"],
    forbidApps: true,
    comment:
      "@palier/engine may only reach @palier/domain (implementation-plan.md 3.1). It is pure algorithms; storage, network and prompts belong above it.",
  },
  {
    name: "app-depends-on-domain-and-engine-only",
    from: "^packages/app/",
    forbidden: ["adapters", "ui", "testing"],
    forbidApps: true,
    comment:
      "@palier/app holds ports and use cases and may only reach domain and engine (implementation-plan.md 3.1). A use case names a port, never a concrete adapter.",
  },
  {
    name: "adapters-depend-on-app-and-domain-only",
    from: "^packages/adapters/",
    forbidden: ["ui", "testing"],
    forbidApps: true,
    comment:
      "@palier/adapters may only reach @palier/app and @palier/domain (implementation-plan.md 3.1).",
  },
  {
    name: "ui-depends-on-domain-only",
    from: "^packages/ui/",
    forbidden: ["engine", "app", "adapters", "testing"],
    forbidApps: true,
    comment:
      "@palier/ui may reach @palier/domain for types and nothing else, never app or engine (implementation-plan.md 3.1). Business logic does not live in the design system.",
  },
  {
    name: "testing-depends-on-app-and-domain-only",
    from: "^packages/testing/",
    forbidden: ["adapters", "ui"],
    forbidApps: true,
    comment:
      "@palier/testing may only reach @palier/app and @palier/domain (implementation-plan.md 3.2). It holds in-memory ports; it must not depend on the concrete adapters it exists to substitute for.",
  },
  {
    name: "factory-depends-on-domain-and-adapters-only",
    from: "^apps/factory/",
    forbidden: ["engine", "ui", "testing"],
    forbidWeb: true,
    comment:
      "apps/factory is the content pipeline CLI and may only reach @palier/domain and the openai adapter (implementation-plan.md 3.2, ADR 14). It shares schemas with the app, not runtime.",
  },
];

const arrowTarget = (packages, { forbidApps, forbidWeb }) => {
  const parts = [];
  if (packages.length > 0) {
    parts.push(`^packages/(${packages.join("|")})/`);
  }
  if (forbidApps) parts.push("^apps/");
  else if (forbidWeb) parts.push("^apps/web/");
  return parts.join("|");
};

/**
 * Test-file suffixes, appended to a package prefix to make "a test file inside
 * this package". Kept as three flat patterns with a single `.*` each, because
 * dependency-cruiser rejects nested quantifiers as ReDoS-unsafe and bails out
 * rather than running, so an optional-directory group wrapping another
 * quantifier is not an option here.
 */
const TEST_SUFFIXES = [
  ".*\\.test\\.tsx?$",
  ".*\\.test-d\\.ts$",
  ".*/__tests__/",
];

const arrowRules = ARROWS.flatMap((arrow) => {
  const { name, from, forbidden, comment, forbidApps, forbidWeb } = arrow;
  const opts = { forbidApps, forbidWeb };
  const forTests = forbidden.filter((pkg) => pkg !== "testing");

  return [
    {
      name,
      severity: "error",
      comment,
      from: { path: from, pathNot: TEST_FILES },
      to: { path: arrowTarget(forbidden, opts) },
    },
    {
      name: `${name}-in-tests`,
      severity: "error",
      comment: `${comment} A test file may additionally import @palier/testing, which is how a port contract suite is run against a real implementation (implementation-plan.md 6.2 tier 3). Nothing else is relaxed for tests.`,
      from: { path: TEST_SUFFIXES.map((suffix) => `${from}${suffix}`) },
      to: { path: arrowTarget(forTests, opts) },
    },
  ];
});

module.exports = {
  forbidden: [
    {
      name: "no-circular",
      severity: "error",
      comment:
        "A cycle means these modules are really one module. Extract the shared part, or move the dependency so it points one way.",
      from: {},
      to: { circular: true },
    },
    {
      name: "no-unresolvable",
      severity: "error",
      comment:
        "This import does not resolve. The two usual causes: a relative import inside packages/* or apps/factory is missing its `.js` extension (they are ESM with NodeNext resolution, see AGENTS.md), or a workspace package has not been built yet — run `pnpm build`.",
      from: {},
      to: { couldNotResolve: true },
    },
    {
      name: "not-in-package-json",
      severity: "error",
      comment:
        "This module is imported but is not a dependency of the importing package's own package.json. Declare it there, or import something the package is allowed to reach.",
      from: { pathNot: ["\\.test\\.tsx?$", "\\.test-d\\.ts$", "/__tests__/"] },
      to: { dependencyTypes: ["npm-no-pkg", "npm-unknown"] },
    },
    {
      name: "not-in-package-json-tests",
      severity: "error",
      comment:
        "A test imported a module that no package.json declares. The test runner itself is the one exemption: `vitest` and `fast-check` are root devDependencies because the whole repository runs as one Vitest process (progress.md deviation D8), so no package declares them. Everything else a test imports must be declared.",
      from: { path: ["\\.test\\.tsx?$", "\\.test-d\\.ts$", "/__tests__/"] },
      to: {
        dependencyTypes: ["npm-no-pkg", "npm-unknown"],
        pathNot: "node_modules/(vitest|@vitest|fast-check)(/|$)",
      },
    },
    {
      name: "no-relative-escape",
      severity: "error",
      comment:
        "A relative import reached outside its own package. Cross-package imports go through the package name (`@palier/domain`) so they resolve through the exports map, which is what declares a package's public surface (AGENTS.md).",
      from: { path: "^(packages/[^/]+|apps/[^/]+)/" },
      to: {
        dependencyTypes: ["local"],
        pathNot: ["^$1/", "^node_modules/"],
      },
    },
    {
      name: "domain-imports-no-node-builtins",
      severity: "error",
      comment:
        "@palier/domain performs no I/O, so it imports no Node core module (implementation-plan.md 3.2). The ExamProfile loader parses an already-read value; reading the file belongs in an adapter.",
      from: { path: "^packages/domain/src/" },
      to: { dependencyTypes: ["core"] },
    },
    {
      name: "domain-imports-only-zod",
      severity: "error",
      comment:
        "@palier/domain takes no framework dependency. `zod` is the single exception, because the content schemas are its job (implementation-plan.md 3.2).",
      from: { path: "^packages/domain/src/" },
      to: {
        dependencyTypes: ["npm", "npm-dev", "npm-optional", "npm-peer", "npm-bundled"],
        pathNot: "node_modules/(zod|@palier)/",
      },
    },
    {
      name: "engine-has-no-dependencies",
      severity: "error",
      comment:
        "@palier/engine is pure and takes no npm or Node core dependency at all (implementation-plan.md 3.2, architecture.md 7). Clock and Random arrive as parameters (ADR 7, ADR 8). If you need a library here, the code probably belongs in @palier/app.",
      from: { path: "^packages/engine/src/" },
      to: {
        dependencyTypes: [
          "core",
          "npm",
          "npm-dev",
          "npm-optional",
          "npm-peer",
          "npm-bundled",
        ],
        pathNot: "node_modules/@palier/",
      },
    },
    {
      name: "no-cross-adapter-imports",
      severity: "error",
      comment:
        "Adapters do not import each other (implementation-plan.md 3.2, ADR 10). Each is one subpath export and must be substitutable on its own. Shared code goes down into @palier/app or @palier/domain.",
      from: { path: "^packages/adapters/src/([^/]+)/" },
      to: {
        path: "^packages/adapters/src/([^/]+)/",
        pathNot: "^packages/adapters/src/$1/",
      },
    },
    ...arrowRules,
    ...VENDOR_BANS.map(({ name, module, allowed, where }) => ({
      name,
      severity: "error",
      comment: `\`${module}\` belongs in ${where} and nowhere else (implementation-plan.md 4.1). Depend on the port instead, and let the composition root wire the concrete thing.`,
      from: { pathNot: allowed },
      to: { path: `node_modules/(${module})(/|$)` },
    })),
    {
      name: "no-vitest-in-shipped-source",
      severity: "error",
      comment:
        "A non-test source file imported vitest, which would make the test runner a runtime dependency of the shipped package. The exception is @palier/testing/src/contracts, whose exported contract suites legitimately call describe and it.",
      from: {
        path: "^(packages|apps)/[^/]+/src/",
        pathNot: [
          "\\.test\\.tsx?$",
          "\\.test-d\\.ts$",
          "/__tests__/",
          "^packages/testing/src/",
        ],
      },
      to: { path: "node_modules/(vitest|@vitest)(/|$)" },
    },
  ],

  options: {
    /**
     * Type-only imports count. `@palier/ui` importing an engine *type* is still
     * an arrow pointing the wrong way, and "no vendor type crosses a package
     * boundary" is unenforceable without this.
     */
    tsPreCompilationDeps: true,
    tsConfig: { fileName: "tsconfig.base.json" },
    // `doNotFollow` stops the cruise at the edge of node_modules but still
    // RECORDS the dependency, which is what the vendor bans below match on.
    // Putting node_modules in `exclude` instead drops those modules from the
    // graph altogether and silently makes every vendor ban vacuous — that bug
    // shipped once and was caught only by running the deliberate violation.
    // `doNotFollow` stops the cruise at these boundaries but still RECORDS the
    // dependency, which is what the rules below match on. `exclude` would drop
    // the module from the graph altogether and make those rules vacuous.
    //
    // Both entries were learned the hard way, by running the deliberate
    // violation and watching a green build:
    //   - node_modules in `exclude` made every vendor ban vacuous;
    //   - dist in `exclude` made every arrow rule vacuous, because a workspace
    //     import resolves through the exports map to `<pkg>/dist/index.js`.
    // The cruise entry points are the `src` directories (see the `boundaries`
    // script in package.json), so dist is only ever a resolved target.
    doNotFollow: { path: "(^|/)(node_modules|dist)/" },
    exclude: {
      path: "(^|/)(coverage|\\.next|\\.turbo)/",
    },
    enhancedResolveOptions: {
      exportsFields: ["exports"],
      conditionNames: ["import", "types", "node", "default"],
      extensions: [".ts", ".tsx", ".js", ".mjs", ".cjs", ".json"],
      mainFields: ["module", "main", "types"],
    },
    cache: {
      folder: "node_modules/.cache/dependency-cruiser",
      strategy: "content",
    },
  },
};
