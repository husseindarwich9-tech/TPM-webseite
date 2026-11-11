// Vorschau-Paket für eine echte Internetadresse (z. B. vorschau.tpm-bau.de oder Netlify), damit die Seite auch
// auf dem Handy gezeigt werden kann. Nimmt den fertigen Build aus dist/ und sperrt ihn für Suchmaschinen
// (robots.txt, noindex in jeder Seite, X-Robots-Tag), weil er noch Platzhalter enthält.
// Ergebnis: vorschau/webseite/ (Ordner) und vorschau/TPM-Bau-Webseite.zip
// Aufruf: npm run build && npm run paket:vorschau [-- --bis JJJJ-MM-TT]
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const QUELLE = 'dist';
const ZIEL = 'vorschau/webseite';
const ZIP = path.resolve('vorschau/TPM-Bau-Webseite.zip');
// Optional: --bis JJJJ-MM-TT schaltet die Vorschau auf Apache/LiteSpeed (z. B. Hostinger) nach diesem Tag ab
const bisArg = process.argv.indexOf('--bis') > -1 ? process.argv[process.argv.indexOf('--bis') + 1] : '';
if (bisArg && !/^\d{4}-\d{2}-\d{2}$/.test(bisArg)) throw new Error(`Ungültiges Datum: ${bisArg} (Format JJJJ-MM-TT)`);
const ablauf = bisArg
  ? `
# Ablaufdatum der Vorschau: ab ${bisArg.split('-').reverse().join('.')} (Folgetag, Serverzeit) nur noch „nicht mehr verfügbar“
<IfModule mod_rewrite.c>
  RewriteEngine On
  RewriteCond %{TIME} >${bisArg.replaceAll('-', '')}235959
  RewriteCond %{REQUEST_URI} !^/abgelaufen\\.html$
  RewriteRule ^ /abgelaufen.html [R=302,L]
</IfModule>
`
  : '';

if (!fs.existsSync(path.join(QUELLE, 'index.html'))) {
  console.error('Kein Build gefunden. Zuerst „npm run build“ ausführen.');
  process.exit(1);
}
fs.rmSync(ZIEL, { recursive: true, force: true });
fs.cpSync(QUELLE, ZIEL, { recursive: true });

// Suchmaschinen aussperren: Die Vorschau darf nicht gefunden werden
fs.writeFileSync(path.join(ZIEL, 'robots.txt'), 'User-agent: *\nDisallow: /\n');
for (const f of fs.readdirSync(ZIEL)) if (/^sitemap.*\.xml$/.test(f)) fs.rmSync(path.join(ZIEL, f));
let seiten = 0;
(function walk(d) {
  for (const f of fs.readdirSync(d)) {
    const p = path.join(d, f);
    if (fs.statSync(p).isDirectory()) walk(p);
    else if (f.endsWith('.html')) {
      const html = fs.readFileSync(p, 'utf8').replace(/<meta name="robots"[^>]*>/g, '');
      if (!html.includes('<head>')) throw new Error(`Kein <head> in ${p}`);
      fs.writeFileSync(p, html.replace('<head>', '<head><meta name="robots" content="noindex, nofollow">'));
      seiten++;
    }
  }
})(ZIEL);

// Apache/LiteSpeed (z. B. Hostinger, IONOS, Strato): Fehlerseite, Sperre, Zwischenspeicher
fs.writeFileSync(
  path.join(ZIEL, '.htaccess'),
  `ErrorDocument 404 /404.html
Options -Indexes
AddDefaultCharset UTF-8${ablauf}
<IfModule mod_headers.c>
  Header set X-Robots-Tag "noindex, nofollow"
  Header set X-Content-Type-Options "nosniff"
  Header set Referrer-Policy "strict-origin-when-cross-origin"
  <FilesMatch "\\.(js|css|woff2|png|svg|webp|avif|jpg)$">
    Header set Cache-Control "public, max-age=31536000, immutable"
  </FilesMatch>
  <FilesMatch "\\.html$">
    Header set Cache-Control "public, max-age=0, must-revalidate"
  </FilesMatch>
</IfModule>
<IfModule mod_mime.c>
  AddType application/manifest+json .webmanifest
</IfModule>
`,
);
fs.writeFileSync(
  path.join(ZIEL, 'abgelaufen.html'),
  '<!doctype html><html lang="de"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">' +
    '<meta name="robots" content="noindex, nofollow"><title>Vorschau nicht mehr verfügbar</title>' +
    '<body style="margin:0;min-height:100vh;display:grid;place-items:center;background:#0a1626;color:#f3f1ec;' +
    'font:16px/1.5 system-ui,sans-serif;text-align:center;padding:2rem"><div><h1 style="font-size:1.6rem">' +
    'Vorschau nicht mehr verfügbar</h1><p>Diese Vorschau ist abgelaufen.</p></div></body></html>\n',
);
// Netlify und Cloudflare Pages
fs.writeFileSync(
  path.join(ZIEL, '_headers'),
  `/*
  X-Robots-Tag: noindex, nofollow
  X-Content-Type-Options: nosniff
  Referrer-Policy: strict-origin-when-cross-origin
/_astro/*
  Cache-Control: public, max-age=31536000, immutable
/fonts/*
  Cache-Control: public, max-age=31536000, immutable
`,
);

fs.rmSync(ZIP, { force: true });
// Inhalt des Ordners direkt ins Archiv (ohne übergeordneten Ordner), damit es im Hauptverzeichnis entpackt werden kann
execFileSync('zip', ['-qr9X', ZIP, '.'], { cwd: ZIEL });
console.log(`${seiten} Seiten, für Suchmaschinen gesperrt → ${ZIEL}/ und ${path.relative('.', ZIP)} (${(fs.statSync(ZIP).size / 1e6).toFixed(1)} MB)`);
