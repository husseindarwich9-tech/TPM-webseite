// Animationen: GSAP + ScrollTrigger, nur für den Raum auf den Leistungsseiten (Gewerk in Schleife).
// Bewusst ohne weiches Scrollen und ohne Effekte, die vom Scrollen abhängen: Die Seite scrollt so direkt wie der
// Browser selbst. Nachgleiten (Lenis), gestapelte Karten und Bilder/Linien, die sich erst beim Hinscrollen
// aufdecken, wirkten beim Präsentieren wie Hängen und sind deshalb entfernt.
// Wird bei prefers-reduced-motion gar nicht erst aktiv (Inhalte sind dann sofort sichtbar).
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { fokusRaeume } from './handwerk';

const root = document.documentElement;
const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');

if (root.classList.contains('motion') && !reduced.matches) {
  gsap.registerPlugin(ScrollTrigger);
  ScrollTrigger.config({ ignoreMobileResize: true });
  root.classList.add('motion-ready');
  init();
}

function init() {
  /* ── Leistungsseiten: Gewerk-Schleife im Raum (läuft nur, solange er im Bild ist) ── */
  fokusRaeume();

  // Nach dem Laden von Schriften/Bildern Positionen neu berechnen
  document.fonts?.ready.then(() => ScrollTrigger.refresh());
  window.addEventListener('load', () => ScrollTrigger.refresh());

  // Wechselt der Nutzer zur Laufzeit auf reduzierte Bewegung: alles anhalten.
  reduced.addEventListener('change', (e) => {
    if (!e.matches) return;
    ScrollTrigger.getAll().forEach((t) => t.kill());
    gsap.globalTimeline.clear();
    root.classList.remove('motion');
  });
}
