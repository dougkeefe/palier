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
 *
 * Writing workshop submissions are held to R12 the same way (progress.md D105–D108): a spec
 * writes {@link SUBMISSION_SENTINEL} into its text, and `assertNoLeak`'s `deviceOnly` lets it
 * appear only on this device (the page, a field, the `writingSubmissions` store) and in a
 * request to OpenAI, which {@link LeakWatch.openAiBodies} proves it reached.
 */

/** A syntactically plausible key that no real account holds, and that nothing else contains. */
export const SENTINEL = "sk-palier-sentinel-5e17c0de9a1b4f6e8d2c7b3a";

/**
 * A word a spec writes into a workshop submission, so the guard can follow the text. Like the
 * key, it may reach OpenAI; unlike the key, it may also sit on the device it was written on.
 */
export const SUBMISSION_SENTINEL = "Quenouillard5e17";

/** The only origin the key may reach (architecture.md §6.3). */
const OPENAI_ORIGIN = "https://api.openai.com";

/**
 * `onDevice` marks a place that is this device's own copy: the page as drawn, a field's
 * value, and the workshop's store. A submission may be there, and nowhere else but OpenAI.
 */
type Seen = { readonly where: string; readonly text: string; readonly onDevice?: boolean };

export type LeakCheck = {
  /** Text that may stay on this device and go to OpenAI, and must reach nowhere else. */
  readonly deviceOnly?: readonly string[];
  /** Text that must be nowhere at all: not sent, not stored, not on the page. */
  readonly nowhere?: readonly string[];
};

export type LeakWatch = {
  /** Every `authorization` header sent to OpenAI: the positive control. */
  readonly openAiAuthorizations: () => readonly string[];
  /** Every request body sent to OpenAI, so a spec can prove a submission went there. */
  readonly openAiBodies: () => readonly string[];
  /**
   * Fail, naming the place, if the sentinel is anywhere but a request to OpenAI, if a
   * `deviceOnly` text left the device other than for OpenAI, or if a `nowhere` text is anywhere.
   */
  readonly assertNoLeak: (pages: readonly Page[], check?: LeakCheck) => Promise<void>;
};

export type OpenAiAnswer = { status: number; body: unknown };

/** OpenAI's model list, the answer `/settings/key`'s check reads. */
export const MODELS_ANSWER: OpenAiAnswer = {
  status: 200,
  body: { object: "list", data: [{ id: "gpt-stub", object: "model" }] },
};

const criterion = { band: "B", evidence: "Le ton convient à un message de service." };

/**
 * A chat completion carrying writing feedback, in the shape the adapter reads (D105). Every
 * excerpt must be words of the text sent, or the adapter refuses the answer; with none, it
 * fits any text.
 */
export const feedbackAnswer = (
  errors: readonly { excerpt: string; correction: string; rule: string }[] = [],
  modelAnswer = "Madame, Monsieur, je vous informe que votre demande est en cours de traitement.",
): OpenAiAnswer => ({
  status: 200,
  body: {
    choices: [
      {
        message: {
          content: JSON.stringify({
            criteria: { register: criterion, structure: criterion, grammar: criterion, vocabulary: criterion, task: criterion },
            errors,
            modelAnswer,
          }),
        },
      },
    ],
    usage: { prompt_tokens: 2_400, completion_tokens: 1_900 },
  },
});

/**
 * Stub OpenAI: the models endpoint `/settings/key` checks, and the completions the workshop
 * asks for feedback with. It answers CORS like the real API, because the browser calls it
 * cross-origin. `answer` sees the request's path, so a spec can script a failure for one call.
 */
