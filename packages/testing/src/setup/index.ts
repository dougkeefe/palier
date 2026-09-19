/**
 * The side-effectful setup entry, for a Vitest project's `setupFiles`. It is a
 * separate subpath export because importing it has effects, which is exactly
 * what a package root should not.
 */
import "./fake-indexeddb.js";
