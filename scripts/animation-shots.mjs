// Screenshots von Animations- und Interaktionszuständen → docs/screenshots/animation-*.png
import { chromium } from 'playwright';
import { CHROME } from './chrome.mjs';
const BASE = process.argv[2] || 'http://localhost:4321';
const browser = await chromium.launch({ executablePath: CHROME });
const out = (n) => `docs/screenshots/animation-${n}.png`;

// Desktop
const d = await browser.newPage({ viewport: { width: 1440, height: 900 } });
await d.goto(BASE + '/', { waitUntil: 'networkidle' });
await d.waitForTimeout(600);
await d.screenshot({ path: out('hero-intro-1440-0.6s') });
await d.waitForTimeout(2800);
await d.screenshot({ path: out('hero-fertig-1440') });

// Mega-Menü
await d.hover('[data-mega] .nav__link');
await d.waitForTimeout(600);
await d.screenshot({ path: out('megamenue-1440') });
await d.mouse.move(700, 600);
await d.waitForTimeout(400);

// Leistungsverzeichnis mit Maus-Vorschau
const scrollTo = async (sel, offset = 0) => {
  await d.evaluate(([s, o]) => { const el = document.querySelector(s); window.scrollTo(0, el.getBoundingClientRect().top + window.scrollY + o); }, [sel, offset]);
  await d.waitForTimeout(1600);
};
await scrollTo('[data-index]', -150);
const row = await d.$('[data-index-row="fliesenlegearbeiten"]');
const box = await row.boundingBox();
await d.mouse.move(box.x + 300, box.y + box.height / 2, { steps: 8 });
await d.waitForTimeout(1200);
await d.screenshot({ path: out('leistungen-hover-1440') });
await d.mouse.move(10, 10);

// Gepinnter Werte-Abschnitt in der Mitte
await scrollTo('[data-hscroll]', 0);
await d.mouse.wheel(0, 1400);
await d.waitForTimeout(1800);
await d.screenshot({ path: out('werte-horizontal-1440') });

// Ablauf mit wachsender Linie
await scrollTo('[data-progress]', -300);
await d.screenshot({ path: out('ablauf-1440') });
await d.close();

// Mobil: Menü
const m = await browser.newPage({ viewport: { width: 375, height: 812 }, hasTouch: true, isMobile: true });
await m.goto(BASE + '/', { waitUntil: 'networkidle' });
await m.waitForTimeout(3200);
await m.screenshot({ path: out('hero-fertig-375') });
await m.click('[data-menu-toggle]');
await m.waitForTimeout(600);
await m.screenshot({ path: out('menue-375') });
await m.close();
await browser.close();
console.log('Animations-Screenshots erstellt.');
