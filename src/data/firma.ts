// Zentrale Firmendaten. Alles, was auf der Seite über TPM steht, kommt von hier.
// Fehlende Angaben sind als PLATZHALTER markiert und in docs/OFFENE-PUNKTE.md gelistet.

export const firma = {
  name: 'TPM Bau GmbH',
  langname: 'Technical Project Management',
  gruendung: 2021,
  geschaeftsfuehrer: 'Onur Bayram',
  leitsatz: ['Bauen mit Leidenschaft', 'Handeln mit Verantwortung'],
  adresse: {
    strasse: 'Gustav-Müller-Platz 3',
    plz: '10829',
    ort: 'Berlin',
    land: 'DE',
  },
  telefon: '+49 30 4699 8895',
  telefonHref: 'tel:+493046998895',
  email: 'info@tpm-bau.de',
  emailHref: 'mailto:info@tpm-bau.de',
  url: 'https://www.tpm-bau.de',
  osmUrl:
    'https://www.openstreetmap.org/search?query=Gustav-M%C3%BCller-Platz%203%2C%2010829%20Berlin',
  oeffnungszeiten: '[PLATZHALTER: Erreichbarkeit / Bürozeiten]',
  mitgliedschaften: ['Handwerkskammer Berlin', 'BG BAU'],
  // Profil-Links fehlen noch. Solange url = null ist, wird kein Link ausgegeben.
  social: [
    { name: 'Instagram', url: null as string | null },
    { name: 'TikTok', url: null as string | null },
    { name: 'LinkedIn', url: null as string | null },
  ],
  werte: [
    {
      titel: 'Präzision',
      text: 'Sauber geplant, genau ausgeführt. Jedes Gewerk greift in das nächste, ohne dass Sie die Schnittstellen selbst koordinieren müssen.',
    },
    {
      titel: 'Transparenz',
      zusatz: 'durch klare Kommunikation',
      text: 'Sie wissen jederzeit, was als Nächstes passiert, wer zuständig ist und wann. Absprachen sind verbindlich und nachvollziehbar.',
    },
    {
      titel: 'Zuverlässigkeit',
      zusatz: 'in der Umsetzung',
      text: 'Was vereinbart ist, wird umgesetzt. Termine werden eingehalten, die Baustelle bleibt organisiert, und am Ende wird sauber übergeben.',
    },
  ],
  team: ['Fachkräfte', 'Bauleiter', 'Projektmanager'],
  auftraggeber: [
    'Union Investment',
    'Five Guys',
    'Apleona',
    'talyo Property Services',
    'Capera',
    'Tattersall Lorenz',
    'GRR Garbe Retail',
    'Deutsche Asset One',
    'WGBG',
  ],
  zulieferer: ['Raab Karcher', 'Brillux', 'Obeta', 'Keramundo', 'SHK Bergmann & Franz'],
} as const;

export const kundenstimmen = [
  {
    name: 'Anonym',
    text: 'Sehr professionelle Abwicklung vom Erstkontakt bis zur Abnahme. Termine und Abstimmungen wurden zuverlässig eingehalten, die Baustelle war organisiert und am Ende sauber übergeben.',
  },
  {
    name: 'P. Morina',
    text: 'Wir hatten ein akutes Sanitärproblem und haben kurzfristig niemanden gefunden. TPM hat super schnell reagiert und war wirklich unsere Rettung.',
  },
  {
    name: 'M. Ahmed',
    text: 'Sehr kompetentes Team. Preis-Leistungs-Verhältnis war mehr als befriedigend. Kann die Firma nur jedem weiterempfehlen.',
  },
] as const;

export const navigation = [
  { href: '/leistungen/', label: 'Leistungen' },
  { href: '/gewerbe/', label: 'Gewerbe & Hausverwaltungen', kurz: 'Gewerbe' },
  { href: '/ueber-uns/', label: 'Über uns' },
  { href: '/karriere/', label: 'Karriere' },
  { href: '/kontakt/', label: 'Kontakt' },
] as const;