export const stubOpenAi = async (
  context: BrowserContext,
  answer: (path: string) => OpenAiAnswer = (path) => (path.endsWith("/chat/completions") ? feedbackAnswer() : MODELS_ANSWER),
) => {
  await context.route(`${OPENAI_ORIGIN}/**`, async (route) => {
    const cors = {
      "access-control-allow-origin": "*",
      "access-control-allow-headers": "authorization, content-type",
      "access-control-allow-methods": "GET, POST, OPTIONS",
    };
    if (route.request().method() === "OPTIONS") return route.fulfill({ status: 204, headers: cors });
    const { status, body } = answer(new URL(route.request().url()).pathname);
    return route.fulfill({ status, headers: { ...cors, "content-type": "application/json" }, body: JSON.stringify(body) });
  });
};

/** Start watching a context. Call it before the first page opens. */
export const watchForLeaks = (context: BrowserContext): LeakWatch => {
  const seen: Seen[] = [];
  const pending: Promise<unknown>[] = [];
  const authorizations: string[] = [];
  const openAiBodies: string[] = [];

  // Headers are read as sent, synchronously: `allHeaders()` waits for a response, and a
  // request a reload aborts never gets one. Every header a page sets is among them.
  context.on("request", (request) => {
    const url = request.url();
    const headers = request.headers();
    if (url.startsWith(OPENAI_ORIGIN)) {
      if (headers.authorization !== undefined) authorizations.push(headers.authorization);
      openAiBodies.push(request.postData() ?? "");
      return;
    }
    seen.push({ where: `request URL ${url}`, text: url });
    seen.push({ where: `request headers ${url}`, text: JSON.stringify(headers) });
    seen.push({ where: `request body ${url}`, text: request.postData() ?? "" });
  });
  // What our own server sends back: a pull would show the key if a push had stored it. Read
  // once the body has fully arrived, so reading it can never hang.
  context.on("requestfinished", (request) => {
    const url = new URL(request.url());
    if (url.origin === OPENAI_ORIGIN || !url.pathname.startsWith("/api/")) return;
    pending.push(
      request
        .response()
        .then((response) => response?.text())
        .then((text) => seen.push({ where: `response body ${url.href}`, text: text ?? "" }))
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
    openAiBodies: () => openAiBodies,
    assertNoLeak: async (pages, { deviceOnly = [], nowhere = [] } = {}) => {
      await Promise.all(pending);
      // This call's own dump, so an earlier check's page does not answer for this one.
      const places = [...seen];
      for (const page of pages) places.push(...(await atRest(page)));
      const found = (needle: string, where: readonly Seen[]) =>
        where.filter((s) => s.text.includes(needle)).map((s) => s.where);
      expect(found(SENTINEL, places), "the sentinel key reached somewhere other than OpenAI").toEqual([]);
      for (const needle of deviceOnly) {
        const offDevice = places.filter((s) => s.onDevice !== true);
        expect(found(needle, offDevice), `"${needle}" reached somewhere other than OpenAI and the workshop's own copy on this device`).toEqual([]);
      }
      for (const needle of nowhere) {
        expect(found(needle, places), `"${needle}" is somewhere it should never be`).toEqual([]);
      }
    },
  };
};

/** Everything the page holds, rendered to text. Runs in the browser. */
const atRest = (page: Page): Promise<Seen[]> =>
  page.evaluate(async () => {
    const out: { where: string; text: string; onDevice?: boolean }[] = [];
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
        // The workshop's own store is where a submission lives on the device (D106).
        out.push({
          where: `IndexedDB ${name}.${store}`,
          text: JSON.stringify(rows.map(render)),
          onDevice: store === "writingSubmissions",
        });
      }
      db.close();
    }

    if (typeof caches !== "undefined") {
      for (const cacheName of await caches.keys()) {
        const requests = await (await caches.open(cacheName)).keys();
        out.push({ where: `Cache Storage ${cacheName}`, text: requests.map((r) => r.url).join("\n") });
      }
    }

    out.push({ where: "DOM", text: document.documentElement.outerHTML, onDevice: true });
    for (const field of Array.from(document.querySelectorAll("input, textarea"))) {
      out.push({ where: "a field's value", text: (field as HTMLInputElement).value, onDevice: true });
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
