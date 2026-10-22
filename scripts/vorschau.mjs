// Erzeugt eine eigenständige Vorschau in vorschau/: jede Seite als einzelne HTML-Datei mit eingebetteten
// Schriften, Stilen und Skripten. Funktioniert per Doppelklick ohne Server (file://).
// Voraussetzung: npm run build.  Aufruf: npm run vorschau
import fs from 'node:fs';
import path from 'node:path';

const DIST = 'dist';
const OUT = 'vorschau';
fs.rmSync(OUT, { recursive: true, force: true });
fs.mkdirSync(OUT, { recursive: true });

const b64 = (f) => fs.readFileSync(path.join(DIST, f)).toString('base64');
const mime = { '.woff2': 'font/woff2', '.svg': 'image/svg+xml', '.png': 'image/png', '.webp': 'image/webp', '.avif': 'image/avif', '.jpg': 'image/jpeg' };
const dataUri = (f) => `data:${mime[path.extname(f)] || 'application/octet-stream'};base64,${b64(f)}`;

// Pfad einer Seite → flacher Dateiname
const datei = (p) => {
  const clean = p.replace(/^\/|\/$/g, '');
  return clean === '' ? 'index.html' : clean === '404.html' ? '404.html' : `${clean.replace(/\//g, '-')}.html`;
};

const seiten = [];
(function walk(d) {
  for (const f of fs.readdirSync(d)) {
    const p = path.join(d, f);
    if (fs.statSync(p).isDirectory()) walk(p);
    else if (f.endsWith('.html')) seiten.push(p);
  }
})(DIST);

for (const file of seiten) {
  const rel = '/' + path.relative(DIST, file).replace(/index\.html$/, '').replace(/\\/g, '/');
  let html = fs.readFileSync(file, 'utf8');

  // Stylesheets einbetten (inkl. Schriften als data-URI)
  html = html.replace(/<link rel="stylesheet" href="(\/_astro\/[^"]+\.css)"\s*\/?>/g, (_, href) => {
    const css = fs.readFileSync(path.join(DIST, href), 'utf8').replace(/url\((['"]?)(\/[^'")]+)\1\)/g, (m, q, u) =>
      fs.existsSync(path.join(DIST, u)) ? `url(${dataUri(u)})` : m,
    );
    return `<style>${css}</style>`;
  });
  html = html.replace(/<style>([\s\S]*?)<\/style>/g, (m, css) =>
    `<style>${css.replace(/url\((['"]?)(\/fonts\/[^'")]+)\1\)/g, (mm, q, u) => (fs.existsSync(path.join(DIST, u)) ? `url(${dataUri(u)})` : mm))}</style>`,
  );

  // Skripte einbetten; Prefetch-Skript weglassen (braucht einen Server)
  html = html.replace(/<script type="module" src="(\/_astro\/[^"]+\.js)"><\/script>/g, (_, src) => {
    if (/\/page\.[^/]+\.js$/.test(src)) return '';
    const js = fs.readFileSync(path.join(DIST, src), 'utf8').replace(/<\/script/gi, '<\\/script');
    return `<script type="module">${js}</script>`;
  });

  // Kopfzeile aufräumen: Server-Ressourcen entfernen, Favicon einbetten, nicht indexieren
  html = html
    .replace(/<link rel="preload"[^>]*>/g, '')
    .replace(/<link rel="(manifest|sitemap)"[^>]*>/g, '')
    .replace(/<link rel="icon" href="\/favicon-32\.png"[^>]*>/g, '')
    .replace(/<link rel="apple-touch-icon"[^>]*>/g, '')
    .replace(/href="\/favicon\.svg"/, `href="${dataUri('/favicon.svg')}"`)
    .replace('<head>', '<head><meta name="robots" content="noindex, nofollow">');

  // Bilder (falls Fotos vorhanden) einbetten
  html = html.replace(/(src|srcset)="([^"]+)"/g, (m, attr, val) => {
    if (!val.includes('/_astro/')) return m;
    const out = val
      .split(',')
      .map((part) => {
        const [u, w] = part.trim().split(/\s+/);
        return fs.existsSync(path.join(DIST, u)) ? `${dataUri(u)}${w ? ' ' + w : ''}` : part;
      })
      .join(', ');
    return `${attr}="${out}"`;
  });

  // Interne Links auf die flachen Dateien umschreiben
  html = html.replace(/href="(\/[^"#?]*)([?#][^"]*)?"/g, (m, p, rest = '') => {
    if (p.startsWith('/_astro/') || /\.(svg|png|xml|txt|webmanifest)$/.test(p)) return m;
    const ziel = path.join(DIST, p, p.endsWith('.html') ? '' : 'index.html');
    if (!fs.existsSync(ziel) && !fs.existsSync(path.join(DIST, p))) return m;
    return `href="${datei(p)}${rest}"`;
  });

  fs.writeFileSync(path.join(OUT, datei(rel)), html);
}

fs.writeFileSync(
  path.join(OUT, 'LIESMICH.txt'),
  'TPM Bau GmbH – Vorschau der neuen Webseite\n\nindex.html per Doppelklick im Browser öffnen (Chrome, Edge, Firefox oder Safari).\nAlle Seiten sind verlinkt, Animationen laufen, kein Internet nötig.\n\nHinweis: Der Anfrage-Assistent ist in der Vorschau voll bedienbar, sendet aber nichts ab\n(es ist noch keine Webhook-URL eingerichtet) – am Ende erscheint der Hinweis mit E-Mail-Alternative.\n',
);
console.log(`${seiten.length} Seiten nach ${OUT}/ geschrieben.`);
