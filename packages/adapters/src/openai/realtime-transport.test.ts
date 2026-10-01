import type { OralDirective, OralTransportEvent } from "@palier/app";
import { anOralScenario, oralTransportContract } from "@palier/testing";
import { afterEach, describe, expect, it, vi } from "vitest";

import { fakePeers } from "./__tests__/fake-peer.js";
import type { FetchLike } from "./http.js";
import { STUDIO_TOOLS, studioInstructions, studioRepeatRequest } from "./prompts.js";
import type { RealtimeTransportConfig } from "./realtime-transport.js";
import { realtimeTransport } from "./realtime-transport.js";

/** Studio mode's transport (progress.md D165, D170), over a fake peer and a canned `/realtime/calls`. */

const EXPIRES = "2026-09-29T12:01:00.000Z";
const SCENARIO = (() => {
  const base = anOralScenario();
  const first = base.phases[0];
  if (first === undefined) throw new Error("the builder's scenario has a phase");
  return anOralScenario({ phases: [first, { ...first, name: "Recul" }] });
})();

/** `/realtime/calls`, answering SDP, recording each offer's headers and body. */
const callsEndpoint = (answer: { status?: number; body?: string } = {}) => {
  const calls: { url: string; headers: Record<string, string>; body: unknown }[] = [];
  const fetchImpl: FetchLike = (url, init) => {
    calls.push({ url, headers: init.headers, body: init.body });
    const status = answer.status ?? 201;
    const body = answer.body ?? "v=0\r\no=- answer";
    return Promise.resolve({ ok: status < 300, status, json: () => Promise.reject(new SyntaxError("sdp")), text: () => Promise.resolve(body) });
  };
  return { fetchImpl, calls };
};

/** Let the dial's promise chain run: every step of it is a microtask. */
const settle = () => new Promise((resolve) => setTimeout(resolve, 0));

const setUp = (over: Partial<RealtimeTransportConfig> = {}, peerOptions: Parameters<typeof fakePeers>[0] = []) => {
  let clock = 10_000;
  let mints = 0;
  let refuseSecret = false;
  const peers = fakePeers(peerOptions);
  const endpoint = callsEndpoint();
  const usage: Parameters<RealtimeTransportConfig["usage"]>[0][] = [];
  const events: OralTransportEvent[] = [];
  const transport = realtimeTransport({
    secret: () => {
      mints += 1;
      return refuseSecret ? Promise.reject(new Error("no key held")) : Promise.resolve({ value: `ek_${String(mints)}`, expiresAt: EXPIRES });
    },
    peer: peers.factory,
    usage: (u) => void usage.push(u),
    model: "rt",
    transcribeModel: "stt",
    maxMs: 25 * 60_000,
    now: () => clock,
    fetchImpl: endpoint.fetchImpl,
    ...over,
  });
  const open = () => transport.open({ scenario: SCENARIO }, (e) => void events.push(e));
  /** The clock `ms` after `open`. */
  const at = (ms: number) => {
    clock = 10_000 + ms;
  };
  const sentOf = (type: string, peer = peers.current()) => peer.sent().filter((m) => m.type === type);
  return {
    transport,
    open,
    events,
    usage,
    peers,
    endpoint,
    at,
    sentOf,
    mints: () => mints,
    refuseSecret: () => {
      refuseSecret = true;
    },
  };
};

const turns = (events: readonly OralTransportEvent[]) => events.filter((e) => e.kind === "turn");

afterEach(() => {
  vi.useRealTimers();
});

