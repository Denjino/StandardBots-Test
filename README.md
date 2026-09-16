# Standard Bots — hero tests

Two hero treatments built on a shared recreation of the *Room for More* page
structure, from the nav down to **03 — Inspection**.

| Slug | Test | Hero backdrop |
| --- | --- | --- |
| `/tests/01-video-scroll/` | Scroll film | A frame sequence stepped by scroll position |
| `/tests/02-parallax-scene/` | Composed scene | Layered plates with a slot for the 3D arm |

`/` is a chooser linking to both. Each test also ends with a CTA that switches
to the other one, so you can go back and forth without leaving the page.

## The hero

Both tests share one mechanic, taken from the `02-spatial-tour` prototype: the
hero is a tall section with a sticky, full-height shell. Scroll position through
that section becomes a `0 → 1` progress value, and three viewpoints sit on it:

| Stop | Progress | Hash |
| --- | --- | --- |
| 01 The machine | `0` | `#machine-tending` |
| 02 Skilled work | `0.59` | `#floor-skilled-work` |
| 03 More possibilities | `1.0` | `#floor-more-possibilities` |

The opening headline fades out and the viewpoint copy fades in as progress
passes roughly 0.08–0.30. Clicking a stop scrolls to that point on the same
track, so there is a single source of truth — scrolling up simply replays
everything in reverse. Wheel, touch and arrow keys cancel an in-flight click
animation so the browser's own momentum is never fought.

Below the hero the page continues into Welding and Inspection as ordinary
full-height chapters, with the fixed application index tracking the active one.

## Layout

```
index.html                      chooser
shared/base.css                 design system (ported from the prototype)
shared/hero.css                 hero, themeable dark/light
shared/hero.js                  the three-viewpoint scroll engine
shared/site.js                  header, index, chapters, dialogs
tests/01-video-scroll/          test.css, test.js, index.html
tests/02-parallax-scene/        test.css, test.js, index.html
assets/img/                     photography from the prototype
assets/frames/                  frame sequence for test 01
assets/fonts/                   drop the licensed fonts here
```

The two test pages each hold their own copy of the shared markup on purpose —
the copy is expected to diverge between tests. Styling and behaviour stay
single-source in `shared/`.

## Tuning each test

**Test 01** — `tests/01-video-scroll/test.js`, the `FRAMES` object. `COUNT` is
the number of stills; `SVH_PER_FRAME` (clamped by `MIN_SVH`/`MAX_SVH`) derives
the scroll length from it, so a longer sequence automatically gets a longer
hero. See `assets/frames/README.md` for how to swap the sequence in. Add
`?debug=1` to any URL to keep the frame readout visible.

**Test 02** — `tests/02-parallax-scene/test.js`. `DEPTH` sets how far each plane
travels (0 is infinitely far, 1 is against the lens); `PAN`, `SWAY` and `RISE`
set how much scroll and pointer movement move them. Point `IMAGES` at real
plates and they replace the placeholders.

## Hero theme

The hero reads `data-theme` on `.room-tour`, set in each test's `index.html`:

- `dark` (current) — light copy, the nav and bottom selector keep the dark
  treatment from `01-room-for-more`.
- `light` — the sand treatment from `02-spatial-tour`; the header and index
  invert while the hero owns the screen.

Switching the attribute is the only change needed; `shared/site.js` reads it to
decide whether the header and index invert.

## Running it

Any static server from the repo root — paths are absolute so it needs to be the
root, not a subfolder:

```
python3 -m http.server 4173
```

Deploys to Vercel as-is; `vercel.json` sets clean URLs and long-lived caching
on `/assets`.

## Not included

- **The 3D arm.** Test 02 has the slot (`#scene-3d`) sitting at the right depth
  between the person and foreground plates, but nothing renders into it yet.
- **Fonts.** Neue Montreal and Supply Sans are licensed and were not in the
  prototype export. See `assets/fonts/README.md` — sizes and tracking are the
  prototype's, so only the letterforms are wrong until they are dropped in.
- **Sections below Inspection.** Finishing, Assembly, Palletizing, the
  possibilities grid, AI, mission, robots and support are all out of scope here.
- **The contact form.** The nav button opens a placeholder dialog rather than
  the prototype's full inquiry flow.
