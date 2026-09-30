import type { RealtimePeer, RealtimePeerFactory, RealtimePeerState } from "../realtime-transport.js";

/**
 * A realtime peer the test drives (progress.md D170): it opens once its answer is set (unless told
 * not to), records every message the transport sends, and plays the Realtime API's side with
 * `emit`. `drop` is the connection lost; `close` is recorded.
 */
export type FakePeer = RealtimePeer & {
  /** Every message sent, parsed. */
  readonly sent: () => readonly Record<string, unknown>[];
  /** The server says `event`. */
  readonly emit: (event: Record<string, unknown>) => void;
  /** The channel carries `message` as it is, JSON or not. */
  readonly emitRaw: (message: string) => void;
  /** The connection is lost. */
  readonly drop: () => void;
  readonly answered: () => string | null;
  readonly closed: () => boolean;
};

export const fakePeer = (options: { readonly opens?: boolean; readonly dropsWhileOpening?: boolean } = {}): FakePeer => {
  const sent: Record<string, unknown>[] = [];
  let onMessage: (message: string) => void = () => undefined;
  let onState: (state: RealtimePeerState) => void = () => undefined;
  let answered: string | null = null;
  let closed = false;
  return {
    offer: () => Promise.resolve("v=0\r\no=- offer"),
    answer: (sdp) => {
      answered = sdp;
      if (options.dropsWhileOpening === true) queueMicrotask(() => onState("dropped"));
      else if (options.opens !== false) queueMicrotask(() => onState("open"));
      return Promise.resolve();
    },
    send: (message) => {
      sent.push(JSON.parse(message) as Record<string, unknown>);
    },
    onMessage: (listener) => {
      onMessage = listener;
    },
    onState: (listener) => {
      onState = listener;
    },
    close: () => {
      closed = true;
    },
    sent: () => sent,
    emit: (event) => {
      onMessage(JSON.stringify(event));
    },
    emitRaw: (message) => {
      onMessage(message);
    },
    drop: () => {
      onState("dropped");
    },
    answered: () => answered,
    closed: () => closed,
  };
};

/** A factory that hands out fresh fake peers, one per dial, made with `options[n]` for the n-th. */
export const fakePeers = (options: readonly Parameters<typeof fakePeer>[0][] = []) => {
  const peers: FakePeer[] = [];
  const factory: RealtimePeerFactory = () => {
    const peer = fakePeer(options[peers.length] ?? {});
    peers.push(peer);
    return peer;
  };
  const current = (): FakePeer => {
    const peer = peers.at(-1);
    if (peer === undefined) throw new Error("no peer was dialled");
    return peer;
  };
  return { factory, peers, current };
};
