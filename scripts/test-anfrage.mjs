// End-to-End-Test des Anfrage-Assistenten inkl. Fehlerfällen.
// Baut die Seite mit einer lokalen Test-Webhook-URL nach dist-test/, startet einen Mock-Webhook
// und spielt die Szenarien mit Playwright durch.  Aufruf: npm run test:anfrage
import { chromium } from 'playwright';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';
import sharp from 'sharp';
import { CHROME } from './chrome.mjs';

const HOOK_PORT = 8787;
const SITE_PORT = 8788;
const OUT = 'dist-test';
const EXEC = CHROME;

if (!process.argv.includes('--no-build')) {
  console.log('Baue Testversion …');
  execSync('npx astro build', {
    stdio: 'ignore',
    env: { ...process.env, ASTRO_OUT_DIR: OUT, PUBLIC_ANFRAGE_WEBHOOK_URL: `http://localhost:${HOOK_PORT}/hook` },
  });
}

/* ── Mock-Webhook ── */
let mode = 'ok';
const received = [];
const hook = http.createServer((req, res) => {
  const cors = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Accept',
  };
  if (req.method === 'OPTIONS') return res.writeHead(204, cors).end();
  let body = '';
  req.on('data', (c) => (body += c));
  req.on('end', () => {
    if (mode === 'down') return req.socket.destroy();
    received.push(JSON.parse(body));
    if (mode === '500') return res.writeHead(500, cors).end('kaputt');
    res.writeHead(200, { ...cors, 'Content-Type': 'application/json' }).end('{"ok":true}');
  });
});
await new Promise((r) => hook.listen(HOOK_PORT, r));

/* ── Statischer Server für dist-test ── */
const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.woff2': 'font/woff2', '.png': 'image/png', '.webmanifest': 'application/manifest+json' };
const site = http.createServer((req, res) => {
  let p = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  if (p.endsWith('/')) p += 'index.html';
  const f = path.join(OUT, p);
  if (!fs.existsSync(f)) return res.writeHead(404).end();
  res.writeHead(200, { 'Content-Type': types[path.extname(f)] || 'application/octet-stream' }).end(fs.readFileSync(f));
});
await new Promise((r) => site.listen(SITE_PORT, r));
const BASE = `http://localhost:${SITE_PORT}`;

/* ── Testbilder ── */
const jpg = await sharp({ create: { width: 2400, height: 1600, channels: 3, background: '#6faad6' } }).jpeg().toBuffer();
const png = await sharp({ create: { width: 800, height: 800, channels: 3, background: '#1a63b0' } }).png().toBuffer();
const bild = (n, buf = jpg, mimeType = 'image/jpeg') => ({ name: n, mimeType, buffer: buf });

/* ── Testrahmen ── */
let ok = 0, fail = 0;
const check = (cond, msg) => {
  if (cond) { ok++; console.log('  ✓', msg); } else { fail++; console.log('  ✗', msg); }
};
const browser = await chromium.launch({ executablePath: EXEC });
async function neueSeite(url = '/anfrage/', reducedMotion = 'reduce') {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 }, reducedMotion });
  page.on('pageerror', (e) => { fail++; console.log('  ✗ JS-Fehler:', e.message); });
  await page.goto(BASE + url, { waitUntil: 'networkidle' });
  return page;
}
const aktiverSchritt = (page) => page.$eval('.wz-step.is-active', (el) => el.dataset.step);
const weiter = (page) => page.click('[data-wz-next]');
// wie ein Nutzer auf das sichtbare Kästchen klicken
const zustimmen = async (page) => {
  await page.click('label.wz-check:has(input[name="datenschutz"]) .wz-check__box');
  if (!(await page.isChecked('input[name="datenschutz"]'))) throw new Error('Datenschutz-Kästchen ließ sich nicht anklicken');
};
const fehler = (page, name) => page.$eval(`[data-error-for="${name}"]`, (el) => el.textContent.trim());

async function bisKontakt(page, { kunde = 'privat' } = {}) {
  await page.check(`input[name="kundentyp"][value="${kunde}"]`, { force: true });
  await weiter(page);
  await page.check('input[name="leistungen"][value="trockenbau"]', { force: true });
  await weiter(page);
  await page.fill('#wz-beschreibung', 'Zwei neue Trennwände im Büro, ca. 12 Meter, mit Tür.');
  await page.fill('#wz-plz', '10829');
  await page.check('input[name="dringlichkeit"][value="zeitnah"]', { force: true });
  await weiter(page);
  await weiter(page); // Fotos optional
  await weiter(page); // Termin optional
}

