// Jump a game forward to a later year and screenshot the shipyard and a fishing ground.
const { chromium } = require('playwright');
const path = require('path');
const out = process.argv[2], year = +(process.argv[3] || 1940);
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 1194, height: 834 } });
  await p.addInitScript(() => { try { localStorage.setItem('tugboat-tour-v1', '1'); } catch (e) {} });
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto('file://' + path.resolve(__dirname, '..', 'index.html'));
  await p.waitForTimeout(1000);
  await p.click('[data-act="play"]');
  const seen = await p.evaluate(year => {
    const T = window.__tugboat, S = T.S; T.ui.speed = 0;
    while (S.year < year) { while (S.season) T.simAdvance(1); T.startSeason(); }
    T.simAdvance(60);
    return { year: S.year, queued: T.ui.queue.length };
  }, year);
  // read through the queued notices, keep the last one on screen
  for (let i = 0; i < 200; i++) {
    if (await p.evaluate(() => document.getElementById('modal').hidden)) break;
    if (i === 0) await p.screenshot({ path: `${out}/later-notice.png` });
    const c = await p.$('#modalBody [data-act="closeModal"], #modalBody [data-act="startSeason"]'); if (!c) break; await c.click();
  }
  await p.evaluate(() => { const T = window.__tugboat; T.ui.speed = 0; T.select({ t: 'ground', id: 'midbay' }); });
  await p.waitForTimeout(700);
  await p.screenshot({ path: `${out}/later-ground.png` });
  await p.click('#panel [data-act="back"]'); await p.waitForTimeout(500);
  await p.click('#panel [data-act="shipyard"]'); await p.waitForTimeout(500);
  await p.screenshot({ path: `${out}/later-shipyard.png` });
  console.log(JSON.stringify(seen), 'errors', errs);
  await b.close();
})();
