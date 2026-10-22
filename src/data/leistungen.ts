// Die zwölf Leistungen der TPM Bau GmbH.
// Hinweis: Die Leistungsumfänge beschreiben übliche Arbeiten des jeweiligen Gewerks und
// sollten von TPM einmal geprüft werden (siehe docs/OFFENE-PUNKTE.md).

export type PhaseId = 'vorbereiten' | 'ausbauen' | 'installieren' | 'gestalten' | 'instandhalten';

export interface Leistung {
  slug: string;
  nr: string;
  titel: string;
  kurz: string;
  phase: PhaseId;
  meta: string;
  intro: string;
  umfang: string[];
  privat: string;
  gewerbe: string;
  verwandt: string[];
}

export const phasen: { id: PhaseId; titel: string; text: string }[] = [
  {
    id: 'vorbereiten',
    titel: 'Vorbereiten',
    text: 'Platz schaffen und den Bestand zurückbauen, damit der Ausbau auf einem sauberen Stand beginnt.',
  },
  {
    id: 'ausbauen',
    titel: 'Ausbauen',
    text: 'Wände, Decken, Untergründe und Einbauten: die Struktur der Räume.',
  },
  {
    id: 'installieren',
    titel: 'Installieren',
    text: 'Strom, Wasser, Wärme und Luft, abgestimmt auf den Ausbau.',
  },
  {
    id: 'gestalten',
    titel: 'Gestalten',
    text: 'Die Oberflächen, die man sieht und jeden Tag benutzt.',
  },
  {
    id: 'instandhalten',
    titel: 'Instand halten',
    text: 'Schäden beheben und Kleinigkeiten erledigen, auch nach der Übergabe.',
  },
];

