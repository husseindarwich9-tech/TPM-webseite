// Handy-Test: alle Seiten auf echten Handy-Größen mit Touch (statt Maus), inkl. Menü, Schnellkontakt-Leiste,
// Wischen, Querformat und Drehen. Voraussetzung: gebaute Seite läuft (npm run serve).
// Aufruf: node scripts/test-handy.mjs [http://localhost:4322]
import { chromium } from 'playwright';
import fs from 'node:fs';
import { CHROME } from './chrome.mjs';

const BASE = process.argv[2] || 'http://localhost:4322';
const sitemap = fs.readFileSync('dist/sitemap-0.xml', 'utf8');
const seiten = [...sitemap.matchAll(/<loc>https:\/\/www\.tpm-bau\.de([^<]*)<\/loc>/g)].map((m) => m[1]);
seiten.push('/gibt-es-nicht/');

// Gängige Handys (Breite × Höhe in CSS-Pixeln), dazu Querformat
const GERAETE = [
  { name: 'iPhone SE (1. Gen.)', width: 320, height: 568, dpr: 2 },
  { name: 'iPhone SE / 8', width: 375, height: 667, dpr: 2 },
  { name: 'iPhone 14/15', width: 390, height: 844, dpr: 3 },
  { name: 'Android (Pixel)', width: 412, height: 915, dpr: 2.6 },
  { name: 'iPhone Querformat', width: 844, height: 390, dpr: 3 },
];
const UA =
  'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1';

let ok = 0;
let fail = 0;
const check = (cond, msg) => {
  if (cond) ok++;
  else {
    fail++;
    console.log('  ✗', msg);
  }
  return cond;
};

const browser = await chromium.launch({ executablePath: CHROME });
const handy = async (g) => {
  const ctx = await browser.newContext({
    viewport: { width: g.width, height: g.height },
    deviceScaleFactor: g.dpr,
    isMobile: true,
    hasTouch: true,
    userAgent: UA,
  });
  const page = await ctx.newPage();
  const fehler = [];
  page.on('pageerror', (e) => fehler.push(e.message));
  page.on('console', (m) => m.type() === 'error' && !m.text().includes('404') && fehler.push(m.text()));
  return { ctx, page, fehler };
};

/** Wischen wie mit dem Finger: aufsetzen, ziehen, loslassen (echte Touch-Ereignisse) */
const wischen = async (page, dy) => {
  const cdp = await page.context().newCDPSession(page);
  const vp = page.viewportSize();
  const x = Math.round(vp.width / 2);
  const start = Math.round(vp.height * (dy > 0 ? 0.8 : 0.25));
  const weg = Math.sign(dy) * Math.min(Math.abs(dy), Math.round(vp.height * 0.6));
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y: start }] });
  for (let k = 1; k <= 12; k++) {
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x, y: start - Math.round((weg * k) / 12) }] });
  }
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await page.waitForTimeout(120);
  await cdp.detach();
};

