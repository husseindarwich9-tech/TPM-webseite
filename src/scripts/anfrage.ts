// Logik des Anfrage-Assistenten: Schritte, Prüfung, Foto-Verkleinerung, Versand als JSON.

const WEBHOOK_URL: string = (import.meta.env.PUBLIC_ANFRAGE_WEBHOOK_URL || '').trim();
const EMAIL = 'info@tpm-bau.de';
const MIN_SEKUNDEN = 5; // schneller füllt kein Mensch sechs Schritte aus
const MAX_FOTOS = 6;
const MAX_FOTO_BYTES = 15 * 1024 * 1024;
const FOTO_KANTE = 1600;
const ERLAUBTE_TYPEN = ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif'];
const TIMEOUT_MS = 30000;

const SCHRITT_NAMEN = ['Kunde', 'Leistungen', 'Details', 'Fotos', 'Termin', 'Kontakt'];

interface Foto {
  id: string;
  name: string;
  type: string;
  size: number;
  dataUrl: string;
  width: number;
  height: number;
}

document.querySelectorAll<HTMLElement>('[data-wizard]').forEach(initWizard);

function initWizard(root: HTMLElement) {
  const form = root.querySelector<HTMLFormElement>('[data-wz-form]')!;
  const steps = [...form.querySelectorAll<HTMLFieldSetElement>('.wz-step')];
  const btnNext = root.querySelector<HTMLButtonElement>('[data-wz-next]')!;
  const btnBack = root.querySelector<HTMLButtonElement>('[data-wz-back]')!;
  const btnSubmit = root.querySelector<HTMLButtonElement>('[data-wz-submit]')!;
  const submitLabel = root.querySelector<HTMLElement>('[data-wz-submit-label]')!;
  const bar = root.querySelector<HTMLElement>('[data-wz-bar]')!;
  const dots = [...root.querySelectorAll<HTMLElement>('[data-wz-dot]')];
  const status = root.querySelector<HTMLElement>('[data-wz-status]')!;
  const sendError = root.querySelector<HTMLElement>('[data-wz-send-error]')!;
  const sendErrorText = root.querySelector<HTMLElement>('[data-wz-send-error-text]')!;
  const mailtoLink = root.querySelector<HTMLAnchorElement>('[data-wz-mailto]')!;
  const done = root.querySelector<HTMLElement>('[data-wz-done]')!;
  const review = root.querySelector<HTMLElement>('[data-wz-review]')!;
  const firmaField = root.querySelector<HTMLElement>('[data-wz-firma]')!;
  const telReq = root.querySelector<HTMLElement>('[data-wz-tel-req]')!;
  const akutHint = root.querySelector<HTMLElement>('[data-wz-akut]')!;
  const counter = root.querySelector<HTMLElement>('[data-wz-count]')!;
  const fileInput = root.querySelector<HTMLInputElement>('#wz-fotos')!;
  const drop = root.querySelector<HTMLElement>('[data-wz-drop]')!;
  const thumbs = root.querySelector<HTMLElement>('[data-wz-thumbs]')!;
  const fotoError = root.querySelector<HTMLElement>('[data-error-for="fotos"]')!;
  const datum = root.querySelector<HTMLInputElement>('#wz-datum')!;

  const startZeit = Date.now();
  let current = 1;
  let sending = false;
  const fotos: Foto[] = [];
  let fotosInArbeit = 0;

  // Datum: frühestens morgen, höchstens zwei Jahre im Voraus
  const morgen = new Date();
  morgen.setDate(morgen.getDate() + 1);
  const maxDatum = new Date();
  maxDatum.setFullYear(maxDatum.getFullYear() + 2);
  datum.min = isoDate(morgen);
  datum.max = isoDate(maxDatum);

  /* ── Vorbelegung über die URL (?kunde=gewerbe&leistung=trockenbau) ── */
  const params = new URLSearchParams(location.search);
  const kunde = params.get('kunde');
  if (kunde === 'privat' || kunde === 'gewerbe') {
    const r = form.querySelector<HTMLInputElement>(`input[name="kundentyp"][value="${kunde}"]`);
    if (r) r.checked = true;
  }
  params
    .getAll('leistung')
    .flatMap((v) => v.split(','))
    .forEach((slug) => {
      const c = form.querySelector<HTMLInputElement>(`input[name="leistungen"][value="${CSS.escape(slug)}"]`);
      if (c) c.checked = true;
    });
  updateConditional();

  /* ── Navigation ── */
  btnNext.addEventListener('click', () => {
    if (validateStep(current)) go(current + 1);
  });
  btnBack.addEventListener('click', () => go(current - 1));
  form.addEventListener('keydown', (e) => {
    // Enter in einem Textfeld springt zum nächsten Schritt statt das Formular abzuschicken
    const t = e.target as HTMLElement;
    if (e.key === 'Enter' && t.tagName === 'INPUT' && (t as HTMLInputElement).type !== 'checkbox' && current < steps.length) {
      e.preventDefault();
      btnNext.click();
    }
  });

  function go(n: number, focus = true) {
    if (n < 1 || n > steps.length) return;
    const back = n < current;
    steps.forEach((s, i) => {
      const active = i + 1 === n;
      s.hidden = !active;
      s.classList.toggle('is-active', active);
      s.classList.toggle('is-back', active && back);
    });
    current = n;
    bar.style.transform = `scaleX(${n / steps.length})`;
    dots.forEach((d, i) => {
      d.classList.toggle('is-current', i + 1 === n);
      d.classList.toggle('is-done', i + 1 < n);
    });
    btnBack.hidden = n === 1;
    btnNext.hidden = n === steps.length;
    btnSubmit.hidden = n !== steps.length;
    status.textContent = `Schritt ${n} von ${steps.length}: ${SCHRITT_NAMEN[n - 1]}`;
    if (n === steps.length) renderReview();
    if (focus) {
      const top = root.getBoundingClientRect().top + window.scrollY - 100;
      if (window.scrollY > top) window.scrollTo({ top, behavior: 'smooth' });
      steps[n - 1].querySelector<HTMLElement>('.wz-legend')?.focus({ preventScroll: true });
    }
  }

  /* ── Bedingte Felder ── */
  form.addEventListener('change', (e) => {
    updateConditional();
    const t = e.target as HTMLInputElement;
    if (t.name) clearError(t.name);
  });
  form.addEventListener('input', (e) => {
    const t = e.target as HTMLInputElement;
    if (t.name === 'beschreibung') counter.textContent = String(t.value.length);
    if (t.getAttribute('aria-invalid') === 'true') clearError(t.name);
  });

  function updateConditional() {
    const isGewerbe = value('kundentyp') === 'gewerbe';
    firmaField.hidden = !isGewerbe;
    const telBevorzugt = value('kontaktweg') === 'telefon';
    telReq.hidden = !telBevorzugt;
    akutHint.hidden = value('dringlichkeit') !== 'akut';
    // „Noch unklar“ und konkrete Leistungen schließen sich nicht aus – keine Sonderlogik nötig.
  }

  /* ── Prüfung ── */
  function validateStep(n: number): boolean {
    const errors: { name: string; msg: string }[] = [];
    const add = (name: string, msg: string) => errors.push({ name, msg });

    if (n === 1 && !value('kundentyp')) add('kundentyp', 'Bitte wählen Sie aus, für wen die Anfrage ist.');
    if (n === 2 && values('leistungen').length === 0)
      add('leistungen', 'Bitte wählen Sie mindestens eine Leistung aus – oder „Noch unklar“.');
    if (n === 3) {
      const b = value('beschreibung').trim();
      if (b.length < 15) add('beschreibung', 'Bitte beschreiben Sie Ihr Vorhaben in mindestens 15 Zeichen.');
      else if ((b.match(/https?:\/\//gi) || []).length > 2) add('beschreibung', 'Bitte fügen Sie höchstens zwei Links ein.');
      const f = value('flaeche');
      if (f && (!/^\d+$/.test(f) || +f < 1 || +f > 100000)) add('flaeche', 'Bitte geben Sie die Fläche als ganze Zahl in m² an.');
      if (!/^\d{5}$/.test(value('plz').trim())) add('plz', 'Bitte geben Sie eine fünfstellige Postleitzahl an.');
      if (!value('dringlichkeit')) add('dringlichkeit', 'Bitte wählen Sie aus, wie dringend es ist.');
    }
    if (n === 4) {
      if (fotosInArbeit > 0) add('fotos', 'Die Fotos werden noch verarbeitet. Bitte einen Moment warten.');
    }
    if (n === 5) {
      const d = value('wunschtermin');
      if (d) {
        if (datum.validity.badInput) add('wunschtermin', 'Bitte geben Sie ein gültiges Datum ein.');
        else if (d < datum.min) add('wunschtermin', 'Der Wunschtermin muss in der Zukunft liegen.');
        else if (d > datum.max) add('wunschtermin', 'Bitte wählen Sie einen Termin innerhalb der nächsten zwei Jahre.');
      } else if (datum.validity.badInput) add('wunschtermin', 'Bitte geben Sie ein gültiges Datum ein.');
    }
    if (n === 6) {
      if (value('name').trim().length < 2) add('name', 'Bitte geben Sie Ihren Namen an.');
      if (value('kundentyp') === 'gewerbe' && value('firma').trim().length < 2)
        add('firma', 'Bitte geben Sie die Firma bzw. Hausverwaltung an.');
      const mail = value('email').trim();
      if (!mail) add('email', 'Bitte geben Sie Ihre E-Mail-Adresse an.');
      else if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(mail)) add('email', 'Bitte prüfen Sie die E-Mail-Adresse (Beispiel: name@beispiel.de).');
      const tel = value('telefon').trim();
      if (tel && !/^\+?[0-9 ()\/-]{6,30}$/.test(tel)) add('telefon', 'Bitte prüfen Sie die Telefonnummer.');
      if (!tel && value('kontaktweg') === 'telefon') add('telefon', 'Bitte geben Sie eine Telefonnummer an, wenn wir Sie anrufen sollen.');
      if (!checked('datenschutz')) add('datenschutz', 'Bitte stimmen Sie der Verarbeitung Ihrer Angaben zu.');
    }

    // Anzeige
    const step = steps[n - 1];
    step.querySelectorAll('[data-error-for]').forEach((el) => {
      if ((el as HTMLElement).dataset.errorFor !== 'fotos') el.textContent = '';
    });
    step.querySelectorAll('[aria-invalid]').forEach((el) => el.removeAttribute('aria-invalid'));
    const summary = step.querySelector<HTMLElement>('[data-wz-summary]')!;
    if (errors.length === 0) {
      summary.hidden = true;
      summary.innerHTML = '';
      return true;
    }
    errors.forEach(({ name, msg }) => {
      const msgEl = step.querySelector<HTMLElement>(`[data-error-for="${name}"]`);
      if (msgEl) msgEl.textContent = msg;
      step.querySelectorAll<HTMLElement>(`[name="${name}"]`).forEach((el) => el.setAttribute('aria-invalid', 'true'));
    });
    summary.innerHTML =
      errors.length === 1
        ? `<p>${escapeHtml(errors[0].msg)}</p>`
        : `<p>Bitte prüfen Sie Ihre Angaben:</p><ul>${errors.map((e) => `<li>${escapeHtml(e.msg)}</li>`).join('')}</ul>`;
    summary.hidden = false;
    // Fokus auf das erste fehlerhafte Feld
    const first = step.querySelector<HTMLElement>(`[name="${errors[0].name}"]`);
    if (first && first.offsetParent !== null) first.focus();
    else summary.focus?.();
    return false;
  }

  function clearError(name: string) {
    form.querySelectorAll(`[name="${CSS.escape(name)}"]`).forEach((el) => el.removeAttribute('aria-invalid'));
    const msg = form.querySelector(`[data-error-for="${CSS.escape(name)}"]`);
    if (msg && name !== 'fotos') msg.textContent = '';
  }

  /* ── Fotos ── */
  fileInput.addEventListener('change', () => {
    if (fileInput.files) addFiles([...fileInput.files]);
    fileInput.value = '';
  });
  ['dragenter', 'dragover'].forEach((ev) =>
    drop.addEventListener(ev, (e) => {
      e.preventDefault();
      drop.classList.add('is-over');
    }),
  );
  ['dragleave', 'drop'].forEach((ev) =>
    drop.addEventListener(ev, (e) => {
      e.preventDefault();
      drop.classList.remove('is-over');
    }),
  );
  drop.addEventListener('drop', (e) => {
    const files = (e as DragEvent).dataTransfer?.files;
    if (files) addFiles([...files]);
  });

  async function addFiles(files: File[]) {
    const meldungen: string[] = [];
    for (const file of files) {
      if (fotos.length + fotosInArbeit >= MAX_FOTOS) {
        meldungen.push(`Es sind höchstens ${MAX_FOTOS} Fotos möglich. „${file.name}“ wurde nicht hinzugefügt.`);
        continue;
      }
      const typ = file.type || (/\.(heic|heif)$/i.test(file.name) ? 'image/heic' : '');
      if (!ERLAUBTE_TYPEN.includes(typ)) {
        meldungen.push(`„${file.name}“ ist kein unterstütztes Bildformat (JPG, PNG, WebP oder HEIC).`);
        continue;
      }
      if (file.size > MAX_FOTO_BYTES) {
        meldungen.push(`„${file.name}“ ist größer als 15 MB.`);
        continue;
      }
      const id = Math.random().toString(36).slice(2);
      const li = document.createElement('li');
      li.dataset.id = id;
      li.innerHTML = `<span class="wz-thumb__loading">Wird verarbeitet …</span>`;
      thumbs.appendChild(li);
      fotosInArbeit++;
      try {
        const foto = await verkleinern(file, id);
        fotos.push(foto);
        li.innerHTML = '';
        const img = document.createElement('img');
        img.src = foto.dataUrl;
        img.alt = `Vorschau: ${foto.name}`;
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.setAttribute('aria-label', `Foto „${foto.name}“ entfernen`);
        btn.innerHTML =
          '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><path d="M5 5l14 14M19 5 5 19"/></svg>';
        btn.addEventListener('click', () => {
          const i = fotos.findIndex((f) => f.id === id);
          if (i > -1) fotos.splice(i, 1);
          li.remove();
          fotoError.textContent = '';
          fileInput.focus();
        });
        li.append(img, btn);
      } catch {
        li.remove();
        meldungen.push(
          `„${file.name}“ konnte nicht gelesen werden. Ihr Browser unterstützt dieses Format eventuell nicht – bitte als JPG oder PNG hochladen.`,
        );
      } finally {
        fotosInArbeit--;
      }
    }
    fotoError.textContent = meldungen.join(' ');
    fileInput.setAttribute('aria-invalid', meldungen.length ? 'true' : 'false');
  }

  /* ── Zusammenfassung ── */
  function renderReview() {
    const d = collect();
    const leistungLabels = d.leistungen.map((l) => l.label).join(', ');
    const zeilen: [string, string, number][] = [
      ['Kunde', d.kundentyp === 'gewerbe' ? 'Gewerbe / Hausverwaltung' : 'Privat', 1],
      ['Leistungen', leistungLabels, 2],
      ['Vorhaben', kuerzen(d.details.beschreibung, 140), 3],
      ['Objekt', [d.details.plz, d.details.ort, d.details.objektart, d.details.flaeche ? `${d.details.flaeche} m²` : ''].filter(Boolean).join(' · '), 3],
      ['Dringlichkeit', ({ akut: 'Akut / Notfall', zeitnah: 'In den nächsten Wochen', flexibel: 'Zeitlich flexibel' } as Record<string, string>)[d.details.dringlichkeit] || '', 3],
      ['Fotos', d.fotos.length ? `${d.fotos.length} Foto${d.fotos.length > 1 ? 's' : ''}` : 'Keine', 4],
      ['Wunschtermin', terminText(d.termin), 5],
    ];
    review.innerHTML =
      `<h3>Ihre Angaben im Überblick</h3><dl>` +
      zeilen
        .map(
          ([k, v, s]) =>
            `<div><dt>${k}</dt><dd>${escapeHtml(v || '–')}</dd><button type="button" data-goto="${s}">Ändern<span class="visually-hidden">: ${k}</span></button></div>`,
        )
        .join('') +
      `</dl>`;
    review.querySelectorAll<HTMLButtonElement>('[data-goto]').forEach((b) =>
      b.addEventListener('click', () => go(Number(b.dataset.goto))),
    );
  }

  /* ── Versand ── */
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (sending) return;
    // Alle Schritte noch einmal prüfen; beim ersten Fehler dorthin springen
    for (let i = 1; i <= steps.length; i++) {
      if (i !== current) {
        // still prüfen, ohne Fokuswechsel, indem kurz der Schritt geprüft wird
        if (!silentValid(i)) {
          go(i);
          validateStep(i);
          return;
        }
      }
    }
    if (!validateStep(steps.length)) return;

    const daten = collect();
    mailtoLink.href = mailtoFallback(daten);

    // Spamschutz: Honeypot gefüllt oder zu schnell → still „erfolgreich“, nichts senden
    const honeypot = (form.elements.namedItem('website') as HTMLInputElement).value;
    const sekunden = (Date.now() - startZeit) / 1000;
    if (honeypot || sekunden < MIN_SEKUNDEN) {
      showDone();
      return;
    }

    if (!WEBHOOK_URL) {
      showSendError(
        'Der Online-Versand ist derzeit nicht eingerichtet. Bitte senden Sie Ihre Anfrage per E-Mail oder rufen Sie uns an.',
      );
      return;
    }

    sending = true;
    btnSubmit.disabled = true;
    submitLabel.textContent = 'Wird gesendet …';
    sendError.hidden = true;
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
    try {
      const res = await fetch(WEBHOOK_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({ ...daten, meta: { ...daten.meta, ausfuellzeitSekunden: Math.round(sekunden) } }),
        signal: ctrl.signal,
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      showDone();
    } catch (err) {
      const abgebrochen = (err as Error).name === 'AbortError';
      showSendError(
        abgebrochen
          ? 'Der Server hat nicht rechtzeitig geantwortet. Bitte versuchen Sie es erneut oder senden Sie Ihre Anfrage per E-Mail.'
          : navigator.onLine === false
            ? 'Sie scheinen offline zu sein. Bitte prüfen Sie Ihre Internetverbindung und versuchen Sie es erneut.'
            : 'Beim Senden ist ein Fehler aufgetreten. Bitte versuchen Sie es erneut oder senden Sie Ihre Anfrage per E-Mail.',
      );
    } finally {
      clearTimeout(timer);
      sending = false;
      btnSubmit.disabled = false;
      submitLabel.textContent = 'Anfrage senden';
    }
  });

  function silentValid(n: number) {
    if (n === 1) return !!value('kundentyp');
    if (n === 2) return values('leistungen').length > 0;
    if (n === 3)
      return value('beschreibung').trim().length >= 15 && /^\d{5}$/.test(value('plz').trim()) && !!value('dringlichkeit');
    if (n === 4) return fotosInArbeit === 0;
    return true;
  }

  function showSendError(text: string) {
    sendErrorText.textContent = text;
    sendError.hidden = false;
    sendError.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }

  function showDone() {
    form.hidden = true;
    root.querySelector<HTMLElement>('.wz-progress')!.hidden = true;
    done.hidden = false;
    status.textContent = 'Ihre Anfrage wurde gesendet.';
    const top = root.getBoundingClientRect().top + window.scrollY - 120;
    window.scrollTo({ top, behavior: 'smooth' });
    done.focus({ preventScroll: true });
  }

  /* ── Daten einsammeln ── */
  function collect() {
    const leistungenAuswahl = [...form.querySelectorAll<HTMLInputElement>('input[name="leistungen"]:checked')].map((c) => ({
      slug: c.value,
      label: c.dataset.label || c.value,
    }));
    return {
      typ: 'anfrage',
      version: 1,
      gesendetAm: new Date().toISOString(),
      kundentyp: value('kundentyp'),
      leistungen: leistungenAuswahl,
      details: {
        beschreibung: value('beschreibung').trim(),
        objektart: value('objektart'),
        flaeche: value('flaeche') ? Number(value('flaeche')) : null,
        plz: value('plz').trim(),
        ort: value('ort').trim(),
        dringlichkeit: value('dringlichkeit'),
      },
      termin: {
        wunschtermin: value('wunschtermin') || null,
        zeitfenster: value('zeitfenster') || 'egal',
        flexibel: checked('terminFlexibel'),
      },
      kontakt: {
        name: value('name').trim(),
        firma: value('kundentyp') === 'gewerbe' ? value('firma').trim() : '',
        email: value('email').trim(),
        telefon: value('telefon').trim(),
        bevorzugterKontaktweg: value('kontaktweg') || 'email',
        datenschutzZugestimmt: checked('datenschutz'),
      },
      fotos: fotos.map(({ name, type, size, dataUrl, width, height }) => ({ name, type, size, width, height, dataUrl })),
      meta: {
        quelle: location.href,
        sprache: navigator.language,
      },
    };
  }

  function mailtoFallback(d: ReturnType<typeof collect>) {
    const text = [
      'Anfrage über tpm-bau.de',
      '',
      `Kunde: ${d.kundentyp === 'gewerbe' ? 'Gewerbe / Hausverwaltung' : 'Privat'}`,
      `Leistungen: ${d.leistungen.map((l) => l.label).join(', ')}`,
      '',
      'Vorhaben:',
      d.details.beschreibung,
      '',
      `Objekt: ${[d.details.plz, d.details.ort, d.details.objektart, d.details.flaeche ? d.details.flaeche + ' m²' : ''].filter(Boolean).join(', ')}`,
      `Dringlichkeit: ${d.details.dringlichkeit}`,
      `Wunschtermin: ${terminText(d.termin)}`,
      '',
      `Name: ${d.kontakt.name}`,
      d.kontakt.firma ? `Firma: ${d.kontakt.firma}` : '',
      `E-Mail: ${d.kontakt.email}`,
      d.kontakt.telefon ? `Telefon: ${d.kontakt.telefon}` : '',
      d.fotos.length ? `\n(Fotos bitte als Anhang an diese E-Mail anfügen.)` : '',
    ]
      .filter((z) => z !== '')
      .join('\n');
    const betreff = `Anfrage: ${d.leistungen.map((l) => l.label).join(', ')}`.slice(0, 120);
    return `mailto:${EMAIL}?subject=${encodeURIComponent(betreff)}&body=${encodeURIComponent(text)}`;
  }

  /* ── Helfer ── */
  function value(name: string): string {
    const els = form.querySelectorAll<HTMLInputElement>(`[name="${name}"]`);
    if (!els.length) return '';
    const first = els[0];
    if (first.type === 'radio') return [...els].find((e) => e.checked)?.value || '';
    if (first.type === 'checkbox') return first.checked ? first.value : '';
    return first.value || '';
  }
  function values(name: string): string[] {
    return [...form.querySelectorAll<HTMLInputElement>(`[name="${name}"]:checked`)].map((e) => e.value);
  }
  function checked(name: string): boolean {
    return !!form.querySelector<HTMLInputElement>(`[name="${name}"]:checked`);
  }
}

function terminText(t: { wunschtermin: string | null; zeitfenster: string; flexibel: boolean }) {
  const teile: string[] = [];
  if (t.wunschtermin) teile.push(new Date(t.wunschtermin + 'T12:00:00').toLocaleDateString('de-DE'));
  if (t.zeitfenster && t.zeitfenster !== 'egal') teile.push(t.zeitfenster);
  if (t.flexibel) teile.push('flexibel');
  return teile.join(', ') || 'Kein Wunschtermin';
}

async function verkleinern(file: File, id: string): Promise<Foto> {
  const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' } as ImageBitmapOptions);
  const scale = Math.min(1, FOTO_KANTE / Math.max(bitmap.width, bitmap.height));
  const w = Math.round(bitmap.width * scale);
  const h = Math.round(bitmap.height * scale);
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#fff';
  ctx.fillRect(0, 0, w, h);
  ctx.drawImage(bitmap, 0, 0, w, h);
  bitmap.close?.();
  const dataUrl = canvas.toDataURL('image/jpeg', 0.82);
  const size = Math.round((dataUrl.length - 'data:image/jpeg;base64,'.length) * 0.75);
  return { id, name: file.name.replace(/\.[^.]+$/, '') + '.jpg', type: 'image/jpeg', size, dataUrl, width: w, height: h };
}

function isoDate(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
function kuerzen(s: string, n: number) {
  return s.length > n ? s.slice(0, n - 1) + '…' : s;
}
function escapeHtml(s: string) {
  return s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);
}
