// Animationen des Bauraums (components/BauRaum.astro): jedes Gewerk arbeitet so, wie es auf der Baustelle aussieht.
import { gsap } from 'gsap';

export const STUFEN = [
  'entruempelung',
  'abriss-und-entsorgung',
  'elektroinstallation',
  'heizung-lueftung-sanitaer',
  'trockenbau',
  'putz-und-spachtelarbeiten',
  'malerarbeiten',
  'fliesenlegearbeiten',
  'bodenlegearbeiten',
  'tischlerarbeiten',
  'innenausbau',
  'kleinreparaturen',
] as const;

type Stufe = (typeof STUFEN)[number];
const SCHRITT = 1; // Dauer je Gewerk in der Gesamt-Timeline

/** Linien „zeichnen“: pathLength normieren und Strichversatz animieren */
function zeichnen(els: Element[]) {
  els.forEach((el) => el.setAttribute('pathLength', '1'));
  return { from: { strokeDasharray: '1 1', strokeDashoffset: 1, opacity: 1 }, to: { strokeDashoffset: 0 } };
}

/** Streifen (Putz, Farbe) von oben nach unten aufziehen */
function aufziehen(tl: gsap.core.Timeline, els: Element[], start: number, dauer: number, abstand: number) {
  els.forEach((el, i) => {
    tl.fromTo(
      el,
      { opacity: 1, attr: { points: el.getAttribute('data-from') || '' } },
      { attr: { points: el.getAttribute('data-to') || '' }, duration: dauer, ease: 'power1.inOut' },
      start + i * abstand,
    );
  });
}

function weg(el: Element, attr = 'data-weg'): [number, number][] {
  try {
    return JSON.parse(el.getAttribute(attr) || '[]');
  } catch {
    return [];
  }
}

