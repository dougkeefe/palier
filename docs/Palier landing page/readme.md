# Palier design system

Palier is a free web study tool for the Public Service Commission of Canada's Second Language Evaluation (SLE), Levels B and C. It offers timed reading and written-expression drills, mock exams, AI feedback on writing and spoken practice with an AI partner. No account is needed. The AI features run on the user's own OpenAI key. It is independent and not affiliated with the PSC. The site is bilingual (EN/FR).

**Source:** `Palier Landing v4.dc.html` in this project (the landing page, built from a layout and typography reference screenshot). No logo or brand mark was supplied, so "Palier" is set as a text wordmark. All photography on the landing is Unsplash stock and is placeholder.

## Content fundamentals
- Plain, factual, second person ("Open it and start", "Bring your own key"). No hype, no exclamation marks, no emoji.
- Short declarative sentences. State costs, limits and privacy directly ("Cost shown first", "never a promised result").
- Sentence case everywhere, including headings. Eyebrows are short labels ("How it works").
- Canadian spelling in English ("Practise" the verb). The French copy is written natively, not literally translated; every string exists in both languages.
- CTAs name the outcome: "Try a free mock exam", "Start free", "Try a sample question".
- Always include the disclaimer: "Not an official tool."

## Visual foundations
- **Ground:** paper `#f3f2f2`, ink `#201e1d`. Sections separate by whitespace (clamp 48–104px), not rules.
- **Accent:** a single teal ramp (100 tint, 700 links, 800 deep panels, 900 footer and dark buttons). Magenta `#9b004e` is used only for small kickers ("Test one").
- **Type:** Source Serif 4 for everything. Display 400 at tight tracking (−0.035em); H2 500; body 16/1.55. Flush-left except the features heading, How it works and FAQ headers, which are centred.
- **Photography:** full-bleed photos under navy scrims (`--overlay-hero`, `--overlay-banner`, `--overlay-card`), white text on top. Cool, teal-leaning imagery. No grain or illustration.
- **Glass:** translucent white fills with 8–12px backdrop blur for nav, chips and the language switch, only over photographs.
- **Shape:** pills (999px) for buttons, chips and nav; 12px for panels; 10px FAQ rows; 8px inputs and answer options; 16px banner.
- **Buttons:** white pill with a dark arrow disc on photos; deep-teal pill with a white disc on paper. Hover shifts to teal 100 (light) or teal 700 (dark).
- **Cards/panels:** flat colour fills, no borders, no shadows. 420px minimum height, 28px padding, 16px gap.
- **Footer:** deep teal with a giant 10% white "PALIER" wordmark cropped at the bottom.
- **Motion:** none beyond hover colour changes and smooth anchor scrolling.
- **Focus:** 2px accent outline, 2px offset.

## Iconography
No icon set is used. Arrows and toggles are text glyphs (↗, +, −) inside the button disc or row. Don't draw SVG icons; if an icon set is needed later, use a thin-stroke set such as Phosphor and flag it.

## Index
- `styles.css` imports the tokens in `tokens/` (colors, typography, spacing, base).
- `components/core/` holds Button, Chip, Eyebrow, NavPill, LangSwitch, FeatureCard and FaqItem, each with `.d.ts` and `.prompt.md`, and `core.card.html` as the preview.
- `guidelines/` holds the specimen cards for colours, type, spacing and the wordmark.
- `Palier Landing v4.dc.html` is the reference page. `Palier Landing v3.dc.html`, `v2` and the original are earlier versions.
- `SKILL.md` makes this usable as an Agent Skill.

## Intentional additions
`LangSwitch` and `NavPill` are extracted from the landing header so they can be reused; no other primitives were invented.

## Caveats
The `_ds/` folder holds the unrelated Broadsheet system from earlier work; this design does not use it.
