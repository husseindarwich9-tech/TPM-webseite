// Erzeugt vorschau/TPM-Bau-Vorschau-Handy.pdf aus den Handy-Screenshots in docs/screenshots/
// (Bauablauf Schritt für Schritt + alle wichtigen Seiten). Aufruf: node scripts/vorschau-pdf.mjs
import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';
import { CHROME } from './chrome.mjs';
import sharp from 'sharp';

const S = 'docs/screenshots';
const b64 = (f) => 'data:image/png;base64,' + fs.readFileSync(path.join(S, f)).toString('base64');
const bau = fs.readdirSync(S).filter((f) => /^bau-390-\d+\.png$/.test(f)).sort();
const schritte = ['Startbildschirm', 'Übergang', 'Entrümpelung', 'Abriss und Entsorgung', 'Elektroinstallation', 'Trockenbau', 'Putz und Spachtel', 'Malerarbeiten', 'Fliesen', 'Boden', 'Tischler', 'Innenausbau / Kleinreparaturen', 'Übergabe'];
const seiten = [
  ['start-375.png', 'Startseite (ganze Seite)'],
  ['leistungen-375.png', 'Leistungen'],
  ['leistungen_malerarbeiten-375.png', 'Leistungsseite: Malerarbeiten'],
  ['gewerbe-375.png', 'Gewerbe & Hausverwaltungen'],
  ['ueber-uns-375.png', 'Über uns'],
  ['kontakt-375.png', 'Kontakt'],
].filter(([f]) => fs.existsSync(path.join(S, f)));
const assistent = ['1', '2', '3-fehler', '4', '5', '6'].map((n) => `anfrage-schritt-${n}-375.png`).filter((f) => fs.existsSync(path.join(S, f)));

const css = `
@page { size: 210mm 297mm; margin: 0 }
body { margin: 0; font-family: Archivo, Arial, sans-serif; color: #0a1626 }
.blatt { width: 210mm; height: 297mm; box-sizing: border-box; padding: 12mm; page-break-after: always; background: #f3f1ec; overflow: hidden }
.dunkel { background: #0a1626; color: #f3f1ec }
h1 { font-size: 34pt; line-height: 1; margin: 30mm 0 6mm; letter-spacing: -0.02em }
h2 { font-size: 15pt; margin: 0 0 5mm }
p { font-size: 11pt; line-height: 1.45; max-width: 150mm }
.raster { display: grid; grid-template-columns: repeat(3, 1fr); gap: 5mm }
.raster figure { margin: 0 } .raster img { width: 100%; border: 1px solid #c9c4ba; display: block }
figcaption { font-size: 8.5pt; margin-top: 1.5mm; color: #4b5567 }
.lang { display: flex; gap: 5mm; height: 255mm } .lang img { width: 58mm; height: 255mm; object-fit: cover; object-position: top; border: 1px solid #c9c4ba }
.mono { font-family: monospace; font-size: 8pt; letter-spacing: .1em; text-transform: uppercase; color: #6faad6 }`;
let html = `<html><head><style>${css}</style></head><body>`;
html += `<section class="blatt dunkel"><p class="mono">TPM Bau GmbH · Vorschau</p><h1>Die neue Webseite<br>auf dem Handy</h1><p>Diese PDF zeigt die Seite so, wie sie auf einem Smartphone aussieht: zuerst den Bauablauf der Startseite Schritt für Schritt (beim Scrollen saniert sich der Raum Gewerk für Gewerk), dann die wichtigsten Seiten und den Anfrage-Assistenten. Animationen und Bedienung erleben Sie in der echten Seite im Browser.</p><img src="${'data:image/png;base64,' + fs.readFileSync('public/og.png').toString('base64')}" style="width:100%;margin-top:14mm"></section>`;
for (let i = 0; i < bau.length; i += 6) {
  html += `<section class="blatt"><h2>Startseite: ein Raum, zwölf Gewerke (${i / 6 + 1}/${Math.ceil(bau.length / 6)})</h2><div class="raster">` +
    bau.slice(i, i + 6).map((f, k) => `<figure><img src="${b64(f)}"><figcaption>${String(i + k + 1).padStart(2, '0')} · ${schritte[i + k] || ''}</figcaption></figure>`).join('') + `</div></section>`;
}
for (const [f, t] of seiten) {
  // lange Seite in Spalten-Ausschnitte teilen (3 je Blatt), bis die ganze Seite abgebildet ist
  const { width, height } = await sharp(path.join(S, f)).metadata();
  const hoeheMm = (height / width) * 58;
  const spalten = Math.ceil(hoeheMm / 255);
  const src = b64(f);
  for (let start = 0; start < spalten; start += 3) {
    const teil = Math.floor(start / 3) + 1;
    const gesamt = Math.ceil(spalten / 3);
    html += `<section class="blatt"><h2>${t}${gesamt > 1 ? ` (${teil}/${gesamt})` : ''}</h2><div class="lang">` +
      Array.from({ length: Math.min(3, spalten - start) }, (_, j) => start + j)
        .map((k) => `<div style="width:58mm;height:255mm;overflow:hidden;border:1px solid #c9c4ba"><img src="${src}" style="width:58mm;height:auto;border:0;margin-top:-${k * 255}mm;object-fit:initial"></div>`)
        .join('') + `</div></section>`;
  }
}
html += `<section class="blatt"><h2>Anfrage-Assistent</h2><div class="raster">` + assistent.map((f, k) => `<figure><img src="${b64(f)}"><figcaption>Schritt ${f.match(/schritt-([^-]+)/)[1]}${f.includes('fehler') ? ' (mit Fehlermeldungen)' : ''}</figcaption></figure>`).join('') + `</div></section>`;
html += '</body></html>';

const browser = await chromium.launch({ executablePath: CHROME });
const page = await browser.newPage();
await page.setContent(html, { waitUntil: 'load' });
fs.mkdirSync('vorschau', { recursive: true });
await page.pdf({ path: 'vorschau/TPM-Bau-Vorschau-Handy.pdf', format: 'A4', printBackground: true });
await browser.close();
console.log('PDF:', (fs.statSync('vorschau/TPM-Bau-Vorschau-Handy.pdf').size / 1024 / 1024).toFixed(1), 'MB');
