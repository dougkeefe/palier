import { readFileSync } from "node:fs";
import { fileURLToPath, pathToFileURL } from "node:url";
import { runInNewContext } from "node:vm";

import { SELF_HOSTED_MESSAGES, SELF_HOSTED_VERSION } from "@palier/adapters/openai";
import { afterEach, describe, expect, it, vi } from "vitest";

/**
 * The self-hosted realtime secret endpoint (ADR 3's escape, architecture.md §6.3, progress.md D192): the one-file
 * Cloudflare Worker and the one-file Vercel function in `selfhost/`, which users deploy on their own accounts.
 *
 * They are deployable files, not a workspace package, so they are loaded here by their file URL rather than imported
 * by a relative path (`no-relative-escape` keeps relative imports inside a package). Every behaviour is run against
 * both, through each platform's own entry point, and their shared code is held identical.
 */

const SELFHOST = new URL("../../../../selfhost/", import.meta.url);
const WORKER_FILE = new URL("cloudflare-worker.mjs", SELFHOST);
const VERCEL_FILE = new URL("vercel/api/realtime-secret.mjs", SELFHOST);
const BEGIN = "// ---- palier-selfhost: shared code begins ----";
const END = "// ---- palier-selfhost: shared code ends ----";

type Handler = (request: Request) => Promise<Response>;
type WorkerModule = { readonly default: { readonly fetch: (request: Request, env: Record<string, string | undefined>) => Promise<Response> } };
type VercelModule = { readonly GET: Handler; readonly POST: Handler };

const load = async <T>(file: URL): Promise<T> => (await import(/* @vite-ignore */ pathToFileURL(fileURLToPath(file)).href)) as T;

const PALIER = "https://palier.example.org";
const ENDPOINT = "https://secret.example.net";
const KEY = "sk-selfhost-test-4c2e";

/** Each deployment, configured as its platform configures it, behind one handler. */
const DEPLOYMENTS: readonly { readonly name: string; readonly handler: (env: Record<string, string | undefined>) => Promise<Handler> }[] = [
  {
    name: "Cloudflare Worker",
    handler: async (env) => {
      const worker = await load<WorkerModule>(WORKER_FILE);
      return (request) => worker.default.fetch(request, env);
    },
  },
  {
    name: "Vercel function",
    handler: async (env) => {
      const fn = await load<VercelModule>(VERCEL_FILE);
      vi.stubEnv("ALLOWED_ORIGIN", env.ALLOWED_ORIGIN);
      vi.stubEnv("OPENAI_BASE_URL", env.OPENAI_BASE_URL);
      // Vercel routes a method to the export of that name; one with no export never reaches this code.
      return (request) => (request.method === "GET" ? fn.GET(request) : fn.POST(request));
    },
  },
];

type Upstream = { url: string; authorization: string | null; body: unknown };

/** OpenAI, canned: what it was asked, and the answer given. */
const openAi = (answer: () => Response | Promise<Response>) => {
  const asked: Upstream[] = [];
  vi.stubGlobal("fetch", async (url: string, init: RequestInit) => {
    const headers = new Headers(init.headers);
    asked.push({ url, authorization: headers.get("authorization"), body: JSON.parse(String(init.body)) as unknown });
    return answer();
  });
  return asked;
};

const minted = () => Response.json({ value: "ek_selfhosted_1", expires_at: 1_790_000_060, session: { model: "x" } });

