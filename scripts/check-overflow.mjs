// Prüft alle Seiten auf horizontales Überlaufen (375 px) und meldet JS-Fehler.
import { chromium } from 'playwright';
import fs from 'node:fs';
const BASE = process.argv[2] || 'http://localhost:4321';
const sitemap = fs.readFileSync('dist/sitemap-0.xml', 'utf8');
const pages = [...sitemap.matchAll(/<loc>https:\/\/www\.tpm-bau\.de([^<]*)<\/loc>/g)].map((m) => m[1]);
pages.push('/gibt-es-nicht/');
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
let probleme = 0;
for (const w of [320, 375, 768]) {
  const page = await browser.newPage({ viewport: { width: w, height: 800 } });
  const errs = [];
  page.on('pageerror', (e) => errs.push(e.message));
  page.on('console', (m) => m.type() === 'error' && errs.push(m.text()));
  for (const p of pages) {
    errs.length = 0;
    await page.goto(BASE + p, { waitUntil: 'networkidle' });
    const res = await page.evaluate((vw) => {
      const out = [];
      document.querySelectorAll('body *').forEach((el) => {
        const r = el.getBoundingClientRect();
        if (r.width === 0) return;
        if (r.right > vw + 1 && getComputedStyle(el).position !== 'fixed') {
          // Elemente innerhalb von overflow-hidden-Containern ignorieren
          let n = el.parentElement, clipped = false;
          while (n && n !== document.body) {
            const o = getComputedStyle(n).overflowX;
            if (o === 'hidden' || o === 'clip' || o === 'auto') { clipped = true; break; }
            n = n.parentElement;
          }
          if (!clipped) out.push(`${el.tagName.toLowerCase()}.${[...el.classList].join('.')} → ${Math.round(r.right)}px`);
        }
      });
      return { sw: document.documentElement.scrollWidth, out: out.slice(0, 5) };
    }, w);
    const errsF = errs.filter((e) => !e.includes('404'));
    if (res.out.length || errsF.length) {
      probleme++;
      console.log(`[${w}] ${p}`, res.out, errsF);
    }
  }
  await page.close();
}
await browser.close();
console.log(probleme ? `${probleme} Probleme` : 'Keine Überläufe, keine JS-Fehler.');
