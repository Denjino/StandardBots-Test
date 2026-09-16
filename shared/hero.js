/* The hero tour: three viewpoints along one tall sticky section.
   Scroll drives progress 0 -> 1; the stop buttons scroll to a point on that
   same track, so there is one source of truth and scrolling up simply plays
   everything in reverse.

   Each test supplies onRender(progress, info) to draw its own backdrop —
   test 01 steps a frame sequence, test 02 offsets parallax layers. Returning
   {x, y} from onRender repositions the hotspot; returning nothing leaves it
   where the stylesheet put it. */

const POINTS = [0, .59, 1];
const HASHES = ['machine-tending', 'floor-skilled-work', 'floor-more-possibilities'];
const DISCOVERIES = [
  ['More machine time', 'Put your machines<br>to more use.', 'Make room for the work you want to take on.'],
  ['More room for skilled work', 'Your people.<br>More possibility.', 'Give your people time for the work that needs them.'],
  ['More opportunity', 'The same floor.<br>A bigger future.', 'The next order. A new application. More from the business you’ve built.'],
];

const clamp = p => Math.max(0, Math.min(1, p));

export function createHeroTour({ onRender } = {}) {
  const tour = document.querySelector('.room-tour');
  if (!tour) return null;
  tour.classList.add('room-enabled');

  const shell = tour.querySelector('.tour-shell');
  const intro = tour.querySelector('.tour-intro');
  const discovery = tour.querySelector('.tour-discovery');
  const stopButtons = [...tour.querySelectorAll('.tour-stops [data-view]')];
  const hotspot = document.querySelector('#tour-hotspot');
  const index = document.querySelector('#application-index');
  const kicker = document.querySelector('#tour-discovery-kicker');
  const title = document.querySelector('#tour-discovery-title');
  const body = document.querySelector('#tour-discovery-body');
  const mq = matchMedia('(prefers-reduced-motion: reduce)');
  const lightHero = tour.dataset.theme === 'light';

  let progress = 0, staticView = 0, active = -1;
  let frame = 0, moving = 0, generation = 0, lastHeight = 0;

  const reduced = () => mq.matches || document.body.classList.contains('motion-paused');
  const staticMode = () => reduced();
  const travel = () => Math.max(1, tour.offsetHeight - shell.offsetHeight);
  const origin = () => tour.getBoundingClientRect().top + scrollY;

  function cancelMove() {
    generation++;
    if (moving) cancelAnimationFrame(moving);
    moving = 0;
  }

  function update() {
    frame = 0;
    progress = staticMode() ? POINTS[staticView] : clamp((scrollY - origin()) / travel());

    const which = progress < .32 ? 0 : progress < .83 ? 1 : 2;
    const initial = 1 - clamp((progress - .08) / .19);
    const subsequent = clamp((progress - .14) / .16);

    tour.style.setProperty('--tour-progress', progress);
    tour.style.setProperty('--intro-opacity', initial);
    tour.style.setProperty('--intro-shift', 1 - initial);
    tour.style.setProperty('--discovery-opacity', subsequent);

    intro.style.visibility = initial > .01 ? 'visible' : 'hidden';
    intro.inert = initial < .5;
    discovery.style.visibility = subsequent > .01 ? 'visible' : 'hidden';
    discovery.inert = subsequent < .5;

    if (active !== which) {
      active = which;
      const [k, t, b] = DISCOVERIES[which];
      kicker.textContent = k;
      title.innerHTML = t;
      body.textContent = b;
      stopButtons.forEach((button, i) =>
        i === which ? button.setAttribute('aria-current', 'step') : button.removeAttribute('aria-current'));
    }

    const rect = tour.getBoundingClientRect();
    const owns = rect.top <= 0 && rect.bottom > shell.offsetHeight * .45;
    // Only a light hero inverts the index; a dark one shares the chapters' treatment.
    if (index) index.classList.toggle('on-tour', lightHero && owns);

    // Rendering is demand-driven; there is no clock or idle loop.
    if (onRender && rect.bottom > 0 && rect.top < innerHeight) {
      const point = onRender(progress, { which, shell, tour });
      if (point && hotspot) {
        hotspot.style.left = `${Math.min(shell.clientWidth - 160, Math.max(shell.clientWidth * .6, point.x))}px`;
        hotspot.style.top = `${Math.max(shell.clientHeight * .38, Math.min(shell.clientHeight * .6, point.y))}px`;
      }
    }

    if (hotspot) hotspot.hidden = progress > .35;
    tour.dataset.view = String(which);
    tour.dataset.progress = progress.toFixed(4);
  }

  function schedule() { if (!frame) frame = requestAnimationFrame(update); }

  function jump(target, { remember = true } = {}) {
    cancelMove();
    const view = Math.max(0, Math.min(2, target));
    if (staticMode()) {
      staticView = view;
      if (remember) history.replaceState({ ...history.state, sbRoom: POINTS[view] }, '', `#${HASHES[view]}`);
      schedule();
      return;
    }
    const start = scrollY, end = origin() + POINTS[view] * travel();
    if (remember) {
      history.replaceState({ sbScroll: start, sbRoom: progress }, '', location.href);
      history.pushState({ sbScroll: end, sbRoom: POINTS[view] }, '', `#${HASHES[view]}`);
    }
    const token = generation, begin = performance.now();
    const duration = Math.min(740, 300 + Math.abs(end - start) * .32);
    function step(now) {
      if (token !== generation) return;
      const u = clamp((now - begin) / duration);
      const eased = u * u * (3 - 2 * u);
      scrollTo({ top: start + (end - start) * eased, behavior: 'instant' });
      update();
      moving = u < 1 ? requestAnimationFrame(step) : 0;
    }
    moving = requestAnimationFrame(step);
  }

  stopButtons.forEach(button => button.addEventListener('click', () => jump(Number(button.dataset.view))));
  hotspot?.addEventListener('click', () => jump(1));
  document.querySelector('#explore-floor')
    ?.addEventListener('click', () => jump(active === 2 ? 0 : active + 1));

  // Passive cancellation preserves the browser's own scrolling and momentum.
  addEventListener('wheel', cancelMove, { passive: true });
  addEventListener('touchstart', cancelMove, { passive: true });
  addEventListener('keydown', e => {
    if (['ArrowDown', 'ArrowUp', 'PageDown', 'PageUp', 'Home', 'End', ' '].includes(e.key)) cancelMove();
  });
  document.addEventListener('click', e => {
    if (e.target.closest('a,[data-film],[data-contact],.menu-toggle')) cancelMove();
    if (staticMode() && e.target.closest('a[href="#machine-tending"]')) { staticView = 0; schedule(); }
  }, true);
  document.querySelector('#application-select')?.addEventListener('change', e => {
    if (staticMode() && e.target.value === 'machine-tending') { staticView = 0; schedule(); }
  });

  addEventListener('scroll', schedule, { passive: true });
  addEventListener('popstate', () => {
    cancelMove();
    if (staticMode() && typeof history.state?.sbRoom === 'number') {
      staticView = POINTS.reduce((best, p, i) =>
        Math.abs(p - history.state.sbRoom) < Math.abs(POINTS[best] - history.state.sbRoom) ? i : best, 0);
    }
    schedule();
  });

  function setMode() {
    const top = origin(), oldProgress = progress;
    const oldHeight = lastHeight || tour.offsetHeight, oldScroll = scrollY;
    const wasIn = oldScroll >= top && oldScroll <= top + oldHeight - shell.offsetHeight + 1;
    cancelMove();
    tour.classList.toggle('room-static', staticMode());
    if (staticMode()) {
      staticView = POINTS.reduce((best, p, i) =>
        Math.abs(p - oldProgress) < Math.abs(POINTS[best] - oldProgress) ? i : best, 0);
    }
    lastHeight = tour.offsetHeight;
    if (wasIn) scrollTo({ top: top + (staticMode() ? 0 : oldProgress * travel()), behavior: 'instant' });
    else if (oldScroll >= top + oldHeight) scrollTo({ top: oldScroll + lastHeight - oldHeight, behavior: 'instant' });
    schedule();
  }

  mq.addEventListener('change', setMode);
  new MutationObserver(setMode).observe(document.body, { attributes: true, attributeFilter: ['class'] });
  addEventListener('resize', () => {
    const rect = tour.getBoundingClientRect();
    const wasIn = rect.top <= 0 && rect.bottom > 0;
    const p = progress;
    cancelMove();
    if (wasIn && !staticMode()) scrollTo({ top: origin() + p * travel(), behavior: 'instant' });
    lastHeight = tour.offsetHeight;
    schedule();
  });

  const about = document.querySelector('#tour-about');
  const aboutButton = document.querySelector('#tour-about-button');
  aboutButton?.addEventListener('click', () => { cancelMove(); about?.showModal(); });
  about?.addEventListener('close', () => {
    if (!document.querySelector('dialog[open]')) aboutButton?.focus({ preventScroll: true });
  });

  setMode();

  const hashView = HASHES.indexOf(location.hash.slice(1));
  if (hashView > 0) requestAnimationFrame(() => {
    if (staticMode()) staticView = hashView;
    else scrollTo({ top: origin() + POINTS[hashView] * travel(), behavior: 'instant' });
    schedule();
  });

  return { jump, schedule, get progress() { return progress; } };
}
