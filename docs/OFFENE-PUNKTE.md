# Offene Punkte

Alles, was auf der Seite als **[PLATZHALTER: …]** markiert ist oder vor dem Livegang bestätigt werden muss.
Erfunden wurde nichts: Keine Zahlen, Projekte, Bewertungen, Zertifikate, Preise oder Garantien außer denen aus dem Briefing.

## 1. Material, das noch fehlt

| Was | Wo auf der Seite | Hinweis |
|---|---|---|
| **`startfoto.jpg`** (Mitarbeiter im TPM-Shirt vor dem Wandgemälde) | Startseite (groß im Abschnitt „Wer wir sind“ direkt nach dem Bauablauf), Über uns (Team) | Lag beim Bau nicht im Projekt. In `bilder-vom-kunden/` legen und neu bauen, dann erscheint es automatisch. Das Foto wird nie beschnitten. Seit Version 2 ist der Hero der animierte Bauablauf. Soll das Foto stattdessen in den ersten Bildschirm, ist das eine kleine Änderung. |
| Original-Logo als SVG | überall | `www.tpm-bau.de` war aus der Arbeitsumgebung gesperrt. Das Logo wurde exakt nach den Koordinaten aus dem Briefing nachgebaut. Bitte mit der Originaldatei abgleichen. |
| Teamfoto, Porträt des Geschäftsführers | Über uns | Platzhalterfläche mit Hinweis |
| Foto „Mitarbeitende bei der Arbeit“ | Karriere | Platzhalterfläche mit Hinweis |
| Foto einer fertigen Gewerbefläche (echtes TPM-Projekt) | Gewerbe & Hausverwaltungen | Platzhalterfläche mit Hinweis |
| Projektfotos je Leistung (optional) | Leistungsseiten | Als `bilder-vom-kunden/leistung-<slug>.jpg` ablegen, erscheint automatisch |
| Links zu Instagram, TikTok, LinkedIn | Footer | Icons sind vorhanden, aber ohne Link (`src/data/firma.ts` → `social`) |
| Erreichbarkeit / Bürozeiten | Kontakt | `src/data/firma.ts` → `oeffnungszeiten` |

## 2. Inhalte, die TPM liefern oder bestätigen muss

- **Notdienst**: Gibt es Erreichbarkeit außerhalb der Bürozeiten? (FAQ)
- **Einsatzgebiet**: nur Berlin oder auch Umland? (FAQ)
- **Kosten für Besichtigung und Angebot**: kostenlos oder nicht? (FAQ)
- **Gewerbekunden**: Angaben zu Rahmenverträgen, Reaktionszeiten, Abrechnung, falls gewünscht (Gewerbe-Seite)
- **Gründungsgeschichte / persönliche Worte** des Geschäftsführers (Über uns)
- **Karriere**: offene Stellen, angebotene Ausbildungsberufe und Ausbildungsbeginn, Leistungen für Mitarbeitende
- **Leistungsumfänge je Gewerk** (`src/data/leistungen.ts`): Sie beschreiben übliche Arbeiten des Gewerks. Bitte prüfen, ob alles so angeboten wird, insbesondere:
  - **Elektroinstallation**: Liegt die nötige Eintragung bzw. Qualifikation vor?
  - **Heizung, Lüftung, Sanitär**: Umfang (z. B. Heizkörpermontage, Lüftung) bestätigen
  - **Fliesen**: „Abdichtung in Nassbereichen“ bestätigen
  - **Putz/Spachtel**: Qualitätsstufen Q1–Q4 bestätigen
- **Ablauf in fünf Schritten** (Startseite: Anfrage → Abstimmung → Angebot → Umsetzung → Abnahme): Entspricht das dem tatsächlichen Vorgehen, z. B. ob es immer eine Besichtigung gibt?
- **Namensnennung der Auftraggeber** (Union Investment, Five Guys, Apleona …): Ist die öffentliche Nennung mit den Kunden abgestimmt? Es werden nur die Namen als Text gezeigt, keine Logos.
- **Kundenstimmen**: Sie stammen laut Briefing von der alten Seite. Bitte bestätigen, dass sie weiter verwendet werden dürfen (Namen „P. Morina“, „M. Ahmed“).
- **Stadtteil**: Auf „Über uns“ steht „Schöneberg“ (PLZ 10829). Bitte bestätigen.

## 3. Rechtliches (vor dem Livegang fachkundig prüfen lassen)

**Impressum** (`src/pages/impressum.astro`): Registergericht und HRB-Nummer, USt-IdNr., Eintragung in die Handwerksrolle (Gewerke), Berufsbezeichnung, Berufshaftpflicht (falls zutreffend), Verantwortlicher für den Inhalt, Angabe zur Verbraucherstreitbeilegung.

**Datenschutz** (`src/pages/datenschutz.astro`): Datenschutzbeauftragter (falls benannt), Hosting-Anbieter und Auftragsverarbeitungsvertrag, Speicherdauer der Server-Logs, Empfänger der Anfragen (z. B. eigener n8n-Server), Stand der Erklärung.

**AGB** (`src/pages/agb.astro`): Der vollständige Text fehlt. Es gibt nur eine Gliederung als Orientierung.

## 4. Technik vor dem Livegang

1. **Webhook-URL** in `.env` eintragen (`PUBLIC_ANFRAGE_WEBHOOK_URL=…`) und neu bauen. Ohne URL zeigt der Assistent einen Hinweis und bietet den Versand per E-Mail an. Das ist getestet.
2. **CORS am Webhook** erlauben: `Access-Control-Allow-Origin: https://www.tpm-bau.de`, Methoden `POST, OPTIONS`, Header `Content-Type`. Details stehen in `docs/ANFRAGE-WEBHOOK.md`.
3. **Workflow für eingehende Anfragen** einrichten (z. B. n8n: E-Mail an info@tpm-bau.de mit Fotos als Anhang). Honeypot-Feld und Ausfüllzeit stehen im JSON für eine zusätzliche Filterung bereit.
4. **Domain**: Die Seite geht von `https://www.tpm-bau.de` aus (Canonical, Sitemap). Die Variante ohne `www` per 301 umleiten (Vorlage in `deploy/nginx.conf`).
5. **Test auf echten Geräten** (iPhone/Safari, Android/Chrome), vor allem Foto-Upload aus der Kamera (HEIC).
6. Nach dem Einsetzen echter Fotos `npm run lighthouse` erneut ausführen.

## 5. Hinweise zur Arbeitsumgebung

- Die alte Seite `www.tpm-bau.de` und Bilddienste (Unsplash, Pexels, Wikimedia, Pixabay) waren aus der Cloud-Arbeitsumgebung gesperrt. Deshalb gab es keinen Abgleich mit der alten Seite und keine Stockfotos. Stattdessen gibt es eigens gezeichnete Werkzeichnungen im Planstil (siehe `docs/BILDQUELLEN.md`).
