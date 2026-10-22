# Bildquellen und Lizenzen

## Fotos

**Es werden keine Stockfotos verwendet.** Bilddienste wie Unsplash und Pexels waren aus der Arbeitsumgebung nicht
erreichbar. Außerdem trägt die Gestaltung bewusst ohne Fotos: Alle Bildflächen sind eigene Zeichnungen.

Echte Fotos der TPM Bau GmbH werden zentral in `src/data/bilder.ts` registriert und liegen in `bilder-vom-kunden/`:

| Datei | Quelle | Lizenz |
|---|---|---|
| `startfoto.jpg` (noch nicht geliefert) | TPM Bau GmbH | Eigentum TPM, unbearbeitet verwendet |

Falls später Stockfotos ergänzt werden, gelten diese Regeln: Quelle und Lizenz hier eintragen, nie als TPM-Projekt
ausgeben und nie Logos in Fotos montieren.

## Grafiken

| Element | Quelle | Lizenz |
|---|---|---|
| Logo / Bildzeichen (drei Dächer) | Nachbau nach den Koordinaten aus dem Briefing (`src/components/LogoMark.astro`) | Eigentum TPM Bau GmbH |
| 12 Werkzeichnungen der Gewerke (`src/components/TradeDrawing.astro`) | eigens für diese Seite gezeichnet | Eigentum TPM Bau GmbH |
| Linien-Icons (Telefon, E-Mail, Pfeile …) (`src/components/Icon.astro`) | eigens gezeichnet | Eigentum TPM Bau GmbH |
| Social-Media-Zeichen Instagram, TikTok, LinkedIn | vereinfachte Nachzeichnung der Markenzeichen | Marken der jeweiligen Unternehmen, nur zur Verlinkung auf die eigenen Profile |
| Vorschaubild für soziale Netzwerke (`public/og.png`), Favicons | erzeugt mit `scripts/generate-icons.mjs` aus Logo und Schriften | Eigentum TPM Bau GmbH |

## Schriften (lokal eingebunden, keine Verbindung zu Google)

| Schrift | Verwendung | Lizenz |
|---|---|---|
| Archivo (variabel, Breite + Stärke) | Überschriften und Fließtext | SIL Open Font License 1.1 (über `@fontsource-variable/archivo`) |
| Montserrat Medium | Logo-Schriftzug | SIL Open Font License 1.1 (über `@fontsource/montserrat`) |
| IBM Plex Mono | Plan-Beschriftungen | SIL Open Font License 1.1 (über `@fontsource/ibm-plex-mono`) |
