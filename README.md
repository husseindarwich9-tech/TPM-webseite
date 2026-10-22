# TPM Bau GmbH – Webseite

Neue Webseite der TPM Bau GmbH (Berlin). Statisch generiert mit [Astro](https://astro.build), Animationen mit GSAP
(ScrollTrigger) und Lenis. Keine Cookies, kein Tracking, keine externen Dienste, Schriften lokal.

- **Designidee:** [`docs/PLAN.md`](docs/PLAN.md)
- **Offene Punkte / Platzhalter:** [`docs/OFFENE-PUNKTE.md`](docs/OFFENE-PUNKTE.md)
- **Bildquellen und Lizenzen:** [`docs/BILDQUELLEN.md`](docs/BILDQUELLEN.md)
- **Anfrage-Assistent und Webhook:** [`docs/ANFRAGE-WEBHOOK.md`](docs/ANFRAGE-WEBHOOK.md)
- **Lighthouse-Ergebnisse:** [`docs/lighthouse/ERGEBNIS.md`](docs/lighthouse/ERGEBNIS.md)
- **Screenshots (375 / 768 / 1440 px):** [`docs/screenshots/`](docs/screenshots/)

## Schnellstart

```bash
npm install
cp .env.example .env        # Webhook-URL für den Anfrage-Assistenten eintragen
npm run dev                 # Entwicklung: http://localhost:4321
npm run build               # fertige Seite nach dist/
npm run preview             # gebaute Seite ansehen: http://localhost:4321
```

Voraussetzung: Node.js 20 oder neuer.

**Vorschau ohne Server:** `npm run vorschau` erzeugt `vorschau/` (plus `TPM-Bau-Vorschau.zip`). Darin ist jede Seite
eine eigenständige HTML-Datei mit eingebetteten Schriften, Stilen und Animationen. `index.html` per Doppelklick öffnen.

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
| `npm run test:anfrage` | End-to-End-Test des Anfrage-Assistenten mit Mock-Webhook (54 Prüfungen inkl. Fehlerfällen) |
| `npm run check:overflow` | Prüft alle Seiten bei 320/375/768 px auf horizontales Überlaufen und JS-Fehler |
| `npm run screenshots` | Screenshots aller Seiten, aller Assistenten-Schritte und Animationszustände (Vorschau muss laufen) |
| `npm run lighthouse` | Lighthouse (Handy-Profil) für die wichtigsten Seiten, mit gzip-Auslieferung wie in Produktion |
| `npm run serve` | Gebaute Seite mit gzip und Cache-Headern ausliefern (wie nginx), Port 4322 |
| `npm run icons` | Favicons, Logo-PNG und Social-Media-Vorschaubild neu erzeugen |

Die Test-Skripte brauchen Chromium. Lokal einmalig `npx playwright install chromium` ausführen oder `CHROME_PATH`
setzen.

## Technik

- **Astro 5**, rein statische Ausgabe, `trailingSlash: always`, Sitemap über `@astrojs/sitemap`
- **GSAP 3 + ScrollTrigger**: Wort-Reveals, sich zeichnende Linien, gepinnter horizontaler Werte-Abschnitt,
  Ablauf-Linie, Maus-Vorschau im Leistungsverzeichnis. **Lenis** für weiches Scrollen.
- **`prefers-reduced-motion`**: Dann ist alles sofort sichtbar und statisch (kein Lenis, keine Scroll-Animationen).
  Ohne JavaScript ist die Seite ebenfalls vollständig lesbar.
- **Native View Transitions** zwischen den Seiten (CSS, ohne Router)
- **SEO:** Titel und Beschreibung je Seite, Canonical, Open Graph, schema.org (`GeneralContractor`, `Service`,
  `BreadcrumbList`, `FAQPage`, `ItemList`), `sitemap-index.xml`, `robots.txt`
- **Barrierefreiheit:** semantisches HTML, Sprunglink, sichtbare Fokusrahmen, Tastaturbedienung für Menüs und
  Assistent, Fehlermeldungen mit `aria-invalid`/`aria-describedby`, Kontraste nach WCAG AA
