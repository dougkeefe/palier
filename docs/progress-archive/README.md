# Palier: Progress archive

`docs/progress.md` holds current state. This directory holds the record it has grown out of. Everything here was moved
verbatim and is not edited (D255). The one exception is a deviation's status, which is marked in place when the
deviation is resolved, as `progress.md` always allowed, with its index line changed to match.

| File | Holds |
| --- | --- |
| `history.md` | The long *Current phase* narrative up to 1.0, the merged rows *In flight* had removed, and the checklists of Phases 0, 1, 2, 4, 5, 6 and 7 |
| `deviations-D000-D099.md`, `deviations-D100-D199.md`, … | Every deviation older than the newest ten, in full, by number, ascending |
| `sessions-2026-09.md`, `sessions-2026-10.md`, … | Every session-log entry older than the newest ten, in full, by month, newest first |

## Finding a deviation

`progress.md`'s deviation index has one line for every archived deviation, such as:

```
- **D192** — <title> · accepted → [deviations-D100-D199.md](progress-archive/deviations-D100-D199.md#…)
```

So a reference such as `progress.md D192` in a code comment still resolves: search `progress.md` for `**D192**`, or
open the file that D192's hundred names. The ten newest deviations are in `progress.md` in full and have no index line.

## Rotating (`progress.md`'s working agreement, rule 8)

Rotate when `progress.md` would hold more than ten deviations or ten session entries in full, or when the file
outside its deviation index would pass 1,200 lines. In the same commit:

1. **Each deviation past the newest ten:** cut its whole block, from its `### Dn — ` heading to the line before the
   next heading, and paste it unchanged at the end of `deviations-D<hundred>-D<hundred + 99>.md`. Create that file
   when its hundred begins, with the same heading and note as the others. Then add its line at the end of the
   index in `progress.md`: `- **Dn** — <the heading's title> · <its status> → [<file>](progress-archive/<file>#<the heading's anchor>)`.
   The status is the `**Status:**` text with any bold removed, cut at the first ` (`, `:`, `;`, ` — ` or `. `.
2. **Each session entry past the newest ten:** cut its whole block and paste it unchanged into
   `sessions-<yyyy>-<mm>.md` for its heading's month. It goes at the top of the entries, because an older month's file
   is complete and the current month's grows newest first. Create the file for a new month, and add it to the list at
   the end of `progress.md`'s session log.
3. **Run `pnpm test`.** `apps/web/src/docs/progress.test.ts` checks the following, and names what it finds wrong:
   - every deviation is in full exactly once, numbered with no gap;
   - each one is in the file its number names;
   - every archived deviation has exactly one index line, and that line matches its title, status and file;
   - every session entry sits in its month's file, newest first;
   - `progress.md` is within its bounds.
