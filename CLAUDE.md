# Hinweise für Claude

## Arbeitsweise

- **Nach jeder Änderung sofort speichern:** committen und auf den aktuellen Arbeitsbranch pushen, ohne nachzufragen
  (Wunsch des Projektinhabers). Nie direkt auf `main` pushen und keinen Pull Request ohne ausdrückliche Bitte anlegen.
- Vor jedem Commit die passenden Prüfungen laufen lassen und nur grün speichern (siehe unten). Schlägt etwas fehl:
  beheben, nicht überspringen.
- Sprache der Seite, der Kommentare und der Dokumentation: Deutsch.

## Prüfungen

```bash
npm ci && npm run build
npm run check                 # Typprüfung, 0 Fehler
npm run serve &               # gebaute Seite auf Port 4322
npm run check:overflow -- http://localhost:4322
npm run test:handy            # Handy-Test (alle Seiten, Menü, Wischen, Drehen, Zurück)
npm run test:anfrage && npm run test:anfrage:handy
npm run vorschau && npm run test:vorschau   # bei Änderungen an der Vorschau-Datei
npm run test:livegang         # bei Änderungen an scripts/check-livegang.mjs oder deploy/nginx.conf
npm audit                     # muss 0 Schwachstellen melden
npm run check:livegang        # vor einer Veröffentlichung: muss ohne Hindernisse durchlaufen
```

In der Cloud-Umgebung ist Chromium unter `/opt/pw-browsers/chromium` vorinstalliert (`scripts/chrome.mjs` findet ihn).

## Wichtige Entscheidungen (nicht rückgängig machen ohne Rücksprache)

- Kein Einblenden von Inhalten beim Scrollen: wirkte beim Testen wie Hängen. Erster Bildschirm nur per CSS animiert.
- Natives Scrollen: kein Lenis, keine festhängenden (gepinnten) Karten, keine JavaScript-Effekte, die beim Scrollen
  rechnen (wirkte beim Präsentieren wie Hängen). Ausnahme auf Wunsch des Inhabers: die Ablauf-Karten der Startseite
  bewegen sich per reinem CSS (`animation-timeline: view()`), nur Lage und Größe, nie die Sichtbarkeit.
- Ausbildung nur Elektroniker/-in (nur im Elektrohandwerk ist ein Meister im Betrieb).
- Logo nach der gelieferten Originaldatei (`src/components/LogoMark.astro`).
- Vorschau-Datei (`scripts/vorschau-einzeln.mjs`): Seiten in abgeschottetem Rahmen (`sandbox` ohne
  `allow-same-origin`), Eingaben aus Adresse und Nachrichten werden geprüft. Siehe `docs/PRUEFBERICHT-ANTWORT.md`.
- Inhalte nie erfinden: Fehlendes bleibt als `[PLATZHALTER: …]` markiert und steht in `docs/OFFENE-PUNKTE.md`.
