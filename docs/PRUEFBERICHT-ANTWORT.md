# Antwort auf den Prüfbericht „TPM Bau – Vorschau V4“

Geprüfte Datei laut Bericht: SHA-256 `6fe3623e…9566`. Alle Befunde wurden nachgestellt, behoben und erneut geprüft.
Die Gegenprobe gegen die ursprüngliche Datei bestätigt die gemeldeten Lücken, die neue Fassung hat sie nicht mehr.

| Nr. | Befund | Bestätigt? | Behebung | Nachprüfung |
|---|---|---|---|---|
| 1 | Script-Einschleusung über URL und `postMessage` | Ja, nur in der Vorschau-Datei. Die eigentliche Webseite ist nicht betroffen (URL-Parameter werden dort gegen feste Werte geprüft, Eingaben maskiert). | Nur bekannte Seiten und erlaubte Parameter (`kunde=privat/gewerbe`, `leistung=[a-z0-9,-]`); Einsetzen als Literal mit maskiertem `<`; Titel maskiert; Nachrichten nur aus den eigenen Rahmen (`e.source`); Seitenrahmen mit `sandbox` ohne `allow-same-origin` (eigener, abgeschotteter Ursprung). | 11/11 Angriffs- und Funktionsprüfungen bestanden (4 präparierte Links, Nachricht aus fremdem Rahmen, Zugriff auf die Hülle gesperrt, gültige Vorbelegung funktioniert). Gegen die alte Datei: 6 von 11 schlagen fehl. |
| 2 | Kein Online-Versand | Ja (bekannt, Webhook-Adresse fehlt) | Ohne Webhook-Adresse zeigt der Assistent den Hinweis jetzt **zu Beginn** (mit Telefonnummer). Neue Prüfung `npm run check:livegang` bricht ab, solange die Adresse fehlt, nicht https ist, die Beispieladresse ist oder in der CSP (`connect-src`) fehlt. | Anfrage-Test 56/56 (neu: Hinweis vorhanden ohne Adresse, nicht vorhanden mit Adresse). Serverseitige Prüfung, Spam-/Ratenbegrenzung und Zustellung hängen am n8n-Workflow, der noch eingerichtet werden muss. |
| 3 | Datenschutz-Link löscht den Entwurf | Ja, nur in der Vorschau-Datei. Auf der Webseite öffnet der Link einen neuen Tab. | Vorschau beachtet jetzt `target="_blank"`, Strg/Cmd/Umschalt und mittlere Maustaste: Die Seite öffnet sich in einem Fenster über dem Formular, dieses bleibt unverändert. | Formular bis Schritt 6 mit 3 Fotos ausgefüllt, Datenschutz geöffnet, geschlossen: alle Angaben und Fotos vorhanden (Vorschau und Webseite). |
| 4 | Rechtstexte unvollständig | Ja | Inhalte muss TPM liefern bzw. rechtlich prüfen lassen. `check:livegang` blockiert, solange Platzhalter in Impressum, Datenschutz oder AGB stehen oder keine HRB-Nummer im Impressum ist. | – |
| 5 | `<button>` direkt in `<dl><div>` | Ja | „Ändern“-Knopf steht jetzt im `<dd>`. Zusätzlich gefunden und behoben: Überschrift der Zusammenfassung übersprang eine Ebene (jetzt keine Überschrift mehr), doppelte Bereichsnamen auf der Startseite, ungültiges `aria-label` am Karussell. | axe-core: 56 Läufe (25 Seiten × Desktop/Handy, letzter Formularschritt, Fehlermeldungen, offene Menüs): **0 Verstöße**. |
| 6 | 35 Platzhalter | Ja. Tatsächlich sind es 38: Die FAQ-Seite enthält 3 weitere. | Liste in `docs/OFFENE-PUNKTE.md`; `check:livegang` listet alle und blockiert. | – |
| 7 | `&amp;` im Browser-Titel | Ja | Titel werden als Klartext abgelegt und nur beim Einsetzen ins HTML maskiert. | Titel zeigt „… Innenausbau & alle Gewerke …“. |

## Zu den offenen Prüfungen aus dem Bericht

- **Farbkontraste:** 4.292 Textstellen gemessen (Textfarbe einschließlich Deckkraft gegen den tatsächlich gerenderten Hintergrund, alle Seiten, Desktop und Handy, dazu Kopfzeile und Handy-Leiste). Keine echte Unterschreitung. Zwei Treffer waren Messartefakte (Inhalt eines geschlossenen FAQ-Eintrags; Umrissziffern der 404-Seite, deren Umriss rund 7:1 hat). Für Umrissschrift gibt es jetzt eine gefüllte Ersatzdarstellung, falls ein Browser keine Umrisse kann.
- **Vergrößerung und Textabstände:** Text auf 200 % (WCAG 1.4.4) und erhöhte Abstände (WCAG 1.4.12) auf allen Seiten bei 320 und 1280 px: kein Überlaufen, nichts abgeschnitten (vorher liefen 17 Seiten bei 320 px mit erhöhten Abständen über).
- **Server, TLS, Header:** `deploy/nginx.conf` mit echtem nginx 1.24 getestet: Syntax gültig, HTTP/2, Umleitungen auf https://www, Sicherheits-Header einschließlich CSP und HSTS auf allen Antworten, alle 24 Seiten ohne CSP-Verstoß.
- **Nicht geprüft:** Screenreader, Safari/iOS, Firefox, HEIC-Verarbeitung (Chrome kann HEIC nicht lesen; der Assistent bittet dann um JPG/PNG). Diese Tests gehören vor dem Livegang auf echte Geräte.

