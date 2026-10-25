import { readdirSync, readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

/**
 * `docs/progress.md` and its archive (progress.md D255, rule 8 of its working agreement). The live file keeps the
 * newest ten deviations and session entries in full, and an index line for every older deviation. The older entries
 * live in `docs/progress-archive/`, moved there verbatim. These tests make the rotation a build failure rather than a
 * habit: without them the file grows back past what one read can hold, which is why D255 exists.
 *
 * `docs/` is no workspace, so it is read by file URL, as `server/selfhost.test.ts` reads `selfhost/`.
 */

const DOCS = new URL("../../../../docs/", import.meta.url);
const ARCHIVE = new URL("progress-archive/", DOCS);
const LIVE_FULL = 10;
const LIVE_LINES_OUTSIDE_INDEX = 1200;

const DEVIATION = /^### D(\d+) — (.*)$/;
const SESSION = /^### (\d{1,2}) ([A-Z][a-z]+) (\d{4}) — /;
const INDEX_LINE = /^- \*\*D(\d+)\*\* — /;
const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

type Deviation = { readonly n: number; readonly title: string; readonly heading: string; readonly block: string; readonly file: string };
type Session = { readonly heading: string; readonly time: number; readonly month: string; readonly file: string };

const read = (url: URL) => readFileSync(url, "utf8");
const live = read(new URL("progress.md", DOCS));
const archiveFiles = readdirSync(ARCHIVE).sort();
const archived = archiveFiles.map((file) => ({ file, text: read(new URL(file, ARCHIVE)) }));

/** Each heading the pattern matches opens a block that runs to the next `##` or `###` heading. */
const blocksOf = (text: string, pattern: RegExp) => {
  const lines = text.split("\n");
  const starts = lines.flatMap((line, i) => (pattern.test(line) ? [i] : []));
  return starts.map((start) => {
    const end = lines.findIndex((line, i) => i > start && /^#{2,3} /.test(line));
    return lines.slice(start, end < 0 ? lines.length : end).join("\n");
  });
};

const deviationsIn = (file: string, text: string): readonly Deviation[] =>
  blocksOf(text, DEVIATION).map((block) => {
    const heading = block.split("\n")[0] ?? "";
    const [, n, title] = DEVIATION.exec(heading) ?? [];
    return { n: Number(n), title: title ?? "", heading, block, file };
  });

const sessionsIn = (file: string, text: string): readonly Session[] =>
  blocksOf(text, SESSION).map((block) => {
    const heading = block.split("\n")[0] ?? "";
    const [, day, month, year] = SESSION.exec(heading) ?? [];
    const m = MONTHS.indexOf(month ?? "");
    return { heading, time: Date.UTC(Number(year), m, Number(day)), month: `${year}-${String(m + 1).padStart(2, "0")}`, file };
  });

/** The status an index line carries: the `**Status:**` text, unbolded, up to its first clause break. */
const statusOf = (block: string) => {
  const line = block.split("\n").find((l) => l.includes("**Status:**")) ?? "";
  const raw = line.slice(line.indexOf("**Status:**") + "**Status:**".length).replaceAll("**", "").trim();
  return (raw.split(/ \(|:|;| — |\. /)[0] ?? "").trim();
};

/** GitHub's heading anchor: lower case, punctuation dropped, spaces as hyphens. */
const anchorOf = (heading: string) =>
  heading
    .replace(/^#+ /, "")
    .toLowerCase()
    .replace(/[^\p{L}\p{M}\p{N}\p{Pc}\- ]/gu, "")
    .replaceAll(" ", "-");

const pad = (n: number) => String(n).padStart(3, "0");
const bucketOf = (n: number) => {
  const low = Math.floor(n / 100) * 100;
  return `deviations-D${pad(low)}-D${pad(low + 99)}.md`;
};
const indexLineOf = (d: Deviation) =>
  `- **D${d.n}** — ${d.title} · ${statusOf(d.block)} → [${d.file}](progress-archive/${d.file}#${anchorOf(d.heading)})`;

const liveDeviations = deviationsIn("progress.md", live);
const liveSessions = sessionsIn("progress.md", live);
const archivedDeviations = archived.flatMap(({ file, text }) => deviationsIn(file, text));
const archivedSessions = archived.flatMap(({ file, text }) => sessionsIn(file, text));
const indexLines = live.split("\n").filter((line) => INDEX_LINE.test(line));
const indexedNumber = (line: string) => Number(INDEX_LINE.exec(line)?.[1]);

describe("docs/progress.md, the live file", () => {
  it("keeps at most ten deviations and ten session entries in full", () => {
    expect(liveDeviations.length).toBeLessThanOrEqual(LIVE_FULL);
    expect(liveSessions.length).toBeLessThanOrEqual(LIVE_FULL);
  });

  it("stays under its line budget outside the deviation index", () => {
    expect(live.split("\n").length - indexLines.length).toBeLessThan(LIVE_LINES_OUTSIDE_INDEX);
  });

  it("links every month of the archived session log", () => {
    const months = archiveFiles.filter((file) => file.startsWith("sessions-"));
    expect(months.filter((file) => !live.includes(`](progress-archive/${file})`))).toEqual([]);
  });
});

describe("the deviations, across the live file and the archive", () => {
  const all = [...archivedDeviations, ...liveDeviations];

  it("holds every deviation in full exactly once, numbered from D1 with no gap", () => {
    const numbers = all.map((d) => d.n);
    const missing = Array.from({ length: Math.max(...numbers) }, (_, i) => i + 1).filter((n) => !numbers.includes(n));
    const repeated = numbers.filter((n, i) => numbers.indexOf(n) !== i);
    expect({ missing: missing.map((n) => `D${n}`), repeated: repeated.map((n) => `D${n}`) }).toEqual({ missing: [], repeated: [] });
  });

  it("keeps the newest deviations live and the older ones archived", () => {
    const oldestLive = Math.min(...liveDeviations.map((d) => d.n));
    expect(archivedDeviations.filter((d) => d.n > oldestLive).map((d) => `D${d.n}`)).toEqual([]);
  });

  it("files each archived deviation in the file its number names", () => {
    const misfiled = archivedDeviations.filter((d) => d.file !== bucketOf(d.n)).map((d) => `D${d.n} in ${d.file}`);
    expect(misfiled).toEqual([]);
  });

  it("orders each archive file by number", () => {
    for (const { file, text } of archived) {
      const numbers = deviationsIn(file, text).map((d) => d.n);
      expect(numbers, file).toEqual([...numbers].sort((a, b) => a - b));
    }
  });

  it("indexes every archived deviation once, in order, with its title, its status and its file", () => {
    const expected = [...archivedDeviations].sort((a, b) => a.n - b.n).map(indexLineOf);
    expect({
      unindexed: expected.filter((line) => !indexLines.includes(line)),
      stale: indexLines.filter((line) => !expected.includes(line)),
    }).toEqual({ unindexed: [], stale: [] });
    expect(indexLines).toEqual(expected);
  });

  it("gives a live deviation no index line", () => {
    const liveNumbers = new Set(liveDeviations.map((d) => d.n));
    expect(indexLines.filter((line) => liveNumbers.has(indexedNumber(line)))).toEqual([]);
  });
});

describe("the session log, across the live file and the archive", () => {
  it("files each archived entry in its heading's month", () => {
    const misfiled = archivedSessions.filter((s) => s.file !== `sessions-${s.month}.md`).map((s) => `${s.heading} in ${s.file}`);
    expect(misfiled).toEqual([]);
  });

  it("runs newest first, from the live file into the archive", () => {
    const byMonthNewestFirst = [...archiveFiles].filter((file) => file.startsWith("sessions-")).reverse();
    const ordered = [...liveSessions, ...byMonthNewestFirst.flatMap((file) => archivedSessions.filter((s) => s.file === file))];
    const outOfOrder = ordered.filter((s, i) => i > 0 && s.time > (ordered[i - 1]?.time ?? Infinity)).map((s) => s.heading);
    expect(outOfOrder).toEqual([]);
  });
});
