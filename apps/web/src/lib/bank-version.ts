/**
 * Where the committed bank is served and which version this build reads. The
 * `content/bank/` tree is copied under `public/content/` at build (scripts/
 * prepare-public.mjs), and every manifest `path` already starts `bank/v{n}/`, so
 * the adapter's base is the directory that *contains* `bank/`. Bank versions are
 * additive (architecture.md §5.5): a new one is a new path, so moving this number
 * is the whole of a bank migration on the client. The service worker precaches
 * this version only (progress.md D82).
 *
 * Its own module, with no imports, so the server can name the version too
 * (`GET /api/health`, the diagnostic bundle) without reaching into the browser-only
 * composition root (D59, D140). `prepare-public.mjs` and `item-statistics.mjs` read
 * these two lines by pattern, so keep their shape.
 */
export const BANK_BASE_PATH = "/content";
export const BANK_VERSION = 4;
