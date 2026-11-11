// Präsentationsmaterial ohne Code: ein PDF mit Bildern der Seiten (Rechner und Handy) und zwei Videos vom
// Durchklicken. Damit kann sich die Firma die Seite ansehen, bekommt aber keine Datei, mit der sich eine Webseite
// betreiben ließe. Jedes Bild und jedes Video trägt den Hinweis „Entwurf“.
// Die Videos sind eine Bildschirmaufnahme des Browsers in echter Zeit; gescrollt wird weich in der Seite selbst.
// Aufruf: npm run build && npm run praesentation  →  vorschau/praesentation/
import { chromium } from 'playwright';
import sharp from 'sharp';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawn, execFileSync } from 'node:child_process';
import { CHROME } from './chrome.mjs';

const ZIEL = 'vorschau/praesentation';
const PORT = 4340;
const BASIS = `http://localhost:${PORT}`;
const FPS = 30;
const nurTeil = process.argv[2]; // optional: pdf | video-rechner | video-handy

if (!fs.existsSync('dist/index.html')) {
  console.error('Kein Build gefunden. Zuerst „npm run build“ ausführen.');
  process.exit(1);
}
fs.mkdirSync(ZIEL, { recursive: true });
const server = spawn('node', ['scripts/serve.mjs', String(PORT)], { stdio: 'ignore' });
for (let i = 0; i < 50; i++) {
  try {
    if ((await fetch(BASIS + '/')).ok) break;
  } catch {}
  await new Promise((r) => setTimeout(r, 100));
}
const browser = await chromium.launch({ executablePath: CHROME });
const stand = new Date().toLocaleDateString('de-DE', { day: 'numeric', month: 'long', year: 'numeric' });

try {
  if (!nurTeil || nurTeil === 'pdf') await pdf();
  if (!nurTeil || nurTeil === 'video-rechner') await videoRechner();
  if (!nurTeil || nurTeil === 'video-handy') await videoHandy();
} finally {
  await browser.close();
  server.kill();
}

