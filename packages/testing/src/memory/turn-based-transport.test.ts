import type { OralDirective, OralTransport } from "@palier/app";
import { turnBasedTransport } from "@palier/app";

import { fakeClock } from "../clock/fake-clock.js";
import { oralTransportContract } from "../contracts/index.js";
import { memoryAnswerSource } from "./answer-source.js";
import { fakeAiProvider } from "./ai-provider.js";
import { memoryCostLedger } from "./cost-ledger.js";
import { memoryKeyVault } from "./key-vault.js";

/**
 * Practice mode's transport held to the contract Phase 6's full-duplex one will be
 * (progress.md D118): `@palier/app`'s real `turnBasedTransport`, over the fake provider and a
 * scripted candidate who answers twice.
 *
 * For a turn-based transport the examiner's side is the transport's own state, since the
 * examiner speaks only when the candidate has answered. So `directives` is what the transport
 * accepted while it was open, which the harness sees at the port, and `hangUp(true)` is the
 * candidate's side failing, as a microphone that went away does. The transport's own handling
 * of each directive is `@palier/app`'s unit tests.
 */
oralTransportContract("turnBasedTransport", async () => {
  const vault = memoryKeyVault();
  await vault.putApiKey("sk-contract", { remember: false });
  const source = memoryAnswerSource([
    { kind: "typed", text: "Je suis analyste." },
    { kind: "audio", audio: new Blob(["Je coordonne des consultations."], { type: "audio/webm" }), durationMs: 4_000 },
  ]);
  const clock = fakeClock("2026-09-27T10:00:00.000Z");
  const inner = turnBasedTransport({
    vault,
    aiProvider: () => fakeAiProvider(),
    ledger: memoryCostLedger(),
    clock,
    answers: source.answers,
  });

  let open = false;
  let closed = false;
  let seeClosed: () => void = () => undefined;
  const closedSeen = new Promise<void>((resolve) => {
    seeClosed = resolve;
  });
  const accepted: OralDirective[] = [];

  const transport: OralTransport = {
    open: async (req, sink) => {
      await inner.open(req, (event) => {
        if (event.kind === "closed") {
          closed = true;
          seeClosed();
        }
        sink(event);
      });
      open = true;
    },
    direct: async (directive) => {
      const reaching = open && !closed;
      await inner.direct(directive);
      if (reaching) accepted.push(directive);
    },
    close: () => inner.close(),
  };

  return {
    transport,
    advance: async (ms) => {
      clock.advance(ms);
      await Promise.race([source.idle(), closedSeen]);
    },
    hangUp: async (failed) => {
      if (!failed) return inner.close();
      source.fail(new Error("The microphone went away."));
      await closedSeen;
    },
    directives: () => accepted,
  };
});