/** Baut die Timeline für ein Gewerk (Dauer ≈ 1). */
function stufe(svg: SVGSVGElement, s: Stufe): gsap.core.Timeline {
  const q = (sel: string) => [...svg.querySelectorAll(`.s-${s}${sel}`)];
  // Transform-Werte der beteiligten Teile gebündelt lesen, bevor geschrieben wird (vermeidet Layout-Thrashing)
  svg.querySelectorAll(`.s-${s}, .sprite, .wrench__rot`).forEach((el) => gsap.getProperty(el, 'x'));
  const tl = gsap.timeline();
  const roller = svg.querySelector('.roller');
  const kelle = svg.querySelector('.trowel');
  const wrench = svg.querySelector('.wrench');

  switch (s) {
    case 'entruempelung': {
      const kartons = q('.crate');
      tl.to(kartons, { x: (i) => -140 - i * 12, y: (i) => 70 + i * 6, opacity: 0, duration: 0.55, ease: 'power2.in', stagger: 0.05 });
      break;
    }
    case 'abriss-und-entsorgung': {
      const tapete = q('.paper');
      const fliesen = q('.tile-old');
      tl.to(tapete, {
        y: 190,
        rotation: (i) => (i % 2 ? 9 : -7),
        transformOrigin: '50% 0%',
        opacity: 0,
        duration: 0.5,
        ease: 'power2.in',
        stagger: 0.04,
      })
        .to(q('.crack'), { opacity: 0, duration: 0.1 }, 0.1)
        .to(fliesen, { y: 90, rotation: () => gsap.utils.random(-40, 40), opacity: 0, duration: 0.45, ease: 'power2.in', stagger: { each: 0.008, from: 'random' } }, 0.15)
        .to(q('.floor-old'), { opacity: 0, duration: 0.35 }, 0.55);
      break;
    }
    case 'elektroinstallation': {
      const kabel = q('.cable');
      const z = zeichnen(kabel);
      tl.fromTo(kabel, z.from, { ...z.to, duration: 0.7, ease: 'power1.inOut', stagger: 0.12 }).fromTo(
        q('.socketbox'),
        { scale: 0, opacity: 1, transformOrigin: '50% 50%' },
        { scale: 1, duration: 0.25, ease: 'back.out(3)', stagger: 0.06 },
        0.55,
      );
      break;
    }
    case 'heizung-lueftung-sanitaer': {
      const rohre = q('.pipe');
      const z = zeichnen(rohre);
      tl.fromTo(rohre, z.from, { ...z.to, duration: 0.5, ease: 'power1.out', stagger: 0.1 }).fromTo(
        q('.radiator'),
        { opacity: 0, y: -14 },
        { opacity: 1, y: 0, duration: 0.4, ease: 'power2.out' },
        0.45,
      );
      break;
    }
    case 'trockenbau': {
      tl.fromTo(q('.track'), { opacity: 0, scaleX: 0, transformOrigin: '0% 50%' }, { opacity: 1, scaleX: 1, duration: 0.25 })
        .fromTo(q('.stud'), { opacity: 1, scaleY: 0, transformOrigin: '50% 100%' }, { scaleY: 1, duration: 0.3, ease: 'power2.out', stagger: 0.025 }, 0.15)
        .fromTo(q('.board'), { opacity: 0, y: -26 }, { opacity: 1, y: 0, duration: 0.3, ease: 'power3.out', stagger: 0.035 }, 0.5);
      break;
    }
    case 'putz-und-spachtelarbeiten': {
      const putz = q('.plaster');
      const fugen = q('.joint');
      const z = zeichnen(fugen);
      const w = kelle ? weg(kelle) : [];
      tl.fromTo(fugen, z.from, { ...z.to, duration: 0.35, stagger: 0.04 });
      aufziehen(tl, putz, 0.25, 0.3, 0.07);
      if (kelle && w.length > 1) {
        tl.fromTo(kelle, { x: w[0][0], y: w[0][1], opacity: 0 }, { opacity: 1, duration: 0.08 }, 0.25)
          .to(kelle, { x: w[1][0], y: w[1][1], duration: 0.65, ease: 'none' }, 0.27)
          .to(kelle, { rotation: 8, yoyo: true, repeat: 5, duration: 0.06, ease: 'sine.inOut', transformOrigin: '50% 100%' }, 0.27)
          .to(kelle, { opacity: 0, duration: 0.08 }, 0.92);
      }
      break;
    }
    case 'malerarbeiten': {
      const links = q('.paint-l');
      const rechts = q('.paint-r');
      aufziehen(tl, links, 0, 0.18, 0.07);
      aufziehen(tl, rechts, 0.48, 0.18, 0.06);
      if (roller) {
        const a = weg(roller);
        const b = weg(roller, 'data-weg2');
        if (a.length > 1 && b.length > 1) {
          tl.fromTo(roller, { x: a[0][0], y: a[0][1], opacity: 0 }, { opacity: 1, duration: 0.05 }, 0)
            .to(roller, { x: a[1][0], y: a[1][1], duration: 0.42, ease: 'none' }, 0.02)
            .to(roller, { x: b[0][0], y: b[0][1], duration: 0.06 }, 0.44)
            .to(roller, { x: b[1][0], y: b[1][1], duration: 0.46, ease: 'none' }, 0.5)
            .to(roller, { opacity: 0, duration: 0.05 }, 0.95);
        }
      }
      break;
    }
    case 'fliesenlegearbeiten': {
      tl.fromTo(
        q('.tile'),
        { opacity: 0, scale: 0.2, transformOrigin: '50% 50%' },
        { opacity: 1, scale: 1, duration: 0.22, ease: 'back.out(2)', stagger: 0.03 },
      );
      break;
    }
    case 'bodenlegearbeiten': {
      const dielen = q('.plank');
      tl.fromTo(
        dielen,
        { opacity: 0, y: -16 },
        { opacity: 1, y: 0, duration: 0.2, ease: 'power2.out', stagger: (i: number, el: Element) => Number(el.getAttribute('data-row')) * 0.045 + (i % 5) * 0.004 },
      );
      const leisten = q('.skirting');
      const z = zeichnen(leisten);
      tl.fromTo(leisten, z.from, { ...z.to, duration: 0.25 }, 0.75);
      break;
    }
    case 'tischlerarbeiten': {
      tl.fromTo(q('.window'), { opacity: 0, y: -12 }, { opacity: 1, y: 0, duration: 0.35, ease: 'power2.out', stagger: 0.05 })
        .fromTo(q('.door'), { opacity: 0, x: 18, y: -10 }, { opacity: 1, x: 0, y: 0, duration: 0.4, ease: 'power3.out', stagger: 0.06 }, 0.4);
      break;
    }
    case 'innenausbau': {
      tl.fromTo(q('.cabinet'), { opacity: 0, y: 30 }, { opacity: 1, y: 0, duration: 0.35, ease: 'power3.out', stagger: 0.04 })
        .fromTo(q('.plate'), { opacity: 0, scale: 0, transformOrigin: '50% 50%' }, { opacity: 1, scale: 1, duration: 0.2, stagger: 0.05 }, 0.3)
        .fromTo(svg.querySelectorAll('.s-innenausbau.picture, .s-innenausbau:not(.cabinet):not(.plate):not(.lamp):not(.light)'), { opacity: 0 }, { opacity: 1, duration: 0.25 }, 0.4)
        .fromTo(q('.lamp'), { opacity: 0, y: -40 }, { opacity: 1, y: 0, duration: 0.35, ease: 'power2.out' }, 0.45)
        .fromTo(q('.light'), { opacity: 0 }, { opacity: 1, duration: 0.25, ease: 'power1.in' }, 0.8);
      break;
    }
    case 'kleinreparaturen': {
      const bild = svg.querySelector('.picture');
      if (bild) {
        const cx = Number(bild.getAttribute('data-cx'));
        const cy = Number(bild.getAttribute('data-cy'));
        tl.fromTo(bild, { rotation: -9, svgOrigin: `${cx} ${cy}` }, { rotation: 0, svgOrigin: `${cx} ${cy}`, duration: 0.45, ease: 'elastic.out(1, 0.5)' }, 0.05);
      }
      if (wrench) {
        const rot = wrench.querySelector('.wrench__rot');
        const o = `${wrench.getAttribute('data-ox')} ${wrench.getAttribute('data-oy')}`;
        tl.fromTo(wrench, { opacity: 0 }, { opacity: 1, duration: 0.08 }, 0.35)
          .fromTo(rot, { rotation: -35, svgOrigin: o }, { rotation: 20, svgOrigin: o, duration: 0.3, ease: 'power2.inOut', yoyo: true, repeat: 1 }, 0.35)
          .to(wrench, { opacity: 0, duration: 0.08 }, 0.95);
      }
      tl.fromTo(q('.badge'), { opacity: 0, scale: 0.4, transformOrigin: '50% 50%' }, { opacity: 1, scale: 1, duration: 0.3, ease: 'back.out(2.5)' }, 0.65);
      break;
    }
  }
  if (tl.duration() > 0) tl.duration(SCHRITT * 0.9);
  return tl;
}

