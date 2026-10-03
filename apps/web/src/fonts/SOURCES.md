# Font sources

The app's one typeface, Source Serif 4, for headings, the interface and passages alike (progress.md
D65, D161, D202). The file is the **Latin subset** of the family's variable font, as Google Fonts
serves it, fetched once on 29 September 2026 and committed, so nothing is fetched from a font CDN at
build or at run time (architecture.md §6.4). It is under the SIL Open Font License 1.1; its licence
text is beside it.

| File | Family | Axis | Fetched from | SHA-256 |
| --- | --- | --- | --- | --- |
| `source-serif-4-latin-wght.woff2` | Source Serif 4 (everything) | `wght` 400–700 | `https://fonts.gstatic.com/s/sourceserif4/v14/vEFF2_tTDB4M7-auWDN0ahZJW3IX2ih5nk3AucvUHf6kDXr4Y3qwzQ.woff2` | `286e05e5e444f44e50724df445808458dea58507e9805bba012b3b12d08ca122` |

The URL is the `/* latin */` face of `https://fonts.googleapis.com/css2?family=Source+Serif+4:wght@400..700`.
The subset's `unicode-range` is declared in `fonts.ts`. It covers every French letter, `œ`/`Œ`,
`« »`, the curly apostrophe and the dashes; only the capital `Ÿ` (U+0178) falls outside it, and it
renders in the fallback.

Inter and Figtree, PRD §10.3's interface and heading faces, were committed here from D161 until the
app took the serif throughout (D202), and were removed with it.

Licence: `OFL-sourceserif4.txt`, from `https://github.com/google/fonts/tree/main/ofl/sourceserif4`.

To replace the file: fetch the new face the same way, update its row and hash, and run the fonts test
(`fonts.test.ts`), which checks the hash.
