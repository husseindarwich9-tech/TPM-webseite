// Reihenfolge, in der die zwölf Gewerke im Raum auf der Startseite nacheinander arbeiten.
// Die Texte beschreiben, was in diesem Moment im gezeigten Raum passiert.
import { leistungBySlug } from './leistungen';

const schritte: { slug: string; text: string }[] = [
  { slug: 'entruempelung', text: 'Zuerst wird Platz geschaffen: Wir räumen aus und entsorgen, was nicht bleiben soll.' },
  { slug: 'abriss-und-entsorgung', text: 'Alte Fliesen, Tapeten und Beläge kommen runter. Der Raum wird bis auf den Rohzustand zurückgebaut.' },
  { slug: 'elektroinstallation', text: 'Solange die Wände offen sind, werden Leitungen, Dosen und Anschlüsse neu gelegt.' },
  { slug: 'heizung-lueftung-sanitaer', text: 'Wasserleitungen und Heizung kommen an ihren Platz.' },
  { slug: 'trockenbau', text: 'Eine Vorsatzschale aus Ständerwerk und Platten nimmt die Installation auf und begradigt die Wand.' },
  { slug: 'putz-und-spachtelarbeiten', text: 'Fugen werden gespachtelt, das Mauerwerk verputzt: glatte Flächen für alles, was folgt.' },
  { slug: 'malerarbeiten', text: 'Farbe auf sauber vorbereitetem Untergrund.' },
  { slug: 'fliesenlegearbeiten', text: 'Wo es nass wird, wird abgedichtet und gefliest.' },
  { slug: 'bodenlegearbeiten', text: 'Der neue Boden wird verlegt, mit Sockelleisten als Abschluss.' },
  { slug: 'tischlerarbeiten', text: 'Tür, Zarge und Fenster werden eingesetzt.' },
  { slug: 'innenausbau', text: 'Einbauten, Schalter, Licht: Der Raum ist bezugsfertig.' },
  { slug: 'kleinreparaturen', text: 'Und wenn später etwas klemmt oder schief hängt: Wir kommen auch für Kleinigkeiten.' },
];

export const bauablauf = schritte.map((s, i) => {
  const l = leistungBySlug(s.slug)!;
  return { ...s, schritt: String(i + 1).padStart(2, '0'), nr: l.nr, titel: l.titel };
});

export const stufen = schritte.map((s) => s.slug);
