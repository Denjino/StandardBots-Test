/* Test 01 — scroll film.

   Frames are stepped, not scrubbed: scroll position maps to a frame index and
   that single frame is drawn. Scrolling up walks the index back down, so the
   sequence plays in reverse for free.

   To load a real sequence, export the video to stills, drop them in
   assets/frames/, and set COUNT (and FILE if the naming differs). Until then
   the hero shows the flat backdrop so the scroll behaviour is still reviewable. */

import { createHeroTour } from '/shared/hero.js';

const FRAMES = {
  // Number of stills in the sequence. 0 keeps the flat backdrop.
  // Currently a 48-frame placeholder pan generated from path-machining.jpg —
  // replace the files in assets/frames/ and update this number.
  COUNT: 48,
  // Path for a given 1-based frame index.
  FILE: i => `/assets/frames/hero-${String(i).padStart(4, '0')}.jpg`,
  // Roughly how much scroll each frame gets, in svh. Drives the track length.
  SVH_PER_FRAME: 3.2,
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
let loaded = 0, ready = false, drawn = -1, canvasWidth = 0, canvasHeight = 0;

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

function render(progress) {
  if (!ready) {
    setReadout('No frames loaded — flat backdrop', `${pad(0)} / ${pad(FRAMES.COUNT)}`);
    return;
  }
  resize();
  const index = Math.round(progress * (FRAMES.COUNT - 1));
  if (index !== drawn) {
    const image = images[index];
    if (image?.complete && image.naturalWidth) {
      draw(image);
      drawn = index;
    }
  }
  setReadout(`${loaded} of ${FRAMES.COUNT} decoded`, `${pad(drawn + 1)} / ${pad(FRAMES.COUNT)}`);
}

/* Give the sequence a scroll track proportional to its length — before the
   tour measures the hero, so its cached height is the final one. */
if (FRAMES.COUNT) {
  const svh = Math.min(FRAMES.MAX_SVH, Math.max(FRAMES.MIN_SVH, FRAMES.COUNT * FRAMES.SVH_PER_FRAME));
  tour.style.setProperty('--hero-scroll', `${svh}svh`);
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
