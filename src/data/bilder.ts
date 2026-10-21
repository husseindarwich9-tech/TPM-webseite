// ─────────────────────────────────────────────────────────────────────────────
// ZENTRALE BILDLISTE
//
// Alle Fotos der Seite werden hier registriert. Ein echtes Foto einsetzen:
//   1. Datei in den Ordner  bilder-vom-kunden/  legen (jpg, jpeg, png, webp oder avif)
//   2. Unten beim passenden Eintrag unter `datei` den Dateinamen eintragen
//      (bei startfoto.jpg ist das schon erledigt)
//   3. Seite neu bauen (npm run build)
//
// Fehlt die Datei, zeigt die Seite stattdessen eine gezeichnete Fläche im Planstil.
// Wo das Foto für den Inhalt wichtig ist, steht dort ein sichtbarer PLATZHALTER.
// Größe, Format (WebP/AVIF) und srcset erzeugt der Build automatisch.
// Fotos werden NICHT zugeschnitten: Sie erscheinen immer im Originalseitenverhältnis.
// ─────────────────────────────────────────────────────────────────────────────

import type { ImageMetadata } from 'astro';

export interface BildEintrag {
  /** Dateiname im Ordner bilder-vom-kunden/ – oder null, solange es kein Foto gibt */
  datei: string | null;
  /** Alternativtext für Screenreader und Suchmaschinen */
  alt: string;
  /** Was auf dem Foto zu sehen sein soll (erscheint im Platzhalter) */
  motiv: string;
  /** Herkunft: 'kunde' = echtes TPM-Foto, sonst Quelle laut docs/BILDQUELLEN.md */
  quelle: 'kunde' | string;
}

export const bilder = {
  startfoto: {
    datei: 'startfoto.jpg',
    alt: 'Mitarbeiter der TPM Bau GmbH im Firmen-Shirt mit TPM-Logo vor einem Wandgemälde in Berlin',
    motiv: 'Mitarbeiter im TPM-Shirt vor einem Wandgemälde',
    quelle: 'kunde',
  },
  team: {
    datei: null,
    alt: 'Das Team der TPM Bau GmbH',
    motiv: 'Teamfoto: Fachkräfte, Bauleiter und Projektmanager',
    quelle: 'kunde',
  },
  geschaeftsfuehrer: {
    datei: null,
    alt: 'Onur Bayram, Geschäftsführer der TPM Bau GmbH',
    motiv: 'Porträt Onur Bayram, Geschäftsführer',
    quelle: 'kunde',
  },
  karriere: {
    datei: null,
    alt: 'Mitarbeiter der TPM Bau GmbH bei der Arbeit auf der Baustelle',
    motiv: 'Mitarbeitende bei der Arbeit, gern mit Auszubildenden',
    quelle: 'kunde',
  },
  gewerbe: {
    datei: null,
    alt: 'Gewerbefläche nach dem Ausbau durch die TPM Bau GmbH',
    motiv: 'Fertig ausgebaute Gewerbe- oder Bürofläche aus einem echten TPM-Projekt',
    quelle: 'kunde',
  },
} satisfies Record<string, BildEintrag>;

export type BildSlot = keyof typeof bilder;

// Optionale Projektfotos je Leistung, z. B. bilder-vom-kunden/leistung-trockenbau.jpg
// Liegt eine solche Datei im Ordner, erscheint sie automatisch auf der Leistungsseite.
export const leistungsFotoDatei = (slug: string) => `leistung-${slug}`;

// Alle Dateien im Kundenordner werden zur Build-Zeit eingelesen.
const dateien = import.meta.glob<ImageMetadata>(
  '/bilder-vom-kunden/*.{jpg,jpeg,png,webp,avif,JPG,JPEG,PNG,WEBP}',
  { eager: true, import: 'default' },
);

export function findeDatei(name: string | null): ImageMetadata | null {
  if (!name) return null;
  const exakt = dateien[`/bilder-vom-kunden/${name}`];
  if (exakt) return exakt;
  // Ohne Endung angegeben? Dann erste passende Datei nehmen.
  const treffer = Object.keys(dateien).find((p) =>
    p.replace(/\.[^.]+$/, '').endsWith(`/${name}`),
  );
  return treffer ? dateien[treffer] : null;
}

export function bild(slot: BildSlot) {
  const eintrag: BildEintrag = bilder[slot];
  return { ...eintrag, src: findeDatei(eintrag.datei) };
}