// The contract, over a scripted Realtime API: overlapping speech, a flag and a note. The harness's
// examiner instructions are the directive itself, so what reached the far end can be read back.
oralTransportContract("realtime", () => {
  const h = setUp({ instructions: (_scenario, directive) => JSON.stringify(directive) });
  const script: [number, Record<string, unknown>][] = [
    [100, { type: "response.output_audio_transcript.delta", item_id: "e1", delta: "Bonjour. " }],
    [2_000, { type: "response.output_audio_transcript.done", item_id: "e1", transcript: "Bonjour. Parlez-moi de votre rôle." }],
    [2_500, { type: "input_audio_buffer.speech_started", item_id: "c1" }],
    [9_000, { type: "input_audio_buffer.speech_stopped", item_id: "c1" }],
    [9_200, { type: "response.function_call_arguments.done", call_id: "k1", name: "flag_difficulty", arguments: '{"direction":"escalate"}' }],
    [9_300, { type: "response.output_audio_transcript.delta", item_id: "e2", delta: "Et ensuite ?" }],
    [9_400, { type: "conversation.item.input_audio_transcription.completed", item_id: "c1", transcript: "Je suis analyste." }],
    [9_500, { type: "response.function_call_arguments.done", call_id: "k2", name: "note_observation", arguments: '{"criterion":"vocabulary","evidence":"« analyste » seul","severity":"minor"}' }],
    [12_000, { type: "response.output_audio_transcript.done", item_id: "e2", transcript: "Et ensuite ?" }],
  ];
  let delivered = 0;
  return Promise.resolve({
    transport: h.transport,
    advance: async (ms) => {
      await settle();
      while (delivered < script.length && (script[delivered]?.[0] ?? Infinity) <= ms && h.peers.peers.length > 0) {
        const [atMs, event] = script[delivered] ?? [0, {}];
        h.at(atMs);
        h.peers.current().emit(event);
        delivered += 1;
      }
      await settle();
    },
    hangUp: async (failed) => {
      await settle();
      if (!failed) return h.transport.close();
      h.refuseSecret();
      h.peers.current().drop();
      await settle();
    },
    directives: () =>
      h.peers.peers.flatMap((peer) =>
        peer
          .sent()
          .filter((m) => m.type === "session.update")
          .slice(1)
          .map((m) => JSON.parse((m.session as { instructions: string }).instructions) as OralDirective),
      ),
  });
});