/* ══════════════ PDF ══════════════ */
async function pdf() {
  const rechner = [
    ['/', 'Startseite'],
    ['/leistungen/', 'Leistungen'],
    ['/leistungen/trockenbau/', 'Leistung: Trockenbau'],
    ['/leistungen/elektroinstallation/', 'Leistung: Elektroinstallation'],
    ['/gewerbe/', 'Gewerbe & Hausverwaltungen'],
    ['/ueber-uns/', 'Über uns'],
    ['/karriere/', 'Karriere & Ausbildung'],
    ['/partner/', 'Partner'],
    ['/faq/', 'Häufige Fragen'],
    ['/kontakt/', 'Kontakt'],
    ['/anfrage/', 'Anfrage-Assistent'],
  ];
  const handy = [
    ['/', 'Startseite', 99],
    ['menue', 'Menü', 1],
    ['/leistungen/trockenbau/', 'Leistung: Trockenbau', 4],
    ['/kontakt/', 'Kontakt', 4],
    ['/anfrage/', 'Anfrage-Assistent', 4],
  ];
  const seiten = []; // { titel, art: 'rechner' | 'handy', bilder: [base64] }

  // Rechner: ganze Seite aufnehmen, in bildschirmgroße Abschnitte teilen (Bewegung aus: alles im Endzustand)
  const ctxR = await browser.newContext({ viewport: { width: 1440, height: 900 }, reducedMotion: 'reduce' });
  const pR = await ctxR.newPage();
  for (const [route, titel] of rechner) {
    await laden(pR, route);
    const png = await pR.screenshot({ fullPage: true });
    const teile = await schneiden(png, 900, 1, 74);
    teile.forEach((b, i) => seiten.push({ titel: `${titel}${teile.length > 1 ? ` (${i + 1}/${teile.length})` : ''}`, art: 'rechner', bilder: [b] }));
    console.log(`PDF · Rechner · ${titel}: ${teile.length} Abschnitt(e)`);
  }
  await ctxR.close();

  // Handy: Abschnitte in Bildschirmhöhe, vier nebeneinander pro PDF-Seite
  const ctxH = await browser.newContext({
    viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, reducedMotion: 'reduce',
  });
  const pH = await ctxH.newPage();
  for (const [route, titel, max] of handy) {
    let teile;
    if (route === 'menue') {
      await laden(pH, '/');
      await pH.click('[data-menu-toggle]');
      await pH.waitForTimeout(400);
      teile = [await jpeg(await pH.screenshot(), 70)];
    } else {
      await laden(pH, route);
      teile = (await schneiden(await pH.screenshot({ fullPage: true }), 844 * 2, 1, 68)).slice(0, max);
    }
    for (let i = 0; i < teile.length; i += 4) {
      const n = Math.ceil(teile.length / 4);
      seiten.push({ titel: `Handy · ${titel}${n > 1 ? ` (${i / 4 + 1}/${n})` : ''}`, art: 'handy', bilder: teile.slice(i, i + 4) });
    }
    console.log(`PDF · Handy · ${titel}: ${teile.length} Bildschirm(e)`);
  }
  await ctxH.close();

  const logo = fs.readFileSync('dist/logo.svg', 'utf8');
  const inhalt = [];
  seiten.forEach((s, i) => {
    const name = s.titel.replace(/ \(\d+\/\d+\)$/, '');
    if (!inhalt.find((x) => x.name === name)) inhalt.push({ name, seite: i + 2 });
  });
  const gesamt = seiten.length + 1;
  const kopf = (titel, nr) =>
    `<header><b>TPM Bau GmbH · Neue Webseite</b><span>${esc(titel)}</span><span>Entwurf · Seite ${nr} von ${gesamt}</span></header>`;
  const fuss = '<footer>Entwurf, nur zur Ansicht. Inhalte mit [PLATZHALTER] werden mit Ihren Angaben ergänzt. Weitergabe und Nutzung nur nach Absprache.</footer>';
  const html = `<!doctype html><html lang="de"><head><meta charset="utf-8"><title>TPM Bau GmbH – Neue Webseite (Entwurf)</title><style>
    @page { size: A4 landscape; margin: 0; }
    * { box-sizing: border-box; }
    body { margin: 0; font: 11px/1.4 Arial, Helvetica, sans-serif; color: #0a1626; }
    .seite { width: 297mm; height: 210mm; padding: 8mm 10mm 6mm; display: grid; grid-template-rows: auto 1fr auto; gap: 4mm;
      position: relative; overflow: hidden; page-break-after: always; background: #fff; }
    .seite:last-child { page-break-after: auto; }
    header { display: flex; justify-content: space-between; gap: 8mm; border-bottom: 0.3mm solid #1b6dc1; padding-bottom: 2mm; font-size: 10px; }
    header span:last-child { color: #1b6dc1; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em; }
    footer { font-size: 8.5px; color: #5b6470; }
    .bild { display: flex; justify-content: center; align-items: center; gap: 5mm; min-height: 0; }
    .bild img { max-width: 100%; max-height: 100%; box-shadow: 0 0 0 0.25mm #c9ced6; display: block; }
    .bild--handy img { max-width: calc((100% - 15mm) / 4); }
    .marke { position: absolute; inset: 0; display: grid; place-items: center; pointer-events: none; }
    .marke span { transform: rotate(-24deg); font: 800 120px/1 Arial, sans-serif; letter-spacing: 0.12em; color: rgba(27, 109, 193, 0.07); }
    .titel { background: #0a1626; color: #f3f1ec; grid-template-rows: 1fr auto; padding: 22mm 24mm 14mm; }
    .titel svg { width: 34mm; height: auto; }
    .titel h1 { font-size: 34px; margin: 10mm 0 3mm; letter-spacing: -0.01em; }
    .titel p { font-size: 14px; margin: 0; color: #c6d3e3; }
    .titel ol { columns: 2; margin: 10mm 0 0; padding-left: 5mm; font-size: 12px; color: #f3f1ec; }
    .titel li { margin: 0 0 1.6mm; }
    .titel li span { color: #99c3ed; }
    .titel footer { color: #99c3ed; }
  </style></head><body>
  <section class="seite titel"><div>${logo}<h1>Neue Webseite – Entwurf zur Ansicht</h1>
    <p>TPM Bau GmbH · Technical Project Management · Stand: ${stand}</p>
    <ol>${inhalt.map((x) => `<li>${esc(x.name)} <span>· Seite ${x.seite}</span></li>`).join('')}</ol></div>${fuss}
    <div class="marke"><span>ENTWURF</span></div></section>
  ${seiten
    .map(
      (s, i) => `<section class="seite">${kopf(s.titel, i + 2)}<div class="bild bild--${s.art}">${s.bilder
        .map((b) => `<img src="data:image/jpeg;base64,${b}" alt="">`)
        .join('')}</div>${fuss}<div class="marke"><span>ENTWURF</span></div></section>`,
    )
    .join('\n')}
  </body></html>`;
  const p = await browser.newPage();
  await p.setContent(html, { waitUntil: 'load' });
  const datei = path.join(ZIEL, 'TPM-Bau-Webseite-Entwurf.pdf');
  await p.pdf({ path: datei, format: 'A4', landscape: true, printBackground: true, preferCSSPageSize: true });
  await p.close();
  console.log(`PDF: ${datei} (${gesamt} Seiten, ${(fs.statSync(datei).size / 1e6).toFixed(1)} MB)`);
}

