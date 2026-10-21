// Häufige Fragen. Antworten enthalten nur gesicherte Angaben; Offenes ist als PLATZHALTER markiert.

export interface Frage {
  frage: string;
  antwort: string;
  /** Antwort enthält einen PLATZHALTER – wird nicht in das FAQPage-Schema übernommen */
  offen?: boolean;
}

export const faqGruppen: { titel: string; fragen: Frage[] }[] = [
  {
    titel: 'Leistungen',
    fragen: [
      {
        frage: 'Welche Arbeiten übernimmt die TPM Bau GmbH?',
        antwort:
          'Wir bieten zwölf Leistungen an: Innenausbau, Trockenbau, Malerarbeiten, Putz- und Spachtelarbeiten, Bodenlegearbeiten, Fliesenlegearbeiten, Tischlerarbeiten, Elektroinstallation, Heizung-Lüftung-Sanitär, Abriss und Entsorgung, Entrümpelung sowie Kleinreparaturen. Sie können einzelne Gewerke beauftragen oder alles aus einer Hand.',
      },
      {
        frage: 'Was bedeutet „alle Gewerke aus einer Hand“ für mich?',
        antwort:
          'Sie müssen nicht mehrere Handwerksbetriebe suchen, Termine abstimmen und Schnittstellen klären. Unser Team aus Fachkräften, Bauleitern und Projektmanagern koordiniert die Gewerke untereinander. Sie haben einen Ansprechpartner für das ganze Vorhaben.',
      },
      {
        frage: 'Übernehmen Sie auch kleine Aufträge?',
        antwort:
          'Ja. Kleinreparaturen gehören ausdrücklich zu unseren Leistungen, etwa eine klemmende Tür, eine undichte Fuge oder ein Wandschaden.',
      },
      {
        frage: 'Helfen Sie auch bei Notfällen, zum Beispiel einem Wasserschaden?',
        antwort:
          'Rufen Sie uns bei einem akuten Problem am besten direkt an: +49 30 4699 8895. Wir prüfen dann, wie schnell wir helfen können. [PLATZHALTER: Angaben zu Notdienst und Erreichbarkeit außerhalb der Bürozeiten]',
        offen: true,
      },
    ],
  },
  {
    titel: 'Ablauf & Angebot',
    fragen: [
      {
        frage: 'Wie läuft eine Anfrage ab?',
        antwort:
          'Beschreiben Sie Ihr Vorhaben über den Anfrage-Assistenten, per E-Mail oder telefonisch. Fotos helfen uns, den Umfang einzuschätzen. Wir melden uns, um offene Fragen zu klären und das weitere Vorgehen abzustimmen.',
      },
      {
        frage: 'Was kostet mein Vorhaben?',
        antwort:
          'Das hängt vom Umfang, vom Zustand vor Ort und von den gewünschten Materialien ab. Pauschale Preise nennen wir deshalb nicht. Nach der Abstimmung erhalten Sie ein Angebot für Ihr konkretes Vorhaben.',
      },
      {
        frage: 'Ist ein Besichtigungstermin oder das Angebot kostenlos?',
        antwort: '[PLATZHALTER: Angaben zu Kosten für Besichtigung und Angebotserstellung]',
        offen: true,
      },
      {
        frage: 'Warum soll ich Fotos mitschicken?',
        antwort:
          'Fotos zeigen uns den Zustand vor Ort und helfen, Rückfragen zu vermeiden. Im Anfrage-Assistenten können Sie bis zu sechs Bilder direkt hochladen.',
      },
    ],
  },
  {
    titel: 'Unternehmen',
    fragen: [
      {
        frage: 'Für wen arbeiten Sie?',
        antwort:
          'Für Privatkunden, etwa bei Sanierung, Renovierung oder einem akuten Schaden, und für Gewerbekunden und Hausverwaltungen. Zu unseren Auftraggebern gehören unter anderem Union Investment, Five Guys, Apleona und Deutsche Asset One.',
      },
      {
        frage: 'In welchem Gebiet sind Sie tätig?',
        antwort:
          'Unser Sitz ist in Berlin-Schöneberg, am Gustav-Müller-Platz 3. [PLATZHALTER: genaues Einsatzgebiet, z. B. Berlin und Umland]',
        offen: true,
      },
      {
        frage: 'Ist die TPM Bau GmbH ein eingetragener Betrieb?',
        antwort:
          'Wir sind Mitglied der Handwerkskammer Berlin und der BG BAU, der Berufsgenossenschaft der Bauwirtschaft.',
      },
      {
        frage: 'Bilden Sie aus?',
        antwort:
          'Informationen zu Ausbildung und offenen Stellen finden Sie auf unserer Karriereseite. Initiativbewerbungen nehmen wir gern per E-Mail an info@tpm-bau.de entgegen.',
      },
    ],
  },
];
