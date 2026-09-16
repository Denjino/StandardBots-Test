/* Shared page behaviour: header state, the bottom application index,
   chapter parallax, dialogs and the motion toggle.
   Ported from the prototype's app.js, scoped to the three chapters these
   tests cover (machine tending, welding, inspection). */

const $ = (q, root = document) => root.querySelector(q);
const $$ = (q, root = document) => [...root.querySelectorAll(q)];
const ASSETS = '/assets/img/';

const applicationData = [
  {
    id: 'machine-tending', name: 'Machine tending',
    headline: 'Make more with the machines you have.',
    body: 'Put AI-native robots to work handling parts at your machines. The Path Machining story explores fixture-less machine tending in an existing operation.',
    tasks: ['CNC machines: lathes & mills', 'Press brakes', 'Injection molding machines'],
    note: 'These are related equipment categories. Fixture-less handling describes the featured workflow; machining may still require workholding, and setup depends on your parts and equipment.',
  },
  {
    id: 'welding', name: 'Welding',
    headline: 'Take on more welding work.',
    body: 'Put your robot on repeatable welds so your team can focus on the next job. Explore the process, the workpiece, and the cell arrangement with our team.',
    tasks: ['Arc welding', 'Linear welds'],
    note: 'Arc welding is a process; linear welds describe a path. Tooling, fixturing, and the cell setup depend on your application.',
  },
  {
    id: 'inspection', name: 'Inspection',
    headline: 'Keep quality moving.',
    body: 'Explore robotic inspection with EAM-Mosca. Start a conversation about the parts you handle and what your operation needs to inspect.',
    tasks: [],
    note: 'The customer-floor photograph shows material handling at EAM-Mosca. The planned inspection story will demonstrate the specific inspection task.',
  },
];

const films = {
  path: {
    title: 'Path Machining', app: 'Machine tending', eyebrow: 'Customer story / Minnesota',
    body: 'An existing machine shop. People who know the work. More room for what comes next.',
    note: 'A first look in photographs. The full customer film is planned for launch.',
    slides: [
      { src: 'path-machining.jpg', caption: 'Robots at work beside existing machining equipment.', label: 'Path Machining · Photo preview' },
      { src: 'teaching.jpg', caption: 'The work, in your hands.', label: 'Path Machining · Photo preview' },
      { src: 'path-team.jpg', caption: 'Your team. Our team. On the floor together.', label: 'Path Machining · Photo preview' },
    ],
  },
  nooyen: {
    title: 'Nooyen', app: 'Welding', eyebrow: 'Customer story / Welding',
    body: 'Take on more welding work. Explore the Nooyen customer film at launch.',
    note: 'The film is not available in this prototype. This concept image illustrates the visual direction, not the Nooyen deployment.',
    slides: [{ src: 'welding.png', caption: 'More room for the next job.', label: 'Concept scene · Not customer footage' }],
  },
  'eam-mosca': {
    title: 'EAM-Mosca', app: 'Inspection', eyebrow: 'Customer story / Inspection',
    body: 'A real customer floor. A closer look at the work.',
    note: 'The planned inspection film is not available yet. This official customer photo shows material handling.',
    slides: [{ src: 'eam-mosca.jpg', caption: 'People and robots at EAM-Mosca.', label: 'EAM-Mosca · Customer photograph' }],
  },
};

const chapters = $$('.chapter');
const indexLinks = $$('[data-index]');
const header = $('#site-header');
const index = $('#application-index');
const applicationSelect = $('#application-select');
const hero = $('.room-tour');
const lightHero = hero?.dataset.theme === 'light';
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');

let activeChapter = 0, manualMotionPause = false, frameRequested = false;
let activeFilm = null, photoIndex = 0;
const dialogOrigins = new WeakMap();
const dialogScrollPositions = new WeakMap();

try { manualMotionPause = localStorage.getItem('sb-motion-paused') === 'true'; } catch {}