describe("realtimeTransport — setup", () => {
  it("posts the peer's offer to /realtime/calls with the ek_ secret, never a key, and sets OpenAI's answer", async () => {
    const h = setUp();
    await h.open();

    expect(h.endpoint.calls).toEqual([
      {
        url: "https://api.openai.com/v1/realtime/calls",
        headers: { authorization: "Bearer ek_1", "content-type": "application/sdp" },
        body: "v=0\r\no=- offer",
      },
    ]);
    expect(h.peers.current().answered()).toBe("v=0\r\no=- answer");
  });

  it("configures the session once the channel opens: phase one's instructions, both tools, transcription, then the examiner's cue", async () => {
    const h = setUp();
    await h.open();

    expect(h.peers.current().sent()).toEqual([
      {
        type: "session.update",
        session: {
          type: "realtime",
          instructions: studioInstructions(SCENARIO, { phase: 0, register: "baseline" }),
          tools: STUDIO_TOOLS,
          tool_choice: "auto",
          audio: {
            input: { transcription: { model: "stt", language: "fr" }, turn_detection: { type: "semantic_vad" } },
          },
        },
      },
      { type: "response.create" },
    ]);
  });

  it("asks semantic turn detection for the configured eagerness, so a candidate's pause is not the end of their turn", async () => {
    const h = setUp({ turnEagerness: "low" });
    await h.open();

    const [update] = h.sentOf("session.update");
    expect(update?.session).toMatchObject({
      audio: { input: { turn_detection: { type: "semantic_vad", eagerness: "low" } } },
    });
  });

  it("opens once", async () => {
    const h = setUp();
    await h.open();

    await expect(h.open()).rejects.toThrow("opens once");
  });

  it("fails to open, keeping why, when no secret can be minted", async () => {
    const h = setUp();
    h.refuseSecret();

    await expect(h.open()).rejects.toThrow("no key held");
    expect(h.transport.lastError()).toMatchObject({ message: "no key held" });
    // The peer was made beside the secret (D190): it is hung up, and nothing was dialled.
    expect(h.peers.peers).toHaveLength(1);
    expect(h.peers.current().closed()).toBe(true);
    expect(h.endpoint.calls).toEqual([]);
  });

  it("makes the peer's offer while the secret is minted, not after it is back (D190)", async () => {
    const steps: string[] = [];
    let mint!: (secret: { value: string; expiresAt: string }) => void;
    const peers = fakePeers();
    const h = setUp({
      secret: () => {
        steps.push("secret asked");
        return new Promise((resolve) => {
          mint = (secret) => {
            steps.push("secret back");
            resolve(secret);
          };
        });
      },
      peer: () => {
        const peer = peers.factory();
        return {
          ...peer,
          offer: () => {
            steps.push("offer made");
            return peer.offer();
          },
        };
      },
    });
    const opening = h.open();
    await settle();

    expect(steps).toEqual(["secret asked", "offer made"]);
    expect(h.endpoint.calls).toEqual([]);
    mint({ value: "ek_late", expiresAt: EXPIRES });
    await opening;

    expect(steps).toEqual(["secret asked", "offer made", "secret back"]);
    expect(h.endpoint.calls.map((c) => c.headers.authorization)).toEqual(["Bearer ek_late"]);
  });

  it("hangs up the peer it made, and dials nothing, when closed while the secret is minted", async () => {
    let mint!: (secret: { value: string; expiresAt: string }) => void;
    const h = setUp({
      secret: () =>
        new Promise((resolve) => {
          mint = resolve;
        }),
    });
    const opening = h.open();
    await settle();
    await h.transport.close();
    mint({ value: "ek_late", expiresAt: EXPIRES });

    await expect(opening).resolves.toBeUndefined();
    expect(h.peers.current().closed()).toBe(true);
    expect(h.endpoint.calls).toEqual([]);
    expect(h.events).toEqual([{ kind: "closed", failed: false }]);
  });

  it.each([
    [{ status: 401 }, "InvalidApiKeyError"],
    [{ status: 500 }, "ProviderRequestError"],
    [{ body: "<html>" }, "InvalidResponseError"],
  ])("fails to open when /realtime/calls answers %o, as %s, and hangs up the peer", async (answer, name) => {
    const endpoint = callsEndpoint(answer);
    const h = setUp({ fetchImpl: endpoint.fetchImpl });

    await expect(h.open()).rejects.toMatchObject({ name });
    expect(h.peers.current().closed()).toBe(true);
    expect(h.events).toEqual([]);
  });

  it("fails to open when the connection drops before its channel opens", async () => {
    const h = setUp({}, [{ dropsWhileOpening: true }]);

    await expect(h.open()).rejects.toMatchObject({ name: "ProviderRequestError" });
  });

  it("uses the base URL it is given", async () => {
    const h = setUp({ baseUrl: "http://localhost:9/v1" });
    await h.open();

    expect(h.endpoint.calls[0]?.url).toBe("http://localhost:9/v1/realtime/calls");
  });

  it("says closed once, and opens nothing further, when closed while it dials", async () => {
    const h = setUp({}, [{ opens: false }]);
    const opening = h.open();
    await settle();
    await h.transport.close();
    h.peers.current().emit({ type: "response.output_audio_transcript.done", item_id: "e", transcript: "Trop tard." });

    await expect(opening).resolves.toBeUndefined();
    expect(h.events).toEqual([{ kind: "closed", failed: false }]);
    expect(h.peers.current().closed()).toBe(true);
  });
});

