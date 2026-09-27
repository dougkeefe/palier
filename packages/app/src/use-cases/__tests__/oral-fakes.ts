import type { OralScenario } from "@palier/domain";
import { scenarioId, sessionId } from "@palier/domain";

import type {
  Clock,
  ItemRepository,
  OralDirective,
  OralSession,
  OralStore,
  OralTransport,
  OralTransportEvent,
} from "../../ports/index.js";
import { StorageQuotaError } from "../../ports/index.js";

/**
 * Local oral fakes for the use-case tests (progress.md D37): a store, a transport the
 * test drives by hand, a settable clock, and a bank holding one scenario.
 */

export const SESSION_ID = sessionId("oral-1");
export const START = "2026-09-27T10:00:00.000Z";
const MIN = 60_000;

/** A 10-minute work discussion in three phases: 2, 5 and 3 minutes. */
export const SCENARIO: OralScenario = {
  id: scenarioId("scn-work-c"),
  lang: "fr",
  sessionType: "work",
  targetBand: "C",
  topic: "project-management",
  phases: [2, 5, 3].map((minutes, i) => ({
    name: `Phase ${String(i + 1)}`,
    minutes,
    intent: "Sonder.",
    seedQuestions: ["Parlez-moi de votre projet."],
    escalation: ["Qu'auriez-vous fait autrement ?"],
    deescalation: ["Décrivez une journée type."],
  })),
};

export const anOralSession = (over: Partial<OralSession> = {}): OralSession => ({
  id: SESSION_ID,
  scenarioId: SCENARIO.id,
  startedAt: START,
  endedAt: null,
  endReason: null,
  turns: [],
  ...over,
});

/** A clock the test moves by hand, in minutes past `START`. */
export const settableClock = (): Clock & { readonly at: (minutes: number) => void } => {
  let now = Date.parse(START);
  return {
    now: () => new Date(now).toISOString(),
    at: (minutes) => {
      now = Date.parse(START) + minutes * MIN;
    },
  };
};

export const scenarioBank = (scenarios: readonly OralScenario[] = [SCENARIO]): ItemRepository => ({
  byIds: () => Promise.resolve([]),
  query: () => Promise.resolve([]),
  passage: () => Promise.resolve(null),
  form: () => Promise.resolve(null),
  forms: () => Promise.resolve([]),
  scenario: (id) => Promise.resolve(scenarios.find((s) => s.id === id) ?? null),
  scenarios: () => Promise.resolve(scenarios),
  bankVersion: () => Promise.resolve(3),
});

type StoredAudio = { readonly blob: Blob; readonly startedAt: string };

/**
 * An oral store that keeps the port's rules. `quotaBytes` bounds the recordings'
 * total, so a test can fill the device; `audio` seeds recordings of those sizes.
 */
export const oralStore = (
  seed: readonly OralSession[] = [],
  options: { readonly quotaBytes?: number; readonly audio?: readonly [OralSession["id"], number][] } = {},
): OralStore & { readonly puts: () => number } => {
  const sessions = new Map(seed.map((s) => [s.id, s]));
  const audio = new Map<OralSession["id"], StoredAudio>();
  for (const [id, bytes] of options.audio ?? []) {
    audio.set(id, { blob: new Blob(["x".repeat(bytes)]), startedAt: sessions.get(id)?.startedAt ?? START });
  }
  let puts = 0;
  const used = () => [...audio.values()].reduce((sum, a) => sum + a.blob.size, 0);
  return {
    put: (session) => {
      puts += 1;
      sessions.set(session.id, session);
      return Promise.resolve();
    },
    get: (id) => Promise.resolve(sessions.get(id) ?? null),
    all: () => Promise.resolve([...sessions.values()].sort((a, b) => b.startedAt.localeCompare(a.startedAt))),
    putAudio: (id, blob) => {
      const session = sessions.get(id);
      if (session === undefined) return Promise.reject(new Error(`no session ${id}`));
      const without = used() - (audio.get(id)?.blob.size ?? 0);
      if (options.quotaBytes !== undefined && without + blob.size > options.quotaBytes) {
        return Promise.reject(new StorageQuotaError());
      }
      audio.set(id, { blob, startedAt: session.startedAt });
      return Promise.resolve();
    },
    audio: (id) => Promise.resolve(audio.get(id)?.blob ?? null),
    audioIndex: () =>
      Promise.resolve(
        [...audio.entries()]
          .map(([sessionId, a]) => ({ sessionId, bytes: a.blob.size, startedAt: a.startedAt }))
          .sort((a, b) => a.startedAt.localeCompare(b.startedAt)),
      ),
    deleteAudio: (ids) => {
      for (const id of ids) audio.delete(id);
      return Promise.resolve();
    },
    clear: () => {
      sessions.clear();
      audio.clear();
      return Promise.resolve();
    },
    puts: () => puts,
  };
};

/**
 * A transport the test drives: `say` and `flag` push events as the examiner's side
 * would, `hangUp` ends it from the far end. `close` delivers `closed` synchronously,
 * as the port allows, unless `deferClose` holds it back until the test hangs up, as a
 * transport still delivering an answer would. `failOpen` makes `open` reject, and
 * `failDirect` every directive.
 */
export const handTransport = (
  options: { readonly failOpen?: boolean; readonly failDirect?: boolean; readonly deferClose?: boolean } = {},
) => {
  let sink: ((event: OralTransportEvent) => void) | null = null;
  let isClosed = false;
  const directives: OralDirective[] = [];
  let closeCalls = 0;
  const emit = (event: OralTransportEvent) => sink?.(event);
  const end = (failed: boolean) => {
    if (isClosed) return;
    isClosed = true;
    emit({ kind: "closed", failed });
  };
  const transport: OralTransport = {
    open: (_req, listener) => {
      if (options.failOpen === true) return Promise.reject(new Error("no connection"));
      sink = listener;
      return Promise.resolve();
    },
    direct: (directive) => {
      if (options.failDirect === true) return Promise.reject(new Error("the channel dropped"));
      if (!isClosed) directives.push(directive);
      return Promise.resolve();
    },
    close: () => {
      closeCalls += 1;
      if (options.deferClose !== true) end(false);
      return Promise.resolve();
    },
  };
  return {
    transport,
    say: (speaker: "examiner" | "candidate", text: string, startMs: number, endMs: number) =>
      emit({ kind: "turn", speaker, text, startMs, endMs }),
    flag: (direction: "escalate" | "deescalate") => emit({ kind: "difficulty", direction }),
    hangUp: (failed: boolean) => end(failed),
    directives: () => directives,
    closeCalls: () => closeCalls,
  };
};
