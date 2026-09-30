import type { OralDirective, OralTransport, OralTransportEvent } from "@palier/app";
import type { OralCriterion, OralDirection, OralNoteSeverity, OralSpeaker } from "@palier/domain";

/** One thing the examiner's side says or signals, at `atMs` after `open`. */
export type OralScriptEntry =
  | {
      readonly atMs: number;
      readonly kind: "turn";
      readonly speaker: OralSpeaker;
      readonly text: string;
      readonly startMs: number;
      readonly endMs: number;
    }
  | { readonly atMs: number; readonly kind: "difficulty"; readonly direction: OralDirection }
  | {
      readonly atMs: number;
      readonly kind: "note";
      readonly criterion: OralCriterion;
      readonly evidence: string;
      readonly severity: OralNoteSeverity;
    };

export type MemoryOralTransport = {
  readonly transport: OralTransport;
  /** Deliver every scripted entry due by `ms` after `open` and not yet delivered, in order. */
  readonly advance: (ms: number) => Promise<void>;
  /** The far end ends the connection, cleanly or not. */
  readonly hangUp: (failed: boolean) => Promise<void>;
  /** Every directive that reached the examiner's side, in order. */
  readonly directives: () => readonly OralDirective[];
};

/**
 * A scripted examiner's side (progress.md D116): it says what `script` says when the
 * test advances time to it, records the directives it is sent, and closes when asked
 * or hung up. Deterministic and clock-free, so a test moves this and a `FakeClock`
 * together.
 *
 * It keeps the port's rules: `direct` rejects before `open` and is a no-op after
 * close; `closed` is delivered exactly once, last; `close` is idempotent. With
 * `deliverOnClose`, a close first delivers every entry still scripted, as a turn-based
 * transport finishes transcribing the answer in flight.
 */
export const memoryOralTransport = (
  script: readonly OralScriptEntry[] = [],
  options: { readonly deliverOnClose?: boolean } = {},
): MemoryOralTransport => {
  const pending = [...script].sort((a, b) => a.atMs - b.atMs);
  const directives: OralDirective[] = [];
  let sink: ((event: OralTransportEvent) => void) | null = null;
  let closed = false;

  /** Nothing is heard before `open`: there is no one listening yet. */
  const send = (event: OralTransportEvent): void => {
    if (sink !== null) sink(event);
  };

  const deliver = (entry: OralScriptEntry): void => {
    if (entry.kind === "turn") {
      const { speaker, text, startMs, endMs } = entry;
      send({ kind: "turn", speaker, text, startMs, endMs });
    } else if (entry.kind === "note") {
      const { criterion, evidence, severity } = entry;
      send({ kind: "note", criterion, evidence, severity });
    } else {
      send({ kind: "difficulty", direction: entry.direction });
    }
  };

  const end = (failed: boolean): void => {
    if (closed) return;
    if (options.deliverOnClose === true && !failed) pending.splice(0).forEach(deliver);
    closed = true;
    send({ kind: "closed", failed });
  };

  const transport: OralTransport = {
    open: (_request, listener) => {
      sink = listener;
      return Promise.resolve();
    },
    direct: (directive) => {
      if (sink === null) return Promise.reject(new Error("The transport is not open."));
      if (!closed) directives.push(directive);
      return Promise.resolve();
    },
    close: () => {
      end(false);
      return Promise.resolve();
    },
  };

  return {
    transport,
    advance: (ms) => {
      // `pending` is sorted, so what is due is a prefix of it.
      if (!closed) pending.splice(0, pending.filter((entry) => entry.atMs <= ms).length).forEach(deliver);
      return Promise.resolve();
    },
    hangUp: (failed) => {
      end(failed);
      return Promise.resolve();
    },
    directives: () => directives,
  };
};
