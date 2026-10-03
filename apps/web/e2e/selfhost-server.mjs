#!/usr/bin/env node
// The end-to-end test's own secret endpoint (progress.md D192): the repository's one-file Cloudflare Worker, run
// unchanged under Node's HTTP server, beside a stand-in for OpenAI's `/v1/realtime/client_secrets`. The Worker mints
// against the stand-in through its `OPENAI_BASE_URL`, because a request the endpoint's server makes is not the
// browser's, so Playwright's routing cannot answer it.
//
// - `/` and every other path: the Worker, configured with `ALLOWED_ORIGIN`.
// - `POST /fake-openai/v1/realtime/client_secrets`: a fresh `ek_selfhosted_<n>`, and the `authorization` it was given
//   kept, so the spec can see the key reached the endpoint's server and went no further.
// - `GET /fake-openai/seen`: those authorizations, for the spec's `request` fixture, which the leak guard does not watch.
//
// PORT and ALLOWED_ORIGIN come from the Playwright config.

/* global Request, Response, Headers -- Node's Fetch API, as the Worker itself uses it. */
import { Buffer } from "node:buffer";
import { createServer } from "node:http";

import worker from "../../../selfhost/cloudflare-worker.mjs";

const port = Number(process.env.PORT ?? "3300");
const origin = `http://localhost:${String(port)}`;
const env = { ALLOWED_ORIGIN: process.env.ALLOWED_ORIGIN, OPENAI_BASE_URL: `${origin}/fake-openai/v1` };
const seen = [];

const bodyOf = (request) =>
  new Promise((resolve, reject) => {
    const chunks = [];
    request.on("data", (chunk) => chunks.push(chunk));
    request.on("end", () => resolve(Buffer.concat(chunks)));
    request.on("error", reject);
  });

const send = async (response, answer) => {
  response.writeHead(answer.status, Object.fromEntries(answer.headers));
  response.end(Buffer.from(await answer.arrayBuffer()));
};

const fakeOpenAi = (method, path, authorization) => {
  if (method === "GET" && path === "/fake-openai/seen") return Response.json({ authorizations: seen });
  if (method === "POST" && path === "/fake-openai/v1/realtime/client_secrets") {
    seen.push(authorization ?? "");
    return Response.json({ value: `ek_selfhosted_${String(seen.length)}`, expires_at: Math.floor(Date.now() / 1000) + 60 });
  }
  return Response.json({ error: "not found" }, { status: 404 });
};

createServer((request, response) => {
  void (async () => {
    const url = new URL(request.url ?? "/", origin);
    if (url.pathname.startsWith("/fake-openai/")) {
      await send(response, fakeOpenAi(request.method ?? "GET", url.pathname, request.headers.authorization));
      return;
    }
    const headers = new Headers();
    for (const [name, value] of Object.entries(request.headers)) {
      if (typeof value === "string") headers.set(name, value);
    }
    const hasBody = request.method !== "GET" && request.method !== "HEAD";
    const asked = new Request(url, { method: request.method, headers, ...(hasBody ? { body: await bodyOf(request) } : {}) });
    await send(response, await worker.fetch(asked, env));
  })().catch(() => {
    response.writeHead(500);
    response.end();
  });
}).listen(port);