describe("realtimeTransport — turns", () => {
  it("makes the candidate's transcription a spoken turn, timed by their speech", async () => {
    const h = setUp();
    await h.open();
    h.at(1_000);
    h.peers.current().emit({ type: "input_audio_buffer.speech_started", item_id: "c1" });
    h.at(4_000);
    h.peers.current().emit({ type: "input_audio_buffer.speech_stopped", item_id: "c1" });
    h.at(4_600);
    h.peers.current().emit({ type: "conversation.item.input_audio_transcription.completed", item_id: "c1", transcript: "Je gère une équipe." });

    expect(turns(h.events)).toEqual([
      { kind: "turn", speaker: "candidate", text: "Je gère une équipe.", startMs: 1_000, endMs: 4_000, input: "voice" },
    ]);
  });

  it("times a transcription it heard no speech markers for at the moment it arrived", async () => {
    const h = setUp();
    await h.open();
    h.at(7_000);
    h.peers.current().emit({ type: "conversation.item.input_audio_transcription.completed", item_id: "c9", transcript: "Oui." });

    expect(turns(h.events)).toEqual([{ kind: "turn", speaker: "candidate", text: "Oui.", startMs: 7_000, endMs: 7_000, input: "voice" }]);
  });

  it("makes the examiner's transcript a turn, from its first words to its last", async () => {
    const h = setUp();
    await h.open();
    h.at(500);
    h.peers.current().emit({ type: "response.output_audio_transcript.delta", item_id: "e1", delta: "Bonjour. " });
    h.at(900);
    h.peers.current().emit({ type: "response.output_audio_transcript.delta", item_id: "e1", delta: "Parlez-moi de vous." });
    h.at(3_000);
    h.peers.current().emit({ type: "response.output_audio_transcript.done", item_id: "e1" });

    expect(turns(h.events)).toEqual([{ kind: "turn", speaker: "examiner", text: "Bonjour. Parlez-moi de vous.", startMs: 500, endMs: 3_000 }]);
  });

  it("takes the finished transcript over the words it pieced together", async () => {
    const h = setUp();
    await h.open();
    h.peers.current().emit({ type: "response.output_audio_transcript.delta", item_id: "e1", delta: "Bonj" });
    h.peers.current().emit({ type: "response.output_audio_transcript.done", item_id: "e1", transcript: "Bonjour." });

    expect(turns(h.events).map((t) => t.kind === "turn" && t.text)).toEqual(["Bonjour."]);
  });

  it("delivers no turn for silence, from either side", async () => {
    const h = setUp();
    await h.open();
    h.peers.current().emit({ type: "conversation.item.input_audio_transcription.completed", item_id: "c1", transcript: "  " });
    h.peers.current().emit({ type: "response.output_audio_transcript.done", item_id: "e1", transcript: "" });

    expect(turns(h.events)).toEqual([]);
  });

  it("never lets one speaker's turns start earlier than the last", async () => {
    const h = setUp();
    await h.open();
    h.at(5_000);
    h.peers.current().emit({ type: "input_audio_buffer.speech_started", item_id: "c1" });
    h.at(6_000);
    h.peers.current().emit({ type: "input_audio_buffer.speech_started", item_id: "c2" });
    h.peers.current().emit({ type: "conversation.item.input_audio_transcription.completed", item_id: "c2", transcript: "Deux." });
    h.peers.current().emit({ type: "conversation.item.input_audio_transcription.completed", item_id: "c1", transcript: "Un." });

    const starts = turns(h.events).map((t) => (t.kind === "turn" ? t.startMs : -1));
    expect(starts).toEqual([6_000, 6_000]);
  });

  it("ignores a message that is not JSON, and an event it does not act on", async () => {
    const h = setUp();
    await h.open();
    h.peers.current().emitRaw("{");
    h.peers.current().emitRaw('"a string"');
    h.peers.current().emit({ type: "session.updated" });

    expect(h.events).toEqual([]);
    expect(h.transport.lastError()).toBeNull();
  });

  it.each([
    [{ code: "conversation_already_has_active_response", message: "m" }, "conversation_already_has_active_response"],
    [{ message: "Session expired" }, "Session expired"],
    [{}, "the realtime session reported an error."],
  ])("keeps a server error %o for lastError, and carries on", async (detail, says) => {
    const h = setUp();
    await h.open();
    h.peers.current().emit({ type: "error", error: detail });

    expect(h.events).toEqual([]);
    expect(String((h.transport.lastError() as Error).message)).toContain(says);
  });
});

