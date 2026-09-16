# Hero frame sequence (test 01)

97 WebP stills (`hero-0001.webp` … `hero-0097.webp`, ~5.6 MB total) covering the
**full 8.04-second** shop-floor dolly. The source clip is 1280×720 at 24fps —
193 frames — sampled at every second frame. The whole move is present start to
finish; only the sampling rate is halved.

Because the camera move is slow, adjacent source frames are nearly identical,
so halving the rate costs almost nothing visually while halving the weight. At
the current track length a frame advances roughly every 20px of scroll.

## Regenerating

`ffmpeg` needs a build with H.264 and libwebp. From the repo root:

```sh
# every 2nd frame (97 stills, current)
ffmpeg -i source.mp4 -vf "select='not(mod(n\,2))'" -fps_mode passthrough \
       -c:v libwebp -quality 68 -compression_level 6 -preset photo \
       assets/frames/hero-%04d.webp

# every frame (193 stills, ~11 MB) — smoother, heavier
ffmpeg -i source.mp4 -fps_mode passthrough \
       -c:v libwebp -quality 68 -compression_level 6 -preset photo \
       assets/frames/hero-%04d.webp
```

Then set `FRAMES.COUNT` in `tests/01-video-scroll/test.js` to the new count.
Delete the old frames first — a shorter sequence leaves stragglers behind.

## Notes

- Quality barely affects size on this footage (48 KB at q50 vs 62 KB at q72),
  so prefer trimming frame count over dropping quality.
- `SVH_PER_FRAME` in `test.js` derives the hero's scroll length from the frame
  count, clamped by `MIN_SVH`/`MAX_SVH`. 97 × 3.7 gives roughly 360svh.
- Keep every frame the same pixel dimensions.
- `COUNT: 0` drops back to the flat backdrop.
- The source is 720p, so the hero upscales and softens above ~1280px wide. A
  higher-resolution master is the only fix.