const mintRequest = ({
  origin = ENDPOINT,
  authorization = `Bearer ${KEY}`,
  body = { model: "gpt-realtime-2.1", voice: "cedar" } as unknown,
}: { origin?: string | null; authorization?: string | null; body?: unknown } = {}) => {
  const headers = new Headers({ "content-type": "application/json" });
  if (origin !== null) headers.set("origin", origin);
  if (authorization !== null) headers.set("authorization", authorization);
  return new Request(`${ENDPOINT}/api/realtime-secret`, { method: "POST", headers, body: typeof body === "string" ? body : JSON.stringify(body) });
};

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe("the two deployable files", () => {
  const text = (file: URL) => readFileSync(file, "utf8");
  const shared = (file: URL) => {
    const source = text(file);
    expect(source.split(BEGIN)).toHaveLength(2);
    expect(source.split(END)).toHaveLength(2);
    return source.slice(source.indexOf(BEGIN), source.indexOf(END) + END.length);
  };

  it("share their code word for word, so a fix to one is a fix to both", () => {
    expect(shared(VERCEL_FILE)).toBe(shared(WORKER_FILE));
  });

  it.each([
    ["the Worker", WORKER_FILE],
    ["the function", VERCEL_FILE],
  ])("%s logs nothing: there is no console call to put the key in a log", (_name, file) => {
    expect(text(file)).not.toMatch(/\bconsole\s*\./);
  });

  it.each([
    ["the Worker", WORKER_FILE],
    ["the function", VERCEL_FILE],
  ])("%s imports nothing, so it deploys as the one file it is", (_name, file) => {
    expect(text(file)).not.toMatch(/^\s*import\s/m);
  });
});

