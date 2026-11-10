// Livegang-Prüfung: Darf dieser Build öffentlich gehen? Prüft den fertigen Build in dist/ und deploy/nginx.conf.
// Bricht mit Fehlercode 1 ab, solange etwas fehlt (fehlender Anfrage-Versand, Platzhalter, Beispiel-Domain …).
// Aufruf: npm run build && npm run check:livegang   (Tests: --dist <ordner> --nginx <datei>)
import fs from 'node:fs';
import path from 'node:path';

// Ordner für Tests überschreibbar: --dist anderer-ordner
const DIST = process.argv.includes('--dist') ? process.argv[process.argv.indexOf('--dist') + 1] : 'dist';
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

/* ── 1 · nginx-Konfiguration lesen (ohne Kommentare) ── */
// Pfad für Tests überschreibbar: node scripts/check-livegang.mjs --nginx andere.conf
const nginxPfad = process.argv.includes('--nginx') ? process.argv[process.argv.indexOf('--nginx') + 1] : 'deploy/nginx.conf';
const conf = ohneKommentare(fs.readFileSync(nginxPfad, 'utf8'));
// Alle CSP-Header, jeweils mit dem location-Block, in dem sie stehen
const cspHeader = [...conf.matchAll(/add_header\s+Content-Security-Policy\s+(?:"([^"]*)"|'([^']*)')/gi)].map((m) => ({
  wert: m[1] ?? m[2],
  location: locationVon(conf, m.index),
}));
const cspFuer = (wert) =>
  Object.fromEntries(
    wert
      .split(';')
      .map((d) => d.trim().split(/\s+/))
      .filter((t) => t[0])
      .map(([name, ...quellen]) => [name.toLowerCase(), quellen]),
  );
if (!cspHeader.length) blocker.push(`nginx: ${nginxPfad} setzt keine Content-Security-Policy.`);
// Seiten werden über „location /“ ausgeliefert: Dort muss die Richtlinie stehen (add_header wird nicht vererbt)
if (cspHeader.length && !cspHeader.some((h) => h.location === '/'))
  blocker.push('nginx: Im Block „location /“ (dort werden die Seiten ausgeliefert) fehlt die Content-Security-Policy.');
for (const h of cspHeader) {
  const d = cspFuer(h.wert);
  const wo = `CSP in „location ${h.location ?? '(server)'}“`;
  if (!d['default-src']) blocker.push(`nginx: ${wo}: default-src fehlt.`);
  for (const name of ['script-src', 'connect-src', 'default-src']) {
    const zuWeit = (d[name] || []).filter((q) => q === '*' || /^(https?|data|blob):?$/i.test(q) || q.includes('*'));
    if (zuWeit.length) blocker.push(`nginx: ${wo}: ${name} erlaubt zu viel (${zuWeit.join(' ')}).`);
  }
  if ((d['script-src'] || d['default-src'] || []).includes("'unsafe-eval'")) blocker.push(`nginx: ${wo}: 'unsafe-eval' ist nicht nötig und unsicher.`);
}
if (/automation\.example\.de/.test(conf))
  blocker.push(`nginx: ${nginxPfad} enthält noch die Beispiel-Domain „automation.example.de“ (connect-src).`);

/* ── 2 · Anfrage-Versand ── */
const webhook = (process.env.PUBLIC_ANFRAGE_WEBHOOK_URL || leseEnv('PUBLIC_ANFRAGE_WEBHOOK_URL') || '').trim();
const anfrage = fs.readFileSync(path.join(DIST, 'anfrage/index.html'), 'utf8');
const skripte = fs
  .readdirSync(path.join(DIST, '_astro'))
  .filter((f) => f.endsWith('.js'))
  .map((f) => fs.readFileSync(path.join(DIST, '_astro', f), 'utf8'))
  .join('\n');
