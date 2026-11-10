// Test der Vorschau-Datei (vorschau/TPM-Bau-Vorschau.html): Sicherheit, Adressen, Datenschutzfenster, Formularentwurf.
// Nimmt die Befunde aus docs/PRUEFBERICHT-ANTWORT.md als Regressionstests auf (nur harmlose Marker, keine Daten).
// Aufruf: npm run vorschau && npm run test:vorschau
import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';
import { CHROME } from './chrome.mjs';

const DATEI = path.resolve(process.argv[2] || 'vorschau/TPM-Bau-Vorschau.html');
if (!fs.existsSync(DATEI)) {
  console.error(`Keine Vorschau unter ${DATEI}. Zuerst „npm run vorschau“ ausführen.`);
  process.exit(1);
}
const URL_ = 'file://' + DATEI;
const browser = await chromium.launch({ executablePath: CHROME });
let ok = 0;
let fail = 0;
const check = (c, m) => {
  c ? ok++ : fail++;
  console.log(c ? '  ✓' : '  ✗', m);
};
const seite = async (p) => (await p.$('#seite')).contentFrame();
const neu = async (hash = '', vp = { width: 1280, height: 900 }) => {
  const p = await browser.newPage({ viewport: vp });
  await p.goto(URL_ + hash);
  await p.waitForTimeout(1800);
  return p;
};
const markerGesetzt = (p) =>
  p.evaluate(() => {
    const fenster = [window, ...[...document.querySelectorAll('iframe')].map((f) => f.contentWindow)];
    return fenster.some((w) => {
      try {
        return w && w.__tpmAuditXss === 1;
      } catch {
        return false;
      }
    });
  });

/* ── 1 · Eingeschleuster Code über die Adresse ── */
console.log('\n1 · Präparierte Adressen');
for (const angriff of [
  '#seite:/?audit=</script><script>parent.__tpmAuditXss=1;window.__tpmAuditXss=1</script>',
  '#seite:/anfrage/?kunde=</script><script>parent.__tpmAuditXss=1</script>',
  '#seite:/anfrage/?leistung=x</script><script>parent.__tpmAuditXss=1</script>',
  '#seite:/"><img src=x onerror="parent.__tpmAuditXss=1">',
  '#seite:/kontakt/#"><img src=x onerror="parent.__tpmAuditXss=1">',
]) {
  const p = await neu(angriff.replace(/ /g, '%20'));
  check(!(await markerGesetzt(p)), `kein eingeschleuster Code: ${angriff.slice(7, 62)}`);
  await p.close();
}
{
  const p = await neu('#seite:/anfrage/?kunde=gewerbe&leistung=trockenbau');
  const f = await seite(p);
  check(
    (await f.isChecked('input[name="kundentyp"][value="gewerbe"]')) && (await f.isChecked('input[name="leistungen"][value="trockenbau"]')),
    'gültige Vorbelegung funktioniert',
  );
  await p.close();
}

/* ── 2 · Nachrichten aus fremden Fenstern, Abschottung, Titel ── */
console.log('\n2 · Fremde Nachrichten und Abschottung');
{
  const p = await neu();
  const vorher = await p.title();
  await p.evaluate(() => {
    const f = document.createElement('iframe');
    f.srcdoc =
      '<script>parent.postMessage({tpmSeite:"/?x=</scr"+"ipt><script>parent.__tpmAuditXss=1</scr"+"ipt>"},"*");parent.postMessage({tpmSeite:"/impressum/"},"*");parent.postMessage({tpmEscape:true},"*");<\/script>';
    document.body.appendChild(f);
  });
  await p.waitForTimeout(1500);
  check(!(await markerGesetzt(p)) && (await p.title()) === vorher, 'Nachrichten aus fremdem Rahmen werden ignoriert');
  const f = await seite(p);
  check(
    (await f.evaluate(() => {
      try {
        return parent.document.title;
      } catch {
        return 'gesperrt';
      }
    })) === 'gesperrt',
    'Seitenrahmen hat keinen Zugriff auf die Hülle',
  );
  check(!/&amp;|&quot;|&lt;/.test(vorher) && vorher.includes('&'), `Titel als Klartext („${vorher.slice(0, 40)}…“)`);
  await p.close();
}