describe("realtimeTransport — tools (D168)", () => {
  const call = (name: string, args: string, callId = "call_1") => ({
    type: "response.function_call_arguments.done",
    call_id: callId,
    name,
    arguments: args,
  });

  it("makes flag_difficulty a difficulty signal, and answers the call", async () => {
    const h = setUp();
    await h.open();
    h.peers.current().emit(call("flag_difficulty", '{"direction":"deescalate"}'));

    expect(h.events).toEqual([{ kind: "difficulty", direction: "deescalate" }]);
    expect(h.sentOf("conversation.item.create")).toEqual([
      { type: "conversation.item.create", item: { type: "function_call_output", call_id: "call_1", output: '{"ok":true}' } },
    ]);
  });

  it("makes note_observation a note, without its phase, which the driver stamps", async () => {
    const h = setUp();
    await h.open();
    h.peers.current().emit(call("note_observation", '{"criterion":"grammar","evidence":"« si j\'aurais »","severity":"major"}'));

    expect(h.events).toEqual([{ kind: "note", criterion: "grammar", evidence: "« si j'aurais »", severity: "major" }]);
  });

  it.each([
    ["arguments that are not JSON", call("note_observation", "{criterion")],
    ["a criterion the report does not have", call("note_observation", '{"criterion":"pronunciation","evidence":"e","severity":"minor"}')],
    ["empty evidence", call("note_observation", '{"criterion":"task","evidence":" ","severity":"minor"}')],
    ["a direction the machine does not know", call("flag_difficulty", '{"direction":"sideways"}')],
    ["a tool it did not offer", call("end_session", "{}")],
  ])("answers, but does not pass on, a call with %s", async (_, event) => {
    const h = setUp();
    await h.open();
    h.peers.current().emit(event);

    expect(h.events).toEqual([]);
    expect(h.sentOf("conversation.item.create")).toHaveLength(1);
  });

  it("cannot answer a call with no id, and passes a whole one on regardless", async () => {
    const h = setUp();
    await h.open();
    h.peers.current().emit({ type: "response.function_call_arguments.done", name: "flag_difficulty", arguments: '{"direction":"escalate"}' });

    expect(h.events).toEqual([{ kind: "difficulty", direction: "escalate" }]);
    expect(h.sentOf("conversation.item.create")).toEqual([]);
  });

  it("asks the examiner to carry on after a response that only called tools", async () => {
    const h = setUp();
    await h.open();
    const before = h.sentOf("response.create").length;
    h.peers.current().emit({ type: "response.done", response: { output: [{ type: "function_call" }, { type: "function_call" }] } });

    expect(h.sentOf("response.create")).toHaveLength(before + 1);
  });

  it("follows up only once on a run of responses that only called tools, so it cannot spend in a loop", async () => {
    const h = setUp();
    await h.open();
    const before = h.sentOf("response.create").length;
    const toolsOnly = { type: "response.done", response: { output: [{ type: "function_call" }] } };
    h.peers.current().emit(toolsOnly);
    h.peers.current().emit(toolsOnly);
    h.peers.current().emit(toolsOnly);
    expect(h.sentOf("response.create")).toHaveLength(before + 1);

    h.peers.current().emit({ type: "response.done", response: { output: [{ type: "message" }] } });
    h.peers.current().emit(toolsOnly);
    expect(h.sentOf("response.create")).toHaveLength(before + 2);
  });

  it.each([
    ["spoke as well", [{ type: "function_call" }, { type: "message" }]],
    ["said nothing at all", []],
  ])("does not prompt again after a response that %s", async (_, output) => {
    const h = setUp();
    await h.open();
    const before = h.sentOf("response.create").length;
    h.peers.current().emit({ type: "response.done", response: { output } });

    expect(h.sentOf("response.create")).toHaveLength(before);
  });
});

describe("realtimeTransport — usage (D167)", () => {
  const PRICING = {
    rt: { textInputPerMTok: 4, textOutputPerMTok: 24, audioInputPerMTok: 32, audioOutputPerMTok: 64, cachedInputPerMTok: 0.4 },
    stt: { perMinute: 0.006 },
  };
  const DONE = {
    type: "response.done",
    response: {
      output: [{ type: "message" }],
      usage: {
        input_tokens: 1_132,
        output_tokens: 121,
        input_token_details: {
          text_tokens: 1_119,
          audio_tokens: 13,
          cached_tokens: 1_064,
          cached_tokens_details: { text_tokens: 1_064, audio_tokens: 0 },
        },
        output_token_details: { text_tokens: 30, audio_tokens: 91 },
      },
    },
  };

  it("prices each response at the realtime rates, the cached input apart", async () => {
    const h = setUp({ pricing: PRICING });
    await h.open();
    h.peers.current().emit(DONE);

    const expected = (55 * 4 + 13 * 32 + 1_064 * 0.4 + 30 * 24 + 91 * 64) / 1_000_000;
    expect(h.usage).toHaveLength(1);
    expect(h.usage[0]).toMatchObject({ model: "rt", inputTokens: 1_132, outputTokens: 121 });
    expect(h.usage[0]?.costUsd).toBeCloseTo(expected, 12);
  });

  it("leaves a response unpriced, never free, when it reported no token details", async () => {
    const h = setUp({ pricing: PRICING });
    await h.open();
    h.peers.current().emit({ type: "response.done", response: { usage: { input_tokens: 10, output_tokens: 5 } } });

    expect(h.usage).toEqual([{ model: "rt", inputTokens: 10, outputTokens: 5 }]);
  });

  it("records nothing for a response that reported no usage, since it billed nothing", async () => {
    const h = setUp();
    await h.open();
    h.peers.current().emit({ type: "response.done", response: { status: "cancelled" } });

    expect(h.usage).toEqual([]);
  });

  it("leaves a response's usage unpriced when there is no pricing", async () => {
    const h = setUp();
    await h.open();
    h.peers.current().emit({ type: "response.done", response: { usage: { input_tokens: 3, output_tokens: 2 } } });

    expect(h.usage).toEqual([{ model: "rt", inputTokens: 3, outputTokens: 2 }]);
  });

  it("prices a transcription by the seconds OpenAI billed, or else by the speech it heard", async () => {
    const h = setUp({ pricing: PRICING });
    await h.open();
    h.peers.current().emit({
      type: "conversation.item.input_audio_transcription.completed",
      item_id: "c1",
      transcript: "Oui.",
      usage: { type: "duration", seconds: 30 },
    });
    h.at(1_000);
    h.peers.current().emit({ type: "input_audio_buffer.speech_started", item_id: "c2" });
    h.at(7_000);
    h.peers.current().emit({ type: "input_audio_buffer.speech_stopped", item_id: "c2" });
    h.peers.current().emit({ type: "conversation.item.input_audio_transcription.completed", item_id: "c2", transcript: "Non." });

    expect(h.usage).toEqual([
      { model: "stt", inputTokens: 0, outputTokens: 0, audioSeconds: 30, costUsd: 0.003 },
      { model: "stt", inputTokens: 0, outputTokens: 0, audioSeconds: 6, costUsd: 0.0006000000000000001 },
    ]);
  });
});

