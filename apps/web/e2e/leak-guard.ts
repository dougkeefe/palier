import { readFile } from "node:fs/promises";

import { type BrowserContext, type Download, expect, type Page } from "@playwright/test";

/**
 * The tier-11 key-leak guard (implementation-plan.md §6.2, Phase 4 exit criterion 1, [R12]).
 * Not a spec file: `key-leak.spec.ts` (hermetic) and `key-leak-production.spec.ts` (real
 * IndexedDB and the service worker) set {@link SENTINEL} through the UI, drive the journeys,
 * and then ask this guard whether the sentinel escaped.
 *
 * It watches from outside the page, through the browser context, so nothing the app does
 * can route around it: every request (the service worker's included), every same-origin API
 * response, every WebSocket frame, every console message and every uncaught error. Then it
 * dumps what the page holds at rest: both Web Storage areas, every IndexedDB store row by row,
 * the Cache Storage URLs, the DOM, and every field's live value.
 *
 * The one place the sentinel may appear is a request to `api.openai.com` (§6.3), and
 * {@link LeakWatch.openAiAuthorizations} lets a spec prove it did, so the guard can never pass
 * because the key was never in play.
 */

/** A syntactically plausible key that no real account holds, and that nothing else contains. */
export const SENTINEL = "sk-palier-sentinel-5e17c0de9a1b4f6e8d2c7b3a";

/** The only origin the key may reach (architecture.md §6.3). */
const OPENAI_ORIGIN = "https://api.openai.com";

type Seen = { readonly where: string; readonly text: string };

export type LeakWatch = {
  /** Every `authorization` header sent to OpenAI: the positive control. */
  readonly openAiAuthorizations: () => readonly string[];
  /** Fail, naming the place, if the sentinel is anywhere but a request to OpenAI. */
  readonly assertNoLeak: (pages: readonly Page[]) => Promise<void>;
};

/**
 * Stub OpenAI's models endpoint, the one call `/settings/key` makes. It answers CORS like the
 * real API, because the browser calls it cross-origin. `status` lets a spec script a failure.
 */
export const stubOpenAi = async (
  context: BrowserContext,
  answer: () => { status: number; body: unknown } = () => ({
    status: 200,
    body: { object: "list", data: [{ id: "gpt-stub", object: "model" }] },
  }),
) => {
  await context.route(`${OPENAI_ORIGIN}/**`, async (route) => {
    const cors = {
      "access-control-allow-origin": "*",
      "access-control-allow-headers": "authorization, content-type",
      "access-control-allow-methods": "GET, POST, OPTIONS",
    };
    if (route.request().method() === "OPTIONS") return route.fulfill({ status: 204, headers: cors });
    const { status, body } = answer();
    return route.fulfill({ status, headers: { ...cors, "content-type": "application/json" }, body: JSON.stringify(body) });
  });
};

/** Start watching a context. Call it before the first page opens. */
export const watchForLeaks = (context: BrowserContext): LeakWatch => {
  const seen: Seen[] = [];
  const pending: Promise<unknown>[] = [];
  const authorizations: string[] = [];

  context.on("request", (request) => {
    pending.push(
      request.allHeaders().then((headers) => {
        const url = request.url();
        if (url.startsWith(OPENAI_ORIGIN)) {
          if (headers.authorization !== undefined) authorizations.push(headers.authorization);
          return;
        }
        seen.push({ where: `request URL ${url}`, text: url });
        seen.push({ where: `request headers ${url}`, text: JSON.stringify(headers) });
        seen.push({ where: `request body ${url}`, text: request.postData() ?? "" });
      }),
    );
  });
  context.on("response", (response) => {
    const url = new URL(response.url());
    // What our own server sends back: a pull would show the key if a push had stored it.
    if (!url.pathname.startsWith("/api/")) return;
    pending.push(
      response
        .text()
        .then((text) => seen.push({ where: `response body ${url.href}`, text }))
        .catch(() => undefined),
    );
  });
  context.on("console", (message) => seen.push({ where: "console", text: message.text() }));
  context.on("weberror", (error) =>
    seen.push({ where: "uncaught error", text: `${error.error().message}\n${error.error().stack ?? ""}` }),
  );
  const watchSockets = (page: Page) =>
    page.on("websocket", (socket) =>
      socket.on("framesent", (frame) => seen.push({ where: `websocket ${socket.url()}`, text: String(frame.payload) })),
    );
  context.pages().forEach(watchSockets);
  context.on("page", watchSockets);

  return {
    openAiAuthorizations: () => authorizations,
    assertNoLeak: async (pages) => {
      await Promise.all(pending);
      for (const page of pages) {
        for (const place of await atRest(page)) seen.push(place);
      }
      const leaks = seen.filter((s) => s.text.includes(SENTINEL)).map((s) => s.where);
      expect(leaks, "the sentinel key reached somewhere other than OpenAI").toEqual([]);
    },
  };
};