## Nachtrag: vier weitere Befunde

| Befund | Behebung | Nachprüfung |
|---|---|---|
| Fokus gelangt hinter das Datenschutzfenster | Die Seite dahinter wird gesperrt (`inert`), solange das Fenster offen ist. | 40× Tab: Fokus bleibt im Fenster, 0× dahinter. Nach dem Schließen ist die Seite wieder bedienbar. |
| Escape wirkt nicht im Seitenrahmen des Fensters | Der Rahmen meldet Escape an die Hülle, die nur Meldungen des eigenen Fensterrahmens annimmt. | Escape schließt das Fenster, auch mit Fokus im Rahmen. |
| Ungültige Routen | Adressen werden wie auf dem Server behandelt: `/kontakt` → `/kontakt/`, `/kontakt/index.html` → `/kontakt/`, `/kontakt/#anfrage` springt zur Stelle, Unbekanntes → 404-Seite. Dabei gefunden: 24 Anfrage-Links der Leistungsseiten („Als Privat-/Gewerbekunde anfragen“) waren in der Vorschau tot, weil Astro „&“ als `&#38;` schreibt und die Adresse am „#“ abgeschnitten wurde. | 10 Adressarten geprüft; Links führen vorbelegt zum Assistenten. Gegenprobe: In der vorherigen Datei sind die Links tot. |
| Hinweis zum E-Mail-Versand | Der Hinweis versprach, dass sich das E-Mail-Programm von selbst öffnet. Jetzt steht dort korrekt „über ‚Per E-Mail senden‘“, mit dem Zusatz, dass Fotos selbst angehängt werden müssen. Ohne Versandadresse gibt es keinen Knopf „Erneut senden“ mehr, der nie funktionieren könnte. | Anfrage-Test 58/58 (Desktop und Handy), mit zwei neuen Prüfungen dafür. |

Stand gespeichert auf Branch `claude/website-gsap-lenis-react-bits-vu35ws`, Commit `5807ec4`.

## Nachtrag 2

| Befund | Ursache | Behebung | Nachprüfung |
|---|---|---|---|
| Fokus gelangt nach längerer Tab-Bedienung trotz `inert` hinter das Fenster | `inert` sperrt nur die Seite; wer mit Tab den Fensterinhalt verließ, landete außerhalb des Fensters (nach 42 Schritten). | Echte Fokusfalle: Wächter vor und hinter dem Fenster holen den Fokus zurück, dazu ein Sicherheitsnetz für jeden Fokus außerhalb. | 250× Tab und 250× Umschalt+Tab: Fokus immer im Fenster (`npm run test:vorschau`). |
| Routen `constructor`, `__proto__` zeigen „undefined“ | Seitenliste war ein normales Objekt und erbte diese Namen. | Seitenliste ohne Prototyp, Abfrage nur eigener Einträge, Pfade müssen mit „/“ beginnen. | 7 solche Namen (mit und ohne „/“, mit Abfrageteil) → 404-Seite. |
| CSP-Kontrolle im Livegang-Skript akzeptiert falsche Konfiguration | Es wurde nur geprüft, ob die Adresse irgendwo im ersten CSP-Eintrag vorkommt (auch in Kommentaren, anderen Direktiven, als Teil einer fremden Domain). Ohne Webhook-Angabe bei der Prüfung entfiel die Kontrolle ganz. | Neu geschrieben: Kommentare ignoriert, alle CSP-Einträge geprüft, CSP muss in `location /` stehen, Adresse muss exakt unter `connect-src` erlaubt sein (Ursprung, ggf. Pfad), keine Platzhalter, kein `'unsafe-eval'`. Die Webhook-Adresse muss bei der Prüfung bekannt sein und genau der im Build entsprechen. | 14 Fälle (`npm run test:livegang`): 12 falsche Konfigurationen abgelehnt, 2 richtige durchgelassen. |
| npm meldet 5 betroffene Abhängigkeiten | Astro 5 (u. a. XSS in Server-Funktionen, Bildverarbeitung), sharp/libvips, esbuild (Entwicklungsserver), zod. Auf der statischen Seite nicht als ausnutzbar nachgewiesen. | Aktualisiert auf Astro 7.4.1, @astrojs/react 7.1.0, sharp 0.35.5. Node 22.22 oder neuer nötig (in `package.json` festgehalten). | `npm audit`: 0 Schwachstellen. Alle Prüfungen danach erneut grün (Typprüfung, Handy-Test 682, Anfrage-Test 58/58 Desktop und Handy, axe 0 Verstöße, nginx-Test 24/24, Lighthouse über alle 24 Seiten: Tempo 95–99, sonst je 100). |

