# Anfrage-Assistent → Webhook

Der Assistent (`src/components/AnfrageAssistent.astro`, Logik in `src/scripts/anfrage.ts`) sendet jede Anfrage als
JSON per `POST` an die Adresse aus `.env`:

```
PUBLIC_ANFRAGE_WEBHOOK_URL=https://automation.example.de/webhook/tpm-anfrage
```

Die URL wird beim Build in die (statische) Seite geschrieben. Verwenden Sie deshalb einen Webhook, der nur
Anfragen annimmt und sonst nichts auslösen kann.

## Anforderungen an den Webhook

- Antwortet bei Erfolg mit einem 2xx-Status. Jeder andere Status wird dem Besucher als Fehler angezeigt, zusammen
  mit den Alternativen „Erneut senden“, „Per E-Mail senden“ und „Anrufen“.
- **CORS**: Der Browser schickt vorher eine `OPTIONS`-Anfrage. Erlauben Sie:
  `Access-Control-Allow-Origin: https://www.tpm-bau.de`, `Access-Control-Allow-Methods: POST, OPTIONS`,
  `Access-Control-Allow-Headers: Content-Type, Accept`.
- Muss Anfragen bis ca. **10 MB** annehmen (6 Fotos à max. 1600 px als JPEG, Base64).
- Antwortzeit unter 30 Sekunden, sonst bricht der Assistent ab und zeigt einen Hinweis.

In **n8n** zum Beispiel: Knoten „Webhook“ (POST, Response: „Immediately“, unter Options „Allowed Origins (CORS)“
`https://www.tpm-bau.de` eintragen), danach Fotos aus `fotos[].dataUrl` in Binärdaten umwandeln und per E-Mail an
info@tpm-bau.de schicken.

## Spamschutz (ohne reCAPTCHA)

1. **Honeypot**: Ein für Menschen unsichtbares Feld `website`. Ist es ausgefüllt, zeigt die Seite „Danke“, sendet aber nichts.
2. **Zeitprüfung**: Wer alle sechs Schritte in unter 5 Sekunden abschickt, wird ebenso still verworfen.
3. **Link-Begrenzung**: Höchstens zwei Links in der Beschreibung.
4. Versand nur per JavaScript, das Formular hat keine `action`.
5. `meta.ausfuellzeitSekunden` wird mitgeschickt und kann im Workflow zusätzlich geprüft werden.

## Beispiel-Payload

```json
{
  "typ": "anfrage",
  "version": 1,
  "gesendetAm": "2026-10-22T09:15:00.000Z",
  "kundentyp": "privat",
  "leistungen": [
    { "slug": "malerarbeiten", "label": "Malerarbeiten" },
    { "slug": "bodenlegearbeiten", "label": "Bodenlegearbeiten" }
  ],
  "details": {
    "beschreibung": "Wohnzimmer und Flur streichen, danach neuen Vinylboden verlegen.",
    "objektart": "Wohnung",
    "flaeche": 45,
    "plz": "10829",
    "ort": "Berlin-Schöneberg",
    "dringlichkeit": "zeitnah"
  },
  "termin": { "wunschtermin": "2026-11-05", "zeitfenster": "vormittags", "flexibel": false },
  "kontakt": {
    "name": "Erika Mustermann",
    "firma": "",
    "email": "erika@beispiel.de",
    "telefon": "030 123 456 78",
    "bevorzugterKontaktweg": "telefon",
    "datenschutzZugestimmt": true
  },
  "fotos": [
    { "name": "bad.jpg", "type": "image/jpeg", "size": 312345, "width": 1600, "height": 1200, "dataUrl": "data:image/jpeg;base64,…" }
  ],
  "meta": { "quelle": "https://www.tpm-bau.de/anfrage/", "sprache": "de-DE", "ausfuellzeitSekunden": 94 }
}
```

Mögliche Werte: `kundentyp` = `privat` | `gewerbe` · `dringlichkeit` = `akut` | `zeitnah` | `flexibel` ·
`zeitfenster` = `vormittags` | `nachmittags` | `egal` · `leistungen[].slug` = die zwölf Leistungs-Slugs oder `unklar`.

## Vorbelegung per Link

`/anfrage/?kunde=gewerbe&leistung=trockenbau` wählt Kundentyp und Leistung vor. Alle Leistungsseiten nutzen das.

## Test

`npm run test:anfrage` baut eine Testversion mit einem lokalen Mock-Webhook und prüft 54 Fälle: Validierung in
jedem Schritt, Foto-Fehler (Format, Größe, defekte Datei, mehr als 6), Serverfehler 500, Netzwerkabbruch,
erfolgreichen Versand inklusive JSON-Inhalt, Honeypot, Zeitprüfung, Vorbelegung, Gewerbe-Pflichtfeld und Betrieb
ohne Webhook-URL.
