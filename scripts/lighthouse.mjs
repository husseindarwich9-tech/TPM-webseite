// Lighthouse (Handy-Profil) für die wichtigsten Seiten → docs/lighthouse/
// Voraussetzung: npm run build. Aufruf: npm run lighthouse
import { spawn, execFileSync } from 'node:child_process';
import fs from 'node:fs';
import { CHROME } from './chrome.mjs';

const PORT = 4330;
const pages = process.argv.slice(2).length
  ? process.argv.slice(2)
  : ['/', '/leistungen/', '/leistungen/trockenbau/', '/gewerbe/', '/ueber-uns/', '/anfrage/', '/kontakt/', '/faq/'];

fs.mkdirSync('docs/lighthouse', { recursive: true });
const server = spawn('node', ['scripts/serve.mjs', String(PORT)], { stdio: 'ignore' });
await new Promise((r) => setTimeout(r, 800));

const rows = [];
for (const p of pages) {
  const name = p === '/' ? 'start' : p.replace(/^\/|\/$/g, '').replace(/\//g, '_');
  const out = `docs/lighthouse/${name}`;
  execFileSync('npx', [
    'lighthouse', `http://localhost:${PORT}${p}`,
    ...(CHROME ? [`--chrome-path=${CHROME}`] : []),
    '--chrome-flags=--headless=new --no-sandbox',
    '--output=json', '--output=html', `--output-path=${out}`,
    '--quiet',
  ], { stdio: 'ignore', env: { ...process.env, ...(CHROME ? { CHROME_PATH: CHROME } : {}) } });
  const j = JSON.parse(fs.readFileSync(`${out}.report.json`, 'utf8'));
  const s = (k) => Math.round(j.categories[k].score * 100);
  const row = { seite: p, performance: s('performance'), barrierefreiheit: s('accessibility'), best_practices: s('best-practices'), seo: s('seo'),
    lcp: j.audits['largest-contentful-paint'].displayValue, cls: j.audits['cumulative-layout-shift'].displayValue, tbt: j.audits['total-blocking-time'].displayValue };
  rows.push(row);
  fs.renameSync(`${out}.report.json`, `${out}.json`);
  console.log(row);
}
server.kill();
const md = ['| Seite | Performance | Barrierefreiheit | Best Practices | SEO | LCP | CLS | TBT |', '|---|---|---|---|---|---|---|---|',
  ...rows.map((r) => `| ${r.seite} | ${r.performance} | ${r.barrierefreiheit} | ${r.best_practices} | ${r.seo} | ${r.lcp} | ${r.cls} | ${r.tbt} |`)].join('\n');
fs.writeFileSync('docs/lighthouse/ERGEBNIS.md', `# Lighthouse (Handy-Profil, simuliertes 4G)\n\nGemessen am ${new Date().toLocaleDateString('de-DE')} lokal mit gzip-Auslieferung (scripts/serve.mjs).\n\n${md}\n`);
console.log('\n' + md);