async function laden(p, route) {
  await p.goto(BASIS + route, { waitUntil: 'networkidle' });
  await p.evaluate(() => document.fonts.ready);
  await p.waitForTimeout(600);
}
async function jpeg(png, q) {
  return (await sharp(png).jpeg({ quality: q, mozjpeg: true }).toBuffer()).toString('base64');
}
// Ganze Seite in Abschnitte der Höhe h teilen; ein sehr kurzer Rest wird an den letzten Abschnitt angehängt
async function schneiden(png, h, _f, q) {
  const { width, height } = await sharp(png).metadata();
  const teile = [];
  for (let y = 0; y < height; y += h) {
    let hoehe = Math.min(h, height - y);
    if (height - (y + hoehe) > 0 && height - (y + hoehe) < h * 0.25) hoehe = height - y;
    teile.push(
      (await sharp(png).extract({ left: 0, top: y, width, height: hoehe }).jpeg({ quality: q, mozjpeg: true }).toBuffer()).toString('base64'),
    );
    if (y + hoehe >= height) break;
  }
  return teile;
}
function esc(t) {
  return String(t).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
}

/* ══════════════ Videos ══════════════ */
// Hinweis „Entwurf“ in jedem Bild (Handy: über der unteren Leiste)
function MARKE(handy) {
  return `(() => {
  const setze = () => {
    if (document.getElementById('tpm-entwurf')) return;
    const d = document.createElement('div');
    d.id = 'tpm-entwurf';
    d.textContent = 'Entwurf';
    d.style.cssText = 'position:fixed;right:14px;${handy ? 'bottom:80px' : 'bottom:16px'};z-index:2147483647;pointer-events:none;' +
      'font:700 12px/1 system-ui,sans-serif;letter-spacing:.14em;text-transform:uppercase;color:#f3f1ec;' +
      'background:rgba(10,22,38,.78);border:1px solid rgba(243,241,236,.3);padding:8px 12px';
    document.documentElement.appendChild(d);
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', setze); else setze();
})()`;
}

async function aufnahme(ctx, name, groesse, ablauf) {
  const ordner = fs.mkdtempSync(path.join(os.tmpdir(), 'tpm-video-'));
  const p = await ctx.newPage();
  const cdp = await ctx.newCDPSession(p);
  // Bildschirmaufnahme des Browsers in echter Zeit: Jedes gezeichnete Bild kommt mit Zeitstempel an
  const bilder = []; // { datei, t } oder { pause: t }
  let laeuft = false;
  cdp.on('Page.screencastFrame', ({ data, metadata, sessionId }) => {
    cdp.send('Page.screencastFrameAck', { sessionId }).catch(() => {});
    if (!laeuft) return;
    const datei = path.join(ordner, String(bilder.length).padStart(5, '0') + '.jpg');
    fs.writeFileSync(datei, Buffer.from(data, 'base64'));
    bilder.push({ datei, t: metadata.timestamp });
  });
  const start = async () => {
    await cdp.send('Page.startScreencast', { format: 'jpeg', quality: 90, maxWidth: groesse.width, maxHeight: groesse.height, everyNthFrame: 1 });
    laeuft = true;
    // Ein erstes Bild erzwingen, auch wenn sich gerade nichts bewegt
    await p.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));
  };
  const stopp = async () => {
    laeuft = false;
    bilder.push({ pause: Date.now() / 1000 });
    await cdp.send('Page.stopScreencast').catch(() => {});
  };
  const halten = (s) => p.waitForTimeout(s * 1000);
  // Weich scrollen in der Seite selbst (langsam anfahren und abbremsen, im Takt des Bildschirms)
  const scrollen = (bis, s) =>
    p.evaluate(
      ([bis, ms]) =>
        new Promise((fertig) => {
          const von = scrollY;
          const ziel = Math.max(0, Math.min(bis, document.documentElement.scrollHeight - innerHeight));
          const t0 = performance.now();
          const schritt = (t) => {
            const k = Math.min(1, (t - t0) / ms);
            const e = k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2;
            scrollTo(0, Math.round(von + (ziel - von) * e));
            if (k < 1) requestAnimationFrame(schritt);
            else fertig();
          };
          requestAnimationFrame(schritt);
        }),
      [bis, s * 1000],
    );
  // Seitenwechsel: Laden wird nicht aufgenommen, die Aufnahme setzt bei der fertigen Seite wieder ein
  const oeffnen = async (route) => {
    if (laeuft) await stopp();
    await p.goto(BASIS + route, { waitUntil: 'networkidle' });
    await p.evaluate(() => document.fonts.ready);
    await p.waitForTimeout(2200);
    await start();
  };
  const y = (sel, versatz = 0) => p.evaluate(([s, v]) => document.querySelector(s).getBoundingClientRect().top + scrollY + v, [sel, versatz]);
  await ablauf({ p, halten, scrollen, oeffnen, y });
  await halten(0.3);
  await stopp();
  await p.close();

  // Bilder mit ihrer tatsächlichen Dauer zusammensetzen, dann gleichmäßig 30 Bilder pro Sekunde
  const liste = [];
  let dauer = 0;
  for (let i = 0; i < bilder.length; i++) {
    const b = bilder[i];
    if (!b.datei) continue;
    const naechstes = bilder[i + 1];
    const d = naechstes ? Math.max(0.001, (naechstes.t ?? naechstes.pause) - b.t) : 1 / FPS;
    dauer += d;
    liste.push(`file '${b.datei}'`, `duration ${d.toFixed(4)}`);
  }
  const letzte = bilder.filter((b) => b.datei).at(-1);
  liste.push(`file '${letzte.datei}'`);
  const listeDatei = path.join(ordner, 'liste.txt');
  fs.writeFileSync(listeDatei, liste.join('\n'));
  const datei = path.join(ZIEL, name);
  execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'concat', '-safe', '0', '-i', listeDatei,
    '-vf', `fps=${FPS},scale=${groesse.width}:${groesse.height}:flags=lanczos`, '-c:v', 'libx264', '-preset', 'slow', '-crf', '20',
    '-pix_fmt', 'yuv420p', '-movflags', '+faststart', datei]);
  fs.rmSync(ordner, { recursive: true, force: true });
  const n = bilder.filter((b) => b.datei).length;
  console.log(`Video: ${datei} (${dauer.toFixed(0)} s, ${n} aufgenommene Bilder ≈ ${(n / dauer).toFixed(0)} pro Sekunde, ${(fs.statSync(datei).size / 1e6).toFixed(1)} MB)`);
}