/* 1 · Pflichtfelder und Validierung je Schritt */
console.log('\n1 · Validierung in jedem Schritt');
{
  const page = await neueSeite();
  await weiter(page);
  check((await aktiverSchritt(page)) === '1', 'Schritt 1: ohne Auswahl kein Weiter');
  check((await fehler(page, 'kundentyp')).length > 0, 'Schritt 1: Fehlermeldung sichtbar');
  check(await page.isVisible('.wz-step.is-active [data-wz-summary]'), 'Schritt 1: Fehlerübersicht (role=alert) sichtbar');
  await page.check('input[name="kundentyp"][value="privat"]', { force: true });
  await weiter(page);
  check((await aktiverSchritt(page)) === '2', 'Schritt 1 → 2 nach Auswahl');

  await weiter(page);
  check((await aktiverSchritt(page)) === '2' && (await fehler(page, 'leistungen')).length > 0, 'Schritt 2: ohne Leistung kein Weiter');
  await page.check('input[name="leistungen"][value="malerarbeiten"]', { force: true });
  await page.check('input[name="leistungen"][value="bodenlegearbeiten"]', { force: true });
  await weiter(page);
  check((await aktiverSchritt(page)) === '3', 'Schritt 2 → 3');

  await page.fill('#wz-beschreibung', 'kurz');
  await page.fill('#wz-plz', '108');
  await page.fill('#wz-flaeche', '-5');
  await weiter(page);
  check((await aktiverSchritt(page)) === '3', 'Schritt 3: ungültige Angaben blockieren');
  check((await fehler(page, 'beschreibung')).includes('15'), 'Schritt 3: Beschreibung zu kurz');
  check((await fehler(page, 'plz')).includes('fünfstellig'), 'Schritt 3: PLZ ungültig');
  check((await fehler(page, 'flaeche')).length > 0, 'Schritt 3: Fläche ungültig');
  check((await fehler(page, 'dringlichkeit')).length > 0, 'Schritt 3: Dringlichkeit fehlt');
  check((await page.getAttribute('#wz-plz', 'aria-invalid')) === 'true', 'Schritt 3: aria-invalid gesetzt');
  await page.fill('#wz-beschreibung', 'Wohnzimmer und Flur streichen, danach neuen Vinylboden verlegen.');
  await page.fill('#wz-plz', '10829');
  await page.fill('#wz-flaeche', '45');
  await page.check('input[name="dringlichkeit"][value="akut"]', { force: true });
  check(await page.isVisible('[data-wz-akut]'), 'Schritt 3: Hinweis „direkt anrufen“ bei akutem Notfall');
  await weiter(page);
  check((await aktiverSchritt(page)) === '4', 'Schritt 3 → 4');

  /* Fotos */
  await page.setInputFiles('#wz-fotos', [{ name: 'notiz.txt', mimeType: 'text/plain', buffer: Buffer.from('hallo') }]);
  check((await fehler(page, 'fotos')).includes('kein unterstütztes Bildformat'), 'Fotos: falsches Format abgelehnt');
  await page.setInputFiles('#wz-fotos', [bild('riesig.jpg', Buffer.alloc(16 * 1024 * 1024))]);
  check((await fehler(page, 'fotos')).includes('15 MB'), 'Fotos: zu große Datei abgelehnt');
  await page.setInputFiles('#wz-fotos', [bild('kaputt.jpg', Buffer.from('keinbild'))]);
  await page.waitForTimeout(500);
  check((await fehler(page, 'fotos')).includes('konnte nicht gelesen'), 'Fotos: defekte Datei abgelehnt');
  await page.setInputFiles('#wz-fotos', [1, 2, 3, 4, 5, 6, 7].map((i) => (i % 2 ? bild(`foto${i}.jpg`) : bild(`foto${i}.png`, png, 'image/png'))));
  await page.waitForFunction(() => document.querySelectorAll('.wz-thumbs img').length === 6, null, { timeout: 15000 });
  check((await page.$$('.wz-thumbs img')).length === 6, 'Fotos: 6 Fotos angenommen');
  check((await fehler(page, 'fotos')).includes('höchstens 6'), 'Fotos: 7. Foto mit Hinweis abgelehnt');
  await page.click('.wz-thumbs li:first-child button');
  check((await page.$$('.wz-thumbs img')).length === 5, 'Fotos: Entfernen funktioniert');
  await weiter(page);
  check((await aktiverSchritt(page)) === '5', 'Schritt 4 → 5');

  await page.fill('#wz-datum', '2020-01-01');
  await weiter(page);
  check((await aktiverSchritt(page)) === '5' && (await fehler(page, 'wunschtermin')).includes('Zukunft'), 'Schritt 5: Datum in der Vergangenheit abgelehnt');
  const d = new Date(); d.setDate(d.getDate() + 14);
  await page.fill('#wz-datum', d.toISOString().slice(0, 10));
  await page.check('input[name="zeitfenster"][value="vormittags"]', { force: true });
  await weiter(page);
  check((await aktiverSchritt(page)) === '6', 'Schritt 5 → 6');

  await page.fill('#wz-name', 'Erika Mustermann');
  await page.fill('#wz-email', 'erika@beispiel');
  await page.check('input[name="kontaktweg"][value="telefon"]', { force: true });
  await page.click('[data-wz-submit]');
  check((await fehler(page, 'email')).length > 0, 'Schritt 6: ungültige E-Mail erkannt');
  check((await fehler(page, 'telefon')).includes('anrufen'), 'Schritt 6: Telefon nötig, wenn Rückruf gewünscht');
  check((await fehler(page, 'datenschutz')).length > 0, 'Schritt 6: Datenschutz-Zustimmung fehlt');
  check(!(await page.isVisible('[data-wz-firma]')), 'Schritt 6: Firmenfeld bei Privatkunden ausgeblendet');
  check((await page.textContent('[data-wz-review]')).includes('Malerarbeiten'), 'Schritt 6: Zusammenfassung zeigt Auswahl');

  // Zusammenfassung → „Ändern“ springt zurück
  await page.click('[data-wz-review] button[data-goto="2"]');
  check((await aktiverSchritt(page)) === '2', 'Zusammenfassung: „Ändern“ springt zum Schritt');
  for (let i = 0; i < 4; i++) await weiter(page);

  await page.fill('#wz-email', 'erika@beispiel.de');
  await page.fill('#wz-telefon', '030 123 456 78');
  await zustimmen(page);

  /* 2 · Serverfehler 500 */
  console.log('\n2 · Versandfehler und erneuter Versand');
  await page.waitForTimeout(5200 - 0); // Mindest-Ausfüllzeit sicher überschreiten
  mode = '500';
  received.length = 0;
  await page.click('[data-wz-submit]');
  await page.waitForSelector('[data-wz-send-error]:not([hidden])');
  check(received.length === 1, 'Server 500: Anfrage wurde gesendet');
  check(await page.isVisible('[data-wz-send-error]'), 'Server 500: Fehlermeldung mit Alternativen sichtbar');
  check((await page.getAttribute('[data-wz-mailto]', 'href')).startsWith('mailto:info@tpm-bau.de'), 'Server 500: E-Mail-Alternative vorbereitet');
  check(await page.isVisible('[data-wz-form]'), 'Server 500: Eingaben bleiben erhalten');

  /* 3 · Netzwerkabbruch */
  mode = 'down';
  await page.click('[data-wz-submit]');
  await page.waitForFunction(() => document.querySelector('[data-wz-submit-label]').textContent === 'Anfrage senden');
  check(await page.isVisible('[data-wz-send-error]'), 'Netzwerkabbruch: Fehlermeldung sichtbar');

  /* 4 · Erfolg */
  mode = 'ok';
  received.length = 0;
  await page.click('[data-wz-submit]');
  await page.waitForSelector('[data-wz-done]:not([hidden])');
  check(await page.isVisible('[data-wz-done]'), 'Erfolg: Danke-Seite sichtbar');
  const j = received[0];
  check(j && j.typ === 'anfrage' && j.kundentyp === 'privat', 'JSON: Typ und Kundentyp');
  check(j && j.leistungen.map((l) => l.slug).join() === 'malerarbeiten,bodenlegearbeiten', 'JSON: Leistungen');
  check(j && j.details.plz === '10829' && j.details.flaeche === 45 && j.details.dringlichkeit === 'akut', 'JSON: Details');
  check(j && j.termin.zeitfenster === 'vormittags' && /^\d{4}-\d{2}-\d{2}$/.test(j.termin.wunschtermin), 'JSON: Wunschtermin');
  check(j && j.kontakt.email === 'erika@beispiel.de' && j.kontakt.bevorzugterKontaktweg === 'telefon' && j.kontakt.datenschutzZugestimmt, 'JSON: Kontakt');
  check(j && j.fotos.length === 5 && j.fotos.every((f) => f.dataUrl.startsWith('data:image/jpeg;base64,') && Math.max(f.width, f.height) <= 1600), 'JSON: 5 Fotos, als JPEG auf max. 1600 px verkleinert');
  check(j && j.meta.ausfuellzeitSekunden >= 5, 'JSON: Ausfüllzeit übermittelt');
  check(j && JSON.stringify(j).length < 6 * 1024 * 1024, `JSON: Gesamtgröße ${(JSON.stringify(j).length / 1024).toFixed(0)} KB`);
  await page.close();
}

