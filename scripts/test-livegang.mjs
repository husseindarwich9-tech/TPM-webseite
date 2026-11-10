// Test der Livegang-Prüfung (scripts/check-livegang.mjs): Sie muss falsche nginx-Konfigurationen und
// unpassende Webhook-Adressen erkennen und richtige durchlassen.
// Baut dazu eine Testfassung mit Beispiel-Webhook nach dist-livegang-test/. Aufruf: npm run test:livegang
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync, spawnSync } from 'node:child_process';

const W = 'https://n8n.tpm-bau.de/webhook/anfrage';
const OUT = 'dist-livegang-test';
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'livegang-'));
console.log('Baue Testfassung mit Webhook …');
execFileSync('npx', ['astro', 'build'], { stdio: 'ignore', env: { ...process.env, ASTRO_OUT_DIR: OUT, PUBLIC_ANFRAGE_WEBHOOK_URL: W } });

const vorlage = fs.readFileSync('deploy/nginx.conf', 'utf8');
const mitQuelle = (q) => vorlage.replaceAll("connect-src 'self' https://automation.example.de", `connect-src 'self' ${q}`);
const faelle = [
  // [Name, Konfiguration, Webhook bei der Prüfung, soll durchgehen?]
  ['richtig', mitQuelle('https://n8n.tpm-bau.de'), W, true],
  ['richtig, mit Pfad', mitQuelle('https://n8n.tpm-bau.de/webhook/'), W, true],
  ['Beispiel-Domain', vorlage, W, false],
  ['Adresse in falscher Direktive', vorlage.replaceAll("connect-src 'self' https://automation.example.de", "connect-src 'self'; img-src https://n8n.tpm-bau.de"), W, false],
  ['Doppelgänger-Domain', mitQuelle('https://n8n.tpm-bau.de.fremd.com'), W, false],
  ['Platzhalter *', vorlage.replaceAll("connect-src 'self' https://automation.example.de", 'connect-src *'), W, false],
  ['Platzhalter *.tpm-bau.de', mitQuelle('https://*.tpm-bau.de'), W, false],
  ['nur http', mitQuelle('http://n8n.tpm-bau.de'), W, false],
  ['falscher Pfad', mitQuelle('https://n8n.tpm-bau.de/anderer/'), W, false],
  ['nur im Kommentar', mitQuelle('https://n8n.tpm-bau.de').replace(/\n(\s*)add_header Content-Security-Policy/g, '\n$1# add_header Content-Security-Policy'), W, false],
  ['fehlt in location /', mitQuelle('https://n8n.tpm-bau.de').replace(/(location \/ \{[\s\S]*?)\n\s*add_header Content-Security-Policy[^\n]*/, '$1'), W, false],
  ["'unsafe-eval'", mitQuelle('https://n8n.tpm-bau.de').replace("script-src 'self' 'unsafe-inline'", "script-src 'self' 'unsafe-inline' 'unsafe-eval'"), W, false],
  ['Webhook bei Prüfung unbekannt', mitQuelle('https://n8n.tpm-bau.de'), '', false],
  ['anderer Webhook als im Build', mitQuelle('https://anderer.tpm-bau.de'), 'https://anderer.tpm-bau.de/x', false],
];

let ok = 0;
let fail = 0;
for (const [name, conf, webhook, sollOk] of faelle) {
  const datei = path.join(tmp, name.replace(/\W+/g, '_') + '.conf');
  fs.writeFileSync(datei, conf);
  const r = spawnSync('node', ['scripts/check-livegang.mjs', '--dist', OUT, '--nginx', datei], {
    env: { ...process.env, PUBLIC_ANFRAGE_WEBHOOK_URL: webhook },
    encoding: 'utf8',
  });
  // Platzhalter in den Texten verhindern den Livegang immer; hier zählen nur Versand und nginx
  const zeilen = r.stdout.split('\n').filter((z) => /–\s+(nginx|Anfrage-Versand: (Für|Der Build|Die|„))/.test(z));
  const bestanden = sollOk ? zeilen.length === 0 : zeilen.length > 0;
  bestanden ? ok++ : fail++;
  console.log(`  ${bestanden ? '✓' : '✗'} ${name.padEnd(30)} ${sollOk ? 'durchgelassen' : 'abgelehnt'}${zeilen[0] ? ': ' + zeilen[0].replace(/^\s*–\s*/, '').slice(0, 90) : ''}`);
}
fs.rmSync(OUT, { recursive: true, force: true });
fs.rmSync(tmp, { recursive: true, force: true });
console.log(`\nErgebnis: ${ok} bestanden, ${fail} fehlgeschlagen`);
process.exit(fail ? 1 : 0);