async function videoRechner() {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  await ctx.addInitScript(MARKE(false));
  await aufnahme(ctx, 'TPM-Bau-Webseite-Rechner.mp4', { width: 1440, height: 900 }, async ({ p, halten, scrollen, oeffnen, y }) => {
    await oeffnen('/');
    await halten(3.5);
    const hoehe = await p.evaluate(() => document.documentElement.scrollHeight);
    await scrollen(await y('[data-gewerke]', -120), 3.5);
    await halten(2.5);
    await scrollen(await y('.audiences', -40), 2.5);
    await halten(2);
    await scrollen(await y('.process', -40), 3);
    await halten(0.5);
    await scrollen(await y('.process', 1300), 6);
    await halten(1);
    await scrollen(hoehe, 4);
    await halten(2);
    // Eine Leistungsseite: das Gewerk bei der Arbeit
    await oeffnen('/leistungen/trockenbau/');
    await halten(2.5);
    await scrollen(await y('svg[data-raum]', -140), 2.5);
    await halten(5);
    // Anfrage-Assistent: die ersten Schritte
    await oeffnen('/anfrage/');
    await halten(2);
    await p.click('label:has(input[name="kundentyp"][value="privat"])');
    await halten(1.2);
    await p.click('[data-wz-next]');
    await halten(1.5);
    await p.click('label:has(input[name="leistungen"][value="malerarbeiten"])');
    await halten(0.6);
    await p.click('label:has(input[name="leistungen"][value="bodenlegearbeiten"])');
    await halten(1.5);
    await p.click('[data-wz-next]');
    await halten(2.5);
  });
  await ctx.close();
}

async function videoHandy() {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  await ctx.addInitScript(MARKE(true));
  await aufnahme(ctx, 'TPM-Bau-Webseite-Handy.mp4', { width: 780, height: 1688 }, async ({ p, halten, scrollen, oeffnen, y }) => {
    await oeffnen('/');
    await halten(3);
    await scrollen(await y('[data-gewerke]', -90), 4);
    await halten(2);
    await scrollen(await y('.audiences', -70), 3);
    await halten(1.5);
    await scrollen(await y('.process', -70), 3.5);
    await scrollen(await y('.process', 2200), 7);
    await halten(1);
    const hoehe = await p.evaluate(() => document.documentElement.scrollHeight);
    await scrollen(hoehe, 4);
    await halten(1.5);
    await scrollen(0, 3);
    await halten(1);
    await p.click('[data-menu-toggle]');
    await halten(2.5);
    await p.click('[data-menu-toggle]');
    await halten(0.8);
    await oeffnen('/leistungen/trockenbau/');
    await halten(2);
    await scrollen(await y('svg[data-raum]', -100), 2.5);
    await halten(4.5);
  });
  await ctx.close();
}
