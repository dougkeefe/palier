import fc from "fast-check";

/**
 * Property runs are reduced in the fast lane and exhaustive nightly
 * (implementation-plan.md 6.5: "property (reduced runs)" in Fast, "full
 * property runs" Nightly). Set once here so no individual test has to remember.
 */
fc.configureGlobal({
  numRuns: process.env.CI_LANE === "nightly" ? 10_000 : 50,
});
