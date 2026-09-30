import { afterEach, describe, expect, it, vi } from "vitest";

import { REALTIME_EVENTS_CHANNEL, browserRealtimePeer } from "./browser-peer.js";
import type { RealtimePeerState } from "./realtime-transport.js";

/**
 * The browser's realtime peer (progress.md D170) over a stubbed `RTCPeerConnection`: the wiring
 * is ours to test; whether real WebRTC carries it is the manual realtime checklist's.
 */

type Handler = ((event: never) => void) | null;

class FakeChannel {
  readyState: "connecting" | "open" | "closed" = "connecting";
  readonly sent: string[] = [];
  onopen: Handler = null;
  onclose: Handler = null;
  onmessage: Handler = null;
  constructor(readonly label: string) {}
  send(message: string) {
    this.sent.push(message);
  }
  close() {
    this.readyState = "closed";
  }
}

class FakeConnection {
  static made: FakeConnection[] = [];
  readonly tracks: unknown[] = [];
  readonly channels: FakeChannel[] = [];
  connectionState = "new";
  local: unknown = null;
  remote: unknown = null;
  closed = false;
  ontrack: Handler = null;
  onconnectionstatechange: Handler = null;
  constructor() {
    FakeConnection.made.push(this);
  }
  addTrack(track: unknown) {
    this.tracks.push(track);
  }
  createDataChannel(label: string) {
    const channel = new FakeChannel(label);
    this.channels.push(channel);
    return channel;
  }
  createOffer() {
    return Promise.resolve({ type: "offer", sdp: "v=0 offer" });
  }
  setLocalDescription(description: unknown) {
    this.local = description;
    return Promise.resolve();
  }
  setRemoteDescription(description: unknown) {
    this.remote = description;
    return Promise.resolve();
  }
  close() {
    this.closed = true;
  }
}

const fire = (handler: Handler, event: unknown = {}) => (handler as ((e: unknown) => void) | null)?.(event);

const media = () => {
  const track = { kind: "audio" };
  const microphone = { getAudioTracks: () => [track] } as unknown as MediaStream;
  const remoteAudio = { srcObject: null } as unknown as HTMLAudioElement;
  return { track, microphone, remoteAudio };
};

const dial = () => {
  vi.stubGlobal("RTCPeerConnection", FakeConnection);
  const m = media();
  const peer = browserRealtimePeer(m)();
  const connection = FakeConnection.made.at(-1) as FakeConnection;
  const channel = connection.channels[0] as FakeChannel;
  const states: RealtimePeerState[] = [];
  const messages: string[] = [];
  peer.onState((s) => void states.push(s));
  peer.onMessage((message) => void messages.push(message));
  return { ...m, peer, connection, channel, states, messages };
};

afterEach(() => {
  vi.unstubAllGlobals();
  FakeConnection.made = [];
});

describe("browserRealtimePeer", () => {
  it("sends the microphone and opens the Realtime API's events channel", () => {
    const { connection, channel, track } = dial();

    expect(connection.tracks).toEqual([track]);
    expect(channel.label).toBe(REALTIME_EVENTS_CHANNEL);
    expect(REALTIME_EVENTS_CHANNEL).toBe("oai-events");
  });

  it("makes the offer its local description and hands back its SDP, then sets the answer", async () => {
    const { peer, connection } = dial();

    expect(await peer.offer()).toBe("v=0 offer");
    expect(connection.local).toEqual({ type: "offer", sdp: "v=0 offer" });
    await peer.answer("v=0 answer");
    expect(connection.remote).toEqual({ type: "answer", sdp: "v=0 answer" });
  });

  it("hands back an empty offer when the browser gives no SDP", async () => {
    const { peer, connection } = dial();
    connection.createOffer = () => Promise.resolve({ type: "offer" } as never);

    expect(await peer.offer()).toBe("");
  });

  it("plays the examiner's voice, and nothing when the track has no stream", () => {
    const { connection, remoteAudio } = dial();
    const stream = { id: "remote" };
    fire(connection.ontrack, { streams: [stream] });
    expect(remoteAudio.srcObject).toBe(stream);
    fire(connection.ontrack, { streams: [] });
    expect(remoteAudio.srcObject).toBeNull();
  });

  it("says open when the channel opens, and passes its messages on as text", () => {
    const { channel, states, messages } = dial();
    fire(channel.onopen);
    fire(channel.onmessage, { data: '{"type":"session.created"}' });

    expect(states).toEqual(["open"]);
    expect(messages).toEqual(['{"type":"session.created"}']);
  });

  it("sends only on an open channel", () => {
    const { peer, channel } = dial();
    peer.send("early");
    channel.readyState = "open";
    peer.send("{}");

    expect(channel.sent).toEqual(["{}"]);
  });

  it("says dropped once when the connection fails, however it fails", () => {
    const { connection, channel, states } = dial();
    connection.connectionState = "disconnected";
    fire(connection.onconnectionstatechange);
    connection.connectionState = "failed";
    fire(connection.onconnectionstatechange);
    fire(channel.onclose);

    expect(states).toEqual(["dropped"]);
  });

  it("says dropped when the channel closes on its own", () => {
    const { channel, states } = dial();
    fire(channel.onclose);

    expect(states).toEqual(["dropped"]);
  });

  it("closes the channel and the connection when asked, and never calls that a drop", () => {
    const { peer, connection, channel, states } = dial();
    peer.close();
    fire(channel.onclose);

    expect(channel.readyState).toBe("closed");
    expect(connection.closed).toBe(true);
    expect(states).toEqual([]);
  });

  it("drops nothing before anyone listens", () => {
    vi.stubGlobal("RTCPeerConnection", FakeConnection);
    browserRealtimePeer(media())();
    const connection = FakeConnection.made.at(-1) as FakeConnection;

    expect(() => {
      fire(connection.channels[0]?.onopen ?? null);
      fire(connection.channels[0]?.onmessage ?? null, { data: "x" });
      fire(connection.channels[0]?.onclose ?? null);
    }).not.toThrow();
  });
});