export const leistungen: Leistung[] = [
  {
    slug: 'innenausbau',
    nr: '01',
    titel: 'Innenausbau',
    kurz: 'Vom Rohzustand bis zur bezugsfertigen Fläche, koordiniert aus einer Hand.',
    phase: 'ausbauen',
    meta: 'Innenausbau in Berlin für Wohnungen, Büros und Gewerbeflächen. Alle Ausbaugewerke koordiniert aus einer Hand – TPM Bau GmbH.',
    intro:
      'Beim Innenausbau greifen viele Gewerke ineinander: Trockenbau, Elektro, Sanitär, Putz, Boden, Fliesen, Malerarbeiten. Wir planen die Reihenfolge, stimmen die Schnittstellen ab und führen die Arbeiten mit unserem Team aus. Sie haben einen Ansprechpartner für das ganze Vorhaben.',
    umfang: [
      'Abstimmung und Koordination aller Ausbaugewerke',
      'Neue Raumaufteilung mit Trennwänden und Decken',
      'Installationen für Strom, Wasser und Heizung',
      'Böden, Fliesen und Wandoberflächen',
      'Türen, Zargen und Einbauten',
      'Übergabe der fertigen Fläche',
    ],
    privat:
      'Sanierung oder Umbau einer Wohnung, Ausbau neuer Räume, Modernisierung vor dem Einzug.',
    gewerbe:
      'Ausbau von Büro-, Laden- und Gastronomieflächen, Herrichten von Flächen bei Mieterwechsel.',
    verwandt: ['trockenbau', 'elektroinstallation', 'heizung-lueftung-sanitaer'],
  },
  {
    slug: 'trockenbau',
    nr: '02',
    titel: 'Trockenbau',
    kurz: 'Wände, Decken und Verkleidungen, schnell gestellt und sauber verspachtelt.',
    phase: 'ausbauen',
    meta: 'Trockenbau in Berlin: Trennwände, abgehängte Decken, Vorsatzschalen und Verkleidungen. Sauber ausgeführt von der TPM Bau GmbH.',
    intro:
      'Mit Trockenbau lassen sich Räume schnell und ohne lange Trocknungszeiten neu aufteilen. Wir stellen Ständerwände, hängen Decken ab, verkleiden Leitungen und Schächte und spachteln die Flächen bis zur gewünschten Oberflächenqualität.',
    umfang: [
      'Trennwände in Ständerbauweise',
      'Vorsatzschalen und Installationswände',
      'Abgehängte Decken und Deckenverkleidungen',
      'Verkleidung von Schächten, Rohren und Leitungen',
      'Spachteln der Fugen und Flächen',
    ],
    privat: 'Neue Zimmer schaffen, Wände begradigen, Leitungen verschwinden lassen.',
    gewerbe: 'Büroaufteilungen, Mieterausbau, Decken für Beleuchtung und Technik.',
    verwandt: ['putz-und-spachtelarbeiten', 'malerarbeiten', 'innenausbau'],
  },
  {
    slug: 'malerarbeiten',
    nr: '03',
    titel: 'Malerarbeiten',
    kurz: 'Anstriche, Lackierungen und Tapeten auf sauber vorbereitetem Untergrund.',
    phase: 'gestalten',
    meta: 'Malerarbeiten in Berlin: Wand- und Deckenanstriche, Lackierarbeiten und Tapezieren für Privat und Gewerbe – TPM Bau GmbH.',
    intro:
      'Ein guter Anstrich hängt vor allem von der Vorbereitung ab. Wir decken ab, bessern den Untergrund aus und streichen, lackieren oder tapezieren danach. Am Ende räumen wir den Raum sauber und können die Fläche übergeben.',
    umfang: [
      'Abdecken und Schützen von Böden und Einrichtung',
      'Untergrund ausbessern und vorbereiten',
      'Wand- und Deckenanstriche',
      'Lackieren von Türen, Zargen und Heizkörpern',
      'Tapezierarbeiten',
    ],
    privat: 'Renovieren vor dem Einzug oder Auszug, neue Farbe für einzelne Räume.',
    gewerbe: 'Renovierung bei Mieterwechsel, Auffrischen von Büro- und Verkaufsflächen.',
    verwandt: ['putz-und-spachtelarbeiten', 'trockenbau', 'bodenlegearbeiten'],
  },
  {
    slug: 'putz-und-spachtelarbeiten',
    nr: '04',
    titel: 'Putz- und Spachtelarbeiten',
    kurz: 'Glatte, tragfähige Wände und Decken als Grundlage für jede Oberfläche.',
    phase: 'ausbauen',
    meta: 'Putz- und Spachtelarbeiten in Berlin: Innenputz, Ausbesserungen und Spachteln in der gewünschten Qualitätsstufe – TPM Bau GmbH.',
    intro:
      'Risse, Löcher und unebene Flächen fallen spätestens nach dem Streichen auf. Wir putzen, spachteln und schleifen Wände und Decken, damit Farbe, Tapete oder Fliesen auf einem tragfähigen und ebenen Untergrund liegen.',
    umfang: [
      'Innenputz auf Wänden und Decken',
      'Ausbessern von Putzschäden, Rissen und Schlitzen',
      'Spachteln in der gewünschten Qualitätsstufe (Q1 bis Q4)',
      'Schleifen und Vorbereiten für den Anstrich',
    ],
    privat: 'Altbauwände glätten, Schäden nach dem Auszug beheben, Wände für neue Farbe vorbereiten.',
    gewerbe: 'Instandsetzung von Wohnungen und Gewerbeeinheiten, Vorbereitung für Malerarbeiten.',
    verwandt: ['malerarbeiten', 'trockenbau', 'innenausbau'],
  },
  {
    slug: 'bodenlegearbeiten',
    nr: '05',
    titel: 'Bodenlegearbeiten',
    kurz: 'Vinyl, Laminat, Parkett oder Teppich, auf einem eben vorbereiteten Untergrund.',
    phase: 'gestalten',
    meta: 'Bodenlegearbeiten in Berlin: Vinyl, Laminat, Parkett und Teppich inklusive Untergrundvorbereitung – TPM Bau GmbH.',
    intro:
      'Ein Boden ist nur so gut wie sein Untergrund. Wir entfernen alte Beläge, gleichen den Untergrund aus und verlegen den neuen Boden. Sockelleisten und Übergänge gehören dazu.',
    umfang: [
      'Entfernen alter Bodenbeläge',
      'Untergrund prüfen, ausgleichen und vorbereiten',
      'Verlegen von Vinyl- und Designbelägen, Laminat und Parkett',
      'Teppich- und textile Beläge',
      'Sockelleisten, Übergangs- und Abschlussprofile',
    ],
    privat: 'Neuer Boden für Wohnung oder Haus, Austausch abgenutzter Beläge.',
    gewerbe: 'Robuste Beläge für Büro- und Verkaufsflächen, Bodenaustausch bei Mieterwechsel.',
    verwandt: ['fliesenlegearbeiten', 'malerarbeiten', 'tischlerarbeiten'],
  },
  {
    slug: 'fliesenlegearbeiten',
    nr: '06',
    titel: 'Fliesenlegearbeiten',
    kurz: 'Bad, Küche und Böden, mit sorgfältiger Abdichtung in Nassbereichen.',
    phase: 'gestalten',
    meta: 'Fliesenlegearbeiten in Berlin: Wand- und Bodenfliesen für Bad, Küche und Gewerbe inklusive Abdichtung – TPM Bau GmbH.',
    intro:
      'Fliesen sollen lange halten, besonders im Bad. Wir bereiten den Untergrund vor, dichten Nassbereiche ab und verlegen Wand- und Bodenfliesen mit sauberem Fugenbild.',
    umfang: [
      'Entfernen alter Fliesen und Untergrundvorbereitung',
      'Abdichtung in Bädern, Duschen und anderen Nassbereichen',
      'Wand- und Bodenfliesen',
      'Fliesenspiegel in der Küche',
      'Erneuern von Fugen und Silikonfugen',
    ],
    privat: 'Badsanierung, neuer Fliesenspiegel, Fliesenboden im Flur oder in der Küche.',
    gewerbe: 'Sanitärräume, Küchen in Gastronomie und Büro, Eingangsbereiche.',
    verwandt: ['heizung-lueftung-sanitaer', 'bodenlegearbeiten', 'abriss-und-entsorgung'],
  },
  {
    slug: 'tischlerarbeiten',
    nr: '07',
    titel: 'Tischlerarbeiten',
    kurz: 'Türen, Zargen, Verkleidungen und Einbauten, passend zum Raum.',
    phase: 'ausbauen',
    meta: 'Tischlerarbeiten in Berlin: Einbau von Türen und Zargen, Verkleidungen, Einbauten und Reparaturen – TPM Bau GmbH.',
    intro:
      'Holz- und Einbauarbeiten geben einem Raum den letzten Schliff. Wir bauen Türen und Zargen ein, setzen Verkleidungen und Einbauten und reparieren beschädigte Holzteile.',
    umfang: [
      'Einbau und Austausch von Innentüren und Zargen',
      'Verkleidungen und Abdeckungen',
      'Einbauten nach Maß',
      'Einstellen und Reparieren von Türen und Holzbauteilen',
    ],
    privat: 'Neue Innentüren, Einbauschrank in der Nische, Reparatur klemmender Türen.',
    gewerbe: 'Türen und Einbauten im Mieterausbau, Reparaturen im laufenden Betrieb.',
    verwandt: ['innenausbau', 'bodenlegearbeiten', 'kleinreparaturen'],
  },
  {
    slug: 'elektroinstallation',
    nr: '08',
    titel: 'Elektroinstallation',
    kurz: 'Leitungen, Steckdosen und Beleuchtung, abgestimmt auf Umbau und Sanierung.',
    phase: 'installieren',
    meta: 'Elektroinstallation in Berlin im Zuge von Sanierung und Ausbau: Leitungen, Steckdosen, Schalter und Beleuchtung – TPM Bau GmbH.',
    intro:
      'Bei Sanierung und Ausbau muss die Elektrik zur neuen Raumaufteilung passen. Wir verlegen Leitungen, setzen Steckdosen, Schalter und Leuchten und stimmen die Arbeiten mit Trockenbau und Putz ab, damit keine Wand zweimal geöffnet wird.',
    umfang: [
      'Verlegen neuer Leitungen',
      'Steckdosen, Schalter und Anschlüsse',
      'Beleuchtung und Leuchtenmontage',
      'Anpassen der Installation bei Umbau und Sanierung',
    ],
    privat: 'Elektrik bei der Wohnungssanierung erneuern, zusätzliche Steckdosen und Lichtpunkte.',
    gewerbe: 'Installationen im Büro- und Ladenausbau, Anpassungen bei neuer Flächennutzung.',
    verwandt: ['trockenbau', 'innenausbau', 'heizung-lueftung-sanitaer'],
  },
  {
    slug: 'heizung-lueftung-sanitaer',
    nr: '09',
    titel: 'Heizung, Lüftung, Sanitär',
    kurz: 'Bad, Leitungen, Heizkörper und Lüftung, auch wenn es schnell gehen muss.',
    phase: 'installieren',
    meta: 'Heizung, Lüftung und Sanitär (HLS) in Berlin: Badinstallation, Leitungen, Heizkörper und Hilfe bei akuten Sanitärproblemen – TPM Bau GmbH.',
    intro:
      'Wasser, Wärme und Luft sind die Technik, die man erst bemerkt, wenn sie fehlt. Wir installieren und erneuern Sanitäranlagen, Leitungen und Heizkörper, kümmern uns um die Lüftung und helfen, wenn ein akutes Problem schnell gelöst werden muss.',
    umfang: [
      'Sanitärinstallation für Bad, WC und Küche',
      'Austausch von Sanitärobjekten und Armaturen',
      'Wasser- und Abwasserleitungen',
      'Heizkörper montieren und austauschen',
      'Lüftung in Bad und Innenräumen',
      'Hilfe bei akuten Sanitärproblemen',
    ],
    privat: 'Badsanierung, neue Armaturen, Hilfe bei Leckagen und Verstopfungen.',
    gewerbe: 'Sanitärräume im Gewerbe, Instandsetzung in verwalteten Wohnungen.',
    verwandt: ['fliesenlegearbeiten', 'elektroinstallation', 'kleinreparaturen'],
  },
  {
    slug: 'abriss-und-entsorgung',
    nr: '10',
    titel: 'Abriss und Entsorgung',
    kurz: 'Rückbau und Entkernung mit ordnungsgemäßer Entsorgung.',
    phase: 'vorbereiten',
    meta: 'Abriss und Entsorgung in Berlin: Rückbau von Wänden, Böden und Bädern, Entkernung und ordnungsgemäße Entsorgung – TPM Bau GmbH.',
    intro:
      'Vor dem Neuen muss oft das Alte raus. Wir bauen Wände, Böden, Bäder und Einbauten zurück, trennen das Material und entsorgen es ordnungsgemäß. So beginnt der Ausbau auf einer sauberen Fläche.',
    umfang: [
      'Rückbau nichttragender Wände und Einbauten',
      'Entfernen von Bodenbelägen, Fliesen und Bädern',
      'Entkernung von Wohnungen und Gewerbeflächen',
      'Trennung und ordnungsgemäße Entsorgung',
    ],
    privat: 'Altes Bad entfernen, Wände öffnen, Wohnung für die Sanierung vorbereiten.',
    gewerbe: 'Rückbau bei Mieterwechsel, Entkernung vor dem Neuausbau.',
    verwandt: ['entruempelung', 'innenausbau', 'trockenbau'],
  },
  {
    slug: 'entruempelung',
    nr: '11',
    titel: 'Entrümpelung',
    kurz: 'Wohnungen, Keller und Gewerbeflächen leer und besenrein übergeben.',
    phase: 'vorbereiten',
    meta: 'Entrümpelung in Berlin: Wohnungen, Keller, Dachböden und Gewerbeflächen räumen und besenrein übergeben – TPM Bau GmbH.',
    intro:
      'Ob nach einem Auszug, vor einer Sanierung oder für einen Mieterwechsel: Wir räumen Wohnungen, Keller, Dachböden und Gewerbeflächen, kümmern uns um die Entsorgung und übergeben die Räume besenrein.',
    umfang: [
      'Räumung von Wohnungen und Häusern',
      'Keller, Dachböden und Abstellräume',
      'Gewerbe- und Büroflächen',
      'Abtransport und Entsorgung',
      'Besenreine Übergabe',
    ],
    privat: 'Wohnungsauflösung, Keller oder Dachboden freiräumen.',
    gewerbe: 'Räumung bei Mieterwechsel, Leerstand oder Umzug von Büroflächen.',
    verwandt: ['abriss-und-entsorgung', 'malerarbeiten', 'kleinreparaturen'],
  },
  {
    slug: 'kleinreparaturen',
    nr: '12',
    titel: 'Kleinreparaturen',
    kurz: 'Die kleinen Dinge, die trotzdem jemand erledigen muss.',
    phase: 'instandhalten',
    meta: 'Kleinreparaturen in Berlin für Privatkunden, Gewerbe und Hausverwaltungen: Türen, Fugen, Wandschäden, Armaturen – TPM Bau GmbH.',
    intro:
      'Eine klemmende Tür, eine undichte Silikonfuge, ein Loch in der Wand: Für einzelne Handwerker lohnt sich der Aufwand oft kaum. Weil wir viele Gewerke im Team haben, erledigen wir auch kleine Aufträge, für Privatkunden ebenso wie für Hausverwaltungen.',
    umfang: [
      'Türen und Beschläge einstellen und reparieren',
      'Silikon- und Fliesenfugen erneuern',
      'Wandschäden ausbessern',
      'Armaturen und Kleinteile austauschen',
      'Montagearbeiten',
    ],
    privat: 'Reparaturen in der Wohnung, Mängel vor Übergabe oder Auszug beheben.',
    gewerbe: 'Laufende Kleinreparaturen in verwalteten Objekten und Gewerbeflächen.',
    verwandt: ['tischlerarbeiten', 'heizung-lueftung-sanitaer', 'malerarbeiten'],
  },
];

export const leistungBySlug = (slug: string) => leistungen.find((l) => l.slug === slug);

/** Titel mit weichen Trennstellen für große Überschriften auf schmalen Bildschirmen */
export const titelUmbruch = (titel: string) =>
  titel
    .replace('Spachtelarbeiten', 'Spachtel­arbeiten')
    .replace('Malerarbeiten', 'Maler­arbeiten')
    .replace('Bodenlegearbeiten', 'Boden­lege­arbeiten')
    .replace('Fliesenlegearbeiten', 'Fliesen­lege­arbeiten')
    .replace('Tischlerarbeiten', 'Tischler­arbeiten')
    .replace('Elektroinstallation', 'Elektro­installation')
    .replace('Kleinreparaturen', 'Klein­reparaturen')
    .replace('Entrümpelung', 'Entrüm­pelung');