/* ── 1 · Alle Seiten auf allen Handys ── */
console.log(`\n1 · ${seiten.length} Seiten × ${GERAETE.length} Handys: Fehler, Überlaufen, Leiste, Schriftgrößen`);
for (const g of GERAETE) {
  const { ctx, page, fehler } = await handy(g);
  for (const p of seiten) {
    fehler.length = 0;
    await page.goto(BASE + p, { waitUntil: 'networkidle' });
    await page.waitForTimeout(300);
    const r = await page.evaluate(() => {
      const vw = innerWidth;
      const bar = document.querySelector('.mobile-bar');
      const barSichtbar = !!bar && getComputedStyle(bar).display !== 'none' && bar.getBoundingClientRect().height > 0;
      // Eingabefelder unter 16 px lösen auf dem iPhone ungewolltes Hineinzoomen aus
      const kleineFelder = [...document.querySelectorAll('input:not([type=checkbox]):not([type=radio]):not([type=hidden]):not([type=file]), select, textarea')]
        .filter((el) => el.offsetParent && parseFloat(getComputedStyle(el).fontSize) < 16)
        .map((el) => el.name || el.id);
      // Bedienelemente kleiner als 24 × 24 px (WCAG 2.2) – Fließtext-Links ausgenommen
      const winzig = [...document.querySelectorAll('button, .btn, [role=button], .mobile-bar a, .menu-btn, input[type=submit]')]
        .filter((el) => el.offsetParent)
        .filter((el) => { const b = el.getBoundingClientRect(); return b.width < 24 || b.height < 24; })
        .map((el) => el.className || el.tagName);
      return { sw: document.documentElement.scrollWidth, vw, barSichtbar, kleineFelder, winzig };
    });
    const tag = `[${g.name}] ${p}`;
    check(r.sw <= r.vw + 1, `${tag}: seitlich überlaufend (${r.sw} > ${r.vw})`);
    check(fehler.length === 0, `${tag}: JS-Fehler ${JSON.stringify(fehler.slice(0, 2))}`);
    check(r.kleineFelder.length === 0, `${tag}: Eingabefelder unter 16 px ${r.kleineFelder}`);
    check(r.winzig.length === 0, `${tag}: zu kleine Bedienelemente ${JSON.stringify(r.winzig.slice(0, 3))}`);
    if (g.width < 900) check(r.barSichtbar, `${tag}: Schnellkontakt-Leiste fehlt`);
  }
  await ctx.close();
  console.log(`  ✓ ${g.name} (${g.width}×${g.height})`);
}

/* ── 2 · Ende der Seite nicht von der Leiste verdeckt ── */
console.log('\n2 · Seitenende nicht von der Schnellkontakt-Leiste verdeckt');
{
  const { ctx, page } = await handy(GERAETE[2]);
  for (const p of ['/', '/kontakt/', '/leistungen/trockenbau/', '/impressum/']) {
    await page.goto(BASE + p, { waitUntil: 'networkidle' });
    await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
    await page.waitForTimeout(1200);
    const r = await page.evaluate(() => {
      const bar = document.querySelector('.mobile-bar').getBoundingClientRect();
      const letzte = [...document.querySelectorAll('footer a, footer p, footer small')].filter((e) => e.offsetParent).pop();
      return { barTop: bar.top, letzteUnten: letzte.getBoundingClientRect().bottom };
    });
    check(r.letzteUnten <= r.barTop + 1, `${p}: letzter Footer-Inhalt liegt unter der Leiste (${Math.round(r.letzteUnten)} > ${Math.round(r.barTop)})`);
  }
  await ctx.close();
  console.log('  ✓ geprüft');
}