if (anfrage.includes('data-wz-ohne-versand')) {
  blocker.push(
    'Anfrage-Versand: Der Build hat keine Webhook-Adresse. PUBLIC_ANFRAGE_WEBHOOK_URL in .env eintragen und neu bauen (docs/ANFRAGE-WEBHOOK.md).',
  );
} else if (!webhook) {
  // Der Build enthält eine Adresse, aber die Prüfung kennt sie nicht: dann lässt sich die CSP nicht prüfen
  blocker.push('Anfrage-Versand: Für die Prüfung fehlt die Webhook-Adresse (PUBLIC_ANFRAGE_WEBHOOK_URL in .env oder als Umgebungsvariable).');
} else {
  let url = null;
  try {
    url = new URL(webhook);
  } catch {
    blocker.push(`Anfrage-Versand: „${webhook}“ ist keine gültige Adresse.`);
  }
  if (url) {
    if (url.protocol !== 'https:') blocker.push('Anfrage-Versand: Die Webhook-Adresse muss mit https:// beginnen.');
    if (/(^|\.)example\.(de|com|org|net)$/i.test(url.hostname)) blocker.push('Anfrage-Versand: Die Webhook-Adresse ist noch eine Beispieladresse.');
    if (!skripte.includes(JSON.stringify(webhook).slice(1, -1)))
      blocker.push('Anfrage-Versand: Der Build enthält eine andere Webhook-Adresse als angegeben. Mit der richtigen Adresse neu bauen.');
    for (const h of cspHeader) {
      const quellen = cspFuer(h.wert)['connect-src'] || cspFuer(h.wert)['default-src'] || [];
      if (!quellen.some((q) => erlaubt(q, url)))
        blocker.push(`nginx: CSP in „location ${h.location ?? '(server)'}“: connect-src erlaubt „${url.origin}“ nicht. Sonst blockiert der Browser den Versand.`);
    }
  }
  hinweise.push('Anfrage-Versand: Bitte einmal mit Testdaten und Fotos bis ins Postfach prüfen (Zustellung, Anhänge, Spamfilter).');
}

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

/** nginx-Konfiguration ohne Kommentare (# bis Zeilenende, außer in Anführungszeichen) */
function ohneKommentare(text) {
  return text
    .split('\n')
    .map((zeile) => {
      let inS = null;
      for (let i = 0; i < zeile.length; i++) {
        const c = zeile[i];
        if (inS) { if (c === inS && zeile[i - 1] !== '\\') inS = null; }
        else if (c === '"' || c === "'") inS = c;
        else if (c === '#') return zeile.slice(0, i);
      }
      return zeile;
    })
    .join('\n');
}

/** In welchem location-Block steht die Stelle? (null = direkt im server-Block) */
function locationVon(text, index) {
  let tiefe = 0;
  const offen = [];
  const re = /location\s+([^{]+?)\s*\{|\{|\}/g;
  let m;
  while ((m = re.exec(text)) && m.index < index) {
    if (m[0] === '}') { const o = offen.pop(); if (o) tiefe--; }
    else if (m[1]) { offen.push(m[1].replace(/^=\s*/, '').trim()); tiefe++; }
    else offen.push(null);
  }
  for (let k = offen.length - 1; k >= 0; k--) if (offen[k]) return offen[k];
  return null;
}

/** Erlaubt die CSP-Quelle die Adresse? Nur genaue Ursprünge (mit optionalem Pfad), keine Platzhalter. */
function erlaubt(quelle, url) {
  if (quelle.includes('*')) return false;
  let q;
  try {
    q = new URL(quelle);
  } catch {
    return false;
  }
  if (q.protocol !== url.protocol || q.host !== url.host) return false;
  if (q.pathname === '/' || q.pathname === '') return true;
  // Pfadangabe: Endet sie mit „/“, gilt sie für alles darunter, sonst nur für genau diesen Pfad
  return q.pathname.endsWith('/') ? url.pathname.startsWith(q.pathname) : url.pathname === q.pathname;
}

