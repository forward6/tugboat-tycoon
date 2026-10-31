// Screenshot chosen areas of the chart: node zoom.js outDir lat,lon,zoomFactor ...
const { chromium } = require('playwright');
const path = require('path');
const [out, ...rest] = process.argv.slice(2);
const year = +(rest.find(v => v.startsWith('year=')) || 'year=0').slice(5), views = rest.filter(v => !v.startsWith('year='));
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 1194, height: 834 } });
  await p.addInitScript(() => { try { localStorage.setItem('tugboat-tour-v1', '1'); } catch (e) {} });
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto('file://' + path.resolve(__dirname, '..', 'index.html'));
  await p.waitForTimeout(1200);
  await p.click('[data-act="play"]');
  await p.evaluate(year => { const T = window.__tugboat; T.ui.speed = 0; const S = T.S;
    while (S.year < year) { while (S.season) T.simAdvance(1); T.startSeason(); }
    T.S.cash = Math.max(T.S.cash, 30000); T.advance(6); T.ui.queue.length = 0; }, year);
  for (let i = 0; i < 40; i++) { if (await p.evaluate(() => document.getElementById('modal').hidden)) break; const c = await p.$('#modalBody [data-act="closeModal"], #modalBody [data-act="startSeason"]'); if (!c) break; await c.click(); }
  let i = 0;
  for (const v of views) {
    const [lat, lon, z] = v.split(',').map(Number);
    const ms = await p.evaluate(([lat, lon, z]) => { const T = window.__tugboat, M = T.cam; if (!lat) { Object.assign(M, T.homeView()); } else { const w = T.ll(lat, lon); M.x = w[0]; M.y = w[1]; M.z = M.fitZ * z; } T.clampCam(); return 0; }, [lat, lon, z]);
    await p.waitForTimeout(700);
    await p.screenshot({ path: `${out}/zoom-${i++}.png` });
  }
  const t = await p.evaluate(() => { const T = window.__tugboat, a = performance.now(); T.renderHI('x'); return Math.round(performance.now() - a); }); console.log('sharp repaint ms', t, 'errors', errs);
  await b.close();
})();
