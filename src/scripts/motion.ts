// Animationen: GSAP + ScrollTrigger, weiches Scrollen mit Lenis.
// Wird bei prefers-reduced-motion gar nicht erst aktiv (Inhalte sind dann sofort sichtbar).
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Lenis from 'lenis';
import { bauSequenz, fokusRaeume } from './handwerk';

const root = document.documentElement;
const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');

if (root.classList.contains('motion') && !reduced.matches) {
  gsap.registerPlugin(ScrollTrigger);
  root.classList.add('motion-ready');
  init();
}

/** Arbeit auf mehrere kurze Tasks verteilen, damit der Hauptthread reaktionsfähig bleibt */
function pause() {
  return new Promise<void>((r) => setTimeout(r, 0));
}

async function init() {
  /* ── Weiches Scrollen ─────────────────────────────── */
  const lenis = new Lenis({
    duration: 1.1,
    easing: (t: number) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
    smoothWheel: true,
    anchors: { offset: -80 },
  });
  lenis.on('scroll', ScrollTrigger.update);
  gsap.ticker.add((time) => lenis.raf(time * 1000));
  gsap.ticker.lagSmoothing(0);
  window.addEventListener('tpm:menu', (e) => {
    const open = (e as CustomEvent<{ open: boolean }>).detail.open;
    if (open) lenis.stop();
    else lenis.start();
  });
  ScrollTrigger.config({ ignoreMobileResize: true });

  /* ── Handwerk: Bauablauf zuerst (gepinnt, beeinflusst alle späteren Positionen) ── */
  bauSequenz(lenis);
  await pause();
  fokusRaeume();
  await pause();

  /* ── Überschriften ────────────────────────────────── */
  // Nur die Startüberschrift baut sich Wort für Wort auf; alle anderen blenden ruhig ein.
  const io = new IntersectionObserver(
    (entries) =>
      entries.forEach((en) => {
        if (!en.isIntersecting) return;
        io.unobserve(en.target);
        gsap.to(en.target, { opacity: 1, y: 0, duration: 0.9, ease: 'power3.out' });
      }),
    { rootMargin: '0px 0px -10% 0px' },
  );
  document.querySelectorAll<HTMLElement>('[data-split]').forEach((el) => {
    if (el.dataset.split === 'load')
      gsap.to(el.querySelectorAll('.sw > span'), { y: 0, duration: 1.1, ease: 'expo.out', stagger: 0.05, delay: 0.15 });
    else io.observe(el);
  });
  await pause();

  /* ── Einblenden ───────────────────────────────────── */
  ScrollTrigger.batch('[data-reveal]', {
    start: 'top 90%',
    once: true,
    onEnter: (batch) =>
      gsap.to(batch, {
        opacity: 1,
        y: 0,
        duration: 1,
        ease: 'power3.out',
        stagger: 0.08,
        overwrite: true,
        clearProps: 'transform',
      }),
  });

  document.querySelectorAll<HTMLElement>('[data-reveal-clip]').forEach((el) => {
    gsap.to(el, {
      clipPath: 'inset(0 0 0% 0)',
      duration: 1.4,
      ease: 'expo.inOut',
      scrollTrigger: { trigger: el, start: 'top 85%', once: true },
    });
    const img = el.querySelector('img');
    if (img) {
      gsap.fromTo(
        img,
        { scale: 1.15 },
        { scale: 1, duration: 1.8, ease: 'expo.out', scrollTrigger: { trigger: el, start: 'top 85%', once: true } },
      );
    }
  });

  await pause();

  /* ── Linien zeichnen sich selbst ──────────────────── */
  const drawables = (svg: Element) =>
    [...svg.querySelectorAll<SVGGeometryElement>('path, rect, circle, line, polyline, polygon')].filter(
      (n) => !n.closest('defs') && !n.classList.contains('mask') && !n.getAttribute('fill')?.startsWith('url'),
    );

  const prepare = (els: SVGGeometryElement[]) =>
    els.forEach((n) => {
      n.setAttribute('pathLength', '1');
      n.style.strokeDasharray = '1 1';
      n.style.strokeDashoffset = '1';
    });

  document.querySelectorAll<SVGElement>('svg[data-draw]').forEach((svg) => {
    if (svg.closest('[data-hero]') || svg.closest('[data-preview]')) return;
    const els = drawables(svg);
    const fills = svg.querySelectorAll<SVGElement>('[fill^="url"], .mask');
    prepare(els);
    gsap.set(fills, { opacity: 0 });
    gsap.set(svg, { opacity: 1 });
    const tl = gsap.timeline({
      scrollTrigger: { trigger: svg, start: 'top 85%', once: true },
    });
    tl.to(els, { strokeDashoffset: 0, duration: 1.4, ease: 'power2.inOut', stagger: 0.06 });
    tl.to(fills, { opacity: 1, duration: 0.6, ease: 'power1.out' }, '-=0.6');
  });

  /* ── Einblenden im ersten Bildschirm ─────────────── */
  gsap.to('[data-hero-fade]', { opacity: 1, y: 0, duration: 0.9, ease: 'power3.out', stagger: 0.08, delay: 0.5 });

  // Nach dem Laden von Schriften/Bildern Positionen neu berechnen
  document.fonts?.ready.then(() => ScrollTrigger.refresh());
  window.addEventListener('load', () => ScrollTrigger.refresh());

  // Wechselt der Nutzer zur Laufzeit auf reduzierte Bewegung: alles sofort zeigen.
  reduced.addEventListener('change', (e) => {
    if (!e.matches) return;
    lenis.destroy();
    ScrollTrigger.getAll().forEach((t) => t.kill());
    gsap.globalTimeline.clear();
    root.classList.remove('motion');
    document.querySelectorAll<HTMLElement>('[style]').forEach((n) => {
      if (n.closest('svg')) n.style.strokeDashoffset = '0';
    });
  });
}
