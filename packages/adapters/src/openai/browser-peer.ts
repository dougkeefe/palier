import type { RealtimePeer, RealtimePeerFactory, RealtimePeerState } from "./realtime-transport.js";

/** The data channel the Realtime API carries its JSON events on. */
export const REALTIME_EVENTS_CHANNEL = "oai-events";

export type BrowserRealtimePeerMedia = {
  /** The candidate's microphone, which the studio screen owns and asked for (Phase 6 Slice 2). */
  readonly microphone: MediaStream;
  /** Where the examiner's voice plays. */
  readonly remoteAudio: HTMLAudioElement;
};

/**
 * The browser's `RealtimePeer` (progress.md D170): native `RTCPeerConnection`, no SDK. The
 * microphone's audio goes out, the examiner's voice comes in to `remoteAudio`, and the events go
 * both ways on the `oai-events` channel. A connection the browser calls `failed`, or a channel that
 * closes without the client closing it, is a drop, said once. Each dial makes a new connection.
 *
 * Its unit test stubs `RTCPeerConnection`; whether real WebRTC behaves is the manual realtime
 * checklist's (architecture.md §14), on every browser Gate O names.
 */
export const browserRealtimePeer =
  (media: BrowserRealtimePeerMedia): RealtimePeerFactory =>
  (): RealtimePeer => {
    const connection = new RTCPeerConnection();
    for (const track of media.microphone.getAudioTracks()) connection.addTrack(track, media.microphone);
    const channel = connection.createDataChannel(REALTIME_EVENTS_CHANNEL);
    let onMessage: (message: string) => void = () => undefined;
    let onState: (state: RealtimePeerState) => void = () => undefined;
    let over = false;
    const drop = (): void => {
      if (over) return;
      over = true;
      onState("dropped");
    };
    connection.ontrack = (event) => {
      media.remoteAudio.srcObject = event.streams[0] ?? null;
    };
    connection.onconnectionstatechange = () => {
      if (connection.connectionState === "failed") drop();
    };
    channel.onopen = () => {
      onState("open");
    };
    channel.onclose = drop;
    channel.onmessage = (event: MessageEvent) => {
      onMessage(String(event.data));
    };
    return {
      offer: async () => {
        const offer = await connection.createOffer();
        await connection.setLocalDescription(offer);
        return offer.sdp ?? "";
      },
      answer: (sdp) => connection.setRemoteDescription({ type: "answer", sdp }),
      send: (message) => {
        if (channel.readyState === "open") channel.send(message);
      },
      onMessage: (listener) => {
        onMessage = listener;
      },
      onState: (listener) => {
        onState = listener;
      },
      close: () => {
        over = true;
        channel.close();
        connection.close();
      },
    };
  };
