import { readFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";

import type { RealtimePeer, RealtimePeerFactory, RealtimePeerState } from "@palier/adapters/openai";
import { sessionId } from "@palier/domain";
import { afterEach, describe, expect, it, vi } from "vitest";

import { routeFetch } from "../app/api/__tests__/route-fetch";
import { createRealtimeSecretApi } from "../server/realtime-handlers";
import aiModels from "./ai-models.json";
import { BANK_BASE_PATH, REALTIME_SECRET_PATH, createContainer } from "./container";

/**
 * A studio session through the real wiring (Phase 6 Slice 1, progress.md D165, D169, D170): the vault,
 * the browser's route client, the real route file and handler, the realtime transport and the session
 * driver, over a fake peer and a canned `/realtime/calls`. The key reaches this origin once per dial, in
 * `Authorization`, and OpenAI's calls endpoint sees only `ek_` secrets. A dropped connection reconnects
 * once with the transcript seeded, and a second drop fails the session cleanly with every turn kept:
 * **Phase 6 exit criterion 2, at the port level.**
 */

const minted = vi.hoisted(() => ({ keys: [] as string[] }));
vi.mock("../server/db", () => ({ syncApi: () => Promise.resolve(null) }));
vi.mock("../server/realtime", async () => {
  const { memoryRealtimeSecretSource } = await import("@palier/testing/in-memory");
  const source = memoryRealtimeSecretSource();
  const api = createRealtimeSecretApi({
    secrets: {
      mint: (key) => {
        minted.keys.push(key);
        return source.mint(key);
      },
    },
  });
  return { realtimeSecretApi: () => api };
});

const KEY = "sk-palier-studio-test-7e2a";
const CONTENT_DIR = dirname(dirname(createRequire(import.meta.url).resolve("@palier/content/profiles/psc-sle.json")));

type Sent = { url: string; authorization: string | undefined; body: unknown };

/**
 * The browser's network, in Node: the bank from the committed tree, this origin's routes through the
 * route files, and OpenAI's `/realtime/calls` answering SDP. Every request's `Authorization` is kept.
 */
const network = async () => {
  const toRoutes = await routeFetch();
  const sent: Sent[] = [];
  vi.stubGlobal("fetch", async (url: string, given?: { method: string; headers: Record<string, string>; body?: string }) => {
    const init = given ?? { method: "GET", headers: {} };
    sent.push({ url, authorization: init.headers.authorization, body: init.body });
    if (url.startsWith(`${BANK_BASE_PATH}/`)) {
      const body = await readFile(join(CONTENT_DIR, url.slice(BANK_BASE_PATH.length + 1)), "utf8");
      return { ok: true, status: 200, json: async () => JSON.parse(body) as unknown };
    }
    if (url === REALTIME_SECRET_PATH) return toRoutes(`http://palier.test${url}`, init);
    if (url === "https://api.openai.com/v1/realtime/calls") return new Response("v=0\r\no=- answer", { status: 201 });
    throw new Error(`nothing else is reached: ${url}`);
  });
  return sent;
};

type FakePeer = RealtimePeer & { readonly emit: (event: Record<string, unknown>) => void; readonly drop: () => void };

/** Peers that open when answered, one per dial, which the test plays the Realtime API through. */
const fakePeers = () => {
  const peers: (FakePeer & { readonly sent: Record<string, unknown>[] })[] = [];
  const factory: RealtimePeerFactory = () => {
    const sent: Record<string, unknown>[] = [];
    let onMessage: (message: string) => void = () => undefined;
    let onState: (state: RealtimePeerState) => void = () => undefined;
    const peer = {
      sent,
      offer: () => Promise.resolve("v=0\r\no=- offer"),
      answer: () => {
        queueMicrotask(() => onState("open"));
        return Promise.resolve();
      },
      send: (message: string) => void sent.push(JSON.parse(message) as Record<string, unknown>),
      onMessage: (listener: (message: string) => void) => {
        onMessage = listener;
      },
      onState: (listener: (state: RealtimePeerState) => void) => {
        onState = listener;
      },
      close: () => undefined,
      emit: (event: Record<string, unknown>) => onMessage(JSON.stringify(event)),
      drop: () => onState("dropped"),
    };
    peers.push(peer);
    return peer;
  };
  const current = () => {
    const peer = peers.at(-1);
    if (peer === undefined) throw new Error("no peer was dialled");
    return peer;
  };
  return { factory, peers, current };
};

const settle = () => new Promise((resolve) => setTimeout(resolve, 0));

afterEach(async () => {
  vi.unstubAllGlobals();
  minted.keys.length = 0;
  await createContainer({ hermetic: false }).useCases.wipeData();
});

describe.each([
  ["hermetic", true],
  ["production", false],
] as const)("a studio session through the %s graph (D165, exit criterion 2)", (_graph, hermetic) => {
  it("dials with a secret, never the key, reconnects once, and fails cleanly on the second drop with every turn and note kept", async () => {
    const sent = await network();
    const c = createContainer({ hermetic });
    await c.useCases.saveApiKey({ key: KEY, remember: true });
    const [choice] = (await c.useCases.oralSessionChoices({ targetBand: "C", lang: "fr" })).filter((x) => x.sessionType === "work");
    if (choice === undefined) throw new Error("the bank offers a work discussion");
    const peers = fakePeers();
    const id = sessionId(c.ids.ulid());

    const run = await c.useCases.startOralStudio({ sessionId: id, scenarioId: choice.scenario.id }, peers.factory);
    peers.current().emit({ type: "response.output_audio_transcript.done", item_id: "e1", transcript: "Parlez-moi de votre poste." });
    peers.current().emit({ type: "input_audio_buffer.speech_started", item_id: "c1" });
    peers.current().emit({ type: "input_audio_buffer.speech_stopped", item_id: "c1" });
    peers.current().emit({
      type: "conversation.item.input_audio_transcription.completed",
      item_id: "c1",
      transcript: "Je coordonne les consultations.",
      usage: { type: "duration", seconds: 4 },
    });
    peers.current().emit({
      type: "response.function_call_arguments.done",
      call_id: "k1",
      name: "note_observation",
      arguments: '{"criterion":"vocabulary","evidence":"« coordonne » répété","severity":"minor"}',
    });
    peers.current().emit({
      type: "response.done",
      response: {
        output: [{ type: "message" }],
        usage: {
          input_tokens: 400,
          output_tokens: 200,
          input_token_details: { text_tokens: 300, audio_tokens: 100, cached_tokens: 0, cached_tokens_details: {} },
          output_token_details: { text_tokens: 40, audio_tokens: 160 },
        },
      },
    });
    await settle();

    peers.current().drop();
    // The redial reads the key through the vault again (IndexedDB, in the production graph): wait for the new
    // line to be configured rather than for a fixed number of ticks.
    await vi.waitFor(() => {
      expect(peers.peers).toHaveLength(2);
      expect(peers.current().sent.map((m) => m.type)).toContain("response.create");
    });
    const seeded = peers.current().sent.filter((m) => m.type === "conversation.item.create");
    expect(seeded).toHaveLength(2);
    peers.current().emit({ type: "response.output_audio_transcript.done", item_id: "e2", transcript: "Reprenons là où nous étions." });
    await settle();

    peers.current().drop();
    const ended = await run.ended;

    expect(ended.endReason).toBe("transport-failed");
    expect(ended.turns.map((turn) => [turn.speaker, turn.text])).toEqual([
      ["examiner", "Parlez-moi de votre poste."],
      ["candidate", "Je coordonne les consultations."],
      ["examiner", "Reprenons là où nous étions."],
    ]);
    expect(ended.notes).toEqual([{ criterion: "vocabulary", evidence: "« coordonne » répété", severity: "minor", phase: 0 }]);
    expect(await c.useCases.oralSession({ sessionId: id })).toEqual(ended);

    // The key reached this origin once per dial, in Authorization, and OpenAI's calls endpoint only secrets.
    expect(minted.keys).toEqual([KEY, KEY]);
    const toRoute = sent.filter((s) => s.url === REALTIME_SECRET_PATH);
    expect(toRoute.map((s) => [s.authorization, s.body])).toEqual([
      [`Bearer ${KEY}`, undefined],
      [`Bearer ${KEY}`, undefined],
    ]);
    const toCalls = sent.filter((s) => s.url.endsWith("/realtime/calls"));
    const secrets = toCalls.map((s) => s.authorization);
    expect(secrets).toHaveLength(2);
    expect(secrets.every((auth) => /^Bearer ek_memory_\d+$/.test(auth ?? ""))).toBe(true);
    expect(new Set(secrets).size).toBe(2);
    expect(JSON.stringify(toCalls)).not.toContain(KEY);
    expect(JSON.stringify(peers.peers.map((p) => p.sent))).not.toContain(KEY);

    // Metered as studio mode, under the session, priced from pricing.json.
    const rows = await c.costLedger.since("2000-01-01T00:00:00.000Z");
    expect(rows.map((row) => [row.feature, row.model, row.sessionId])).toEqual([
      ["oral-studio", aiModels.transcribe, id],
      ["oral-studio", aiModels.realtime, id],
    ]);
    expect(rows.every((row) => row.costUsd !== null && row.costUsd > 0)).toBe(true);
  });

  it("serves the screen: the phase, a repeat asked of the examiner, the cost so far, and the session held as studio (D180–D182)", async () => {
    await network();
    const c = createContainer({ hermetic });
    await c.useCases.saveApiKey({ key: KEY, remember: true });
    const [choice] = (await c.useCases.oralSessionChoices({ targetBand: "C", lang: "fr" })).filter((x) => x.sessionType === "work");
    if (choice === undefined) throw new Error("the bank offers a work discussion");
    const peers = fakePeers();
    const id = sessionId(c.ids.ulid());

    const run = await c.useCases.startOralStudio({ sessionId: id, scenarioId: choice.scenario.id }, peers.factory);
    expect(run.phase()).toBe(0);
    await run.repeat();
    expect(peers.current().sent.slice(-2)).toEqual([
      {
        type: "conversation.item.create",
        item: { type: "message", role: "user", content: [{ type: "input_text", text: expect.stringMatching(/répéter/) }] },
      },
      { type: "response.create" },
    ]);
    peers.current().emit({
      type: "response.done",
      response: {
        output: [{ type: "message" }],
        usage: {
          input_tokens: 400,
          output_tokens: 200,
          input_token_details: { text_tokens: 300, audio_tokens: 100, cached_tokens: 0, cached_tokens_details: {} },
          output_token_details: { text_tokens: 40, audio_tokens: 160 },
        },
      },
    });
    await vi.waitFor(async () => {
      expect((await c.useCases.oralSessionCost({ sessionId: id }))?.studio.calls).toBe(1);
    });
    expect((await c.useCases.oralSession({ sessionId: id }))?.mode).toBe("studio");

    await run.endByUser();
    const ended = await run.ended;
    expect(ended.mode).toBe("studio");
    expect((await c.useCases.oralReport({ sessionId: id }))?.cost.studio.usd).toBeGreaterThan(0);
  });

  it("gives the screen the browser's realtime peer, which dials nothing until asked", () => {
    const c = createContainer({ hermetic });
    const factory = c.realtimePeer({} as MediaStream, {} as HTMLAudioElement);
    expect(typeof factory).toBe("function");
  });

  it("refuses to dial with no key held, naming it, and sends the route nothing", async () => {
    await network();
    const c = createContainer({ hermetic });
    const [choice] = await c.useCases.oralSessionChoices({ targetBand: "C", lang: "fr" });
    if (choice === undefined) throw new Error("the bank offers a session");

    await expect(
      c.useCases.startOralStudio({ sessionId: sessionId(c.ids.ulid()), scenarioId: choice.scenario.id }, fakePeers().factory),
    ).rejects.toMatchObject({ name: "NoApiKeyError" });
    expect(minted.keys).toEqual([]);
  });
});
