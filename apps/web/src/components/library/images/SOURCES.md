# Library photograph sources

The library's nineteen photographs (progress.md D256, D257): the index's own beside its title, and one per article, on its
card and at the head of its page. Each was downloaded once from Unsplash, cropped and converted to WebP, and committed, so
nothing is fetched from Unsplash at build or at run time: the CSP's `img-src 'self'` would refuse a hotlink (D201).
`library.css` uses them as backgrounds, so they are bundled under `/_next/static/media/` and the service worker precaches
them by following the stylesheet.

They are free to use under the [Unsplash License](https://unsplash.com/license), which asks for no credit. Palier
credits each photographer anyway, linked to the photo, at the foot of every page that shows it
(`features/library/photos.ts`, `components/library/PhotoCredit.tsx`). `photos.test.ts` holds each row here to the credit
the page shows, and each article's file to 25 KB at most, since the worker precaches them all.

| File | Photographer | Photo | Profile | Crop and subject | Size |
| --- | --- | --- | --- | --- | --- |
| `library.webp` | Fang-Wei Lin | https://unsplash.com/photos/H1IRUS1vEFA | https://unsplash.com/@fangweilin | 1200×900, by attention; an open book | 33 KB |
| `main-idea.webp` | Jordan Madrid | https://unsplash.com/photos/iDzKdNI7Qgc | https://unsplash.com/@jordanmadrid | 900×600, by attention; compass on a sill by a misty window | 24 KB |
| `specific-detail.webp` | Markus Winkler | https://unsplash.com/photos/afW1hht0NSs | https://unsplash.com/@markuswinkler | 900×600, by attention; magnifying glass on pale blue | 14 KB |
| `inference.webp` | Daniel Schludi | https://unsplash.com/photos/q3bw5vrQrO4 | https://unsplash.com/@schluditsch | 900×600, by attention, quality 55; footprints across a beach | 25 KB |
| `vocabulary-in-context.webp` | Mathias Reding | https://unsplash.com/photos/sY_9Y4gu4ps | https://unsplash.com/@matreding | 900×600, centred, quality 55; an old French book's title page | 23 KB |
| `cohesion-and-reference.webp` | Edge2Edge Media | https://unsplash.com/photos/t1OalCBUYRc | https://unsplash.com/@edge2edgemedia | 900×600, by attention; chain links | 19 KB |
| `tone-and-intent.webp` | Lucas George Wendt | https://unsplash.com/photos/C4SaNxZs0g0 | https://unsplash.com/@lucasgwendt | 900×600, by attention; colour swatches, green to blue | 22 KB |
| `text-structure.webp` | Ilya Semenov | https://unsplash.com/photos/fCnYbTnJASs | https://unsplash.com/@si1og | 900×600, by attention; card-catalogue drawers | 13 KB |
| `numerical-and-tabular-detail.webp` | Isaac Smith | https://unsplash.com/photos/AT77Q0Njnt0 | https://unsplash.com/@isaacmsmith | 900×600, by attention; a line graph drawn on paper | 22 KB |
| `verb-tense-and-mood.webp` | Gaelle Marcel | https://unsplash.com/photos/Xd_H7iOwKN0 | https://unsplash.com/@gaellemarcel | 900×600, by attention; an hourglass | 11 KB |
| `agreement.webp` | Mockup Graphics | https://unsplash.com/photos/2KwO5KWCeag | https://unsplash.com/@mockupgraphics | 900×600, by attention; two matching eggs | 12 KB |
| `prepositions-and-government.webp` | Amol Tyagi | https://unsplash.com/photos/0juktkOTkpU | https://unsplash.com/@amoltyagi2 | 900×600, by attention; a key in a keyhole | 13 KB |
| `pronouns.webp` | Randy Fath | https://unsplash.com/photos/G1yhU1Ej-9A | https://unsplash.com/@randyfath | 900×600, by attention; chess pieces, one dark pawn among them | 19 KB |
| `connectors-and-discourse-markers.webp` | Pierre Châtel-Innocenti | https://unsplash.com/photos/6BqbZjy1AoY | https://unsplash.com/@chatelp | 900×600, by attention; a cable-stayed bridge | 19 KB |
| `register-and-formality.webp` | Diana Light | https://unsplash.com/photos/Fcd6LJ4HDNk | https://unsplash.com/@dreamcatchlight | 900×600, centred; envelopes under wax seals | 15 KB |
| `word-choice-precision.webp` | RoonZ nl | https://unsplash.com/photos/H3UKvdu3GQE | https://unsplash.com/@roonz_nl | 900×600, by attention; a sharpened pencil | 10 KB |
| `false-friends-and-anglicisms.webp` | Dmytro Koplyk | https://unsplash.com/photos/0gTN2mU8EyA | https://unsplash.com/@dkoplyk | 900×600, by attention; a water lily and its reflection | 18 KB |
| `punctuation-and-mechanics.webp` | Debby Hudson | https://unsplash.com/photos/oVQBn0X2oEk | https://unsplash.com/@hudsoncrafted | 900×600, by attention; typewriter keys | 19 KB |
| `sentence-structure.webp` | Loegunn Lai | https://unsplash.com/photos/-JYD8-AZ5pw | https://unsplash.com/@loegunntunghok | 900×600, centred; a spiral staircase from above | 24 KB |

`library.webp` was downloaded on 24 October 2026 (D256), the eighteen article photographs on 25 October 2026 (D257). Each
was fetched at 2400px wide from `https://unsplash.com/photos/<id>/download?w=2400`, which for a photo under the Unsplash
License (not Unsplash+) redirects to `images.unsplash.com/photo-…`, then resized with `sharp` (the copy Next installs, run
once by hand, not a dependency) to WebP at quality 70 for the library's own and 65 for an article's, 55 where 65 passed
25 KB. The eighteen come to 322 KB.

To replace one: pick a photo under the Unsplash License that avoids anything that looks official, maple leaves and red
and white (PRD §10.1), and faces in close-up; one quiet in detail, since a busy photo will not fit 25 KB. Convert it the
same way, and update its row here and its credit in `photos.ts` together.