describe.each(DEPLOYMENTS)("the self-hosted endpoint, as a $name", ({ handler }) => {
  const configured = (env: Record<string, string | undefined> = {}) => handler({ ALLOWED_ORIGIN: PALIER, ...env });

  describe("its page", () => {
    it("serves a page that speaks Palier's protocol to the configured origin", async () => {
      const response = await (await configured())(new Request(`${ENDPOINT}/api/realtime-secret`));
      const html = await response.text();

      expect(response.status).toBe(200);
      expect(response.headers.get("content-type")).toBe("text/html; charset=utf-8");
      expect(response.headers.get("cache-control")).toBe("no-store");
      expect(html).toContain(JSON.stringify(SELF_HOSTED_MESSAGES));
      expect(html).toContain(`const VERSION = ${String(SELF_HOSTED_VERSION)};`);
      expect(html).toContain(`const ALLOWED = ${JSON.stringify(PALIER)};`);
    });

    it("allows only its own nonce'd script and style, and fetches to its own origin", async () => {
      const response = await (await configured())(new Request(`${ENDPOINT}/`));
      const policy = response.headers.get("content-security-policy") ?? "";
      const nonce = /script-src 'nonce-([^']+)'/.exec(policy)?.[1];
      const html = await response.text();

      expect(policy).toContain("default-src 'none'");
      expect(policy).toContain("connect-src 'self'");
      expect(policy).toContain("frame-ancestors 'none'");
      expect(nonce).toBeDefined();
      expect(html).toContain(`<script nonce="${String(nonce)}">`);
      expect(response.headers.get("referrer-policy")).toBe("no-referrer");
    });

    it("gives a fresh nonce to every page", async () => {
      const handle = await configured();
      const nonceOf = async () => (await handle(new Request(`${ENDPOINT}/`))).headers.get("content-security-policy");

      expect(await nonceOf()).not.toBe(await nonceOf());
    });

    it("sends no opener policy, which would cut the page off from the Palier that opened it", async () => {
      const response = await (await configured())(new Request(`${ENDPOINT}/`));

      expect(response.headers.get("cross-origin-opener-policy")).toBeNull();
    });

    it("reduces its configuration to an origin, so no path or markup in it reaches the page", async () => {
      const html = await (await configured({ ALLOWED_ORIGIN: "https://x.example/</script><script>alert(1)" }))(new Request(`${ENDPOINT}/`)).then(
        (response) => response.text(),
      );

      expect(html).toContain('const ALLOWED = "https://x.example";');
      expect(html).not.toContain("<script>alert(1)");
    });

    it("says it is not configured when it has no allowed origin, and talks to nobody", async () => {
      const html = await (await configured({ ALLOWED_ORIGIN: undefined }))(new Request(`${ENDPOINT}/`)).then((response) => response.text());

      expect(html).toContain("const ALLOWED = null;");
    });
  });

  describe("its mint", () => {
    it("asks OpenAI for a 60-second pass with the key, the model and the voice, and answers the pass alone", async () => {
      const asked = openAi(minted);

      const response = await (await configured())(mintRequest());

      expect(response.status).toBe(200);
      expect(response.headers.get("cache-control")).toBe("no-store");
      expect(await response.json()).toEqual({ value: "ek_selfhosted_1", expiresAt: new Date(1_790_000_060 * 1000).toISOString() });
      expect(asked).toEqual([
        {
          url: "https://api.openai.com/v1/realtime/client_secrets",
          authorization: `Bearer ${KEY}`,
          body: {
            expires_after: { anchor: "created_at", seconds: 60 },
            session: { type: "realtime", model: "gpt-realtime-2.1", audio: { output: { voice: "cedar" } } },
          },
        },
      ]);
    });

    it("asks the OpenAI address it is configured with", async () => {
      const asked = openAi(minted);

      await (await configured({ OPENAI_BASE_URL: "http://localhost:3201/v1" }))(mintRequest());

      expect(asked[0]?.url).toBe("http://localhost:3201/v1/realtime/client_secrets");
    });

    it.each([
      ["no origin", null],
      ["another origin", "https://elsewhere.example.com"],
      ["Palier's own origin", PALIER],
    ])("refuses a mint from %s: only its own page may ask", async (_label, origin) => {
      const asked = openAi(minted);

      const response = await (await configured())(mintRequest({ origin }));

      expect(response.status).toBe(403);
      expect(await response.json()).toEqual({ error: "forbidden-origin" });
      expect(asked).toEqual([]);
    });

    it.each([
      ["no header", null],
      ["no bearer", KEY],
      ["a space in it", "Bearer sk-a b"],
      ["a key too long to be one", `Bearer sk-${"a".repeat(600)}`],
    ])("refuses a mint with %s as missing-key", async (_label, authorization) => {
      const asked = openAi(minted);

      const response = await (await configured())(mintRequest({ authorization }));

      expect(response.status).toBe(401);
      expect(await response.json()).toEqual({ error: "missing-key" });
      expect(asked).toEqual([]);
    });

    it.each([
      ["no body", "not json"],
      ["no model", { voice: "cedar" }],
      ["a model that is not a name", { model: "../../v1/files", voice: "cedar" }],
      ["a voice that is not a name", { model: "gpt-realtime-2.1", voice: "Cedar Voice" }],
    ])("refuses a mint with %s before it reaches OpenAI", async (_label, body) => {
      const asked = openAi(minted);

      const response = await (await configured())(mintRequest({ body }));

      expect(response.status).toBe(400);
      expect(await response.json()).toEqual({ error: "bad-request" });
      expect(asked).toEqual([]);
    });

    it("refuses every mint when it has no allowed origin", async () => {
      const asked = openAi(minted);

      const response = await (await configured({ ALLOWED_ORIGIN: "not an origin" }))(mintRequest());

      expect(response.status).toBe(500);
      expect(await response.json()).toEqual({ error: "not-configured" });
      expect(asked).toEqual([]);
    });

    it.each([
      [401, 401, "invalid-key"],
      [429, 429, "rate-limited"],
      [500, 502, "upstream"],
      [403, 502, "upstream"],
    ])("answers OpenAI's %i as %i %s, never OpenAI's own words", async (upstream, status, error) => {
      openAi(() => Response.json({ error: { message: `Incorrect API key provided: ${KEY}` } }, { status: upstream }));

      const response = await (await configured())(mintRequest());
      const body = await response.text();

      expect(response.status).toBe(status);
      expect(JSON.parse(body)).toEqual({ error });
      expect(body).not.toContain(KEY);
    });

    it.each([
      ["not JSON", () => new Response("<html>", { status: 200 })],
      ["no value", () => Response.json({ expires_at: 1 })],
      ["no expiry", () => Response.json({ value: "ek_1" })],
    ])("answers upstream when OpenAI's answer is %s", async (_label, answer) => {
      openAi(answer);

      expect(await (await (await configured())(mintRequest())).json()).toEqual({ error: "upstream" });
    });

    it("answers upstream when OpenAI cannot be reached", async () => {
      vi.stubGlobal("fetch", () => Promise.reject(new TypeError("fetch failed")));

      const response = await (await configured())(mintRequest());

      expect(response.status).toBe(502);
      expect(await response.json()).toEqual({ error: "upstream" });
    });
  });

});

