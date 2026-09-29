"use client";

import { Button } from "@palier/ui";
import { useId, useRef, useState } from "react";

import { type CopyResult, copyBundle } from "../../lib/diagnostic";
import { errorIssueUrl } from "../../lib/report";
import type { ErrorCopy } from "./copy";

/**
 * The diagnostic bundle, offered and never sent (architecture.md §16, ADR 15). The user can
 * open it and read every line before copying it or opening the prefilled issue, which is
 * the only way it leaves the device (progress.md D141).
 */
export function DiagnosticPanel({ bundle, errorName, copy }: { bundle: string; errorName: string; copy: ErrorCopy }) {
  const headingId = useId();
  const [result, setResult] = useState<CopyResult | null>(null);
  // Counts the attempts, so a second Copy with the same result is announced again.
  const [attempt, setAttempt] = useState(0);
  const details = useRef<HTMLDetailsElement>(null);

  const onCopy = async () => {
    const outcome = await copyBundle(clipboard, bundle);
    // The failure says to select the text shown, so show it.
    if (outcome === "failed" && details.current !== null) details.current.open = true;
    setResult(outcome);
    setAttempt((n) => n + 1);
  };
  // `navigator.clipboard` is absent on an insecure origin, whatever the DOM types say.
  const clipboard = navigator.clipboard as Clipboard | undefined;

  return (
    <section className="app-stack" aria-labelledby={headingId}>
      <h2 id={headingId}>{copy.reportHeading}</h2>
      <p className="app-muted">{copy.reportBody}</p>
      <details ref={details} className="app-diagnostic">
        <summary className="pl-focusable">{copy.details}</summary>
        <pre className="app-diagnostic__text" data-testid="diagnostic-bundle">
          {bundle}
        </pre>
      </details>
      <div className="app-actions">
        <Button variant="secondary" onClick={() => void onCopy()}>
          {copy.copy}
        </Button>
        <a
          className="pl-btn pl-btn--secondary pl-focusable"
          href={errorIssueUrl({ errorName, bundle })}
          target="_blank"
          rel="noopener noreferrer"
        >
          {copy.openIssue}
        </a>
      </div>
      <p role="status" className="app-muted">
        {result === null ? null : <span key={attempt}>{result === "copied" ? copy.copied : copy.copyFailed}</span>}
      </p>
    </section>
  );
}
