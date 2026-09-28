import { NextRequest, NextResponse } from "next/server";
import { describe, expect, it } from "vitest";

import { NONCE_HEADER, OPENAI_ORIGIN, contentSecurityPolicy, newNonce, withContentSecurityPolicy } from "./csp";

/** The policy as a directive → sources map, so each directive is asserted whole. */
const directives = (policy: string) =>
  new Map(
    policy.split("; ").map((directive) => {
      const [name = "", ...sources] = directive.split(" ");
      return [name, sources.join(" ")];
    }),
  );

describe("contentSecurityPolicy in production", () => {
  const policy = directives(contentSecurityPolicy({ nonce: "abc123", development: false }));

  it("runs no script but this origin's and this response's nonce: no inline, no eval, no strict-dynamic", () => {
    expect(policy.get("script-src")).toBe("'self' 'nonce-abc123'");
  });

  it("lets the browser talk to this origin and OpenAI only, so a script that ran could send the key nowhere else", () => {
    expect(policy.get("connect-src")).toBe(`'self' ${OPENAI_ORIGIN}`);
    expect(OPENAI_ORIGIN).toBe("https://api.openai.com");
  });

  it("allows no inline style", () => {
    expect(policy.get("style-src")).toBe("'self'");
  });

  it("plays the examiner's voice and the recording from blob: URLs", () => {
    expect(policy.get("media-src")).toBe("'self' blob:");
  });

  it("enforces Trusted Types with the default policy only", () => {
    expect(policy.get("require-trusted-types-for")).toBe("'script'");
    expect(policy.get("trusted-types")).toBe("default");
  });

  it("refuses plugins, framing, a foreign base URL and a form posting elsewhere", () => {
    expect(policy.get("object-src")).toBe("'none'");
    expect(policy.get("frame-ancestors")).toBe("'none'");
    expect(policy.get("base-uri")).toBe("'self'");
    expect(policy.get("form-action")).toBe("'self'");
  });

  it("keeps everything else to this origin", () => {
    expect(policy.get("default-src")).toBe("'self'");
    expect(policy.get("img-src")).toBe("'self' data: blob:");
    expect(policy.get("font-src")).toBe("'self'");
    expect(policy.get("worker-src")).toBe("'self'");
    expect(policy.get("manifest-src")).toBe("'self'");
  });
});

describe("contentSecurityPolicy under next dev", () => {
  const policy = directives(contentSecurityPolicy({ nonce: "abc123", development: true }));

  it("adds eval for React's server error stacks, and nothing inline", () => {
    expect(policy.get("script-src")).toBe("'self' 'nonce-abc123' 'unsafe-eval'");
  });

  it("allows the dev overlay's inline styles", () => {
    expect(policy.get("style-src")).toBe("'self' 'unsafe-inline'");
  });

  it("lets the HMR websocket connect", () => {
    expect(policy.get("connect-src")).toBe(`'self' ${OPENAI_ORIGIN} ws:`);
  });

  it("does not enforce Trusted Types, since the dev runtime writes to sinks the policy refuses", () => {
    expect(policy.has("require-trusted-types-for")).toBe(false);
    expect(policy.has("trusted-types")).toBe(false);
  });
});

describe("newNonce", () => {
  it("encodes 128 random bits as base64", () => {
    const nonce = newNonce((bytes) => bytes.fill(0xff));
    expect(nonce).toBe(btoa(String.fromCharCode(...new Uint8Array(16).fill(0xff))));
    expect(atob(nonce)).toHaveLength(16);
  });

  it("is fresh each call on Web Crypto", () => {
    expect(newNonce()).not.toBe(newNonce());
  });
});

describe("withContentSecurityPolicy", () => {
  const options = { nonce: "n0nce", development: false };
  const policy = contentSecurityPolicy(options);

  it("hands the rest of the proxy a request carrying the policy and the nonce, which is where Next reads it", () => {
    let seen: NextRequest | undefined;
    withContentSecurityPolicy(
      new NextRequest("http://localhost/en"),
      (request) => {
        seen = request;
        return NextResponse.next();
      },
      options,
    );

    expect(seen?.headers.get("content-security-policy")).toBe(policy);
    expect(seen?.headers.get(NONCE_HEADER)).toBe("n0nce");
  });

  it("sets the policy on the response the rest of the proxy returns, and not the nonce header", () => {
    const redirect = NextResponse.redirect("http://localhost/en");
    const response = withContentSecurityPolicy(new NextRequest("http://localhost/"), () => redirect, options);

    expect(response).toBe(redirect);
    expect(response.headers.get("content-security-policy")).toBe(policy);
    expect(response.headers.get(NONCE_HEADER)).toBeNull();
  });
});
