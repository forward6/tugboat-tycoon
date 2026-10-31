// Rough frame-cost check: average time spent in the draw call at a few zooms, with traffic on the map.
const { chromium } = require('playwright');
const path = require('path');
(async () => {
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1194, height: 834 }, deviceScaleFactor: 2 }); await p.addInitScript(() => { try { localStorage.setItem('tugboat-tour-v1', '1'); } catch (e) {} });
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto('file://' + (process.env.PAGE || path.resolve(__dirname, '..', 'index.html'))); await p.waitForTimeout(800); await p.click('[data-act="play"]');
  await p.evaluate(() => { const T = window.__tugboat, S = T.S; T.ui.speed = 0; while (S.year < 1925) { while (S.season) T.simAdvance(1); T.startSeason(); } T.advance(2); T.ui.queue.length = 0; document.getElementById('modal').hidden = true; T.ui.modalOpen = false; });
  for (const [lat, lon, z] of [[0, 0, 1], [44.6, -80.4, 4], [44.51, -80.21, 18]]) {
    const ms = await p.evaluate(([lat, lon, z]) => new Promise(done => {
      const T = window.__tugboat, c = T.cam; if (lat) { const w = T.ll(lat, lon); c.x = w[0]; c.y = w[1]; c.z = c.fitZ * z; } else Object.assign(c, T.homeView()); T.clampCam(); T.ui.speed = 1;
      const times = []; let last = performance.now(), n = 0;
      const tick = t => { times.push(t - last); last = t; if (++n < 90) requestAnimationFrame(tick); else { times.sort((a, b) => a - b); done({ median: +times[45].toFixed(1), p90: +times[81].toFixed(1), vehicles: T.vehicles.length }); } };
      setTimeout(() => requestAnimationFrame(tick), 400);
    }), [lat, lon, z]);
    console.log(`zoom ${z}: frame median ${ms.median} ms, 90th pct ${ms.p90} ms, vehicles ${ms.vehicles}`);
  }
  console.log('errors', errs); await b.close();
})();