describe("realtimeTransport — directives", () => {
  it("moves to a new phase with its instructions and the examiner's cue", async () => {
    const h = setUp();
    await h.open();
    const before = h.peers.current().sent().length;
    await h.transport.direct({ phase: 1, register: "baseline" });

    expect(h.peers.current().sent().slice(before)).toEqual([
      { type: "session.update", session: { type: "realtime", instructions: studioInstructions(SCENARIO, { phase: 1, register: "baseline" }) } },
      { type: "response.create" },
    ]);
  });

  it("holds a new phase's cue while the examiner is mid-response, and sends it once that response ends", async () => {
    const h = setUp();
    await h.open();
    h.peers.current().emit({ type: "response.created", response: { id: "r1" } });
    const before = h.sentOf("response.create").length;
    await h.transport.direct({ phase: 1, register: "baseline" });

    expect(h.sentOf("session.update").at(-1)).toMatchObject({ session: { instructions: studioInstructions(SCENARIO, { phase: 1, register: "baseline" }) } });
    expect(h.sentOf("response.create")).toHaveLength(before);
    h.peers.current().emit({ type: "response.done", response: { output: [{ type: "message" }] } });
    expect(h.sentOf("response.create")).toHaveLength(before + 1);
    h.peers.current().emit({ type: "response.done", response: { output: [{ type: "message" }] } });
    expect(h.sentOf("response.create")).toHaveLength(before + 1);
  });

  it("changes register within a phase with its instructions alone", async () => {
    const h = setUp();
    await h.open();
    const before = h.peers.current().sent().length;
    await h.transport.direct({ phase: 0, register: "escalate" });

    expect(h.peers.current().sent().slice(before)).toEqual([
      { type: "session.update", session: { type: "realtime", instructions: studioInstructions(SCENARIO, { phase: 0, register: "escalate" }) } },
    ]);
  });
});

