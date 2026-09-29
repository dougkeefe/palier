"use client";

import { Button } from "@palier/ui";
import { useEffect, useRef, useState } from "react";

import { BANK_VERSION } from "../../lib/bank-version";
import { BUILD_VERSION } from "../../lib/build-info";
import { diagnosticBundle, sanitiseError } from "../../lib/diagnostic";
import type { ErrorCopy } from "./copy";
import { DiagnosticPanel } from "./DiagnosticPanel";
import { useInBrowser } from "./in-browser";

/**
 * An error screen: what happened in plain words, a way to try again, a way home, and the
 * diagnostic bundle on offer (architecture.md §16, progress.md D141). Shared by the route
 * boundary and the global one, which differ only in their copy and their document.
 *
 * The bundle is made once hydrated, because it reads the browser (its user agent, the path
 * and the time), which a server render does not have. Focus moves to the heading, so a
 * screen reader announces what replaced the screen.
 */
export function ErrorView({ copy, error, onRetry, homeHref }: { copy: ErrorCopy; error: unknown; onRetry: () => void; homeHref: string }) {
  const heading = useRef<HTMLHeadingElement>(null);
  const inBrowser = useInBrowser();
  const [at] = useState(() => new Date());

  useEffect(() => {
    heading.current?.focus();
  }, []);

  const bundle = inBrowser
    ? diagnosticBundle({
        build: BUILD_VERSION,
        bank: BANK_VERSION,
        userAgent: navigator.userAgent,
        path: window.location.pathname,
        at,
        error,
      })
    : null;

  return (
    <section className="app-prose app-error">
      <h1 ref={heading} tabIndex={-1} className="app-hero__title">
        {copy.title}
      </h1>
      <p>{copy.body}</p>
      <div className="app-actions">
        <Button onClick={onRetry}>{copy.retry}</Button>
        {/* A document load, not a client navigation: after an error, start from a clean page. */}
        <a className="pl-btn pl-btn--secondary pl-focusable" href={homeHref}>
          {copy.home}
        </a>
      </div>
      {bundle === null ? null : <DiagnosticPanel bundle={bundle} errorName={sanitiseError(error).name} copy={copy} />}
    </section>
  );
}