/**
 * The Worker alone: Cloudflare hands it every method, while Vercel answers a method with no export itself, so this
 * branch of the shared code runs only on Cloudflare.
 */
describe("the self-hosted endpoint, as a Cloudflare Worker, on another method", () => {
  it.each(["PUT", "DELETE", "OPTIONS"])("refuses %s", async (method) => {
    const worker = await load<WorkerModule>(WORKER_FILE);
    const response = await worker.default.fetch(new Request(`${ENDPOINT}/`, { method }), { ALLOWED_ORIGIN: PALIER });

    expect(response.status).toBe(405);
    expect(response.headers.get("allow")).toBe("GET, POST");
  });
});

/**
 * The page's own script, run in a sandbox with a fake window, opener and `fetch`: the browser half of the protocol,
 * held to the adapter's (`selfHostedRealtimeSecrets`). A real browser runs it in the end-to-end test.
 */
describe("the page's script", () => {
  type Posted = { readonly data: Record<string, unknown>; readonly origin: string };

  /** `null` deploys it with no allowed origin at all. */
  const pageScriptOf = async (allowed: string | null): Promise<string> => {
    const worker = await load<WorkerModule>(WORKER_FILE);
    const env = allowed === null ? {} : { ALLOWED_ORIGIN: allowed };
    const html = await (await worker.default.fetch(new Request(`${ENDPOINT}/api/realtime-secret`), env)).text();
    const script = /<script nonce="[^"]+">([\s\S]*)<\/script>/.exec(html)?.[1];
    if (script === undefined) throw new Error("no script");
    return script;
  };

  const runPage = async ({
    allowed = PALIER,
    withOpener = true,
    answer = () => Promise.resolve({ ok: true, json: () => Promise.resolve({ value: "ek_page_1", expiresAt: "2026-10-02T12:01:00.000Z" }) }),
  }: {
    allowed?: string | null;
    withOpener?: boolean;
    answer?: (url: string, init: { method: string; headers: Record<string, string>; body: string }) => Promise<unknown>;
  } = {}) => {
    const posted: Posted[] = [];
    const fetched: { url: string; init: { method: string; headers: Record<string, string>; body: string } }[] = [];
    const lines: string[] = [];
    let listener: ((event: { origin: string; source: unknown; data: unknown }) => Promise<void>) | null = null;
    let closed = false;
    const opener = { postMessage: (data: Record<string, unknown>, origin: string) => posted.push({ data, origin }) };
    const status = {
      set textContent(_value: string) {
        lines.length = 0;
      },
      append: (line: { textContent: string }) => lines.push(line.textContent),
    };
    const window = {
      opener: withOpener ? opener : null,
      addEventListener: (_type: string, handler: typeof listener) => {
        listener = handler;
      },
      close: () => {
        closed = true;
      },
    };
    runInNewContext(await pageScriptOf(allowed), {
      window,
      document: { getElementById: () => status, createElement: () => ({ lang: "", textContent: "" }) },
      location: { pathname: "/api/realtime-secret", search: "" },
      fetch: (url: string, init: { method: string; headers: Record<string, string>; body: string }) => {
        fetched.push({ url, init });
        return answer(url, init);
      },
    });
    const send = async (event: { origin: string; source: unknown; data: unknown }) => {
      await listener?.(event);
    };
    const mint = (extra: Record<string, unknown> = {}) => ({
      type: SELF_HOSTED_MESSAGES.mint,
      version: SELF_HOSTED_VERSION,
      id: "mint-1",
      key: KEY,
      model: "gpt-realtime-2.1",
      voice: "cedar",
      ...extra,
    });
    return { posted, fetched, lines, opener, send, mint, closed: () => closed, listening: () => listener !== null };
  };

  it("says ready to its opener, at the allowed origin only", async () => {
    const page = await runPage();

    expect(page.posted).toEqual([{ data: { type: SELF_HOSTED_MESSAGES.ready, version: SELF_HOSTED_VERSION }, origin: PALIER }]);
  });

  it("mints on its own origin with the key it was handed, posts back the pass, and closes itself", async () => {
    const page = await runPage();

    await page.send({ origin: PALIER, source: page.opener, data: page.mint() });

    expect(page.fetched).toEqual([
      {
        url: "/api/realtime-secret",
        init: {
          method: "POST",
          headers: { authorization: `Bearer ${KEY}`, "content-type": "application/json" },
          body: JSON.stringify({ model: "gpt-realtime-2.1", voice: "cedar" }),
        },
      },
    ]);
    expect(page.posted.at(-1)).toEqual({
      data: { type: SELF_HOSTED_MESSAGES.minted, version: SELF_HOSTED_VERSION, id: "mint-1", value: "ek_page_1", expiresAt: "2026-10-02T12:01:00.000Z" },
      origin: PALIER,
    });
    expect(page.closed()).toBe(true);
  });

  it.each([
    ["another origin", { origin: "https://elsewhere.example.com" }],
    ["another window", { source: {} }],
  ])("ignores a mint from %s, and keeps its key from going anywhere", async (_label, from) => {
    const page = await runPage();

    await page.send({ origin: PALIER, source: page.opener, ...from, data: page.mint() });

    expect(page.fetched).toEqual([]);
    expect(page.posted).toHaveLength(1);
  });

  it.each([
    ["another version", { version: 2 }],
    ["another message", { type: SELF_HOSTED_MESSAGES.ready }],
    ["no key", { key: 7 }],
    ["no id", { id: undefined }],
  ])("ignores a mint with %s", async (_label, extra) => {
    const page = await runPage();

    await page.send({ origin: PALIER, source: page.opener, data: page.mint(extra) });

    expect(page.fetched).toEqual([]);
  });

  it("mints once, though asked twice", async () => {
    const page = await runPage();

    await page.send({ origin: PALIER, source: page.opener, data: page.mint() });
    await page.send({ origin: PALIER, source: page.opener, data: page.mint({ id: "mint-2" }) });

    expect(page.fetched).toHaveLength(1);
  });

  it("posts back its endpoint's refusal code, or upstream when it has none or cannot reach it", async () => {
    const refused = await runPage({ answer: () => Promise.resolve({ ok: false, json: () => Promise.resolve({ error: "invalid-key" }) }) });
    await refused.send({ origin: PALIER, source: refused.opener, data: refused.mint() });
    expect(refused.posted.at(-1)?.data).toEqual({ type: SELF_HOSTED_MESSAGES.refused, version: SELF_HOSTED_VERSION, id: "mint-1", error: "invalid-key" });

    const silent = await runPage({ answer: () => Promise.resolve({ ok: false, json: () => Promise.reject(new SyntaxError("html")) }) });
    await silent.send({ origin: PALIER, source: silent.opener, data: silent.mint() });
    expect(silent.posted.at(-1)?.data).toMatchObject({ type: SELF_HOSTED_MESSAGES.refused, error: "upstream" });

    const offline = await runPage({ answer: () => Promise.reject(new TypeError("offline")) });
    await offline.send({ origin: PALIER, source: offline.opener, data: offline.mint() });
    expect(offline.posted.at(-1)?.data).toMatchObject({ type: SELF_HOSTED_MESSAGES.refused, error: "upstream" });
    expect(offline.closed()).toBe(true);
  });

  it("does nothing but say so when it is not configured, or was not opened by Palier", async () => {
    const unconfigured = await runPage({ allowed: null });
    expect(unconfigured.posted).toEqual([]);
    expect(unconfigured.listening()).toBe(false);
    expect(unconfigured.lines.join(" ")).toContain("not configured");

    const alone = await runPage({ withOpener: false });
    expect(alone.listening()).toBe(false);
    expect(alone.lines.join(" ")).toContain("does nothing on its own");
  });
});
