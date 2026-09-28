/**
 * The microphone level check (architecture.md §8.5 step 1, progress.md D119): three seconds of the
 * microphone through an `AnalyserNode`, reporting each reading so the screen can draw a meter, and
 * settling with the loudest, which `levelVerdict` judges.
 */

/** A frame's loudness: the root mean square of its samples, 0 for silence, about 0.7 for a full sine. */
export const rms = (samples: ArrayLike<number>): number => {
  if (samples.length === 0) return 0;
  let sum = 0;
  for (let i = 0; i < samples.length; i++) {
    const sample = samples[i] ?? 0;
    sum += sample * sample;
  }
  return Math.sqrt(sum / samples.length);
};

/** What the check needs of Web Audio, so a test can hand in a fake. */
export type LevelKit = {
  readonly open: (stream: MediaStream) => { readonly read: () => number; readonly close: () => void };
  readonly every: (ms: number, fn: () => void) => () => void;
  readonly after: (ms: number) => Promise<void>;
};

/** How often the meter reads the microphone. */
export const LEVEL_READ_MS = 100;

/** Listen for `durationMs`, reporting each reading, and settle with the loudest. */
export const measureLevel = async (
  stream: MediaStream,
  durationMs: number,
  onLevel: (level: number) => void,
  kit: LevelKit,
): Promise<number> => {
  const source = kit.open(stream);
  let peak = 0;
  const stop = kit.every(LEVEL_READ_MS, () => {
    const level = source.read();
    peak = Math.max(peak, level);
    onLevel(level);
  });
  try {
    await kit.after(durationMs);
    return peak;
  } finally {
    stop();
    source.close();
  }
};

/** The browser's Web Audio and timers. */
export const browserLevelKit = (): LevelKit => ({
  open: (stream) => {
    const context = new AudioContext();
    // WebKit may make a context suspended when it is created after an await; a suspended one reads silence (D121).
    void context.resume().catch(() => undefined);
    const analyser = context.createAnalyser();
    analyser.fftSize = 2048;
    context.createMediaStreamSource(stream).connect(analyser);
    const samples = new Float32Array(analyser.fftSize);
    return {
      read: () => {
        analyser.getFloatTimeDomainData(samples);
        return rms(samples);
      },
      close: () => void context.close(),
    };
  },
  every: (ms, fn) => {
    const timer = setInterval(fn, ms);
    return () => clearInterval(timer);
  },
  after: (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
});