/* ── 3 · Adressen wie auf dem Server ── */
console.log('\n3 · Adressen');
const erwartet = [
  ['#seite:/kontakt', 'Kontakt'],
  ['#seite:/kontakt/index.html', 'Kontakt'],
  ['#seite:/leistungen/trockenbau', 'Trockenbau'],
  ['#seite:/gibt-es-nicht/', 'nicht gefunden'],
  ['#seite:/KONTAKT/', 'nicht gefunden'],
  ['#seite:kontakt/', 'nicht gefunden'],
  ['#seite://evil.example/', 'nicht gefunden'],
  ...['constructor', '__proto__', '/constructor', '/__proto__/', 'toString', '/hasOwnProperty', 'valueOf?kunde=privat'].map((r) => [
    '#seite:' + r,
    'nicht gefunden',
  ]),
  ['#seite:%E0%A4%A', 'Innenausbau'],
];
for (const [hash, teil] of erwartet) {
  const p = await neu(hash);
  const t = await p.title();
  const h1 = await (await seite(p)).evaluate(() => document.querySelector('h1')?.textContent || '');
  check(t.includes(teil) && !/undefined/.test(t + h1), `${hash.padEnd(30)} → ${t.slice(0, 40)}`);
  await p.close();
}
{
  const p = await neu('#seite:/kontakt/#anfrage');
  const top = await (await seite(p)).evaluate(() => Math.round(document.getElementById('anfrage').getBoundingClientRect().top));
  check(top >= 0 && top < 250, `/kontakt/#anfrage springt zum Assistenten (${top} px)`);
  await p.close();
}
{
  // Astro schreibt „&“ in Adressen als „&#38;“: Die Anfrage-Links der Leistungsseiten müssen trotzdem funktionieren
  const p = await neu('#seite:/leistungen/trockenbau/');
  const f = await seite(p);
  const hrefs = await f.$$eval('a[href*="kunde="]', (as) => as.map((a) => a.getAttribute('href')));
  check(hrefs.length >= 2 && hrefs.every((h) => h.startsWith('#seite:/anfrage/?kunde=') && h.includes('&leistung=')), 'Anfrage-Links der Leistungsseiten sind Vorschau-Links');
  await f.click('a[href*="kunde=gewerbe"]');
  await p.waitForTimeout(1800);
  check(await (await seite(p)).isChecked('input[name="kundentyp"][value="gewerbe"]'), '„Als Gewerbekunde anfragen“ öffnet den vorbelegten Assistenten');
  await p.close();
}

/* ── 4 · Datenschutzfenster: Fokus, Escape, Entwurf ── */
console.log('\n4 · Datenschutzfenster');
{
  const p = await neu('#seite:/anfrage/', { width: 390, height: 844 });
  let f = await seite(p);
  await f.click('label:has(input[name="kundentyp"][value="privat"])');
  await f.click('[data-wz-next]');
  await p.waitForTimeout(300);
  await f.click('label:has(input[name="leistungen"][value="malerarbeiten"])');
  await f.click('[data-wz-next]');
  await p.waitForTimeout(300);
  await f.fill('#wz-beschreibung', 'Testentwurf');
  const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==', 'base64');
  await f.setInputFiles('#wz-fotos', [1, 2].map((i) => ({ name: `foto${i}.png`, mimeType: 'image/png', buffer: png })));
  await p.waitForTimeout(800);
  await f.evaluate(() => document.querySelector('a[target="_blank"][href="#seite:/datenschutz/"]').click());
  await p.waitForTimeout(1800);
  check(await p.evaluate(() => !document.getElementById('ueber').hidden), 'Datenschutz öffnet sich als Fenster über dem Formular');
  check(await p.evaluate(() => document.getElementById('seite').inert === true), 'Seite dahinter gesperrt');
  const verteilung = {};
  let ersterFehler = null;
  for (const [taste, n] of [['Tab', 250], ['Shift+Tab', 250]]) {
    for (let i = 1; i <= n; i++) {
      await p.keyboard.press(taste);
      const wo = await p.evaluate(() => {
        const a = document.activeElement;
        return a && document.getElementById('ueber').contains(a) ? 'Fenster' : 'HINTEN: ' + (a ? a.tagName + '#' + a.id : 'nichts');
      });
      verteilung[wo] = (verteilung[wo] || 0) + 1;
      if (!ersterFehler && wo !== 'Fenster') ersterFehler = `${taste} Schritt ${i}: ${wo}`;
    }
  }
  check(!ersterFehler, `500× Tab/Umschalt+Tab: Fokus bleibt im Fenster ${ersterFehler ? '(' + ersterFehler + ')' : ''}`);
  const uf = await (await p.$('#ueber__rahmen')).contentFrame();
  await uf.focus('a');
  await p.keyboard.press('Escape');
  await p.waitForTimeout(500);
  check(await p.evaluate(() => document.getElementById('ueber').hidden), 'Escape mit Fokus im Fensterinhalt schließt das Fenster');
  f = await seite(p);
  check(
    (await f.inputValue('#wz-beschreibung')) === 'Testentwurf' && (await f.$$('[data-wz-thumbs] img')).length === 2,
    'Entwurf (Text und Fotos) danach unverändert',
  );
  await p.close();
}

await browser.close();
console.log(`\nErgebnis: ${ok} bestanden, ${fail} fehlgeschlagen`);
process.exit(fail ? 1 : 0);