/* ── 3 · Menü und Schnellkontakt per Fingertipp ── */
console.log('\n3 · Menü und Leiste per Fingertipp');
{
  const { ctx, page, fehler } = await handy(GERAETE[2]);
  await page.goto(BASE + '/', { waitUntil: 'networkidle' });
  await page.tap('[data-menu-toggle]');
  await page.waitForTimeout(700);
  check(await page.$eval('[data-menu-toggle]', (b) => b.getAttribute('aria-expanded') === 'true'), 'Menü öffnet sich nicht');
  check(await page.$eval('[data-menu]', (m) => !m.hidden && m.getBoundingClientRect().height > 300), 'Menü nicht sichtbar');
  const vorher = await page.evaluate(() => scrollY);
  await wischen(page, 400);
  await page.waitForTimeout(400);
  check((await page.evaluate(() => scrollY)) === vorher, 'Seite scrollt hinter dem offenen Menü weiter');
  await page.tap('[data-menu-toggle]');
  await page.waitForTimeout(700);
  check(await page.$eval('[data-menu]', (m) => m.hidden || getComputedStyle(m).visibility === 'hidden' || m.getBoundingClientRect().height === 0), 'Menü schließt sich nicht');
  // Menüpunkt antippen führt zur Seite
  await page.tap('[data-menu-toggle]');
  await page.waitForTimeout(700);
  await Promise.all([page.waitForURL('**/karriere/'), page.tap('[data-menu] a[href="/karriere/"]')]);
  check(page.url().endsWith('/karriere/'), 'Menüpunkt „Karriere“ führt nicht zur Seite');
  // Menü nach dem Scrollen: muss den ganzen Bildschirm füllen und bedienbar sein
  for (const seite of ['/', '/leistungen/trockenbau/', '/karriere/']) {
    await page.goto(BASE + seite, { waitUntil: 'networkidle' });
    for (let i = 0; i < 6; i++) await wischen(page, 500);
    await wischen(page, -150); // kurz hoch: Kopfzeile erscheint
    await page.waitForTimeout(600);
    await page.tap('[data-menu-toggle]');
    await page.waitForTimeout(900);
    const r = await page.evaluate(() => {
      const m = document.querySelector('[data-menu]').getBoundingClientRect();
      const a = document.querySelector('[data-menu] a[href="/leistungen/"]').getBoundingClientRect();
      const oben = document.elementFromPoint(a.x + 20, a.y + a.height / 2);
      return { hoehe: Math.round(m.height), vh: innerHeight, trifft: oben?.closest('a')?.getAttribute('href') };
    });
    check(r.hoehe >= r.vh - 1, `${seite}: Menü nach dem Scrollen nur ${r.hoehe} px hoch statt ${r.vh}`);
    check(r.trifft === '/leistungen/', `${seite}: Fingertipp auf „Leistungen“ im Menü trifft ${r.trifft}`);
    await Promise.all([page.waitForURL('**/leistungen/', { timeout: 5000 }).catch(() => {}), page.tap('[data-menu] a[href="/leistungen/"]')]);
    check(page.url().endsWith('/leistungen/'), `${seite}: Menüpunkt „Leistungen“ nach dem Scrollen ohne Wirkung`);
  }
  // Leiste: richtige Ziele
  const ziele = await page.$$eval('.mobile-bar a', (as) => as.map((a) => a.getAttribute('href')));
  check(ziele.some((h) => h.startsWith('tel:')), 'Leiste: Anrufen fehlt');
  check(ziele.some((h) => h.startsWith('mailto:')), 'Leiste: E-Mail fehlt');
  check(ziele.some((h) => h.startsWith('/anfrage/')), 'Leiste: Anfrage fehlt');
  await Promise.all([page.waitForURL('**/anfrage/**'), page.tap('.mobile-bar a[href^="/anfrage/"]')]);
  check(page.url().includes('/anfrage/'), 'Leiste: „Anfrage“ öffnet den Assistenten nicht');
  // Gewerk-Kachel antippen
  await page.goto(BASE + '/', { waitUntil: 'networkidle' });
  await page.$eval('[data-gewerke]', (el) => el.scrollIntoView());
  await page.waitForTimeout(800);
  await Promise.all([page.waitForURL('**/leistungen/trockenbau/'), page.tap('.gewerk[href="/leistungen/trockenbau/"]')]);
  check(page.url().endsWith('/leistungen/trockenbau/'), 'Kachel „Trockenbau“ führt nicht zur Seite');
  // Antippen unmittelbar nach dem Wischen darf nicht verloren gehen
  await page.goto(BASE + '/', { waitUntil: 'networkidle' });
  await page.$eval('[data-gewerke]', (el) => el.scrollIntoView({ block: 'end' }));
  await page.waitForTimeout(600);
  await wischen(page, 120);
  // Wie ein Mensch: warten, bis die Seite nach dem Wischen zur Ruhe kommt, dann sofort tippen
  for (let alt = -1, i = 0; i < 40; i++) {
    const y = await page.evaluate(() => scrollY);
    if (y === alt) break;
    alt = y;
    await page.waitForTimeout(50);
  }
  // eine Kachel, die gerade mitten im Bildschirm liegt
  const kachel = await page.$$eval('[data-gewerke] .gewerk', (as) => {
    const mitte = innerHeight / 2;
    const a = as.reduce((best, el) => { const r = el.getBoundingClientRect(); const d = Math.abs(r.top + r.height / 2 - mitte); return d < best.d ? { el, d } : best; }, { el: as[0], d: Infinity }).el;
    const r = a.getBoundingClientRect();
    return { x: r.x + r.width / 2, y: r.y + r.height / 2, href: a.getAttribute('href') };
  });
  await Promise.all([page.waitForURL('**' + kachel.href, { timeout: 4000 }).catch(() => {}), page.touchscreen.tap(kachel.x, kachel.y)]);
  check(page.url().endsWith(kachel.href), 'Antippen einer Kachel direkt nach dem Wischen geht verloren');
  check(fehler.length === 0, `JS-Fehler: ${JSON.stringify(fehler.slice(0, 2))}`);
  await ctx.close();
  console.log('  ✓ geprüft');
}

