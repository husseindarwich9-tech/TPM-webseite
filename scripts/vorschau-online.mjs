// Passwortgeschützte Vorschau-Adresse auf Cloudflare Pages (kostenlos), die sich zu einem festen Datum selbst abschaltet.
// Der Schutz sitzt auf dem Server (Pages Function): Ohne Benutzername und Passwort wird keine einzige Datei
// ausgeliefert, auch kein Bild, Skript oder Stil. Nach Ablauf antwortet die Adresse nur noch „Vorschau abgelaufen“.
//
// Aufruf:
//   npm run build && npm run paket:vorschau
//   node scripts/vorschau-online.mjs [--bis 2026-11-25] [--passwort …] [--deploy]
// Ohne --passwort wird ein neues erzeugt. Das Passwort steht nur in der Ausgabe und als Prüfsumme in der Funktion,
// nie im Repository (Ausgabeordner vorschau/online/ ist ignoriert).
// --deploy lädt hoch (wrangler, braucht CLOUDFLARE_API_TOKEN oder einen Schlüssel über den Proxy).
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';

const arg = (n) => {
  const i = process.argv.indexOf('--' + n);
  return i > -1 ? process.argv[i + 1] : undefined;
};
const QUELLE = 'vorschau/webseite';
const ZIEL = 'vorschau/online';
const PROJEKT = arg('projekt') || 'tpm-bau-vorschau';
const NUTZER = arg('nutzer') || 'tpm';
const BIS = arg('bis') || new Date(Date.now() + 14 * 864e5).toISOString().slice(0, 10);
const bisZeit = new Date(BIS + 'T23:59:59+01:00');
if (Number.isNaN(bisZeit.getTime())) throw new Error(`Ungültiges Datum: ${BIS}`);

if (!fs.existsSync(path.join(QUELLE, 'index.html'))) {
  console.error('Kein Vorschau-Paket gefunden. Zuerst „npm run build && npm run paket:vorschau“ ausführen.');
  process.exit(1);
}

// Gut lesbares Passwort (keine verwechselbaren Zeichen), z. B. „Kran-Putz-4827-Dach“
const woerter = ['Kran', 'Putz', 'Dach', 'Wand', 'Fliese', 'Balken', 'Kelle', 'Leiter', 'Ziegel', 'Riegel', 'Profil', 'Gips',
  'Hammer', 'Zange', 'Boden', 'Decke', 'Fenster', 'Rahmen', 'Mörtel', 'Lack'];
const zufall = (n) => crypto.randomInt(n);
const passwort =
  arg('passwort') || `${woerter[zufall(20)]}-${woerter[zufall(20)]}-${1000 + zufall(9000)}-${woerter[zufall(20)]}`;
const salz = crypto.randomBytes(16).toString('hex');
const pruefsumme = crypto.createHash('sha256').update(salz + NUTZER + ':' + passwort).digest('hex');

fs.rmSync(ZIEL, { recursive: true, force: true });
fs.cpSync(QUELLE, path.join(ZIEL, 'public'), { recursive: true });
fs.rmSync(path.join(ZIEL, 'public', '.htaccess'), { force: true });
fs.mkdirSync(path.join(ZIEL, 'functions'), { recursive: true });
fs.writeFileSync(
  path.join(ZIEL, 'functions', '_middleware.js'),
  `// Zugangsschutz der Vorschau: Basic Auth und Ablaufdatum. Läuft auf dem Server, nicht im Browser.
const BIS = ${bisZeit.getTime()};
const SALZ = '${salz}';
const PRUEFSUMME = '${pruefsumme}';
const KOPF = { 'X-Robots-Tag': 'noindex, nofollow', 'Cache-Control': 'no-store', 'Content-Type': 'text/html; charset=utf-8' };
const seite = (titel, text) =>
  '<!doctype html><html lang="de"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">' +
  '<title>' + titel + '</title><body style="margin:0;min-height:100vh;display:grid;place-items:center;background:#0a1626;' +
  'color:#f3f1ec;font:16px/1.5 system-ui,sans-serif;text-align:center;padding:2rem"><div><h1 style="font-size:1.6rem">' +
  titel + '</h1><p>' + text + '</p></div></body></html>';

async function sha256(t) {
  const d = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(t));
  return [...new Uint8Array(d)].map((b) => b.toString(16).padStart(2, '0')).join('');
}
function gleich(a, b) {
  if (a.length !== b.length) return false;
  let x = 0;
  for (let i = 0; i < a.length; i++) x |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return x === 0;
}

export async function onRequest({ request, next }) {
  if (Date.now() > BIS) {
    return new Response(seite('Vorschau abgelaufen', 'Diese Vorschau ist nicht mehr verfügbar.'), { status: 410, headers: KOPF });
  }
  const kopf = request.headers.get('Authorization') || '';
  if (kopf.startsWith('Basic ')) {
    let klar = '';
    try {
      klar = new TextDecoder().decode(Uint8Array.from(atob(kopf.slice(6)), (c) => c.charCodeAt(0)));
    } catch {}
    if (klar && gleich(await sha256(SALZ + klar), PRUEFSUMME)) {
      const antwort = await next();
      const neu = new Response(antwort.body, antwort);
      neu.headers.set('X-Robots-Tag', 'noindex, nofollow');
      neu.headers.set('Cache-Control', 'private, no-store');
      return neu;
    }
  }
  return new Response(seite('Anmeldung erforderlich', 'Bitte mit den erhaltenen Zugangsdaten anmelden.'), {
    status: 401,
    headers: { ...KOPF, 'WWW-Authenticate': 'Basic realm="TPM Bau GmbH", charset="UTF-8"' },
  });
}
`,
);
// Zwischenspeicher für Bilder/Skripte nur privat (sonst könnten geteilte Caches sie ohne Anmeldung ausliefern)
const headers = path.join(ZIEL, 'public', '_headers');
fs.writeFileSync(headers, fs.readFileSync(headers, 'utf8').replaceAll('public, max-age=31536000, immutable', 'private, max-age=86400'));

console.log(`Vorschau vorbereitet in ${ZIEL}/`);
console.log(`  Adresse:    https://${PROJEKT}.pages.dev  (nach dem Hochladen)`);
console.log(`  Benutzer:   ${NUTZER}`);
console.log(`  Passwort:   ${passwort}`);
console.log(`  Gültig bis: ${bisZeit.toLocaleDateString('de-DE', { day: 'numeric', month: 'long', year: 'numeric' })}, danach „Vorschau abgelaufen“`);

if (process.argv.includes('--deploy')) {
  execFileSync('npx', ['--yes', 'wrangler@4.154.0', 'pages', 'deploy', 'public', '--project-name', PROJEKT, '--branch', 'main', '--commit-dirty=true'], {
    cwd: ZIEL,
    stdio: 'inherit',
  });
}
