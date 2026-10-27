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
    end: () => `+=${Math.round(window.innerHeight * 3.8)}`,
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
