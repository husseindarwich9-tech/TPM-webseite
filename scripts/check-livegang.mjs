// Livegang-Prüfung: Darf dieser Build öffentlich gehen? Prüft den fertigen Build in dist/ und deploy/nginx.conf.
// Bricht mit Fehlercode 1 ab, solange etwas fehlt (fehlender Anfrage-Versand, Platzhalter, Beispiel-Domain …).
// Aufruf: npm run build && npm run check:livegang
import fs from 'node:fs';
import path from 'node:path';

const DIST = 'dist';
const blocker = [];
const hinweise = [];

if (!fs.existsSync(path.join(DIST, 'index.html'))) {
  console.error('Kein Build gefunden. Zuerst „npm run build“ ausführen.');
  process.exit(1);
}

const seiten = [];
(function walk(d) {
  for (const f of fs.readdirSync(d)) {
    const p = path.join(d, f);
    if (fs.statSync(p).isDirectory()) walk(p);
    else if (f.endsWith('.html')) seiten.push(p);
  }
})(DIST);
const route = (f) => '/' + path.relative(DIST, f).replace(/\\/g, '/').replace(/index\.html$/, '');

/* ── 1 · Anfrage-Versand ── */
const webhook = (process.env.PUBLIC_ANFRAGE_WEBHOOK_URL || leseEnv('PUBLIC_ANFRAGE_WEBHOOK_URL') || '').trim();
const anfrage = fs.readFileSync(path.join(DIST, 'anfrage/index.html'), 'utf8');
if (anfrage.includes('data-wz-ohne-versand')) {
  blocker.push(
    'Anfrage-Versand: Der Build hat keine Webhook-Adresse. PUBLIC_ANFRAGE_WEBHOOK_URL in .env eintragen und neu bauen (docs/ANFRAGE-WEBHOOK.md).',
  );
} else if (webhook) {
  let url;
  try {
    url = new URL(webhook);
  } catch {
    blocker.push(`Anfrage-Versand: „${webhook}“ ist keine gültige Adresse.`);
  }
  if (url && url.protocol !== 'https:') blocker.push('Anfrage-Versand: Die Webhook-Adresse muss mit https:// beginnen.');
  if (url && /example\.(de|com|org)$/.test(url.hostname)) blocker.push('Anfrage-Versand: Die Webhook-Adresse ist noch die Beispieladresse.');
  if (url) {
    const conf = fs.readFileSync('deploy/nginx.conf', 'utf8');
    const csp = (conf.match(/Content-Security-Policy "([^"]+)"/) || [])[1] || '';
    if (!csp.includes(url.origin))
      blocker.push(`nginx: In der Content-Security-Policy fehlt „${url.origin}“ unter connect-src. Sonst blockiert der Browser den Versand.`);
  }
  hinweise.push('Anfrage-Versand: Bitte einmal mit Testdaten und Fotos bis ins Postfach prüfen (Zustellung, Anhänge, Spamfilter).');
}

/* ── 2 · nginx-Vorlage ── */
const conf = fs.readFileSync('deploy/nginx.conf', 'utf8');
if (conf.includes('automation.example.de'))
  blocker.push('nginx: deploy/nginx.conf enthält noch die Beispiel-Domain „automation.example.de“ (connect-src).');

/* ── 3 · Platzhalter in den Seiten ── */
let anzahl = 0;
for (const f of seiten.sort()) {
  const html = fs.readFileSync(f, 'utf8');
  const main = (html.match(/<main[^>]*>([\s\S]*?)<\/main>/) || [, html])[1];
  const treffer = [...main.matchAll(/\[PLATZHALTER:\s*([^\]]*)\]/g)].map((m) => m[1].replace(/<[^>]+>/g, '').trim());
  if (!treffer.length) continue;
  anzahl += treffer.length;
  const pflicht = /impressum|datenschutz|agb/.test(f);
  const text = `${route(f)}: ${treffer.length} Platzhalter – ${[...new Set(treffer)].slice(0, 3).join('; ').slice(0, 160)}`;
  // Rechtstexte sind Pflicht; die übrigen Platzhalter sind sichtbar und wirken unfertig
  blocker.push((pflicht ? 'Rechtstext ' : 'Inhalt ') + text);
}

/* ── 4 · Sonstiges ── */
const impressum = fs.readFileSync(path.join(DIST, 'impressum/index.html'), 'utf8');
if (!/HRB\s*\d/.test(impressum)) blocker.push('Impressum: Keine HRB-Nummer gefunden (Handelsregister).');
if (!/DE\s?\d{9}/.test(impressum)) hinweise.push('Impressum: Keine USt-IdNr. gefunden (Pflicht, sofern vorhanden).');
const robots = fs.readFileSync(path.join(DIST, 'robots.txt'), 'utf8');
if (/Disallow:\s*\/\s*$/m.test(robots)) blocker.push('robots.txt sperrt die ganze Seite für Suchmaschinen.');
hinweise.push('Vor dem Livegang auf echten Geräten testen: iPhone (Safari), Android (Chrome), Foto-Upload aus der Kamera (HEIC).');

/* ── Ausgabe ── */
console.log(`Livegang-Prüfung (${seiten.length} Seiten, ${anzahl} Platzhalter)\n`);
if (blocker.length) {
  console.log(`✗ ${blocker.length} Punkt(e) verhindern den Livegang:`);
  blocker.forEach((b) => console.log('   –', b));
} else console.log('✓ Keine Hindernisse gefunden.');
if (hinweise.length) {
  console.log('\nBitte zusätzlich von Hand prüfen:');
  hinweise.forEach((h) => console.log('   –', h));
}
process.exit(blocker.length ? 1 : 0);

function leseEnv(name) {
  for (const f of ['.env.production', '.env']) {
    if (!fs.existsSync(f)) continue;
    const m = fs.readFileSync(f, 'utf8').match(new RegExp(`^\\s*${name}\\s*=\\s*(.*)$`, 'm'));
    if (m) return m[1].replace(/^["']|["']$/g, '');
  }
  return '';
}