/* ── 4 · Wischen: flüssig bei Handy-Rechenleistung ── */
console.log('\n4 · Wischen über ganze Seiten (CPU auf Handy-Niveau gedrosselt)');
for (const p of ['/', '/leistungen/malerarbeiten/', '/karriere/', '/anfrage/']) {
  const { ctx, page, fehler } = await handy(GERAETE[2]);
  await page.goto(BASE + p, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1500);
  const cdp = await ctx.newCDPSession(page);
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
  await page.evaluate(() => {
    window.__f = [];
    window.__lt = [];
    let last = performance.now();
    const loop = (t) => { window.__f.push(t - last); last = t; requestAnimationFrame(loop); };
    requestAnimationFrame(loop);
    new PerformanceObserver((l) => l.getEntries().forEach((e) => window.__lt.push(e.duration))).observe({ type: 'longtask' });
  });
  // Wischen, bis das Seitenende erreicht ist (höchstens 80-mal)
  for (let i = 0; i < 80; i++) {
    await wischen(page, 700);
    if (await page.evaluate(() => scrollY + innerHeight >= document.documentElement.scrollHeight - 5)) break;
  }
  await page.waitForTimeout(800);
  const r = await page.evaluate(() => {
    const f = window.__f.slice(2);
    return { bilder: f.length, ruckler: f.filter((x) => x > 50).length, lang: window.__lt.filter((x) => x > 100).length, unten: Math.round(scrollY + innerHeight) >= document.documentElement.scrollHeight - 5 };
  });
  check(r.unten, `${p}: Seitenende per Wischen nicht erreicht`);
  check(r.ruckler <= 3, `${p}: ${r.ruckler} Ruckler über 50 ms`);
  check(r.lang === 0, `${p}: ${r.lang} Blockaden über 100 ms`);
  check(fehler.length === 0, `${p}: JS-Fehler ${JSON.stringify(fehler.slice(0, 2))}`);
  console.log(`  ✓ ${p}: ${r.bilder} Bilder, ${r.ruckler} Ruckler`);
  await ctx.close();
}

/* ── 5 · Drehen (Hoch- ↔ Querformat) ── */
console.log('\n5 · Drehen: Hochformat → Querformat → Hochformat');
{
  const { ctx, page, fehler } = await handy(GERAETE[2]);
  for (const p of ['/', '/leistungen/fliesenlegearbeiten/', '/anfrage/']) {
    await page.goto(BASE + p, { waitUntil: 'networkidle' });
    await wischen(page, 1200);
    for (const vp of [{ width: 844, height: 390 }, { width: 390, height: 844 }]) {
      await page.setViewportSize(vp);
      await page.waitForTimeout(700);
      const sw = await page.evaluate(() => document.documentElement.scrollWidth);
      check(sw <= vp.width + 1, `${p} nach Drehen auf ${vp.width}×${vp.height}: überlaufend (${sw})`);
    }
  }
  check(fehler.length === 0, `JS-Fehler: ${JSON.stringify(fehler.slice(0, 2))}`);
  await ctx.close();
  console.log('  ✓ geprüft');
}

