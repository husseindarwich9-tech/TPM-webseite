// Handwerkliche Interaktionen: Bauablauf im Raum, Kreuzlinienlaser, Maßband, Wasserwaage, Schraube, Transparentpapier.
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import type Lenis from 'lenis';
import { bauAufbauen, fokusSchleife } from './bauraum';

/* ── Startseite: ein Raum, zwölf Gewerke ───────────────────────── */
export function bauSequenz(lenis: Lenis) {
  const sec = document.querySelector<HTMLElement>('[data-bau]');
  const svg = sec?.querySelector<SVGSVGElement>('svg[data-raum]');
  if (!sec || !svg) return;
  const hero = sec.querySelector<HTMLElement>('[data-bau-hero]')!;
  const steps = [...sec.querySelectorAll<HTMLElement>('[data-bau-step]')];
  const finale = sec.querySelector<HTMLElement>('[data-bau-final]')!;
  const ticks = [...sec.querySelectorAll<HTMLElement>('[data-bau-tick]')];
  const label = sec.querySelector<HTMLElement>('[data-bau-label]');
  const room = sec.querySelector<HTMLElement>('[data-bau-room]');

  const START = 0.6;
  const ENDE = START + 12;
  const master = gsap.timeline({ paused: true });
  const bau = gsap.timeline();
  master
    .to(hero, { opacity: 0, y: -60, duration: 0.45, ease: 'power2.in' }, 0.08)
    .fromTo(room, { scale: 0.94 }, { scale: 1, duration: START, ease: 'power1.out' }, 0)
    .add(bau, START)
    .to({}, { duration: 1.1 }, ENDE); // Platzhalter: Gesamtlänge steht fest, auch während die Gewerke noch aufgebaut werden
  bauAufbauen(svg, bau, 0);

  let zustand = '';
  const setLink = (el: HTMLElement, aktiv: boolean) =>
    el.querySelectorAll('a').forEach((a) => (a.tabIndex = aktiv ? 0 : -1));
  const update = () => {
    const t = master.time();
    const idx = t < 0.3 ? -1 : t >= ENDE + 0.1 ? 12 : Math.min(11, Math.max(0, Math.floor(t - START + 0.12)));
    const neu = String(idx);
    if (neu === zustand) return;
    zustand = neu;
    hero.style.pointerEvents = idx < 0 ? '' : 'none';
    hero.setAttribute('aria-hidden', String(idx >= 0));
    setLink(hero, idx < 0);
    steps.forEach((s, i) => {
      s.classList.toggle('is-active', i === idx);
      s.classList.toggle('is-past', i < idx);
      setLink(s, i === idx);
    });
    finale.classList.toggle('is-active', idx === 12);
    setLink(finale, idx === 12);
    ticks.forEach((tk, i) => {
      tk.classList.toggle('is-done', i < idx);
      tk.classList.toggle('is-current', i === idx);
    });
    if (label) label.textContent = idx < 0 ? 'Altbestand' : idx >= 12 ? 'Übergeben' : steps[idx].querySelector('h3')?.textContent || '';
  };

  ScrollTrigger.create({
    trigger: sec,
    start: 'top top',
    end: () => `+=${Math.round(window.innerHeight * 5.6)}`,
    pin: true,
    scrub: 0.6,
    animation: master,
    anticipatePin: 1,
    onRefresh: update,
  });
  // Text folgt der (geglätteten) Timeline, nicht nur dem Scrollereignis
  master.eventCallback('onUpdate', update);
  update();

  sec.querySelector('[data-bau-skip]')?.addEventListener('click', (e) => {
    e.preventDefault();
    lenis.scrollTo('#nach-bau', { offset: -60, duration: 1.4 });
  });
}

/* ── Leistungsseiten: das jeweilige Gewerk in Schleife ─────────── */
export function fokusRaeume() {
  document.querySelectorAll<SVGSVGElement>('svg[data-raum][data-focus]').forEach((svg) => {
    fokusSchleife(svg, svg.dataset.focus || '').then((f) => {
      if (!f) return;
      ScrollTrigger.create({
        trigger: svg,
        start: 'top 92%',
        end: 'bottom 8%',
        onToggle: (self) => (self.isActive ? f.schleife.play() : f.schleife.pause()),
      });
    });
  });
}

