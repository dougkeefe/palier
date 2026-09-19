import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

/**
 * Named exports only (docs/implementation-plan.md). Next.js file conventions are
 * the one exception: the framework resolves these modules by their default export,
 * so the list below is exhaustive and should only grow when Next.js adds a
 * convention we actually use.
 */
const FRAMEWORK_DEFAULT_EXPORT_FILES = [
  "src/app/**/{page,layout,route,template,default,loading,error,global-error,not-found,forbidden,unauthorized}.{ts,tsx}",
  "src/app/**/{icon,apple-icon,opengraph-image,twitter-image}.{ts,tsx}",
  "src/app/**/{sitemap,robots,manifest}.ts",
  "src/{instrumentation,instrumentation-client,proxy}.ts",
  "next.config.ts",
  "eslint.config.mjs",
  "postcss.config.mjs",
];

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
  {
    rules: {
      "no-restricted-syntax": [
        "error",
        {
          selector: "ExportDefaultDeclaration",
          message:
            "Named exports only. Default exports are allowed solely in Next.js file conventions.",
        },
      ],
    },
  },
  {
    files: FRAMEWORK_DEFAULT_EXPORT_FILES,
    rules: {
      "no-restricted-syntax": "off",
    },
  },
]);

export default eslintConfig;
