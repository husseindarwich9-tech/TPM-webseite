// Erzeugt Favicons, Logo-PNG und das Social-Media-Vorschaubild (og.png) aus dem Logo.
// Aufruf: node scripts/generate-icons.mjs
import sharp from 'sharp';
import fs from 'node:fs';
import { chromium } from 'playwright';

const mark = fs.readFileSync('public/favicon.svg');
const onInk = (size, pad) =>
  sharp({ create: { width: size, height: size, channels: 4, background: '#0a1626' } })
    .composite([{ input: Buffer.from(mark), top: pad, left: pad, density: 300 }]);

await sharp(mark, { density: 300 }).resize(32, 32).png().toFile('public/favicon-32.png');
for (const [size, file] of [[180, 'apple-touch-icon.png'], [192, 'icon-192.png'], [512, 'icon-512.png']]) {
  const inner = Math.round(size * 0.72);
  const markPng = await sharp(mark, { density: 600 }).resize(inner, inner).png().toBuffer();
  await sharp({ create: { width: size, height: size, channels: 4, background: '#0a1626' } })
    .composite([{ input: markPng, gravity: 'center' }])
    .png()
    .toFile(`public/${file}`);
}
await sharp(fs.readFileSync('public/logo.svg'), { density: 600 }).resize(600).png().toFile('public/logo.png');

// OG-Bild per Browser rendern (nutzt die lokalen Schriften)
const fontUrl = (f) => 'data:font/woff2;base64,' + fs.readFileSync(`public/fonts/${f}`).toString('base64');
const logo = fs.readFileSync('public/logo.svg', 'utf8');
const html = `<!doctype html><html><head><style>
@font-face{font-family:A;src:url(${fontUrl('archivo-var.woff2')});font-weight:100 900;font-stretch:62% 125%}
@font-face{font-family:M;src:url(${fontUrl('montserrat-500.woff2')})}
@font-face{font-family:P;src:url(${fontUrl('plex-mono-400.woff2')})}
*{margin:0;box-sizing:border-box}
body{width:1200px;height:630px;background:#0a1626;color:#f3f1ec;font-family:A;position:relative;overflow:hidden;
background-image:linear-gradient(to right,rgba(243,241,236,.07) 1px,transparent 1px),linear-gradient(to bottom,rgba(243,241,236,.07) 1px,transparent 1px);background-size:90px 90px}
.mark{position:absolute;right:80px;top:56px;width:330px;opacity:.95}
.brand{position:absolute;left:72px;top:64px;display:flex;align-items:center;gap:16px}
.brand svg{width:56px}.n{font-family:M;font-size:28px}.s{font-family:M;font-size:11px;letter-spacing:.2em;margin-top:6px;opacity:.8}
h1{position:absolute;left:72px;bottom:112px;font-size:76px;line-height:.92;font-weight:780;letter-spacing:-.035em}
h1 span{color:#6faad6}
.tag{position:absolute;left:72px;bottom:60px;font-family:P;font-size:16px;letter-spacing:.08em;text-transform:uppercase;color:#a3afc0}
</style></head><body>
<div class="brand">${logo}<div><div class="n">TPM Bau GmbH</div><div class="s">TECHNICAL PROJECT MANAGEMENT</div></div></div>
<div class="mark">${logo}</div>
<h1>Bauen mit Leidenschaft.<br><span>Handeln mit Verantwortung.</span></h1>
<p class="tag">Alle Gewerke aus einer Hand · Berlin</p>
</body></html>`;
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
const page = await browser.newPage({ viewport: { width: 1200, height: 630 } });
await page.setContent(html);
await page.waitForTimeout(300);
await page.screenshot({ path: 'public/og.png' });
await browser.close();
console.log('Icons und og.png erzeugt.');
