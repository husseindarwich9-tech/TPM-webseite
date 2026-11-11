# TPM Bau GmbH – Webseite

Neue Webseite der TPM Bau GmbH (Berlin), Version 4. Statisch generiert mit [Astro](https://astro.build), Animationen
mit GSAP (ScrollTrigger) und einzelnen Komponenten aus [React Bits](https://github.com/DavidHDev/react-bits).
Keine Cookies, kein Tracking, keine externen Dienste, Schriften lokal.

- **Designidee:** [`docs/PLAN.md`](docs/PLAN.md)
- **Offene Punkte / Platzhalter:** [`docs/OFFENE-PUNKTE.md`](docs/OFFENE-PUNKTE.md)
- **Bildquellen und Lizenzen:** [`docs/BILDQUELLEN.md`](docs/BILDQUELLEN.md)
- **Anfrage-Assistent und Webhook:** [`docs/ANFRAGE-WEBHOOK.md`](docs/ANFRAGE-WEBHOOK.md)
- **Lighthouse-Ergebnisse:** [`docs/lighthouse/ERGEBNIS.md`](docs/lighthouse/ERGEBNIS.md)
- **Prüfbericht zur Vorschau und Antwort:** [`docs/PRUEFBERICHT-ANTWORT.md`](docs/PRUEFBERICHT-ANTWORT.md)

## Schnellstart

```bash
npm install
cp .env.example .env        # Webhook-URL für den Anfrage-Assistenten eintragen
npm run dev                 # Entwicklung: http://localhost:4321
npm run build               # fertige Seite nach dist/
npm run preview             # gebaute Seite ansehen: http://localhost:4321
```

Voraussetzung: Node.js 22.22 oder neuer (Astro 7).

**Vorschau ohne Server:** `npm run vorschau` erzeugt `vorschau/TPM-Bau-Vorschau.html`: die komplette Seite mit allen
Unterseiten in **einer** Datei, mit eingebetteten Schriften, Stilen und Skripten. Sie lässt sich per Doppelklick im
Browser öffnen. Jede Seite wird darin als frisches Dokument in einen Rahmen geladen, „Zurück“ führt an die vorherige
Stelle. Manche Handy-Apps zeigen HTML-Dateien nur als Text an; zum Testen auf dem Handy die Seite auf einen Server legen.

**Vorschau im Internet (auch fürs Handy):** `npm run build && npm run paket:vorschau` erzeugt `vorschau/webseite/` und
`vorschau/TPM-Bau-Webseite.zip`: den fertigen Build, für Suchmaschinen gesperrt (`robots.txt`, `noindex` in jeder
Seite, `X-Robots-Tag`), mit `.htaccess` (Apache/LiteSpeed, z. B. Hostinger) und `_headers` (Netlify, Cloudflare Pages).
Den Inhalt im Hauptverzeichnis einer (Sub-)Domain ablegen, z. B. `vorschau.tpm-bau.de`.

## Seiten

| Pfad | Inhalt |
|---|---|
| `/` | Startseite |
| `/leistungen/` | Leistungsverzeichnis, nach Bauphasen geordnet |
| `/leistungen/<slug>/` | 12 Leistungsseiten (z. B. `/leistungen/trockenbau/` für „Trockenbau Berlin“) |
| `/gewerbe/` | Gewerbekunden & Hausverwaltungen |
| `/ueber-uns/`, `/partner/`, `/karriere/`, `/faq/`, `/kontakt/` | Unternehmen |
| `/anfrage/` | Anfrage-Assistent (auch auf `/kontakt/` eingebettet) |
| `/impressum/`, `/datenschutz/`, `/agb/` | Rechtliches (mit markierten Platzhaltern) |
| `/404.html` | Fehlerseite |

## Inhalte ändern

Fast alle Inhalte liegen als Daten vor. Die Seiten passen sich automatisch an.

| Datei | Inhalt |
|---|---|
| `src/data/firma.ts` | Firmendaten, Kontakt, Werte, Auftraggeber, Zulieferer, Kundenstimmen, Social-Media-Links, Navigation |
| `src/data/leistungen.ts` | Die 12 Leistungen (Texte, Umfang, SEO-Beschreibung) und Bauphasen |
| `src/data/faq.ts` | Häufige Fragen |
| `src/data/bilder.ts` | **Zentrale Bildliste**: welches Foto wo erscheint |

### Fotos einsetzen

1. Foto in `bilder-vom-kunden/` legen (z. B. `startfoto.jpg`).
2. In `src/data/bilder.ts` beim passenden Eintrag den Dateinamen unter `datei` eintragen (bei `startfoto.jpg` schon erledigt).
3. `npm run build`.

Die Fotos werden nicht beschnitten. Der Build erzeugt automatisch AVIF/WebP in mehreren Größen. Projektfotos je
Leistung erscheinen automatisch, wenn sie `leistung-<slug>.jpg` heißen.

## Veröffentlichen auf dem Hetzner-Server

> **Erst veröffentlichen, wenn `npm run check:livegang` ohne Hindernisse durchläuft.** Stand jetzt fehlen noch der
> Anfrage-Versand (Webhook), die Rechtstexte (Impressum, Datenschutz, AGB) und weitere Inhalte von TPM,
> siehe [`docs/OFFENE-PUNKTE.md`](docs/OFFENE-PUNKTE.md).

Die Seite besteht nach `npm run build` nur aus statischen Dateien in `dist/`. Ein Webserver wie nginx genügt.

```bash
npm ci
npm run build
rsync -avz --delete dist/ benutzer@server:/var/www/tpm-bau/
```

Eine fertige nginx-Konfiguration (HTTPS, Umleitung auf `www`, gzip, Caching, Sicherheits-Header, 404) liegt in
[`deploy/nginx.conf`](deploy/nginx.conf). Dort in der Content-Security-Policy unter `connect-src` die Domain des
Anfrage-Webhooks eintragen.

## Qualitätssicherung

| Befehl | Zweck |
|---|---|
| `npm run check` | Typprüfung des gesamten Codes (`astro check`), muss ohne Fehler durchlaufen |
| `npm run check:livegang` | **Vor jedem Livegang** (nach `npm run build`): bricht ab, solange Webhook-Adresse, nginx-Eintrag, Rechtstexte oder andere Platzhalter fehlen, und listet alles auf |
| `npm run test:anfrage` | End-to-End-Test des Anfrage-Assistenten mit Mock-Webhook (54 Prüfungen inkl. Fehlerfällen) |
| `npm run test:anfrage:handy` | Derselbe Test als Handy mit Touchscreen (Auswahl per Fingertipp) |
| `npm run test:handy` | Handy-Test (`npm run serve` muss laufen): alle Seiten auf fünf Handygrößen, Menü (auch nach dem Scrollen), Leiste, Wischen bei gedrosselter CPU, Drehen, Hoch-/Runterwischen, „Zurück“ |
| `npm run test:vorschau` | Test der Vorschau-Datei (nach `npm run vorschau`): eingeschleuster Code, fremde Nachrichten, Adressen, Datenschutzfenster (Fokus, Escape), Formularentwurf |
| `npm run test:livegang` | Test der Livegang-Prüfung: Sie muss 12 falsche nginx- und Webhook-Konfigurationen ablehnen und richtige durchlassen |
| `npm run check:overflow` | Prüft alle Seiten bei 320/375/768 px auf horizontales Überlaufen und JS-Fehler |
| `npm run screenshots` | Screenshots aller Seiten und aller Assistenten-Schritte nach `docs/screenshots/` (Vorschau muss laufen) |
| `npm run lighthouse` | Lighthouse (Handy-Profil) für die wichtigsten Seiten, mit gzip-Auslieferung wie in Produktion |
| `npm run serve` | Gebaute Seite mit gzip und Cache-Headern ausliefern (wie nginx), Port 4322 |
| `npm run icons` | Favicons, Logo-PNG und Social-Media-Vorschaubild neu erzeugen |

Die Test-Skripte brauchen Chromium. Lokal einmalig `npx playwright install chromium` ausführen oder `CHROME_PATH`
setzen.

## Technik

- **Astro 7**, rein statische Ausgabe, `trailingSlash: always`, Sitemap über `@astrojs/sitemap`
- **React-Inseln** (`@astrojs/react`): Nur einzelne Bausteine sind React, der Rest ist statisches HTML.
  Aus React Bits (`src/react-bits/`, Lizenz liegt bei): `RotatingText` (wechselndes Gewerk), `LogoLoop`
  (Auftraggeber-Laufband), `SpotlightCard` (Lichtschein-Karten), `Magnet` (Anfrage-Knopf).
  `SpotlightCard` und `Magnet` werden nur auf Geräten mit Maus geladen (`client:media`).
- **Raum-Illustration** (`src/components/BauRaum.astro`): Auf jeder Leistungsseite zeigt der isometrische Raum den
  Zustand vor dem Gewerk und spielt dieses Gewerk in Schleife (`src/scripts/bauraum.ts`, `src/scripts/handwerk.ts`).
- **GSAP 3 + ScrollTrigger**: Raum-Animationen auf den Leistungsseiten.
- **Natives Scrollen:** Kein weiches Nachgleiten (Lenis), keine gestapelten Karten und keine Bilder oder Linien,
  die sich erst beim Hinscrollen aufdecken. Das wirkte beim Präsentieren wie Hängen; die Seite scrollt jetzt so
  direkt wie der Browser selbst.
- **Bewusst ohne Einblenden beim Scrollen:** Texte, Listen und Überschriften sind sofort sichtbar. Animiert ist nur
  der Seitenkopf, und zwar mit reinem CSS: Er startet mit dem ersten Bild der Seite, unabhängig vom Laden der Skripte.
- **Ausfallsicher:** Lädt ein Skript nicht, bleibt alles lesbar und bedienbar. `prefers-reduced-motion`: alles
  statisch (keine Animationen). Ohne JavaScript ist die Seite ebenfalls vollständig lesbar.
- **Icons der Gewerke:** [Lucide](https://lucide.dev) (ISC-Lizenz), beim Bauen als SVG ins HTML geschrieben.
- **Native View Transitions** zwischen den Seiten (CSS, ohne Router)
- **SEO:** Titel und Beschreibung je Seite, Canonical, Open Graph, schema.org (`GeneralContractor`, `Service`,
  `BreadcrumbList`, `FAQPage`, `ItemList`), `sitemap-index.xml`, `robots.txt`
- **Barrierefreiheit:** semantisches HTML, Sprunglink, sichtbare Fokusrahmen, Tastaturbedienung für Menüs und
  Assistent, Fehlermeldungen mit `aria-invalid`/`aria-describedby`, Kontraste nach WCAG AA
