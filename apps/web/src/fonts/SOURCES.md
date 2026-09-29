# Font sources

The three typefaces PRD §10.3 names (progress.md D65, D161). Each file is the **Latin subset**
of the family's variable font, as Google Fonts serves it, fetched once on 29 September 2026 and
committed, so nothing is fetched from a font CDN at build or at run time (architecture.md §6.4).
Each is under the SIL Open Font License 1.1; its licence text is beside it.

| File | Family | Axis | Fetched from | SHA-256 |
| --- | --- | --- | --- | --- |
| `inter-latin-wght.woff2` | Inter (the interface) | `wght` 400–700 | `https://fonts.gstatic.com/s/inter/v20/UcC73FwrK3iLTeHuS_nVMrMxCp50SjIa1ZL7W0Q5nw.woff2` | `c940764593d0fe5d596be327ca7558855e018039fb78509aa21921fd3644c3e4` |
| `figtree-latin-wght.woff2` | Figtree (headings) | `wght` 500–800 | `https://fonts.gstatic.com/s/figtree/v9/_Xms-HUzqDCFdgfMm4S9DaRvzig.woff2` | `8330490a01c60c196eae00b823de8102275aaa5862e7b76a7af21b8745338928` |
| `source-serif-4-latin-wght.woff2` | Source Serif 4 (passages) | `wght` 400–700 | `https://fonts.gstatic.com/s/sourceserif4/v14/vEFF2_tTDB4M7-auWDN0ahZJW3IX2ih5nk3AucvUHf6kDXr4Y3qwzQ.woff2` | `286e05e5e444f44e50724df445808458dea58507e9805bba012b3b12d08ca122` |

The URLs are the `/* latin */` faces of
`https://fonts.googleapis.com/css2?family=Inter:wght@400..700`, `…family=Figtree:wght@500..800` and
`…family=Source+Serif+4:wght@400..700`. The subset's `unicode-range` is declared in `fonts.ts`.
It covers every French letter, `œ`/`Œ`, `« »`, the curly apostrophe and the dashes; only the
capital `Ÿ` (U+0178) falls outside it, and it renders in the fallback.

Licences: `OFL-inter.txt`, `OFL-figtree.txt` and `OFL-sourceserif4.txt`, from
`https://github.com/google/fonts/tree/main/ofl/{inter,figtree,sourceserif4}`.

To replace a file: fetch the new face the same way, update its row and hash, and run the fonts test
(`fonts.test.ts`), which checks each hash.