/* ── Kreuzlinienlaser als Mauszeiger-Begleiter ─────────────────── */
export function laser() {
  if (!window.matchMedia('(pointer: fine)').matches) return;
  document.querySelectorAll<HTMLElement>('[data-laser]').forEach((sec) => {
    const el = document.createElement('div');
    el.className = 'laser';
    el.setAttribute('aria-hidden', 'true');
    el.innerHTML =
      '<span class="laser__h"></span><span class="laser__v"></span><span class="laser__dot"></span><span class="laser__tag">± 0,0 mm</span>';
    sec.appendChild(el);
    const [h, v, dot, tag] = [...el.children] as HTMLElement[];
    const hy = gsap.quickTo(h, 'y', { duration: 0.35, ease: 'power3' });
    const vx = gsap.quickTo(v, 'x', { duration: 0.35, ease: 'power3' });
    const dx = gsap.quickTo([dot, tag], 'x', { duration: 0.35, ease: 'power3' });
    const dy = gsap.quickTo([dot, tag], 'y', { duration: 0.35, ease: 'power3' });
    sec.addEventListener('mousemove', (e) => {
      const r = sec.getBoundingClientRect();
      const x = e.clientX - r.left;
      const y = e.clientY - r.top;
      hy(y);
      vx(x);
      dx(x);
      dy(y);
      el.classList.add('is-on');
    });
    sec.addEventListener('mouseleave', () => el.classList.remove('is-on'));
  });
}

/* ── Maßband: misst, wie weit Sie gescrollt haben ──────────────── */
export function massband() {
  const el = document.querySelector<HTMLElement>('[data-massband]');
  if (!el) return;
  const band = el.querySelector<HTMLElement>('.massband__band')!;
  const haken = el.querySelector<HTMLElement>('.massband__haken')!;
  const wert = el.querySelector<HTMLElement>('.massband__wert')!;
  const fmt = new Intl.NumberFormat('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  let letzte = -1;
  const tick = () => {
    const max = document.documentElement.scrollHeight - window.innerHeight;
    const p = max > 0 ? Math.min(1, Math.max(0, window.scrollY / max)) : 0;
    if (Math.abs(p - letzte) < 0.0005) return;
    letzte = p;
    const hoehe = el.clientHeight;
    band.style.clipPath = `inset(0 0 ${(1 - p) * 100}% 0)`;
    haken.style.transform = `translate3d(0, ${p * hoehe}px, 0)`;
    // 40 px Band = 1 cm: der Wert zeigt die gescrollte Strecke in Metern
    wert.textContent = `${fmt.format(window.scrollY / 4000)} m`;
  };
  gsap.ticker.add(tick);
  el.classList.add('is-ready');
}

/* ── Werte: Wasserwaage, Transparentpapier, Schraube ───────────── */
export function werkzeuge() {
  // Wasserwaage: Die Libelle schwingt mit der Scrollgeschwindigkeit und kommt ins Lot.
  document.querySelectorAll<SVGElement>('[data-waage]').forEach((waage) => {
    const blase = waage.querySelector<SVGElement>('.waage__blase');
    const lot = waage.closest('.value')?.querySelector<HTMLElement>('[data-lot]');
    if (!blase) return;
    const bx = gsap.quickTo(blase, 'x', { duration: 0.9, ease: 'elastic.out(1, 0.35)' });
    let ruhe: gsap.core.Tween | null = null;
    ScrollTrigger.create({
      trigger: waage,
      start: 'top bottom',
      end: 'bottom top',
      onUpdate: (self) => {
        const v = gsap.utils.clamp(-22, 22, self.getVelocity() / 90);
        bx(v);
        lot?.classList.toggle('is-lot', Math.abs(v) < 3);
        ruhe?.kill();
        ruhe = gsap.delayedCall(0.18, () => {
          bx(0);
          lot?.classList.add('is-lot');
        });
      },
    });
  });

  // Transparentpapier: Planlagen fächern sich auf
  document.querySelectorAll<SVGElement>('[data-lagen]').forEach((lagen) => {
    const blaetter = lagen.querySelectorAll('.lage');
    gsap.fromTo(
      blaetter,
      { x: 0, y: 0 },
      {
        x: (i) => i * 26,
        y: (i) => i * -18,
        ease: 'none',
        scrollTrigger: { trigger: lagen.closest('section') || lagen, start: 'top bottom', end: 'bottom top', scrub: 0.6 },
      },
    );
  });

  // Schraube: dreht sich beim Scrollen ins Material
  document.querySelectorAll<SVGElement>('[data-schraube]').forEach((s) => {
    const teil = s.querySelector('.schraube__teil');
    const gewinde = s.querySelector('.schraube__gewinde');
    const trigger = s.closest('section') || s;
    const st = { trigger, start: 'top bottom', end: 'bottom top', scrub: 0.5 };
    // Gewinde wandert nach oben (wirkt wie Drehen), die Schraube sinkt ins Holz
    gsap.fromTo(gewinde, { y: 0 }, { y: -140, ease: 'none', scrollTrigger: st });
    gsap.fromTo(teil, { y: -6 }, { y: 44, ease: 'none', scrollTrigger: { ...st } });
  });
}
