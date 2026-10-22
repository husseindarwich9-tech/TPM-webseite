// Screenshots aller Seiten auf 375, 768 und 1440 px Breite → docs/screenshots/
// Aufruf: node scripts/screenshots.mjs [basis-url] [pfad-filter]
import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';

const BASE = process.argv[2] || 'http://localhost:4321';
const FILTER = process.argv[3] || '';
const OUT = path.resolve('docs/screenshots');
const EXEC = fs.existsSync('/opt/pw-browsers/chromium-1194/chrome-linux/chrome')
  ? '/opt/pw-browsers/chromium-1194/chrome-linux/chrome'
  : undefined;

const sitemap = fs.readFileSync('dist/sitemap-0.xml', 'utf8');
let pages = [...sitemap.matchAll(/<loc>https:\/\/www\.tpm-bau\.de([^<]*)<\/loc>/g)].map((m) => m[1]);
pages.push('/diese-seite-gibt-es-nicht/');
if (FILTER) pages = pages.filter((p) => p.includes(FILTER));

const widths = (process.env.WIDTHS || '375,768,1440').split(',').map(Number);
fs.mkdirSync(OUT, { recursive: true });
// GPU-Rasterung aus: Headless-Chromium stellt sehr große Schriften in Ganzseiten-Screenshots sonst gelegentlich zu klein dar
const browser = await chromium.launch({ executablePath: EXEC, args: ['--disable-gpu', '--disable-gpu-rasterization'] });

for (const w of widths) {
  const ctx = await browser.newContext({
    viewport: { width: w, height: w === 375 ? 812 : w === 768 ? 1024 : 900 },
    deviceScaleFactor: 1,
    // Ganzseiten-Screenshots im statischen Modus (reduzierte Bewegung): alle Inhalte sichtbar,
    // keine gepinnten Abschnitte. Animationen prüft scripts/viewport-shot.mjs.
    reducedMotion: 'reduce',
  });
  for (const p of pages) {
    // pro Seite ein frischer Tab: verhindert Darstellungsfehler bei Serien-Screenshots
    const page = await ctx.newPage();
    await page.goto(BASE + p, { waitUntil: 'networkidle' });
    await page.waitForTimeout(500);
    // Für den Ganzseiten-Screenshot alle Animationen in den Endzustand bringen
    await page.addStyleTag({ content: '[data-reveal],[data-hero-fade],.sw>span{opacity:1!important;transform:none!important} [data-reveal-clip]{clip-path:none!important} svg[data-draw]{opacity:1!important}' });
    await page.waitForTimeout(400);
    const name = (p === '/' ? 'start' : p.replace(/^\/|\/$/g, '').replace(/\//g, '_')) + `-${w}.png`;
    // Statt fullPage: Fenster auf volle Seitenhöhe setzen (Hero behält die ursprüngliche Bildschirmhöhe)
    const vh = page.viewportSize().height;
    await page.addStyleTag({ content: `.hero{min-height:${vh}px!important}` });
    const docH = await page.evaluate(() => document.documentElement.scrollHeight);
    await page.setViewportSize({ width: w, height: docH });
    await page.waitForTimeout(400);
    await page.screenshot({ path: path.join(OUT, name) });
    console.log('✓', name);
    await page.close();
  }
  await ctx.close();
}
await browser.close();
