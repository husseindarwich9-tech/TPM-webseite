// Erzeugt vorschau/TPM-Bau-Vorschau.html: die komplette Webseite (alle Seiten) in EINER Datei.
// Schriften, Stile und Skripte sind eingebettet; Links zwischen den Seiten funktionieren über einen kleinen Router.
// Gedacht zum direkten Öffnen in einer App-Vorschau oder per Doppelklick. Voraussetzung: npm run build.
// Aufruf: node scripts/vorschau-einzeln.mjs
import fs from 'node:fs';
import path from 'node:path';

const DIST = 'dist';
const OUT = 'vorschau/TPM-Bau-Vorschau.html';
fs.mkdirSync('vorschau', { recursive: true });

const mime = { '.woff2': 'font/woff2', '.svg': 'image/svg+xml', '.png': 'image/png', '.webp': 'image/webp', '.avif': 'image/avif', '.jpg': 'image/jpeg' };
const dataUri = (f) => `data:${mime[path.extname(f)] || 'application/octet-stream'};base64,${fs.readFileSync(path.join(DIST, f)).toString('base64')}`;
const fontsEinbetten = (css) =>
  css.replace(/url\((['"]?)(\/[^'")]+)\1\)/g, (m, q, u) => (fs.existsSync(path.join(DIST, u)) ? `url(${dataUri(u)})` : m));

// Alle Seiten einsammeln
const dateien = [];
(function walk(d) {
  for (const f of fs.readdirSync(d)) {
    const p = path.join(d, f);
    if (fs.statSync(p).isDirectory()) walk(p);
    else if (f.endsWith('.html')) dateien.push(p);
  }
})(DIST);
const route = (file) => {
  const r = '/' + path.relative(DIST, file).replace(/\\/g, '/').replace(/index\.html$/, '');
  return r === '/404.html' ? '/404/' : r;
};
const istSeite = (p) => fs.existsSync(path.join(DIST, p, 'index.html'));

// Interne Links → Router-Links (#seite:/pfad/?query)
const linksUmschreiben = (html) =>
  html.replace(/href="(\/[^"#]*)"/g, (m, ziel) => {
    const [p, q = ''] = ziel.split('?');
    if (p.startsWith('/_astro/') || !istSeite(p)) return m;
    return `href="#seite:${p}${q ? '?' + q : ''}"`;
  });

const cssLinks = new Set();
const inlineStyles = new Set();
const skripte = new Set();
const seiten = [];

for (const file of dateien) {
  const html = fs.readFileSync(file, 'utf8');
  const head = html.slice(0, html.indexOf('</head>'));
  [...head.matchAll(/<link rel="stylesheet" href="([^"]+)"\s*\/?>/g)].forEach((m) => cssLinks.add(m[1]));
  [...head.matchAll(/<style>([\s\S]*?)<\/style>/g)].forEach((m) => inlineStyles.add(m[1]));
  [...html.matchAll(/<script type="module" src="(\/_astro\/[^"]+\.js)"><\/script>/g)].forEach((m) => {
    if (!/\/page\.[^/]+\.js$/.test(m[1])) skripte.add(m[1]);
  });
  const main = html.match(/<main id="inhalt" tabindex="-1">([\s\S]*?)<\/main>/);
  const titel = (html.match(/<title>([^<]*)<\/title>/) || [])[1] || 'TPM Bau GmbH';
  // Skript-Verweise im Inhalt entfernen (die Skripte werden einmal zentral eingebettet)
  if (main) seiten.push({ route: route(file), titel, inhalt: linksUmschreiben(main[1].replace(/<script type="module" src="[^"]+"><\/script>/g, '')) });
}

// Hülle aus der Startseite
let shell = fs.readFileSync(path.join(DIST, 'index.html'), 'utf8');
const css = [...cssLinks].map((h) => fontsEinbetten(fs.readFileSync(path.join(DIST, h), 'utf8'))).join('\n') + '\n' + [...inlineStyles].map(fontsEinbetten).join('\n');

shell = shell
  .replace(/<link rel="stylesheet"[^>]*>/g, '')
  .replace(/<style>[\s\S]*?<\/style>/g, '')
  .replace('</head>', () => `<style>${css}</style>\n</head>`)
  .replace(/<link rel="(preload|manifest|sitemap|apple-touch-icon)"[^>]*>/g, '')
  .replace(/<link rel="icon" href="\/favicon-32\.png"[^>]*>/g, '')
  .replace(/href="\/favicon\.svg"/, () => `href="${dataUri('/favicon.svg')}"`)
  .replace(/<link rel="canonical"[^>]*>/, '')
  .replace(/<script type="application\/ld\+json">[\s\S]*?<\/script>/g, '')
  .replace('<head>', '<head><meta name="robots" content="noindex, nofollow">')
  .replace(/<script type="module" src="[^"]+"><\/script>/g, '');

const templates = seiten
  .map((s) => `<template data-route="${s.route}" data-titel="${s.titel.replace(/"/g, '&quot;')}">${s.inhalt}</template>`)
  .join('\n');

// Router: wählt die Seite vor dem Start der Skripte aus. Seitenwechsel = Neuladen derselben Datei
// (window.name merkt sich das Ziel), damit alle Animationen sauber neu starten.
const router = `<script>
(function () {
  var P = 'tpm-seite:';
  var ziel = '/';
  try {
    if (window.name && window.name.indexOf(P) === 0) ziel = window.name.slice(P.length);
    else if (location.hash.indexOf('#seite:') === 0) ziel = decodeURIComponent(location.hash.slice(7));
  } catch (e) {}
  var pfad = ziel.split('?')[0];
  window.__tpmSuche = ziel.indexOf('?') > -1 ? ziel.slice(ziel.indexOf('?')) : '';
  var t = document.querySelector('template[data-route="' + pfad + '"]') || document.querySelector('template[data-route="/404/"]');
  var main = document.getElementById('inhalt');
  // Die Startseite steht bereits im Dokument (sichtbar auch ohne JavaScript); andere Seiten ersetzen sie
  if (pfad !== '/' && t) { main.innerHTML = ''; main.appendChild(t.content.cloneNode(true)); }
  document.title = t.getAttribute('data-titel');
  document.querySelectorAll('header a[aria-current]').forEach(function (a) { a.removeAttribute('aria-current'); });
  document.querySelectorAll('header a[href^="#seite:"]').forEach(function (a) {
    var r = a.getAttribute('href').slice(7);
    if (r !== '/' && pfad.indexOf(r) === 0) a.setAttribute('aria-current', 'page');
  });
  try { history.scrollRestoration = 'manual'; } catch (e) {}
  window.scrollTo(0, 0);
  window.addEventListener('click', function (e) {
    var a = e.target.closest && e.target.closest('a[href^="#seite:"]');
    if (!a) return;
    e.preventDefault();
    e.stopImmediatePropagation();
    var neu = a.getAttribute('href').slice(7);
    try { window.name = P + neu; } catch (err) {}
    try { location.reload(); } catch (err) { location.hash = 'seite:' + neu; location.reload(); }
  }, true);
})();
</script>`;

// Hinweis: Ersetzungen immer als Funktion – sonst würden "$"-Zeichen im Code als Ersetzungsmuster gelesen
const start = seiten.find((x) => x.route === '/');
shell = shell.replace(/<main id="inhalt" tabindex="-1">[\s\S]*?<\/main>/, () => `<main id="inhalt" tabindex="-1">${start.inhalt}</main>\n${templates}\n${router}`);
shell = linksUmschreiben(shell);

// Skripte einbetten (Abfrageparameter des Assistenten kommen aus dem Router)
const js = [...skripte]
  .map((src) => {
    let code = fs.readFileSync(path.join(DIST, src), 'utf8').replace(/location\.search/g, '(window.__tpmSuche||location.search)');
    return `<script type="module">${code.replace(/<\/script/gi, '<\\/script')}</script>`;
  })
  .join('\n');
shell = shell.replace('</body>', () => `${js}\n</body>`);

fs.writeFileSync(OUT, shell);
console.log(`${seiten.length} Seiten in ${OUT} (${(fs.statSync(OUT).size / 1024 / 1024).toFixed(1)} MB)`);
