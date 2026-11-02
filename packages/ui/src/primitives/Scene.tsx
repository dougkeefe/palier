import type { JSX } from "react";

import type { CocoPose, SceneName } from "./logic.js";

/**
 * A spot illustration (progress.md D269): Coco the parrot, filled in the brand's teal, among props drawn as ink line
 * art, on a tinted circle. The look is onboarding's reference, a figure on a soft disc above a short heading, kept to
 * the tokens so it needs no new colour and no contrast check of its own.
 *
 * Drawn the way `Mascot` is: presentation attributes only, so the strict CSP's `style-src` has nothing to refuse, and
 * no text, so nothing to translate. Decorative: `aria-hidden`, since the heading beside it carries the meaning. A new
 * scene is an entry in `SCENES` and a new pose one in `COCO_WINGS` (principle 6).
 *
 * Coco hops in as the scene mounts, and confetti pops on `celebrate`: transform only, off under reduced motion and in
 * exam mode by the stylesheet's one switch. A caller replays the hop by keying the scene.
 */
export type SceneProps = {
  readonly name: SceneName;
  readonly className?: string;
};

/** Coco's wings in each pose, in Coco's own 60 × 76 frame, facing right, feet at y 74. */
const COCO_WINGS: Readonly<Record<CocoPose, JSX.Element>> = {
  rest: <path d="M12 40 q-2 16 12 22 q2 -14 -12 -22 z" fill="var(--accent)" />,
  wave: (
    <>
      <path d="M12 40 q-2 16 12 22 q2 -14 -12 -22 z" fill="var(--accent)" />
      <path className="pl-scene__wing" d="M38 40 q16 -4 20 -22 q-12 2 -20 14 z" fill="var(--accent)" />
    </>
  ),
  hold: <path d="M30 40 q16 2 22 8 q-10 6 -22 0 z" fill="var(--accent)" />,
  cheer: (
    <>
      <path d="M14 40 q-16 -4 -18 -22 q12 4 18 14 z" fill="var(--accent)" />
      <path d="M38 40 q16 -4 20 -22 q-12 2 -20 14 z" fill="var(--accent)" />
    </>
  ),
};

/** Coco, placed with its feet at (`x`, `ground`) on the scene's grid and drawn `scale` times its own size. */
const Coco = ({ pose, x, ground, scale }: { pose: CocoPose; x: number; ground: number; scale: number }): JSX.Element => (
  <g transform={`translate(${x} ${ground - 74 * scale}) scale(${scale})`}>
    <g className="pl-scene__coco">
      <path d="M14 54 L4 74 L13 71 L20 58 Z" fill="var(--accent)" />
      <ellipse cx="26" cy="48" rx="17" ry="20" fill="var(--primary)" />
      <ellipse cx="29" cy="52" rx="9" ry="12" fill="var(--surface)" fillOpacity="0.25" />
      <circle cx="30" cy="22" r="15" fill="var(--primary)" />
      <path d="M24 8 q-2 -8 6 -8 q-2 4 1 7 z" fill="var(--accent)" />
      <path d="M43 18 q11 1 9 13 q-5 -5 -10 -5 z" fill="var(--accent)" />
      <circle cx="35" cy="19" r="4" fill="var(--surface)" />
      <circle cx="36" cy="19" r="2" fill="var(--ink)" />
      <circle cx="31" cy="28" r="3" fill="var(--surface-rose)" />
      <path d="M22 67 v7 M31 67 v7" stroke="var(--ink)" strokeWidth="2.5" strokeLinecap="round" />
      {COCO_WINGS[pose]}
    </g>
  </g>
);

/** The props' pen: ink line art, round-ended, as the reference draws them. */
const Ink = ({ children }: { children: JSX.Element | JSX.Element[] }): JSX.Element => (
  <g fill="none" stroke="var(--ink)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    {children}
  </g>
);

/** The ground every scene stands on. */
const GROUND = 176;