describe("realtimeTransport — repeat (D180)", () => {
  const asked = {
    type: "conversation.item.create",
    item: { type: "message", role: "user", content: [{ type: "input_text", text: studioRepeatRequest("fr") }] },
  };

  it("asks the examiner to repeat, in the session's language, then cues the examiner", async () => {
    const h = setUp();
    await h.open();
    const before = h.peers.current().sent().length;
    await h.transport.repeat();

    expect(h.peers.current().sent().slice(before)).toEqual([asked, { type: "response.create" }]);
  });

  it("holds the cue while the examiner is mid-response, and sends it once that response ends", async () => {
    const h = setUp();
    await h.open();
    h.peers.current().emit({ type: "response.created", response: { id: "r1" } });
    const before = h.sentOf("response.create").length;
    await h.transport.repeat();

    expect(h.sentOf("conversation.item.create").at(-1)).toEqual(asked);
    expect(h.sentOf("response.create")).toHaveLength(before);
    h.peers.current().emit({ type: "response.done", response: { output: [{ type: "message" }] } });
    expect(h.sentOf("response.create")).toHaveLength(before + 1);
  });

  it("makes no turn of the request, and leaves it out of a reconnect's seed", async () => {
    const h = setUp();
    await h.open();
    await h.transport.repeat();
    h.peers.current().drop();
    await settle();

    expect(turns(h.events)).toEqual([]);
    expect(h.peers.current().sent().map((m) => m.type)).toEqual(["session.update", "response.create"]);
  });

  it("is refused before the transport opens", async () => {
    const h = setUp();
    await expect(h.transport.repeat()).rejects.toThrow("not open");
  });

  it("does nothing while the line is down, and nothing once it is closed", async () => {
    const h = setUp({}, [{}, { opens: false }]);
    await h.open();
    const first = h.peers.current();
    first.drop();
    await settle();
    const redialled = h.peers.current();
    await h.transport.repeat();
    expect(first.sent().filter((m) => m.type === "conversation.item.create")).toEqual([]);
    expect(redialled.sent()).toEqual([]);

    await h.transport.close();
    await h.transport.repeat();
    expect(redialled.sent()).toEqual([]);
  });
});

describe("realtimeTransport — ending", () => {
  it("closes itself cleanly at the cap, counted from open (D166)", async () => {
    vi.useFakeTimers();
    const h = setUp({ maxMs: 60_000 });
    await h.open();
    await vi.advanceTimersByTimeAsync(59_999);
    expect(h.events).toEqual([]);
    await vi.advanceTimersByTimeAsync(1);

    expect(h.events).toEqual([{ kind: "closed", failed: false }]);
    expect(h.peers.current().closed()).toBe(true);
  });

  it("delivers the examiner's words in flight before it says closed", async () => {
    const h = setUp();
    await h.open();
    h.at(1_000);
    h.peers.current().emit({ type: "response.output_audio_transcript.delta", item_id: "e1", delta: "Pour finir," });
    h.at(1_500);
    await h.transport.close();
    await h.transport.close();

    expect(h.events).toEqual([
      { kind: "turn", speaker: "examiner", text: "Pour finir,", startMs: 1_000, endMs: 1_500 },
      { kind: "closed", failed: false },
    ]);
  });

  it("says nothing once closed, whatever the peer still sends", async () => {
    const h = setUp();
    await h.open();
    await h.transport.close();
    h.peers.current().emit({ type: "response.output_audio_transcript.done", item_id: "e1", transcript: "Encore ?" });
    await h.transport.direct({ phase: 1, register: "baseline" });

    expect(h.events).toEqual([{ kind: "closed", failed: false }]);
  });

  it("closes without a word when it was never opened", async () => {
    const h = setUp();
    await h.transport.close();

    expect(h.events).toEqual([]);
    await expect(h.transport.direct({ phase: 0, register: "baseline" })).resolves.toBeUndefined();
  });
});

