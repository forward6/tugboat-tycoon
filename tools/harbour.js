// Enter a town's harbour view in chosen years and screenshot it: node tools/harbour.js <outdir> <port id> <year>[,<year>...] [zoom]
const { chromium } = require('playwright');
const path = require('path');
const [out, pid, years, zoom] = process.argv.slice(2);
(async () => {
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1194, height: 834 }, deviceScaleFactor: 2 }); await p.addInitScript(() => { try { localStorage.setItem('tugboat-tour-v1', '1'); } catch (e) {} });
  const errs = []; p.on('pageerror', e => errs.push(e.message + ' ' + (e.stack || '').split('\n')[1])); p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  await p.goto('file://' + path.resolve(__dirname, '..', 'index.html')); await p.waitForTimeout(800); await p.click('[data-act="play"]');
  for (const yr of years.split(',').map(Number)) {
    const t0 = Date.now();
    await p.evaluate(([yr, pid, zoom]) => { const T = window.__tugboat, S = T.S; T.ui.speed = 0; while (S.year < yr) { while (S.season) T.simAdvance(1); T.startSeason(); } T.advance(25);
      T.ui.queue.length = 0; document.getElementById('modal').hidden = true; T.ui.modalOpen = false;
      T.enterHarbour(pid); if (zoom) { T.cam.z = T.cam.fitZ * zoom; T.clampCam(); } }, [yr, pid, +zoom || 0]);
    await p.waitForTimeout(1500);
    await p.screenshot({ path: `${out}/h-${pid}-${yr}${zoom ? '-z' + zoom : ''}.png` });
    await p.evaluate(() => window.__tugboat.exitHarbour());
    console.log(yr, 'ms', Date.now() - t0);
  }
  console.log('errors', errs.slice(0, 5)); await b.close();
})();
