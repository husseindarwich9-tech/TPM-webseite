// Animationen: GSAP + ScrollTrigger, weiches Scrollen mit Lenis.
// Wird bei prefers-reduced-motion gar nicht erst aktiv (Inhalte sind dann sofort sichtbar).
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Lenis from 'lenis';
import { bauSequenz, fokusRaeume, laser, massband, werkzeuge } from './handwerk';

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
  const finePointer = window.matchMedia('(pointer: fine)').matches;
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
  laser();
  massband();
  await pause();

  /* ── Überschriften: Wort für Wort ─────────────────── */
  // IntersectionObserver statt je eines ScrollTriggers: keine Layout-Messung pro Überschrift beim Start
  const tween = { y: 0, duration: 1.15, ease: 'expo.out', stagger: 0.055 };
  const io = new IntersectionObserver(
    (entries) =>
      entries.forEach((en) => {
        if (!en.isIntersecting) return;
        io.unobserve(en.target);
        gsap.to(en.target.querySelectorAll('.sw > span'), tween);
      }),
    { rootMargin: '0px 0px -12% 0px' },
  );
  document.querySelectorAll<HTMLElement>('[data-split]').forEach((el) => {
    if (el.dataset.split === 'load') gsap.to(el.querySelectorAll('.sw > span'), { ...tween, delay: 0.15 });
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

  /* ── Fließtext, der sich beim Scrollen „einschreibt“ ── */
  document.querySelectorAll<HTMLElement>('[data-scrub-words]').forEach((el) => {
    gsap.to(el.querySelectorAll('.wd'), {
      color: getComputedStyle(el).color,
      ease: 'none',
      stagger: 0.1,
      scrollTrigger: { trigger: el, start: 'top 80%', end: 'bottom 45%', scrub: 0.5 },
    });
  });

  /* ── Einblenden im ersten Bildschirm ─────────────── */
  gsap.to('[data-hero-fade]', { opacity: 1, y: 0, duration: 0.9, ease: 'power3.out', stagger: 0.08, delay: 0.5 });

  /* ── Parallax ─────────────────────────────────────── */
  document.querySelectorAll<HTMLElement>('[data-parallax]').forEach((el) => {
    const amount = parseFloat(el.dataset.parallax || '0.15');
    gsap.to(el, {
      yPercent: -100 * amount,
      ease: 'none',
      scrollTrigger: { trigger: el.parentElement || el, start: 'top bottom', end: 'bottom top', scrub: true },
    });
  });

  /* ── Fortschrittslinie (Ablauf) ───────────────────── */
  document.querySelectorAll<HTMLElement>('[data-progress]').forEach((wrap) => {
    const line = wrap.querySelector<HTMLElement>('[data-progress-line]');
    const steps = wrap.querySelectorAll<HTMLElement>('[data-step]');
    if (line) {
      gsap.fromTo(
        line,
        { scaleY: 0 },
        {
          scaleY: 1,
          ease: 'none',
          scrollTrigger: { trigger: wrap, start: 'top 65%', end: 'bottom 65%', scrub: 0.6 },
        },
      );
    }
    steps.forEach((step) =>
      ScrollTrigger.create({
        trigger: step,
        start: 'top 65%',
        onEnter: () => step.classList.add('is-active'),
        onLeaveBack: () => step.classList.remove('is-active'),
      }),
    );
  });

  await pause();

  /* ── Horizontal gepinnter Abschnitt (Werte) ───────── */
  const mm = gsap.matchMedia();
  mm.add('(min-width: 900px)', () => {
    document.querySelectorAll<HTMLElement>('[data-hscroll]').forEach((section) => {
      const track = section.querySelector<HTMLElement>('[data-hscroll-track]');
      if (!track) return;
      const distance = () => track.scrollWidth - window.innerWidth;
      const progress = section.querySelector<HTMLElement>('[data-hscroll-progress]');
      gsap.to(track, {
        x: () => -distance(),
        ease: 'none',
        scrollTrigger: {
          trigger: section,
          start: 'top top',
          end: () => `+=${distance()}`,
          pin: true,
          scrub: 0.8,
          invalidateOnRefresh: true,
          anticipatePin: 1,
          onUpdate: (self) => {
            if (progress) progress.style.transform = `scaleX(${self.progress})`;
          },
        },
      });
    });
  });

  await pause();

  /* ── Laufband ─────────────────────────────────────── */
  document.querySelectorAll<HTMLElement>('[data-marquee]').forEach((el) => {
    const track = el.querySelector<HTMLElement>('[data-marquee-track]');
    if (!track) return;
    const dir = el.dataset.marquee === 'reverse' ? 1 : -1;
    const tween = gsap.to(track, {
      xPercent: dir * 50,
      ease: 'none',
      duration: parseFloat(el.dataset.speed || '40'),
      repeat: -1,
    });
    if (dir === 1) gsap.set(track, { xPercent: -50 });
    // Scroll-Geschwindigkeit beeinflusst das Laufband leicht
    ScrollTrigger.create({
      trigger: el,
      start: 'top bottom',
      end: 'bottom top',
      onUpdate: (self) => {
        const v = Math.min(Math.abs(self.getVelocity()) / 600, 4);
        gsap.to(tween, { timeScale: 1 + v, duration: 0.3, overwrite: true });
        gsap.to(tween, { timeScale: 1, duration: 1.2, delay: 0.3 });
      },
    });
    el.addEventListener('mouseenter', () => gsap.to(tween, { timeScale: 0.15, duration: 0.6 }));
    el.addEventListener('mouseleave', () => gsap.to(tween, { timeScale: 1, duration: 0.6 }));
  });

  /* ── Leistungsverzeichnis: Zeichnung folgt der Maus ── */
  if (finePointer) {
    document.querySelectorAll<HTMLElement>('[data-index]').forEach((list) => {
      const preview = list.querySelector<HTMLElement>('[data-preview]');
      if (!preview) return;
      const items = preview.querySelectorAll<HTMLElement>('[data-preview-item]');
      const xTo = gsap.quickTo(preview, 'x', { duration: 0.6, ease: 'power3' });
      const yTo = gsap.quickTo(preview, 'y', { duration: 0.6, ease: 'power3' });
      const prepared = new Set<Element>();
      list.addEventListener('mousemove', (e) => {
        const r = list.getBoundingClientRect();
        xTo(e.clientX - r.left);
        yTo(e.clientY - r.top);
      });
      list.querySelectorAll<HTMLElement>('[data-index-row]').forEach((row) => {
        row.addEventListener('mouseenter', () => {
          const slug = row.dataset.indexRow;
          items.forEach((it) => {
            const active = it.dataset.previewItem === slug;
            it.classList.toggle('is-active', active);
            if (active) {
              const svg = it.querySelector('svg');
              if (!svg) return;
              const els = drawables(svg);
              if (!prepared.has(svg)) {
                prepared.add(svg);
              }
              prepare(els);
              gsap.to(els, { strokeDashoffset: 0, duration: 0.9, ease: 'power2.out', stagger: 0.03, overwrite: true });
            }
          });
          gsap.to(preview, { autoAlpha: 1, scale: 1, duration: 0.45, ease: 'power3.out' });
        });
      });
      list.addEventListener('mouseleave', () =>
        gsap.to(preview, { autoAlpha: 0, scale: 0.9, duration: 0.35, ease: 'power2.in' }),
      );
    });

    /* ── Magnetische Buttons ──────────────────────────── */
    document.querySelectorAll<HTMLElement>('[data-magnetic]').forEach((el) => {
      const xTo = gsap.quickTo(el, 'x', { duration: 0.5, ease: 'power3' });
      const yTo = gsap.quickTo(el, 'y', { duration: 0.5, ease: 'power3' });
      el.addEventListener('mousemove', (e) => {
        const r = el.getBoundingClientRect();
        xTo((e.clientX - (r.left + r.width / 2)) * 0.25);
        yTo((e.clientY - (r.top + r.height / 2)) * 0.35);
      });
      el.addEventListener('mouseleave', () => {
        xTo(0);
        yTo(0);
      });
    });
  }

  werkzeuge();

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
