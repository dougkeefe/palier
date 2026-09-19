/**
 * Side-effect import that puts a working IndexedDB on `globalThis`, so Dexie
 * adapter tests run in Node in the fast lane rather than only under Playwright
 * (implementation-plan.md 6.1).
 */
import "fake-indexeddb/auto";
