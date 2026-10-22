# Bilder vom Kunden

Hier gehören die echten Fotos der TPM Bau GmbH hinein. Welche Datei wo erscheint, steht zentral in
`src/data/bilder.ts`.

| Dateiname | Wo erscheint das Foto? |
|---|---|
| `startfoto.jpg` | Startseite (Hero, prominent) und „Über uns“ (Team) – Mitarbeiter im TPM-Shirt vor dem Wandgemälde |
| `leistung-<slug>.jpg`, z. B. `leistung-trockenbau.jpg` | Auf der jeweiligen Leistungsseite (erscheint automatisch) |
| weitere (Team, Geschäftsführer, Karriere, Gewerbe) | Dateiname in `src/data/bilder.ts` beim passenden Eintrag unter `datei` eintragen |

Danach `npm run build` ausführen. Die Fotos werden **nicht beschnitten** und nicht bearbeitet; der Build
erzeugt nur verkleinerte Web-Versionen (AVIF/WebP) für schnelle Ladezeiten.