/* 5 · Spamschutz */
console.log('\n5 · Spamschutz');
{
  received.length = 0;
  const page = await neueSeite();
  await bisKontakt(page);
  await page.fill('#wz-name', 'Bot');
  await page.fill('#wz-email', 'bot@spam.de');
  await zustimmen(page);
  await page.$eval('#wz-website', (el) => (el.value = 'http://spam.example'));
  await page.waitForTimeout(5200);
  await page.click('[data-wz-submit]');
  await page.waitForSelector('[data-wz-done]:not([hidden])');
  check(received.length === 0, 'Honeypot ausgefüllt: scheinbarer Erfolg, aber nichts gesendet');
  await page.close();
}
{
  received.length = 0;
  const page = await neueSeite();
  await bisKontakt(page);
  await page.fill('#wz-name', 'Schnell');
  await page.fill('#wz-email', 'schnell@spam.de');
  await zustimmen(page);
  await page.click('[data-wz-submit]');
  await page.waitForSelector('[data-wz-done]:not([hidden])');
  check(received.length === 0, 'Unter 5 Sekunden ausgefüllt: nichts gesendet');
  await page.close();
}

/* 6 · Vorbelegung + Gewerbe-Pflichtfeld */
console.log('\n6 · Vorbelegung per Link und Gewerbekunde');
{
  received.length = 0;
  const page = await neueSeite('/anfrage/?kunde=gewerbe&leistung=trockenbau', 'no-preference');
  check(await page.isChecked('input[name="kundentyp"][value="gewerbe"]'), 'Kundentyp aus Link vorbelegt');
  check(await page.isChecked('input[name="leistungen"][value="trockenbau"]'), 'Leistung aus Link vorbelegt');
  await bisKontakt(page, { kunde: 'gewerbe' });
  check(await page.isVisible('[data-wz-firma]'), 'Firmenfeld bei Gewerbe sichtbar');
  await page.fill('#wz-name', 'Max Verwalter');
  await page.fill('#wz-email', 'max@hausverwaltung.de');
  await zustimmen(page);
  await page.click('[data-wz-submit]');
  check((await fehler(page, 'firma')).length > 0, 'Firma ist Pflicht bei Gewerbe');
  await page.fill('#wz-firma', 'Muster Hausverwaltung GmbH');
  await page.waitForTimeout(5200);
  await page.click('[data-wz-submit]');
  await page.waitForSelector('[data-wz-done]:not([hidden])');
  check(received[0]?.kontakt.firma === 'Muster Hausverwaltung GmbH', 'JSON: Firma übermittelt (mit aktiven Animationen getestet)');
  await page.close();
}

