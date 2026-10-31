// Headless check: load the page, report errors, screenshot, then fast-forward the simulation.
const { chromium } = require('playwright');
const path = require('path');
const out = process.argv[2] || '.';
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 1180, height: 820 }, deviceScaleFactor: 1 });
  await p.addInitScript(() => { try { localStorage.setItem('tugboat-tour-v1', '1'); } catch (e) {} });
  const errs = [];
  p.on('pageerror', e => errs.push('pageerror: ' + e.message));
  p.on('console', m => { if (m.type() === 'error') errs.push('console: ' + m.text()); });
  await p.goto('file://' + path.resolve(__dirname, '..', 'index.html'));
  await p.waitForTimeout(1500);
  await p.screenshot({ path: out + '/01-title.png' });
  const info = await p.evaluate(() => {
    const T = window.__tugboat;
    const res = { gw: T.GW, gh: T.GH, docks: {}, unreachable: [] };
    for (const id of Object.keys(T.PORT)) res.docks[id] = T.nodePos('p:' + id).map(v => +v.toFixed(1));
    for (const a of Object.keys(T.PORT)) for (const b of ['collingwood']) { if (a === b) continue; const pth = T.getPath('p:' + a, 'p:' + b); if (pth.pts.length <= 2) res.unreachable.push(a); }
    res.d = { 'coll-parry': T.distKm('collingwood', 'parrysound'), 'french-midland': T.distKm('french', 'midland'), 'spanish-midland': T.distKm('spanish', 'midland'), 'gateway-owen': T.distKm('gateway', 'owensound'), 'lc-spanish': T.distKm('littlecurrent', 'spanish') };
    return res;
  });
  console.log(JSON.stringify(info));
  await p.click('[data-act="play"]');
  await p.waitForTimeout(3000);
  await p.screenshot({ path: out + '/02-play.png' });
  console.log('errors', errs);
  await b.close();
})();
