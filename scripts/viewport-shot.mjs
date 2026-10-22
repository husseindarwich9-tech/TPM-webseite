// Hilfsskript: Screenshot des ersten Bildschirms nach Ablauf der Intro-Animation (1440 und 375 px).
import { chromium } from 'playwright';
const url = process.argv[2] || 'http://localhost:4321/';
const out = process.argv[3];
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
for (const [w,h] of [[1440,900],[375,812]]) {
  const p = await browser.newPage({ viewport: { width: w, height: h } });
  const errs=[]; p.on('pageerror', e=>errs.push(e.message)); p.on('console', m=>{ if(m.type()==='error') errs.push(m.text())});
  await p.goto(url, { waitUntil: 'networkidle' });
  await p.waitForTimeout(3500);
  await p.screenshot({ path: `${out}-${w}.png` });
  console.log(w, errs);
  await p.close();
}
await browser.close();