/* ── 6 · Hoch und runter wischen: Was im Bild ist, ist sichtbar ── */
console.log('\n6 · Hoch und runter wischen: nichts erscheint verzögert');
for (const p of ['/', '/leistungen/trockenbau/', '/ueber-uns/', '/gewerbe/']) {
  const { ctx, page, fehler } = await handy(GERAETE[2]);
  await page.goto(BASE + p, { waitUntil: 'networkidle' });
  await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight / 2));
  await page.waitForTimeout(800);
  const unsichtbar = new Set();
  const pruefe = async () =>
    (await page.evaluate(() =>
      [...document.querySelectorAll('main *, footer *')]
        .filter((e) => e.children.length === 0 && (e.textContent || '').trim().length > 2)
        .filter((e) => { const r = e.getBoundingClientRect(); return r.bottom > 80 && r.top < innerHeight - 90 && r.height > 0; })
        // wechselndes Gewerk-Schild und Illustrationen (Bauraum) blenden absichtlich über
        .filter((e) => !e.closest('.text-rotate, svg'))
        // Gesamtdeckkraft (alle Eltern multipliziert) unter 50 %: noch nicht oder kaum sichtbar.
        // Bewusst helle Texte (60–80 %) zählen nicht.
        .filter((e) => { let o = 1; for (let n = e; n && n !== document.body; n = n.parentElement) o *= +getComputedStyle(n).opacity; return o < 0.5; })
        .map((e) => e.textContent.trim().slice(0, 30)),
    )).forEach((t) => unsichtbar.add(t));
  for (let i = 0; i < 10; i++) { await wischen(page, -350); await page.waitForTimeout(200); await pruefe(); }
  for (let i = 0; i < 16; i++) { await wischen(page, 350); await page.waitForTimeout(200); await pruefe(); }
  // Laufband und wechselndes Gewerk blenden absichtlich weich über
  const echt = [...unsichtbar].filter((t) => !/Investment|Five Guys|Apleona|talyo|Capera|Tattersall|GRR|Asset|WGBG/.test(t));
  check(echt.length === 0, `${p}: beim Wischen noch unsichtbar im Bild: ${JSON.stringify(echt.slice(0, 4))}`);
  check(fehler.length === 0, `${p}: JS-Fehler ${JSON.stringify(fehler.slice(0, 2))}`);
  await ctx.close();
}
console.log('  ✓ geprüft');

/* ── 7 · Zurück-Taste führt an dieselbe Stelle ── */
console.log('\n7 · Gewerk antippen, dann „Zurück“: wieder bei den Gewerken');
{
  const { ctx, page } = await handy(GERAETE[2]);
  await page.goto(BASE + '/', { waitUntil: 'networkidle' });
  await page.$eval('[data-gewerke]', (g) => window.scrollTo(0, g.getBoundingClientRect().top + scrollY - 100));
  await page.waitForTimeout(1200);
  const vorher = await page.evaluate(() => Math.round(scrollY));
  await Promise.all([page.waitForURL('**/malerarbeiten/'), page.tap('.gewerk[href="/leistungen/malerarbeiten/"]')]);
  await page.waitForTimeout(800);
  await page.goBack({ waitUntil: 'load' });
  await page.waitForTimeout(1500);
  const nachher = await page.evaluate(() => Math.round(scrollY));
  check(Math.abs(nachher - vorher) < 40, `Nach „Zurück“ bei ${nachher} statt ${vorher} (Gewerke)`);
  await ctx.close();
  console.log('  ✓ geprüft');
}

await browser.close();
console.log(`\nErgebnis: ${ok} bestanden, ${fail} fehlgeschlagen`);
process.exit(fail ? 1 : 0);