describe("realtimeTransport — one reconnect, then a clean failure (exit criterion 2)", () => {
  const converse = async (h: ReturnType<typeof setUp>) => {
    await h.open();
    h.at(1_000);
    h.peers.current().emit({ type: "response.output_audio_transcript.done", item_id: "e1", transcript: "Parlez-moi de votre poste." });
    h.at(2_000);
    h.peers.current().emit({ type: "input_audio_buffer.speech_started", item_id: "c1" });
    h.at(5_000);
    h.peers.current().emit({ type: "input_audio_buffer.speech_stopped", item_id: "c1" });
    h.peers.current().emit({ type: "conversation.item.input_audio_transcription.completed", item_id: "c1", transcript: "Je suis analyste." });
  };

  it("dials again with a fresh secret, and seeds the transcript so far before the examiner carries on", async () => {
    const h = setUp();
    await converse(h);
    h.peers.current().drop();
    await settle();

    expect(h.mints()).toBe(2);
    expect(h.peers.peers).toHaveLength(2);
    expect(h.peers.peers[0]?.closed()).toBe(true);
    expect(h.endpoint.calls.map((c) => c.headers.authorization)).toEqual(["Bearer ek_1", "Bearer ek_2"]);
    const again = h.peers.current().sent();
    expect(again.map((m) => m.type)).toEqual(["session.update", "conversation.item.create", "conversation.item.create", "response.create"]);
    expect(again.slice(1, 3)).toEqual([
      {
        type: "conversation.item.create",
        item: { type: "message", role: "assistant", content: [{ type: "output_text", text: "Parlez-moi de votre poste." }] },
      },
      {
        type: "conversation.item.create",
        item: { type: "message", role: "user", content: [{ type: "input_text", text: "Je suis analyste." }] },
      },
    ]);
    expect(h.events.filter((e) => e.kind === "closed")).toEqual([]);
  });

  it("asks the reconnected line for the same turn detection eagerness", async () => {
    const h = setUp({ turnEagerness: "low" });
    await converse(h);
    h.peers.current().drop();
    await settle();

    const [update] = h.sentOf("session.update");
    expect(update?.session).toMatchObject({
      audio: { input: { turn_detection: { type: "semantic_vad", eagerness: "low" } } },
    });
  });

  it("carries on after a reconnect: the new line's turns are delivered, the old line's ignored", async () => {
    const h = setUp();
    await converse(h);
    const old = h.peers.current();
    old.drop();
    await settle();
    old.emit({ type: "response.output_audio_transcript.done", item_id: "x", transcript: "De l'ancienne ligne." });
    h.at(9_000);
    h.peers.current().emit({ type: "response.output_audio_transcript.done", item_id: "e2", transcript: "Reprenons." });

    expect(turns(h.events).map((t) => t.kind === "turn" && t.text)).toEqual([
      "Parlez-moi de votre poste.",
      "Je suis analyste.",
      "Reprenons.",
    ]);
  });

  it("applies a directive sent while it redialled once the line is back, sending nothing to the dead line", async () => {
    const h = setUp();
    await converse(h);
    const old = h.peers.current();
    const sentBefore = old.sent().length;
    old.drop();
    await h.transport.direct({ phase: 1, register: "escalate" });
    await settle();

    expect(old.sent()).toHaveLength(sentBefore);
    const first = h.peers.current().sent()[0] as { session: { instructions: string } };
    expect(first.session.instructions).toBe(studioInstructions(SCENARIO, { phase: 1, register: "escalate" }));
  });

  it("fails cleanly on a second drop: every turn kept, the words in flight delivered, closed { failed } last", async () => {
    const h = setUp();
    await converse(h);
    h.peers.current().drop();
    await settle();
    h.at(8_000);
    h.peers.current().emit({ type: "response.output_audio_transcript.delta", item_id: "e2", delta: "Et votre équipe" });
    h.peers.current().drop();
    await settle();

    expect(h.events.map((e) => (e.kind === "turn" ? e.text : e.kind))).toEqual([
      "Parlez-moi de votre poste.",
      "Je suis analyste.",
      "Et votre équipe",
      "closed",
    ]);
    expect(h.events.at(-1)).toEqual({ kind: "closed", failed: true });
    expect(h.peers.current().closed()).toBe(true);
  });

  it("fails cleanly, keeping why, when the reconnect cannot mint a secret", async () => {
    const h = setUp();
    await converse(h);
    h.refuseSecret();
    h.peers.current().drop();
    await settle();

    expect(h.events.at(-1)).toEqual({ kind: "closed", failed: true });
    expect(turns(h.events)).toHaveLength(2);
    expect(h.transport.lastError()).toMatchObject({ message: "no key held" });
  });

  it("fails cleanly when the reconnect's line drops before it opens", async () => {
    const h = setUp({}, [{}, { dropsWhileOpening: true }]);
    await converse(h);
    h.peers.current().drop();
    await settle();

    expect(h.events.filter((e) => e.kind === "closed")).toEqual([{ kind: "closed", failed: true }]);
  });

  it("says closed once, cleanly, when the client closes while it redials", async () => {
    const h = setUp({}, [{}, { opens: false }]);
    await converse(h);
    h.peers.current().drop();
    await settle();
    await h.transport.close();

    expect(h.events.filter((e) => e.kind === "closed")).toEqual([{ kind: "closed", failed: false }]);
  });
});
