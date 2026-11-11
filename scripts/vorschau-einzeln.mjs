// Erzeugt vorschau/TPM-Bau-Vorschau.html: die komplette Webseite (alle Seiten) in EINER Datei.
// Schriften, Stile und Skripte sind eingebettet. Gedacht zum direkten Öffnen in einer App-Vorschau oder per
// Doppelklick. Voraussetzung: npm run build. Aufruf: node scripts/vorschau-einzeln.mjs
//
// Aufbau: Die Datei ist eine kleine Hülle mit einem Rahmen (iframe). Jede Seite wird beim Anklicken als eigenes,
// frisches Dokument in den Rahmen geschrieben (srcdoc). So starten alle Skripte und Animationen je Seite neu,
// ohne dass die Datei neu geladen werden muss (das klappt in eingebetteten App-Vorschauen oft nicht).
import fs from 'node:fs';
import path from 'node:path';

const DIST = 'dist';
const OUT = 'vorschau/TPM-Bau-Vorschau.html';
fs.mkdirSync('vorschau', { recursive: true });

const mime = { '.woff2': 'font/woff2', '.svg': 'image/svg+xml', '.png': 'image/png', '.webp': 'image/webp', '.avif': 'image/avif', '.jpg': 'image/jpeg' };
const dataUri = (f) => `data:${mime[path.extname(f)] || 'application/octet-stream'};base64,${fs.readFileSync(path.join(DIST, f)).toString('base64')}`;
const dateienEinbetten = (text) =>
  text.replace(/url\((['"]?)(\/[^'")]+)\1\)/g, (m, _q, u) => (fs.existsSync(path.join(DIST, u)) ? `url(${dataUri(u)})` : m));

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

// Interne Links → Vorschau-Links (#seite:/pfad/?query)
// Achtung: Astro schreibt „&“ in Adressen als „&#38;“. Erst entschlüsseln, sonst wird die Adresse am „#“ abgeschnitten.
const linksUmschreiben = (html) =>
  html.replace(/href="(\/[^"]*)"/g, (m, roh) => {
    const ziel = roh.replace(/&#38;|&amp;/g, '&');
    const [vorAnker, anker = ''] = ziel.split('#');
    const [p, q = ''] = vorAnker.split('?');
    if (p.startsWith('/_astro/') || !istSeite(p)) return m;
    const neu = `#seite:${p}${q ? '?' + q : ''}${anker ? '#' + anker : ''}`;
    return `href="${neu.replace(/&/g, '&amp;')}"`;
  });

// Skriptteile (auch die React-Inseln) laden sich gegenseitig nach. Über file:// blockiert der Browser das.
// Deshalb bekommt jedes Teil einen festen Namen (tpm/…) und wird per Import-Map als data:-URL eingebettet.
const teilName = (datei) => `tpm/${datei}`;
const importeUmschreiben = (code) =>
  code
    .replace(/(from|import)\s*"\.\/([^"]+\.js)"/g, (_m, kw, f) => `${kw}"${teilName(f)}"`)
    .replace(/import\(\s*"\.\/([^"]+\.js)"\s*\)/g, (_m, f) => `import("${teilName(f)}")`);
const importMap = { imports: {} };
for (const f of fs.readdirSync(path.join(DIST, '_astro')).filter((x) => x.endsWith('.js'))) {
  // Abfrageparameter (z. B. für den Anfrage-Assistenten) kommen aus der Vorschau, nicht aus der Adresse
  const code = importeUmschreiben(
    fs.readFileSync(path.join(DIST, '_astro', f), 'utf8').replace(/location\.search/g, '(window.__tpmSuche||location.search)'),
  );
  importMap.imports[teilName(f)] = `data:text/javascript;base64,${Buffer.from(code).toString('base64')}`;
}

const entitaetenAufloesen = (t) =>
  t.replace(/&(amp|lt|gt|quot|#39|#x27);/g, (_m, e) => ({ amp: '&', lt: '<', gt: '>', quot: '"', '#39': "'", '#x27': "'" })[e]);

const cssLinks = new Set();
const inlineStyles = new Set();
const seiten = [];
let kopf = '';

for (const file of dateien) {
  const html = fs.readFileSync(file, 'utf8');
  const head = html.slice(html.indexOf('<head>') + 6, html.indexOf('</head>'));
  [...head.matchAll(/<link rel="stylesheet" href="([^"]+)"\s*\/?>/g)].forEach((m) => cssLinks.add(m[1]));
  [...head.matchAll(/<style>([\s\S]*?)<\/style>/g)].forEach((m) => inlineStyles.add(m[1]));
  // Titel als Klartext (im HTML steht z. B. „&amp;“); beim Einsetzen wird er wieder maskiert
  const titel = entitaetenAufloesen((html.match(/<title>([^<]*)<\/title>/) || [])[1] || 'TPM Bau GmbH');
  if (route(file) === '/') kopf = head;
  const body = html
    .slice(html.indexOf('<body>') + 6, html.lastIndexOf('</body>'))
    // Prefetch-Skript wird in der Vorschau nicht gebraucht
    .replace(/<script type="module" src="\/_astro\/page\.[^"]+\.js"><\/script>/g, '')
    .replace(/<script type="module" src="\/_astro\/([^"]+\.js)"><\/script>/g, (_m, f) => `<script type="module">import "${teilName(f)}";</script>`)
    .replace(/(component-url|renderer-url)="\/_astro\/([^"]+\.js)"/g, (_m, attr, f) => `${attr}="${teilName(f)}"`);
  seiten.push({ route: route(file), titel, body: dateienEinbetten(linksUmschreiben(body)) });
}

// Gemeinsamer Kopf für alle Seiten (Stile mit eingebetteten Schriften, Import-Map, Animations-Weiche)
const css = [...cssLinks].map((h) => fs.readFileSync(path.join(DIST, h), 'utf8')).join('\n') + '\n' + [...inlineStyles].join('\n');
kopf = kopf
  .replace(/<link[^>]*>/g, '')
  .replace(/<script type="module" src="[^"]+"><\/script>/g, '')
  .replace(/<style>[\s\S]*?<\/style>/g, '')
  .replace(/<title>[^<]*<\/title>/, '')
  .replace(/<meta (name="description"|property="og:[^"]*"|name="twitter:[^"]*")[^>]*>/g, '')
  .replace(/<script type="application\/ld\+json">[\s\S]*?<\/script>/g, '');
const gemeinsam = {
  kopf: `<script type="importmap">${JSON.stringify(importMap)}</script><style>${dateienEinbetten(css)}</style>${kopf}`,
};

// Steuerung innerhalb jeder Seite: Klicks auf Vorschau-Links an die Hülle melden.
// Links mit target="_blank" (z. B. Datenschutz im Anfrage-Assistenten) und Klicks mit Strg/Cmd/Umschalt oder der
// mittleren Maustaste öffnen die Seite in einem Fenster ÜBER der aktuellen. Die aktuelle Seite bleibt dabei
// unverändert, ein halb ausgefülltes Formular geht nicht verloren.
const seitenSkript = `<script>
document.addEventListener('click', function (e) {
  var a = e.target.closest && e.target.closest('a[href^="#seite:"]');
  if (!a) return;
  e.preventDefault();
  e.stopImmediatePropagation();
  var neu = a.target === '_blank' || e.ctrlKey || e.metaKey || e.shiftKey || e.button === 1;
  // Scrollposition mitschicken, damit „Zurück“ wieder an dieselbe Stelle führt (wie im echten Browser)
  parent.postMessage({ tpmSeite: a.getAttribute('href').slice(7), scrollY: window.scrollY, neuesFenster: neu }, '*');
}, true);
document.addEventListener('auxclick', function (e) {
  var a = e.target.closest && e.target.closest('a[href^="#seite:"]');
  if (!a || e.button !== 1) return;
  e.preventDefault();
  parent.postMessage({ tpmSeite: a.getAttribute('href').slice(7), neuesFenster: true }, '*');
}, true);
// Sprungmarke (z. B. /kontakt/#anfrage) anfahren, sobald die Seite steht
if (window.__tpmAnker) {
  window.addEventListener('load', function () {
    setTimeout(function () {
      var el = document.getElementById(window.__tpmAnker);
      if (!el) return;
      el.scrollIntoView();
    }, 60);
  });
}
// Escape im Zusatzfenster schließt es (Tastendrücke im Rahmen erreichen die Hülle sonst nicht)
document.addEventListener('keydown', function (e) {
  if (e.key === 'Escape') parent.postMessage({ tpmEscape: true }, '*');
});
// Gemerkte Position wiederherstellen, sobald die Seite steht
if (window.__tpmScrollZiel > 0) {
  window.addEventListener('load', function () {
    setTimeout(function () {
      window.scrollTo(0, window.__tpmScrollZiel);
    }, 60);
  });
}
<\/script>`;

const daten = JSON.stringify({ kopf: gemeinsam.kopf, skript: seitenSkript, seiten }).replace(/</g, '\\u003c');

const shell = `<!doctype html>
<html lang="de">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<meta name="robots" content="noindex, nofollow">
<title>TPM Bau GmbH – Vorschau</title>
<link rel="icon" href="${dataUri('/favicon.svg')}" type="image/svg+xml">
<style>
  html, body { margin: 0; height: 100%; background: #0a1626; overflow: hidden; }
  iframe { position: fixed; inset: 0; width: 100%; height: 100%; border: 0; display: block; background: #0a1626; }
  noscript p { color: #f3f1ec; font: 16px/1.5 system-ui, sans-serif; padding: 2rem; }
  #ueber { position: fixed; inset: 0; z-index: 10; display: grid; grid-template-rows: auto 1fr; background: #0a1626; }
  #ueber[hidden] { display: none; }
  #ueber__leiste { display: flex; align-items: center; justify-content: space-between; gap: 1rem; padding: 0.6rem 1rem;
    background: #1a63b0; color: #f3f1ec; font: 600 15px/1.3 system-ui, sans-serif; }
  #ueber__zu { font: inherit; color: #0a1626; background: #f3f1ec; border: 0; padding: 0.55rem 1rem; cursor: pointer; }
  #ueber__zu:focus-visible { outline: 3px solid #f3f1ec; outline-offset: 2px; }
  #ueber iframe { position: static; }
  #ueber [data-waechter] { position: absolute; width: 1px; height: 1px; overflow: hidden; clip-path: inset(50%); }
</style>
</head>
<body>
<!-- sandbox ohne allow-same-origin: Die Seiten laufen in einem eigenen, abgeschotteten Ursprung und können
     weder auf diese Hülle noch auf andere Fenster zugreifen. -->
<iframe id="seite" title="TPM Bau GmbH – Vorschau" sandbox="allow-scripts allow-forms allow-popups allow-popups-to-escape-sandbox allow-downloads"></iframe>
<div id="ueber" role="dialog" aria-modal="true" aria-labelledby="ueber__titel" hidden>
  <!-- Fokusfalle: Wer mit Tab/Umschalt+Tab das Fenster verlassen würde, landet an diesen Wächtern und wird zurückgeholt -->
  <span tabindex="0" data-waechter="anfang"></span>
  <div id="ueber__leiste"><span id="ueber__titel">Zusätzliches Fenster</span><button type="button" id="ueber__zu">Schließen und zurück</button></div>
  <iframe id="ueber__rahmen" title="Zusätzliches Fenster" sandbox="allow-scripts allow-forms allow-popups allow-popups-to-escape-sandbox allow-downloads"></iframe>
  <span tabindex="0" data-waechter="ende"></span>
</div>
<noscript><p>Die Vorschau braucht JavaScript.</p></noscript>
<script id="tpm-daten" type="application/json">${daten}</script>
<script>
(function () {
  var D = JSON.parse(document.getElementById('tpm-daten').textContent);
  var rahmen = document.getElementById('seite');
  // Jeder Seitenwechsel bekommt einen frischen Rahmen (srcdoc vor dem Einfügen gesetzt). So entstehen keine
  // zusätzlichen Einträge im Browserverlauf, und „Zurück“ führt immer zur vorherigen Seite.
  function ersetze(alt, html) {
    var neu = alt.cloneNode(false);
    neu.srcdoc = html;
    alt.replaceWith(neu);
    return neu;
  }
  var ueber = document.getElementById('ueber');
  var ueberRahmen = document.getElementById('ueber__rahmen');
  var aktuell = null;
  var positionen = Object.create(null); // zuletzt gesehene Scrollposition je Seite
  // Ohne Prototyp: Sonst gälten Namen wie „constructor“ oder „__proto__“ als vorhandene Seiten
  var routen = Object.create(null);
  D.seiten.forEach(function (s) { routen[s.route] = s; });
  function bekannt(pfad) { return Object.prototype.hasOwnProperty.call(routen, pfad); }

  // Nur bekannte Seiten und nur die Abfrageparameter, die die Seite kennt (Anfrage-Vorbelegung).
  // Alles andere wird verworfen, bevor es irgendwo eingesetzt wird.
  // Adressen werden wie auf dem echten Server behandelt: /kontakt → /kontakt/, /kontakt/index.html → /kontakt/,
  // /kontakt/#anfrage → Seite /kontakt/ an der Stelle „anfrage“. Unbekanntes → 404-Seite.
  function pruefe(ziel) {
    ziel = String(ziel || '/');
    var anker = '';
    var a = ziel.indexOf('#');
    if (a > -1) { anker = ziel.slice(a + 1); ziel = ziel.slice(0, a); }
    if (!/^[A-Za-z][\\w-]{0,60}$/.test(anker)) anker = '';
    var q = ziel.indexOf('?');
    var pfad = q > -1 ? ziel.slice(0, q) : ziel;
    if (pfad === '') pfad = '/';
    pfad = pfad.replace(/\\/index\\.html$/, '/');
    // Seiten beginnen immer mit „/“
    if (pfad.charAt(0) !== '/') { pfad = '/404/'; anker = ''; }
    if (!bekannt(pfad) && bekannt(pfad + '/')) pfad = pfad + '/';
    if (!bekannt(pfad)) { pfad = '/404/'; anker = ''; }
    var suche = '';
    if (q > -1) {
      var p = new URLSearchParams(ziel.slice(q + 1)), raus = new URLSearchParams();
      var kunde = p.get('kunde');
      if (kunde === 'privat' || kunde === 'gewerbe') raus.set('kunde', kunde);
      p.getAll('leistung').forEach(function (v) { if (/^[a-z0-9,-]{1,200}$/.test(v)) raus.append('leistung', v); });
      var t = raus.toString();
      suche = t ? '?' + t : '';
    }
    return { pfad: pfad, suche: suche, anker: anker, ziel: pfad + suche + (anker ? '#' + anker : '') };
  }
  // Wert als JavaScript-Literal, das kein HTML-Endtag enthalten kann
  function literal(v) { return JSON.stringify(v).replace(/</g, '\\u003c'); }
  function maskiere(t) { return String(t).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function dokument(z, scrollZiel) {
    var s = routen[z.pfad];
    var y = Math.max(0, Math.min(1e6, Math.round(Number(scrollZiel) || 0)));
    return '<!doctype html><html lang="de"><head><title>' + maskiere(s.titel) + '</title>' +
      '<script>window.__tpmSuche=' + literal(z.suche) + ';window.__tpmAnker=' + literal(z.anker) + ';window.__tpmScrollZiel=' + y + ';<\\/script>' +
      D.kopf + '</head><body>' + s.body + D.skript + '</body></html>';
  }
  function zeige(ziel, scrollZiel) {
    var z = pruefe(ziel);
    aktuell = z.ziel;
    document.title = routen[z.pfad].titel; // Klartext, keine HTML-Entities
    rahmen = ersetze(rahmen, dokument(z, scrollZiel));
    return z;
  }
  function oeffneUeber(ziel) {
    var z = pruefe(ziel);
    document.getElementById('ueber__titel').textContent = routen[z.pfad].titel;
    ueberRahmen = ersetze(ueberRahmen, dokument(z, 0));
    ueber.hidden = false;
    // Seite dahinter für Tastatur, Maus und Screenreader sperren, solange das Fenster offen ist
    rahmen.inert = true;
    document.getElementById('ueber__zu').focus();
  }
  function schliesseUeber() {
    if (ueber.hidden) return;
    ueber.hidden = true;
    ueberRahmen = ersetze(ueberRahmen, '');
    rahmen.inert = false;
    rahmen.focus();
  }
  document.getElementById('ueber__zu').addEventListener('click', schliesseUeber);
  // Fokusfalle: Ende → zurück zum Schließen-Knopf, Anfang → in den Fensterinhalt
  ueber.querySelectorAll('[data-waechter]').forEach(function (w) {
    w.addEventListener('focus', function () {
      if (w.getAttribute('data-waechter') === 'ende') document.getElementById('ueber__zu').focus();
      else ueberRahmen.focus();
    });
  });
  // Tab vom Schließen-Knopf in den Fensterinhalt selbst setzen: Chrome verliert den Fokus beim Übergang in den
  // abgeschotteten Rahmen sonst gelegentlich auf <body>
  document.getElementById('ueber__zu').addEventListener('keydown', function (e) {
    if (e.key === 'Tab' && !e.shiftKey && !e.altKey && !e.ctrlKey && !e.metaKey) {
      e.preventDefault();
      ueberRahmen.focus();
    }
  });
  // Sicherheitsnetz: Fokus außerhalb des offenen Fensters (z. B. auf der Seite) sofort zurückholen
  function fokusZurueck() {
    if (!ueber.hidden && !ueber.contains(document.activeElement)) document.getElementById('ueber__zu').focus();
  }
  document.addEventListener('focusin', function (e) {
    if (!ueber.hidden && !ueber.contains(e.target)) document.getElementById('ueber__zu').focus();
  });
  // Fällt der Fokus ganz heraus (auf <body>), gibt es kein focusin: deshalb auch beim Verlassen nachsehen
  document.addEventListener('focusout', function () { setTimeout(fokusZurueck, 0); });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') schliesseUeber(); });

  function ausHash() {
    var h = '';
    try { h = decodeURIComponent(location.hash); } catch (e) {}
    return h.indexOf('#seite:') === 0 ? h.slice(7) : '/';
  }
  window.addEventListener('message', function (e) {
    // Nur Nachrichten aus den eigenen Rahmen annehmen, nie aus fremden Fenstern
    var vonSeite = e.source === rahmen.contentWindow;
    var vonUeber = !ueber.hidden && e.source === ueberRahmen.contentWindow;
    if (!vonSeite && !vonUeber) return;
    var d = e.data;
    if (vonUeber && d && d.tpmEscape === true) { schliesseUeber(); return; }
    if (!d || typeof d !== 'object' || typeof d.tpmSeite !== 'string' || d.tpmSeite.length > 300) return;
    if (vonUeber) {
      // Im Zusatzfenster weiterblättern, die Seite darunter bleibt unverändert
      var z = pruefe(d.tpmSeite);
      document.getElementById('ueber__titel').textContent = routen[z.pfad].titel;
      ueberRahmen = ersetze(ueberRahmen, dokument(z, 0));
      return;
    }
    if (d.neuesFenster === true) { oeffneUeber(d.tpmSeite); return; }
    if (aktuell !== null && typeof d.scrollY === 'number') positionen[aktuell] = d.scrollY;
    var z2 = zeige(d.tpmSeite, 0);
    // Adresse mitführen, damit "Zurück" funktioniert (in manchen App-Vorschauen gesperrt, dann ohne)
    try { location.hash = 'seite:' + z2.ziel; } catch (err) {}
  });
  // „Zurück“ / „Vor“: dorthin, wo man auf der Seite zuletzt war
  window.addEventListener('hashchange', function () {
    schliesseUeber();
    var z = pruefe(ausHash());
    if (z.ziel !== aktuell) zeige(z.ziel, positionen[z.ziel] || 0);
  });
  var start = zeige(ausHash());
  if (location.hash && start.ziel !== ausHash() && start.pfad !== '/404/') {
    try { history.replaceState(null, '', '#seite:' + start.ziel); } catch (err) {}
  }
})();
</script>
</body>
</html>
`;

fs.writeFileSync(OUT, shell);
console.log(`${seiten.length} Seiten in ${OUT} (${(fs.statSync(OUT).size / 1024 / 1024).toFixed(1)} MB)`);