/** Everything the page holds, rendered to text. Runs in the browser. */
const atRest = (page: Page): Promise<Seen[]> =>
  page.evaluate(async () => {
    const out: { where: string; text: string }[] = [];
    // Bytes read as latin1, so plaintext stored as bytes shows up as the ASCII it is.
    const bytes = (view: Uint8Array) => Array.from(view, (b) => String.fromCharCode(b)).join("");
    const render = (value: unknown): unknown => {
      if (value instanceof Uint8Array) return bytes(value);
      if (value instanceof ArrayBuffer) return bytes(new Uint8Array(value));
      if (ArrayBuffer.isView(value)) return bytes(new Uint8Array(value.buffer));
      if (typeof CryptoKey !== "undefined" && value instanceof CryptoKey) return "[CryptoKey]";
      if (value instanceof Date) return value.toISOString();
      if (Array.isArray(value)) return value.map(render);
      if (value !== null && typeof value === "object") {
        return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, render(v)]));
      }
      return value;
    };

    for (const [name, area] of [
      ["localStorage", localStorage],
      ["sessionStorage", sessionStorage],
    ] as const) {
      for (let i = 0; i < area.length; i++) {
        const key = area.key(i) ?? "";
        out.push({ where: `${name}[${key}]`, text: `${key}=${area.getItem(key) ?? ""}` });
      }
    }

    for (const { name } of await indexedDB.databases()) {
      if (name === undefined) continue;
      const db = await new Promise<IDBDatabase>((resolve, reject) => {
        const open = indexedDB.open(name);
        open.onsuccess = () => resolve(open.result);
        open.onerror = () => reject(open.error);
      });
      for (const store of Array.from(db.objectStoreNames)) {
        const rows = await new Promise<unknown[]>((resolve, reject) => {
          const request = db.transaction(store, "readonly").objectStore(store).getAll();
          request.onsuccess = () => resolve(request.result);
          request.onerror = () => reject(request.error);
        });
        out.push({ where: `IndexedDB ${name}.${store}`, text: JSON.stringify(rows.map(render)) });
      }
      db.close();
    }

    if (typeof caches !== "undefined") {
      for (const cacheName of await caches.keys()) {
        const requests = await (await caches.open(cacheName)).keys();
        out.push({ where: `Cache Storage ${cacheName}`, text: requests.map((r) => r.url).join("\n") });
      }
    }

    out.push({ where: "DOM", text: document.documentElement.outerHTML });
    for (const field of Array.from(document.querySelectorAll("input, textarea"))) {
      out.push({ where: "a field's value", text: (field as HTMLInputElement).value });
    }
    return out;
  });

/** The ids of the rows in one IndexedDB store, so a spec can see what the vault holds at rest. */
export const idsAtRest = (page: Page, database: string, store: string): Promise<string[]> =>
  page.evaluate(
    async ({ database, store }) => {
      const db = await new Promise<IDBDatabase>((resolve, reject) => {
        const open = indexedDB.open(database);
        open.onsuccess = () => resolve(open.result);
        open.onerror = () => reject(open.error);
      });
      const keys = await new Promise<IDBValidKey[]>((resolve, reject) => {
        const request = db.transaction(store, "readonly").objectStore(store).getAllKeys();
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });
      db.close();
      return keys.map(String);
    },
    { database, store },
  );

/** The text of a download: an export file must not carry the key either. */
export const downloadedText = async (download: Download): Promise<string> => {
  const path = await download.path();
  return readFile(path, "utf8");
};
