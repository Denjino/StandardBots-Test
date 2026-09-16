import { createHeroTour } from '/shared/hero.js';
const parallax = document.querySelector('#parallax');
const world = document.querySelector('.scene-world');
const host = document.querySelector('#scene-3d');
const plates = [...world.querySelectorAll('.plate')];
const reduced = matchMedia('(prefers-reduced-motion: reduce)');
const motionOff = () => reduced.matches || document.body.classList.contains('motion-paused');
const depth = { backdrop: .12, person: .36, model: .48, foreground: 1 };
let progress = 0, x = 0, y = 0, tx = 0, ty = 0, frame = 0, previous = 0, visible = true, robot;
function draw(now) {
  frame = 0;
  if (!visible || document.hidden) return;
  const dt = Math.min((now - previous) / 1000 || .016, .05); previous = now;
  const smoothing = 1 - Math.exp(-7 * dt);
  if (motionOff()) x = y = tx = ty = 0;
  else { x += (tx - x) * smoothing; y += (ty - y) * smoothing; }
  for (const plate of plates) {
    const d = depth[plate.dataset.layer];
    const pan = motionOff() ? 0 : -progress * 1.6 * d;
    plate.style.transform = `translate3d(${pan + x * .55 * d}%,${y * .24 * d}%,0)`;
  }
  robot?.render(x, y);
  if (Math.abs(tx - x) + Math.abs(ty - y) > .0005) invalidate();
}
function invalidate() { if (!frame && visible && !document.hidden) frame = requestAnimationFrame(draw); }
function layout() {
  const width = parallax.clientWidth, height = parallax.clientHeight;
  const wide = Math.max(width, height * 2688 / 1520) * 1.045;
  world.style.width = `${wide}px`; world.style.height = `${wide * 1520 / 2688}px`;
  world.style.left = `${width / 2 - (width < 800 ? wide * .095 : 0)}px`;
  invalidate();
}
new ResizeObserver(layout).observe(parallax);
new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; if (visible) invalidate(); }, { threshold: 0 }).observe(parallax);
document.addEventListener('visibilitychange', invalidate);
document.querySelector('.tour-shell').addEventListener('pointermove', event => {
  if (event.pointerType !== 'mouse' || motionOff()) return;
  const rect = parallax.getBoundingClientRect();
  tx = Math.max(-1, Math.min(1, (event.clientX - rect.left) / rect.width * 2 - 1));
  ty = Math.max(-1, Math.min(1, (event.clientY - rect.top) / rect.height * 2 - 1));
  invalidate();
}, { passive: true });
document.querySelector('.tour-shell').addEventListener('pointerleave', () => { tx = ty = 0; invalidate(); });
reduced.addEventListener('change', invalidate);
new MutationObserver(invalidate).observe(document.body, { attributes: true, attributeFilter: ['class'] });
createHeroTour({ onRender(value) { progress = value; invalidate(); } });
layout();
// Keep the complete photographic reference if WebGL or loading fails.
import('./robot-scene.bundle.js').then(({ mountRobot }) => mountRobot(host, invalidate)).then(instance => {
  robot = instance;
  if (robot) parallax.classList.add('is-live');
  invalidate();
}).catch(error => { host.dataset.state = 'fallback'; console.warn('Robot scene unavailable; using still image.', error); });
new MutationObserver(() => parallax.classList.toggle('is-live', host.dataset.state === 'ready'))
  .observe(host, { attributes: true, attributeFilter: ['data-state'] });
addEventListener('pagehide', event => { if (!event.persisted) robot?.dispose(); });
