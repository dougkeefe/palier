# Library photograph sources

The library's three photographs (progress.md D256): the index's own beside its title, and one per skill, beside its
section on the index and at the head of each of its articles. Each was downloaded once from Unsplash on 24 October 2026,
cropped and converted to WebP, and committed, so nothing is fetched from Unsplash at build or at run time: the CSP's
`img-src 'self'` would refuse a hotlink (D201). `library.css` uses them as backgrounds, so they are bundled under
`/_next/static/media/` and the service worker precaches them by following the stylesheet.

They are free to use under the [Unsplash License](https://unsplash.com/license), which asks for no credit. Palier
credits each photographer anyway, linked to the photo, at the foot of every page that shows it
(`features/library/photos.ts`, `components/library/PhotoCredit.tsx`). `photos.test.ts` holds each row here to the credit
the page shows.

| File | Photographer | Photo | Profile | Crop |
| --- | --- | --- | --- | --- |
| `library.webp` | Fang-Wei Lin | https://unsplash.com/photos/H1IRUS1vEFA | https://unsplash.com/@fangweilin | 1200×900, by attention |
| `reading.webp` | Praise Judah | https://unsplash.com/photos/FIDYni5UiIs | https://unsplash.com/@pjayth3kreator | 900×600, centred |
| `writing.webp` | Marcos Paulo Prado | https://unsplash.com/photos/tcyW6Im5Uug | https://unsplash.com/@marcospradobr | 900×600, by attention |

Each was fetched at 2400px wide from `https://unsplash.com/photos/<id>/download?w=2400`, then resized with `sharp` (the
copy Next installs, run once by hand, not a dependency) at WebP quality 70: 33 KB, 22 KB and 17 KB.

To replace one: pick a photo under the Unsplash License that avoids anything that looks official, maple leaves and red
and white (PRD §10.1), convert it the same way, and update its row here and its credit in `photos.ts` together.
