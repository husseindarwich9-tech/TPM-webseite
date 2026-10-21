# Designidee – TPM Bau GmbH

## Ausgangslage

Die alte Seite https://www.tpm-bau.de konnte ich aus der Arbeitsumgebung nicht aufrufen: Die Netzwerk-Richtlinie
sperrt die Domain, ebenso Unsplash und Pexels. Die Idee stützt sich deshalb auf das Briefing, das Logo und die
Firmendaten. Ein Abgleich mit der alten Seite steht in `docs/OFFENE-PUNKTE.md`.

## Die Idee: „Der Bauplan wird lebendig“

1. **TPM heißt „Technical Project Management“, und so sieht die Seite auch aus:** wie ein präziser technischer
   Plan, der beim Scrollen entsteht. Achsraster mit Achsbeschriftungen (A, B, C / 1, 2, 3), Maßketten, Schnittmarken
   und ein Plankopf wie auf einer Werkzeichnung bilden das wiederkehrende visuelle System.
2. **Das Logo ist das Motiv.** Die drei geknickten „Dächer“ werden im Hero großformatig als Konstruktionslinien
   gezeichnet und füllen sich dann in Hell- und Dunkelblau. Die Dachkante (der Knick) taucht als Trennlinie,
   Pfeilform und Bildausschnitt auf der ganzen Seite wieder auf.
3. **Zwei Flächen, zwei Blautöne:** ein tiefes Tinten-Navy (#0A1626) für die großen Bühnen und ein warmes
   Planpapier-Weiß (#F3F1EC) für die Inhaltsbereiche. Akzente nur in den beiden Markenblaus #1A63B0 und #6FAAD6:
   keine beliebigen Verläufe, kein Neon.
4. **Typografie mit Haltung:** Archivo als variable Schrift. Überschriften sind breit laufend (Expanded, fett) und
   wirken wie Beschriftungen auf Bauschildern. Fließtext steht in normaler Breite. Dazu IBM Plex Mono für
   Plan-Annotationen („Blatt 03 · Malerarbeiten“). Montserrat Medium nur im Logo-Schriftzug, wie im Original.
5. **Leistungen als Verzeichnis statt Kartenraster:** Die zwölf Gewerke stehen als großes, nummeriertes Planverzeichnis
   (01–12). Fährt man auf dem Desktop über einen Eintrag, folgt eine kleine Werkzeichnung des Gewerks dem Mauszeiger.
   Auf der Übersichtsseite sind sie nach Bauphasen geordnet (Vorbereiten → Ausbauen → Installieren → Gestalten →
   Instand halten). So wird „alle Gewerke aus einer Hand“ als Ablauf sichtbar und nicht nur behauptet.
6. **Eigene Strichzeichnungen statt Stockfotos:** Jedes Gewerk hat eine eigene Linienzeichnung im Planstil, die sich
   beim Erscheinen selbst zeichnet. Echte Fotos (zuerst `startfoto.jpg`) werden über eine zentrale Bildliste
   eingebunden und erscheinen automatisch, sobald die Datei im Ordner liegt. Stockfotos werden nie als
   TPM-Projekte ausgegeben.
7. **Bewegung mit Zweck:** GSAP mit ScrollTrigger und Lenis für weiches Scrollen. Wort-für-Wort-Reveals der
   Überschriften, sich zeichnende Linien, ein gepinnter horizontaler Abschnitt für die drei Werte und eine
   Ablauf-Linie, die mit dem Scrollen wächst. Seitenwechsel mit nativen View Transitions. Bei
   `prefers-reduced-motion` ist alles sofort sichtbar und statisch.
8. **Anfragen zuerst:** Auf jeder Seite ist der Weg zur Anfrage höchstens einen Klick entfernt. Der Anfrage-Assistent
   führt in sechs kurzen Schritten durch. Auf dem Handy bleibt unten eine feste Leiste mit Anrufen / E-Mail / Anfrage.
9. **Technik:** Astro erzeugt rein statische Seiten für den eigenen Hetzner-Server. Schriften und Bibliotheken liegen
   lokal, es gibt keine Cookies, keine externen Dienste und keine eingebettete Karte.
