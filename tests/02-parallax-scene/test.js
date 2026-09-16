/* Test 02 — composed scene.

   Four depth planes move against each other from two inputs:
     scroll   pans the camera across the floor, through the three viewpoints
     pointer  shifts the planes for parallax depth

   Deeper planes move least. The robot arm sits on its own plane between the
   person and the foreground, so the three.js arm inherits the parallax without
   knowing about it — mount into #scene-3d and it lands in the right depth.

   Point IMAGES at the real plates when they exist; a plate with no image keeps
   its flat stand-in. */

import { createHeroTour } from '/shared/hero.js';

const IMAGES = {
  backdrop: null,    // e.g. '/assets/img/scene-backdrop.jpg'
  person: null,
  foreground: null,
};

/* Depth per plane: 0 is infinitely far, 1 is right against the lens. */
const DEPTH = { backdrop: .18, person: .4, model: .68, foreground: 1 };

/* Travel, as a percentage of the viewport, at depth 1. */
const PAN = 13;     // scroll across the floor
const SWAY = 2.4;   // pointer
const RISE = 1.1;   // pointer, vertical

const parallax = document.querySelector('#parallax');
const plates = [...parallax.querySelectorAll('.plate')];
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');

let progress = 0;
let pointerX = 0, pointerY = 0;      // eased, -1..1
let targetX = 0, targetY = 0;
let loop = 0;

const motionOff = () => reducedMotion.matches || document.body.classList.contains('motion-paused');

for (const [layer, src] of Object.entries(IMAGES)) {
  if (!src) continue;
  const plate = plates.find(p => p.dataset.layer === layer);
  if (plate) plate.style.backgroundImage = `url('${src}')`;
}
if (Object.values(IMAGES).every(Boolean)) parallax.classList.add('is-clean');

// Surface the depth values in the legend so they can be tuned against what you see.
for (const cell of document.querySelectorAll('.layer-legend [data-depth]')) {
  cell.textContent = (DEPTH[cell.dataset.depth] ?? 0).toFixed(2);
}

function apply() {
  for (const plate of plates) {
    const depth = DEPTH[plate.dataset.layer] ?? .5;
    // Progress is centred so the camera sits mid-floor at the middle viewpoint.
    const pan = (progress - .5) * -PAN * depth;
    const sway = pointerX * SWAY * depth;
    const rise = pointerY * RISE * depth;
    // Nearer planes scale up slightly, which reads as them being closer.
    const scale = 1 + depth * .012;
    plate.style.transform =
      `translate3d(${(pan + sway).toFixed(3)}%, ${rise.toFixed(3)}%, 0) scale(${scale.toFixed(4)})`;
  }
}

/* Ease the pointer toward its target, then stop — no idle loop. */
function ease() {
  const dx = targetX - pointerX, dy = targetY - pointerY;
  pointerX += dx * .085;
  pointerY += dy * .085;
  apply();
  if (Math.abs(dx) > .0015 || Math.abs(dy) > .0015) {
    loop = requestAnimationFrame(ease);
  } else {
    pointerX = targetX;
    pointerY = targetY;
    apply();
    loop = 0;
  }
}

function nudge() { if (!loop) loop = requestAnimationFrame(ease); }

addEventListener('pointermove', event => {
  if (event.pointerType !== 'mouse' || motionOff()) return;
  targetX = (event.clientX / innerWidth) * 2 - 1;
  targetY = (event.clientY / innerHeight) * 2 - 1;
  nudge();
}, { passive: true });

addEventListener('pointerleave', () => {
  if (motionOff()) return;
  targetX = targetY = 0;
  nudge();
}, { passive: true });

createHeroTour({
  onRender(value) {
    progress = value;
    if (motionOff()) {
      pointerX = pointerY = targetX = targetY = 0;
    }
    apply();
  },
});

apply();
