// Leistungsseiten: Der Raum zeigt das jeweilige Gewerk bei der Arbeit (in Schleife, nur solange er im Bild ist).
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { fokusSchleife } from './bauraum';

/* ── Leistungsseiten: das jeweilige Gewerk in Schleife ─────────── */
export function fokusRaeume() {
  document.querySelectorAll<SVGSVGElement>('svg[data-raum][data-focus]').forEach((svg) => {
    fokusSchleife(svg, svg.dataset.focus || '')
      // Schlägt der Aufbau fehl, bleibt der fertige Raum stehen (kein Fehler für Besucher)
      .catch(() => null)
      .then((f) => {
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
