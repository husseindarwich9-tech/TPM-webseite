import { chromium } from 'playwright';
import { CHROME } from './chrome.mjs';
const b = await chromium.launch({ executablePath: CHROME });
const p = await b.newPage({ viewport: { width: 412, height: 823 } });
await p.addInitScript(() => {
  window.__long = [];
  new PerformanceObserver((l) => l.getEntries().forEach((e) => window.__long.push([Math.round(e.startTime), Math.round(e.duration)]))).observe({ type: 'longtask', buffered: true });
});
const cdp = await p.context().newCDPSession(p);
await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
await cdp.send('Profiler.enable'); await cdp.send('Profiler.start');
await p.goto('http://127.0.0.1:4321/'); await p.waitForTimeout(6000);
const prof = (await cdp.send('Profiler.stop')).profile;
console.log(await p.evaluate(() => ({ build: Math.round(window.__bauBuild), total: Math.round(window.__bauTotal), long: window.__long })));
// Top-Funktionen nach Selbstzeit
const self = new Map(); const dt = prof.timeDeltas; const ids = prof.samples;
const byId = new Map(prof.nodes.map(n => [n.id, n]));
ids.forEach((id, i) => { const n = byId.get(id); const k = n.callFrame.functionName + ' ' + (n.callFrame.url.split('/').pop() || '') + ':' + n.callFrame.lineNumber; self.set(k, (self.get(k) || 0) + (dt[i] || 0)); });
console.log([...self.entries()].sort((a, b) => b[1] - a[1]).slice(0, 15).map(([k, v]) => `${Math.round(v / 1000)}ms ${k}`).join('\n'));
await b.close();
