/**
 * apps/web needs its own cruise because dependency-cruiser takes one tsConfig
 * per run, and apps/web is the only workspace on `moduleResolution: bundler`
 * with a `@/*` path alias (see the comment in the root tsconfig.json, and
 * progress.md deviation D2 for why it is split from the tsc -b solution too).
 *
 * The rule set is the root one. Only the TypeScript config differs, so the
 * arrows and vendor bans stay defined in exactly one place.
 */
const root = require("../../.dependency-cruiser.cjs");

module.exports = {
  ...root,
  options: {
    ...root.options,
    tsConfig: { fileName: "tsconfig.json" },
  },
};
