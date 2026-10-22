// Screenshots der einzelnen Schritte des Anfrage-Assistenten → docs/screenshots/anfrage-schritt-*.png
import { chromium } from 'playwright';
import sharp from 'sharp';
import { CHROME } from './chrome.mjs';
const BASE = process.argv[2] || 'http://localhost:4321';
const browser = await chromium.launch({ executablePath: CHROME });
const foto = await sharp({ create: { width: 1200, height: 900, channels: 3, background: '#a9cdea' } }).jpeg().toBuffer();
for (const [w, h] of [[1440, 1000], [375, 812]]) {
  const page = await browser.newPage({ viewport: { width: w, height: h }, reducedMotion: 'reduce' });
  await page.goto(BASE + '/anfrage/?leistung=malerarbeiten', { waitUntil: 'networkidle' });
  const shot = async (n) => {
    await page.waitForTimeout(250);
    const el = await page.$('[data-wizard]');
    await el.scrollIntoViewIfNeeded();
    await page.screenshot({ path: `docs/screenshots/anfrage-schritt-${n}-${w}.png`, fullPage: false });
  };
  const next = () => page.click('[data-wz-next]');
  await page.check('input[name="kundentyp"][value="privat"]', { force: true });
  await shot('1');
  await next();
  await page.check('input[name="leistungen"][value="bodenlegearbeiten"]', { force: true });
  await shot('2');
  await next();
  await next(); // Fehlerzustand zeigen
  await shot('3-fehler');
  await page.fill('#wz-beschreibung', 'Wohnzimmer und Flur streichen, danach neuen Vinylboden verlegen.');
  await page.fill('#wz-plz', '10829');
  await page.check('input[name="dringlichkeit"][value="zeitnah"]', { force: true });
  await next();
  await page.setInputFiles('#wz-fotos', [1, 2, 3].map((i) => ({ name: `foto${i}.jpg`, mimeType: 'image/jpeg', buffer: foto })));
  await page.waitForFunction(() => document.querySelectorAll('.wz-thumbs img').length === 3);
  await shot('4');
  await next();
  await shot('5');
  await next();
  await page.fill('#wz-name', 'Erika Mustermann');
  await page.fill('#wz-email', 'erika@beispiel.de');
  await page.click('label.wz-check:has(input[name="datenschutz"]) .wz-check__box');
  await page.evaluate(() => document.querySelector('[data-wz-review]').scrollIntoView());
  await page.waitForTimeout(200);
  await page.screenshot({ path: `docs/screenshots/anfrage-schritt-6-${w}.png` });
  await page.close();
}
await browser.close();
console.log('Assistent-Screenshots erstellt.');