/* 7 · Kontaktseite (eingebetteter Assistent) */
console.log('\n7 · Assistent auf der Kontaktseite');
{
  const page = await neueSeite('/kontakt/');
  await weiter(page);
  check((await fehler(page, 'kundentyp')).length > 0, 'Kontaktseite: Assistent funktioniert');
  await page.close();
}

/* 8 · Ohne Webhook-URL (normaler Build) */
console.log('\n8 · Ohne eingerichtete Webhook-URL');
if (fs.existsSync('dist/anfrage/index.html')) {
  const html = fs.readFileSync('dist/anfrage/index.html', 'utf8');
  const jsFiles = [...html.matchAll(/src="(\/_astro\/[^"]+\.js)"/g)].map((m) => m[1]);
  const usesTestHook = jsFiles.some((f) => fs.readFileSync('dist' + f, 'utf8').includes(`localhost:${HOOK_PORT}`));
  check(!usesTestHook, 'Produktions-Build enthält keine Test-URL');
}
{
  // Testversion ohne URL simulieren: Webhook-Konstante ist leer → Hinweis + E-Mail-Alternative
  execSync('npx astro build', { stdio: 'ignore', env: { ...process.env, ASTRO_OUT_DIR: OUT, PUBLIC_ANFRAGE_WEBHOOK_URL: '' } });
  received.length = 0;
  const page = await neueSeite();
  await bisKontakt(page);
  await page.fill('#wz-name', 'Erika');
  await page.fill('#wz-email', 'erika@beispiel.de');
  await zustimmen(page);
  await page.waitForTimeout(5200);
  await page.click('[data-wz-submit]');
  await page.waitForSelector('[data-wz-send-error]:not([hidden])');
  check((await page.textContent('[data-wz-send-error-text]')).includes('nicht eingerichtet'), 'Ohne URL: verständlicher Hinweis');
  check((await page.getAttribute('[data-wz-mailto]', 'href')).includes('Trockenbau'), 'Ohne URL: E-Mail-Alternative enthält die Angaben');
  await page.close();
}

await browser.close();
hook.close();
site.close();
fs.rmSync(OUT, { recursive: true, force: true });
console.log(`\nErgebnis: ${ok} bestanden, ${fail} fehlgeschlagen`);
process.exit(fail ? 1 : 0);