const pause = () => new Promise<void>((r) => setTimeout(r, 0));

/**
 * Baut die Abfolge schrittweise in `tl` auf: ein Gewerk pro Task, damit der Hauptthread nie lange blockiert.
 * Labels: s0 … s11 (Beginn je Gewerk) und "ende". `start` = Vorlauf vor dem ersten Gewerk.
 */
export async function bauAufbauen(svg: SVGSVGElement, tl: gsap.core.Timeline, start = 0) {
  tl.addLabel('anfang', 0);
  for (let i = 0; i < STUFEN.length; i++) {
    await pause();
    const pos = start + i * SCHRITT;
    tl.addLabel(`s${i}`, pos);
    tl.add(stufe(svg, STUFEN[i]), pos);
  }
  tl.addLabel('ende', start + STUFEN.length * SCHRITT);
  return tl;
}

/** Leistungsseite: Raum im Zustand vor dem Gewerk zeigen und nur dieses Gewerk in Schleife abspielen */
export async function fokusSchleife(svg: SVGSVGElement, slug: string) {
  const i = STUFEN.indexOf(slug as Stufe);
  if (i < 0) return null;
  const tl = gsap.timeline({ paused: true });
  await bauAufbauen(svg, tl, 0);
  const von = `s${i}`;
  const bis = i + 1 < STUFEN.length ? `s${i + 1}` : 'ende';
  tl.seek(von);
  const schleife = gsap.timeline({ repeat: -1, repeatDelay: 1.4, paused: true });
  schleife.add(tl.tweenFromTo(von, bis, { duration: 2.4, ease: 'none' }));
  return { schleife, tl, von, bis };
}