const escapeHTML = value => String(value).replace(/[&<>"']/g,
  c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

function motionOff() { return reducedMotion.matches || manualMotionPause; }

function applyMotion() {
  document.body.classList.toggle('motion-paused', manualMotionPause);
  const off = motionOff();
  const toggle = $('#motion-toggle');
  if (toggle) {
    toggle.setAttribute('aria-pressed', String(off));
    toggle.innerHTML = off
      ? 'Motion paused <span aria-hidden="true">▶</span>'
      : 'Pause motion <span aria-hidden="true">Ⅱ</span>';
  }
  scheduleFrame();
}

$('#motion-toggle')?.addEventListener('click', () => {
  if (reducedMotion.matches) { notify('Reduced motion follows your device preference.'); return; }
  manualMotionPause = !manualMotionPause;
  try { localStorage.setItem('sb-motion-paused', String(manualMotionPause)); } catch {}
  applyMotion();
});
reducedMotion.addEventListener('change', applyMotion);

function syncScroll() {
  frameRequested = false;
  const vh = innerHeight;
  let closest = 0, closestDistance = Infinity;

  chapters.forEach((chapter, i) => {
    const r = chapter.getBoundingClientRect();
    // A chapter crossing the 40% line owns the index outright. Without that,
    // a chapter scrolled to exactly top:0 ties with the one above it (whose
    // bottom is also 0) and the earlier one wins, leaving the index a section
    // behind — which is exactly what clicking an index link does.
    const straddles = r.top <= vh * .4 && r.bottom > vh * .4;
    const distance = straddles ? 0 : Math.min(Math.abs(r.top), Math.abs(r.bottom));
    if (straddles || distance < closestDistance) { closest = i; closestDistance = distance; }
    if (r.bottom >= 0 && r.top <= vh) {
      const enter = Math.max(0, Math.min(1, r.top / vh));
      chapter.style.setProperty('--reveal', motionOff() ? 0 : enter.toFixed(4));
      chapter.style.setProperty('--pan', motionOff() ? '0px' : `${Math.max(-22, Math.min(22, -r.top * .035))}px`);
    }
  });

  activeChapter = closest;
  indexLinks.forEach((a, i) =>
    i === activeChapter ? a.setAttribute('aria-current', 'location') : a.removeAttribute('aria-current'));
  if (applicationSelect) applicationSelect.value = applicationData[activeChapter].id;

  const bottom = $('#applications').getBoundingClientRect().bottom;
  index.classList.toggle('is-hidden', bottom < vh * .45);

  // The header inverts once the chapters are behind us, while a light hero owns
  // the screen, or whenever the mobile menu is open.
  const past = bottom <= 100;
  const overLightHero = lightHero && hero.getBoundingClientRect().bottom > header.offsetHeight;
  header.classList.toggle('light', past || overLightHero || !$('#mobile-menu').hidden);
}

function scheduleFrame() {
  if (!frameRequested) { frameRequested = true; requestAnimationFrame(syncScroll); }
}
addEventListener('scroll', scheduleFrame, { passive: true });
addEventListener('resize', scheduleFrame);

function closeMenu() {
  const toggle = $('.menu-toggle');
  toggle.setAttribute('aria-expanded', 'false');
  toggle.setAttribute('aria-label', 'Open navigation');
  $('#mobile-menu').hidden = true;
  scheduleFrame();
}
$('.menu-toggle').addEventListener('click', () => {
  const open = $('#mobile-menu').hidden;
  $('#mobile-menu').hidden = !open;
  $('.menu-toggle').setAttribute('aria-expanded', String(open));
  $('.menu-toggle').setAttribute('aria-label', open ? 'Close navigation' : 'Open navigation');
  scheduleFrame();
});
addEventListener('keydown', e => { if (e.key === 'Escape') closeMenu(); });

function goTo(id, { historyEntry = true, focus = true } = {}) {
  const target = document.getElementById(id);
  if (!target) return;
  closeMenu();
  if (historyEntry && location.hash !== `#${id}`) {
    history.replaceState({ sbScroll: scrollY }, '', location.href);
    history.pushState({ sbTarget: id }, '', `#${id}`);
  }
  const offset = target.classList.contains('chapter') ? 0 : header.offsetHeight;
  const top = target.getBoundingClientRect().top + scrollY - offset;
  const previous = document.documentElement.style.scrollBehavior;
  document.documentElement.style.scrollBehavior = 'auto';
  scrollTo({ top: Math.max(0, top), behavior: 'instant' });
  requestAnimationFrame(() => {
    document.documentElement.style.scrollBehavior = previous;
    scheduleFrame();
  });
  if (focus) {
    const heading = $('h1,h2', target);
    if (heading) { heading.tabIndex = -1; heading.focus({ preventScroll: true }); }
  }
}

document.addEventListener('click', e => {
  const anchor = e.target.closest('a[href^="#"]');
  if (anchor) {
    const id = anchor.getAttribute('href').slice(1);
    if (id && document.getElementById(id)) {
      e.preventDefault();
      $$('dialog[open]').forEach(d => { d.dataset.skipFocus = 'true'; d.close(); });
      goTo(id);
      return;
    }
  }
  const film = e.target.closest('[data-film]');
  if (film) { openFilm(film.dataset.film, film); return; }
  const detail = e.target.closest('[data-detail]');
  if (detail) { openDetail(detail.dataset.detail, detail); return; }
  const contact = e.target.closest('[data-contact]');
  if (contact) { showDialog($('#contact-dialog'), contact); return; }
  const close = e.target.closest('[data-close]');
  if (close) close.closest('dialog').close();
});

applicationSelect?.addEventListener('change', () => goTo(applicationSelect.value));

addEventListener('popstate', e => {
  closeMenu();
  $$('dialog[open]').forEach(d => { d.dataset.skipFocus = 'true'; d.close(); });
  if (typeof e.state?.sbScroll === 'number') {
    const previous = document.documentElement.style.scrollBehavior;
    document.documentElement.style.scrollBehavior = 'auto';
    scrollTo({ top: e.state.sbScroll, behavior: 'instant' });
    requestAnimationFrame(() => {
      document.documentElement.style.scrollBehavior = previous;
      scheduleFrame();
    });
  } else if (location.hash) goTo(location.hash.slice(1), { historyEntry: false });
});

function showDialog(dialog, trigger) {
  if (!dialog) return;
  const existing = $('dialog[open]');
  const parentDialog = trigger?.closest('dialog');
  const origin = parentDialog ? dialogOrigins.get(parentDialog) : (trigger || document.activeElement);
  if (origin) dialogOrigins.set(dialog, origin);
  dialogScrollPositions.set(dialog, parentDialog ? dialogScrollPositions.get(parentDialog) : scrollY);
  if (existing && existing !== dialog) existing.close();
  if (!dialog.open) dialog.showModal();
}

$$('dialog').forEach(dialog => {
  dialog.addEventListener('click', e => {
    if (e.target !== dialog) return;
    const rect = dialog.getBoundingClientRect();
    if (e.clientX < rect.left || e.clientX > rect.right || e.clientY < rect.top || e.clientY > rect.bottom) dialog.close();
  });
  dialog.addEventListener('close', () => {
    const skip = dialog.dataset.skipFocus === 'true';
    delete dialog.dataset.skipFocus;
    requestAnimationFrame(() => {
      const origin = dialogOrigins.get(dialog);
      if (skip || $('dialog[open]')) return;
      const top = dialogScrollPositions.get(dialog);
      if (typeof top === 'number') scrollTo({ top, behavior: 'instant' });
      if (origin?.isConnected) origin.focus({ preventScroll: true });
    });
  });
});

function openFilm(key, trigger) {
  const film = films[key];
  if (!film) return;
  activeFilm = key;
  photoIndex = 0;
  $('#film-eyebrow').textContent = film.eyebrow;
  const first = film.slides[0];
  const controls = film.slides.length > 1
    ? '<div><button id="photo-prev" aria-label="Previous photograph" disabled>←</button><button id="photo-next" aria-label="Next photograph">→</button></div>'
    : '';
  $('#film-content').innerHTML = `<div class="film-layout">
    <div class="film-visual">
      <img id="film-photo" src="${ASSETS}${first.src}" alt="${escapeHTML(first.caption)}">
      <span class="media-label" id="photo-label">${escapeHTML(first.label)}</span>
      <p class="film-photo-caption" id="photo-caption">${escapeHTML(first.caption)}</p>
      <div class="photo-controls">
        <span id="photo-count">01 / ${String(film.slides.length).padStart(2, '0')}</span>${controls}
      </div>
    </div>
    <div class="film-summary">
      <p class="eyebrow">${escapeHTML(film.app)}</p>
      <h2 id="film-title">${escapeHTML(film.title)}</h2>
      <p>${escapeHTML(film.body)}</p>
      <p class="availability-note">${escapeHTML(film.note)}</p>
    </div>
  </div>`;
  $('#photo-prev')?.addEventListener('click', () => stepPhoto(-1));
  $('#photo-next')?.addEventListener('click', () => stepPhoto(1));
  showDialog($('#film-dialog'), trigger);
}

function stepPhoto(direction) {
  const film = films[activeFilm];
  if (!film) return;
  photoIndex = Math.max(0, Math.min(film.slides.length - 1, photoIndex + direction));
  const slide = film.slides[photoIndex];
  $('#film-photo').src = `${ASSETS}${slide.src}`;
  $('#film-photo').alt = slide.caption;
  $('#photo-label').textContent = slide.label;
  $('#photo-caption').textContent = slide.caption;
  $('#photo-count').textContent = `${String(photoIndex + 1).padStart(2, '0')} / ${String(film.slides.length).padStart(2, '0')}`;
  $('#photo-prev').disabled = photoIndex === 0;
  $('#photo-next').disabled = photoIndex === film.slides.length - 1;
}

function openDetail(id, trigger) {
  const application = applicationData.find(a => a.id === id);
  if (!application) return;
  const chips = application.tasks.length
    ? `<div class="detail-tasks"><span>Application possibilities</span><div class="task-chips">${
        application.tasks.map(t => `<span>${escapeHTML(t)}</span>`).join('')}</div></div>`
    : '';
  $('#detail-content').innerHTML = `<div class="detail-body">
    <p class="eyebrow">${escapeHTML(application.name)}</p>
    <h2 id="detail-title">${escapeHTML(application.headline)}</h2>
    <p>${escapeHTML(application.body)}</p>
    ${chips}
    <p class="detail-note">${escapeHTML(application.note)}</p>
    <div class="detail-actions">
      <button class="button button-blue" data-contact>Talk about your application <span>↗</span></button>
    </div>
  </div>`;
  showDialog($('#detail-dialog'), trigger);
}

let toastTimer = 0;
function notify(message) {
  const toast = $('#toast');
  if (!toast) return;
  toast.textContent = message;
  toast.classList.add('visible');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove('visible'), 3200);
}

applyMotion();
scheduleFrame();
