// Screenshots des Bauablaufs auf der Startseite an mehreren Scroll-Positionen → Ausgabeordner
import { chromium } from 'playwright';
import { CHROME } from './chrome.mjs';
const BASE = process.argv[2] || 'http://127.0.0.1:4321';
const OUT = process.argv[3] || 'docs/screenshots';
const browser = await chromium.launch({ executablePath: CHROME });
for (const [w, h, tag] of [[1440, 900, '1440'], [390, 844, '390']]) {
  const page = await browser.newPage({ viewport: { width: w, height: h }, ...(w < 500 ? { isMobile: true, hasTouch: true, deviceScaleFactor: 1 } : {}) });
  const errs = [];
  page.on('pageerror', (e) => errs.push(e.message));
  await page.goto(BASE + '/', { waitUntil: 'networkidle' });
  await page.waitForTimeout(2200);
  const stops = [0, 0.09, 0.17, 0.25, 0.33, 0.42, 0.5, 0.58, 0.66, 0.74, 0.82, 0.9, 1.0];
  const total = h * 3.8;
  for (const [i, f] of stops.entries()) {
    await page.evaluate((y) => window.scrollTo(0, y), Math.round(f * total));
    await page.waitForTimeout(1300);
    await page.screenshot({ path: `${OUT}/bau-${tag}-${String(i).padStart(2, '0')}.png` });
  }
  console.log(tag, errs.length ? errs : 'keine Fehler');
  await page.close();
}
await browser.close();
