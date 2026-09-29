import type { SessionId } from "@palier/domain";

/**
 * Which spoken sessions a page on this device is running now (progress.md D144).
 *
 * A session whose page is closed hard runs no code on the way out, so its record says it is
 * still running. Nothing in the record can tell that apart from a session another tab is
 * running, so the page that runs a session holds it here for the session's life, and anything
 * that closes abandoned sessions asks here first. The browser's is a Web Lock per session,
 * which the browser releases itself when the tab goes, however it goes.
 */
export type OralLiveness = {
  /** Mark `id` as running in this page, until the returned release is called or the page goes. */
  readonly hold: (id: SessionId) => () => void;
  /** The sessions some page on this device is running now. */
  readonly live: () => Promise<ReadonlySet<SessionId>>;
};