/** Each scene's disc colour and drawing, on a 240 × 200 grid. */
export const SCENES: Readonly<Record<SceneName, { readonly disc: string; readonly drawing: JSX.Element }>> = {
  // Coco waves hello beside a speech bubble and a stack of papers: the federal workplace, in a friendly key.
  hello: {
    disc: "var(--surface-tint)",
    drawing: (
      <>
        <Ink>
          <path d="M40 48 h16 M48 40 v16" stroke="var(--accent)" />
          <rect x="164" y="112" width="44" height="56" rx="3" fill="var(--surface)" />
          <rect x="154" y="120" width="44" height="56" rx="3" fill="var(--surface)" />
          <path d="M162 136 h28 M162 146 h22 M162 156 h26" />
          <rect x="146" y="30" width="64" height="40" rx="14" fill="var(--surface)" />
          <path d="M162 70 l-8 12 l20 -12" fill="var(--surface)" />
        </Ink>
        <circle cx="163" cy="50" r="4" fill="var(--ink)" />
        <circle cx="178" cy="50" r="4" fill="var(--ink)" />
        <circle cx="193" cy="50" r="4" fill="var(--ink)" />
        <circle cx="214" cy="100" r="3" fill="var(--accent)" />
        <Coco pose="wave" x={64} ground={GROUND} scale={1.25} />
      </>
    ),
  },
  // Coco on a laptop, a dotted line to a phone and a folder: progress brought over from another device or a file.
  devices: {
    disc: "var(--surface-quiet)",
    drawing: (
      <>
        <Ink>
          <rect x="34" y="120" width="76" height="48" rx="4" fill="var(--surface)" />
          <path d="M26 176 h92 l-8 -8 h-76 z" fill="var(--surface)" />
          <rect x="168" y="70" width="38" height="66" rx="6" fill="var(--surface)" />
          <path d="M182 128 h10" />
          <path d="M118 112 C 136 88, 150 84, 164 90" stroke="var(--accent)" strokeDasharray="2 8" />
          <path d="M150 150 h40 l6 8 h20 v18 h-66 z" fill="var(--surface)" />
        </Ink>
        <path d="M178 96 l6 6 l12 -12" fill="none" stroke="var(--accent)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
        <Coco pose="wave" x={48} ground={120} scale={0.75} />
      </>
    ),
  },
  // Coco at the top of a staircase, by a flag: the level aimed for.
  summit: {
    disc: "var(--surface-rose)",
    drawing: (
      <>
        <Ink>
          <path d="M60 82 a10 10 0 0 1 16 -8 a13 13 0 0 1 24 4 a9 9 0 0 1 -2 18 h-36 a8 8 0 0 1 -2 -14 z" fill="var(--surface)" />
          <path d="M46 140 C 70 104, 100 96, 118 90" stroke="var(--accent)" strokeDasharray="2 8" />
          <path d="M36 176 V150 H82 V122 H128 V94 H180 V176 Z" fill="var(--surface)" />
          <path d="M174 94 V34" />
          <path d="M174 34 L204 44 L174 54 Z" fill="var(--accent)" />
        </Ink>
        <Coco pose="rest" x={126} ground={94} scale={0.8} />
      </>
    ),
  },
  // Coco with a mug beside a clock: a few minutes a day.
  time: {
    disc: "var(--surface-mint)",
    drawing: (
      <>
        <Ink>
          <circle cx="82" cy="104" r="40" fill="var(--surface)" />
          <path d="M82 70 v6 M116 104 h-6 M82 138 v-6 M48 104 h6" />
          <path d="M82 104 V82 M82 104 L98 114" strokeWidth="3.5" />
          <path d="M58 62 l-8 -8 M106 62 l8 -8" />
        </Ink>
        <circle cx="82" cy="104" r="3.5" fill="var(--ink)" />
        <Coco pose="hold" x={130} ground={GROUND} scale={1.1} />
        <Ink>
          <rect x="186" y="128" width="20" height="24" rx="3" fill="var(--surface)" />
          <path d="M206 134 a6 6 0 0 1 0 12" />
          <path d="M192 120 q-4 -6 0 -12 M200 120 q-4 -6 0 -12" stroke="var(--accent)" />
        </Ink>
      </>
    ),
  },
  // Coco holding a key up to an open padlock: the user's own key.
  key: {
    disc: "var(--surface-quiet)",
    drawing: (
      <>
        <Ink>
          <path d="M170 132 v-16 a14 14 0 0 1 28 0" />
          <rect x="160" y="128" width="44" height="40" rx="6" fill="var(--surface)" />
          <path d="M182 150 v8" />
          <path d="M163 76 L118 128" strokeWidth="6" />
          <path d="M132 112 l9 8 M124 121 l7 6" strokeWidth="4" />
          <circle cx="174" cy="62" r="18" fill="var(--accent)" />
        </Ink>
        <circle cx="182" cy="146" r="4" fill="var(--ink)" />
        <circle cx="174" cy="62" r="6" fill="var(--surface-quiet)" />
        <path d="M40 50 h14 M47 43 v14" stroke="var(--accent)" strokeWidth="2.5" strokeLinecap="round" />
        <Coco pose="hold" x={56} ground={GROUND} scale={1.2} />
      </>
    ),
  },
  // Coco cheering, wings up, in a pop of confetti: ready to start.
  celebrate: {
    disc: "var(--surface-tint)",
    drawing: (
      <>
        <g className="pl-scene__confetti">
          <rect x="44" y="56" width="12" height="7" rx="2" fill="var(--accent)" transform="rotate(24 50 60)" />
          <circle cx="192" cy="52" r="6" fill="var(--surface-rose)" />
          <rect x="172" y="100" width="12" height="7" rx="2" fill="var(--primary)" transform="rotate(-30 178 104)" />
          <circle cx="58" cy="124" r="5" fill="var(--surface-mint)" />
          <rect x="98" y="30" width="10" height="6" rx="2" fill="var(--surface-rose)" transform="rotate(-14 103 33)" />
          <circle cx="150" cy="32" r="4" fill="var(--accent)" />
          <circle cx="202" cy="132" r="4" fill="var(--primary)" />
          <rect x="32" y="92" width="10" height="6" rx="2" fill="var(--primary)" transform="rotate(40 37 95)" />
        </g>
        <Ink>
          <path d="M206 92 q6 -6 0 -12 q-6 -6 0 -12" stroke="var(--accent)" />
          <path d="M34 150 q6 -6 0 -12 q-6 -6 0 -12" stroke="var(--accent)" />
        </Ink>
        <Coco pose="cheer" x={76} ground={GROUND} scale={1.45} />
      </>
    ),
  },
};

export const Scene = ({ name, className }: SceneProps): JSX.Element => {
  const { disc, drawing } = SCENES[name];
  return (
    <svg
      className={className === undefined ? "pl-scene" : `pl-scene ${className}`}
      viewBox="0 0 240 200"
      width="240"
      height="200"
      aria-hidden="true"
      focusable="false"
    >
      <circle cx="120" cy="100" r="88" fill={disc} />
      <ellipse cx="140" cy="92" rx="54" ry="60" fill="var(--surface)" fillOpacity="0.4" />
      <path d={`M28 ${GROUND} h184`} stroke="var(--ink)" strokeWidth="2" strokeLinecap="round" />
      {drawing}
    </svg>
  );
};
