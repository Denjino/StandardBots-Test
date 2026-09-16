/* Test 01 — scroll film.

   Frames are stepped, not scrubbed: scroll position maps to a frame index and
   that single frame is drawn. Scrolling up walks the index back down, so the
   sequence plays in reverse for free.

   Frames are preloaded up front; the first to arrive swaps out the flat plate
   and the rest fill in behind it. To swap the sequence, replace the files in
   assets/frames/ and update COUNT (and FILE if the naming differs). COUNT: 0
   falls back to the flat backdrop. */

import { createHeroTour } from '/shared/hero.js';

const FRAMES = {
  // Number of stills in the sequence. 0 keeps the flat backdrop.
  // The shop-floor dolly, sampled at every 2nd source frame: the full 8s move,
  // 97 stills. See assets/frames/README.md to regenerate at a different rate.
  COUNT: 97,
  // Path for a given 1-based frame index.
  FILE: i => `/assets/frames/hero-${String(i).padStart(4, '0')}.webp`,
  // Roughly how much scroll each frame gets, in svh. Drives the track length.
  // 97 x 3.7 puts the hero at ~360svh.
  SVH_PER_FRAME: 3.7,
  // Track length floor/ceiling so a short or very long sequence stays usable.
  MIN_SVH: 240,
  MAX_SVH: 900,
};

const tour = document.querySelector('.room-tour');
const canvas = document.querySelector('#frame-canvas');
const flat = document.querySelector('#frame-flat');
const readout = document.querySelector('#frame-readout');
const readoutState = document.querySelector('#frame-readout-state');
const readoutCount = document.querySelector('#frame-readout-count');
const debug = new URLSearchParams(location.search).has('debug');

const context = canvas.getContext('2d', { alpha: false });
const images = [];
let loaded = 0, ready = false, canvasWidth = 0, canvasHeight = 0;
// wanted: the frame scroll is asking for. drawn: what is actually on the canvas.
let wanted = 0, drawn = -1;

const pad = n => String(n).padStart(2, '0');

function setReadout(state, count) {
  if (readoutState) readoutState.textContent = state;
  if (readoutCount) readoutCount.textContent = count;
  readout?.classList.toggle('is-visible', debug || !ready);
}

/* Size the backing store to the shell, accounting for device pixel ratio. */
function resize() {
  const shell = tour.querySelector('.tour-shell');
  const ratio = Math.min(devicePixelRatio || 1, 2);
  const width = Math.round(shell.clientWidth * ratio);
  const height = Math.round(shell.clientHeight * ratio);
  if (width === canvasWidth && height === canvasHeight) return;
  canvasWidth = canvas.width = width;
  canvasHeight = canvas.height = height;
  drawn = -1;
}

/* Cover-fit, matching how the photographic scenes are framed. */
function draw(image) {
  if (!image?.naturalWidth) return;
  const scale = Math.max(canvasWidth / image.naturalWidth, canvasHeight / image.naturalHeight);
  const width = image.naturalWidth * scale;
  const height = image.naturalHeight * scale;
  context.drawImage(image, (canvasWidth - width) / 2, (canvasHeight - height) / 2, width, height);
}

/* Paint the frame scroll is currently asking for. If it hasn't arrived yet the
   last good frame stays up rather than flashing, and the load handler calls
   back here the moment it lands. */
function paint() {
  if (wanted === drawn) return;
  const image = images[wanted];
  if (!image?.complete || !image.naturalWidth) return;
  draw(image);
  drawn = wanted;
  setReadout(`${loaded} of ${FRAMES.COUNT} decoded`, `${pad(drawn + 1)} / ${pad(FRAMES.COUNT)}`);
}

function render(progress) {
  if (!ready) {
    setReadout('No frames loaded — flat backdrop', `${pad(0)} / ${pad(FRAMES.COUNT)}`);
    return;
  }
  resize();
  wanted = Math.round(progress * (FRAMES.COUNT - 1));
  paint();
  setReadout(`${loaded} of ${FRAMES.COUNT} decoded`, `${pad(drawn + 1)} / ${pad(FRAMES.COUNT)}`);
}

/* Give the sequence a scroll track proportional to its length — before the
   tour measures the hero, so its cached height is the final one. */
if (FRAMES.COUNT) {
  const svh = Math.min(FRAMES.MAX_SVH, Math.max(FRAMES.MIN_SVH, FRAMES.COUNT * FRAMES.SVH_PER_FRAME));
  tour.style.setProperty('--hero-scroll', `${Math.round(svh)}svh`);
}

const hero = createHeroTour({ onRender: render });

function loadFrames() {
  if (!FRAMES.COUNT) {
    setReadout('No frames loaded — flat backdrop', `${pad(0)} / ${pad(0)}`);
    return;
  }

  for (let i = 1; i <= FRAMES.COUNT; i++) {
    const image = new Image();
    image.decoding = 'async';
    image.src = FRAMES.FILE(i);
    image.addEventListener('load', () => {
      loaded++;
      // Show the sequence as soon as the first frame is in, then keep filling.
      if (!ready) {
        ready = true;
        canvas.hidden = false;
        flat.hidden = true;
        resize();
        hero?.schedule();
      } else if (i - 1 === wanted) {
        // The frame scroll is sitting on just arrived — put it up now.
        paint();
      }
      if (loaded === FRAMES.COUNT) readout?.classList.toggle('is-visible', debug);
    }, { once: true });
    image.addEventListener('error', () => {
      if (loaded === 0 && i === 1) setReadout(`Frame 1 missing at ${FRAMES.FILE(1)}`, `${pad(0)} / ${pad(FRAMES.COUNT)}`);
    }, { once: true });
    images.push(image);
  }
}

addEventListener('resize', () => { resize(); hero?.schedule(); });
loadFrames();
setReadout(FRAMES.COUNT ? 'Loading frames…' : 'No frames loaded — flat backdrop', `${pad(0)} / ${pad(FRAMES.COUNT)}`);
