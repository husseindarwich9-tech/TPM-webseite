// Bedienelemente, die immer funktionieren müssen – auch ohne Animationen.

const header = document.querySelector<HTMLElement>('[data-header]');

/* ── Mobiles Menü ─────────────────────────────────────────── */
const menuBtn = document.querySelector<HTMLButtonElement>('[data-menu-toggle]');
const menu = document.querySelector<HTMLElement>('[data-menu]');
const menuLabel = document.querySelector<HTMLElement>('[data-menu-label]');

function setMenu(open: boolean) {
  if (!menuBtn || !menu || !header) return;
  menuBtn.setAttribute('aria-expanded', String(open));
  header.classList.toggle('menu-open', open);
  if (menuLabel) menuLabel.textContent = open ? 'Schließen' : 'Menü';
  if (open) {
    menu.hidden = false;
    document.documentElement.style.overflow = 'hidden';
    window.dispatchEvent(new CustomEvent('tpm:menu', { detail: { open: true } }));
    menu.querySelector<HTMLElement>('a')?.focus({ preventScroll: true });
  } else {
    menu.hidden = true;
    document.documentElement.style.overflow = '';
    window.dispatchEvent(new CustomEvent('tpm:menu', { detail: { open: false } }));
  }
}
menuBtn?.addEventListener('click', () => setMenu(menuBtn.getAttribute('aria-expanded') !== 'true'));
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    if (menuBtn?.getAttribute('aria-expanded') === 'true') {
      setMenu(false);
      menuBtn.focus();
    }
    setMega(false);
  }
});
// Fokus im offenen Menü halten
menu?.addEventListener('keydown', (e) => {
  if (e.key !== 'Tab' || !menuBtn) return;
  const items = [menuBtn, ...menu.querySelectorAll<HTMLElement>('a, button')];
  const first = items[0];
  const last = items[items.length - 1];
  if (e.shiftKey && document.activeElement === menu.querySelector('a')) {
    e.preventDefault();
    first.focus();
  } else if (!e.shiftKey && document.activeElement === last) {
    e.preventDefault();
    first.focus();
  }
});
window.matchMedia('(min-width: 900px)').addEventListener('change', (e) => {
  if (e.matches) setMenu(false);
});

/* ── Mega-Menü Leistungen ─────────────────────────────────── */
const megaWrap = document.querySelector<HTMLElement>('[data-mega]');
const megaBtn = document.querySelector<HTMLButtonElement>('[data-mega-toggle]');
let megaTimer = 0;

function setMega(open: boolean) {
  if (!megaBtn || !header) return;
  megaBtn.setAttribute('aria-expanded', String(open));
  header.classList.toggle('mega-open', open);
}
megaBtn?.addEventListener('click', () => setMega(megaBtn.getAttribute('aria-expanded') !== 'true'));
if (megaWrap && window.matchMedia('(hover: hover)').matches) {
  megaWrap.addEventListener('mouseenter', () => {
    clearTimeout(megaTimer);
    setMega(true);
  });
  megaWrap.addEventListener('mouseleave', () => {
    megaTimer = window.setTimeout(() => setMega(false), 180);
  });
}
megaWrap?.addEventListener('focusout', (e) => {
  if (!megaWrap.contains(e.relatedTarget as Node)) setMega(false);
});

/* ── Kopfzeile: Hintergrund beim Scrollen, ausblenden beim Runterscrollen ── */
let lastY = window.scrollY;
function onScroll() {
  if (!header) return;
  const y = window.scrollY;
  header.classList.toggle('is-scrolled', y > 24);
  if (Math.abs(y - lastY) > 6) {
    header.classList.toggle('is-hidden', y > lastY && y > 400);
    lastY = y;
  }
}
window.addEventListener('scroll', onScroll, { passive: true });
onScroll();

/* ── Kundenstimmen ─────────────────────────────────────────── */
document.querySelectorAll<HTMLElement>('[data-quotes]').forEach((root) => {
  const slides = [...root.querySelectorAll<HTMLElement>('[data-quote]')];
  const dots = [...root.querySelectorAll<HTMLButtonElement>('[data-quote-dot]')];
  const prev = root.querySelector<HTMLButtonElement>('[data-quote-prev]');
  const next = root.querySelector<HTMLButtonElement>('[data-quote-next]');
  const counter = root.querySelector<HTMLElement>('[data-quote-count]');
  let index = 0;
  const show = (i: number) => {
    index = (i + slides.length) % slides.length;
    slides.forEach((s, n) => {
      const active = n === index;
      s.classList.toggle('is-active', active);
      s.setAttribute('aria-hidden', String(!active));
      if (active) s.removeAttribute('inert');
      else s.setAttribute('inert', '');
    });
    dots.forEach((d, n) => d.setAttribute('aria-current', String(n === index)));
    if (counter) counter.textContent = String(index + 1).padStart(2, '0');
  };
  prev?.addEventListener('click', () => show(index - 1));
  next?.addEventListener('click', () => show(index + 1));
  dots.forEach((d, n) => d.addEventListener('click', () => show(n)));
  // Wischen auf Touch-Geräten
  let startX = 0;
  root.addEventListener('touchstart', (e) => (startX = e.touches[0].clientX), { passive: true });
  root.addEventListener(
    'touchend',
    (e) => {
      const dx = e.changedTouches[0].clientX - startX;
      if (Math.abs(dx) > 50) show(index + (dx < 0 ? 1 : -1));
    },
    { passive: true },
  );
  show(0);
});

/* ── FAQ: nur ein Eintrag gleichzeitig offen (je Gruppe) ───── */
document.querySelectorAll<HTMLDetailsElement>('details[data-accordion]').forEach((d) => {
  d.addEventListener('toggle', () => {
    if (!d.open) return;
    d.parentElement?.parentElement
      ?.querySelectorAll<HTMLDetailsElement>('details[data-accordion]')
      .forEach((other) => {
        if (other !== d) other.open = false;
      });
  });
});
