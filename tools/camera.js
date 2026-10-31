// Check how the map moves: limits, drag, glide, wheel, double-tap and the whole-map button.
const { chromium } = require('playwright');
const path = require('path');
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 1194, height: 834 } });
  await p.addInitScript(() => { try { localStorage.setItem('tugboat-tour-v1', '1'); } catch (e) {} });
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto('file://' + path.resolve(__dirname, '..', 'index.html'));
  await p.waitForTimeout(1000);
  await p.click('[data-act="play"]');
  await p.evaluate(() => { window.__tugboat.ui.speed = 0; });
  const cam = () => p.evaluate(() => { const c = window.__tugboat.cam; return { x: +c.x.toFixed(2), y: +c.y.toFixed(2), z: +c.z.toFixed(3), fit: +c.fitZ.toFixed(3) }; });
  const edges = () => p.evaluate(() => { const T = window.__tugboat, c = T.cam; const r = document.getElementById('mapArea').getBoundingClientRect();
    return { left: +(c.x - (c.cx - r.left) / c.z).toFixed(1), right: +(c.x + (r.right - c.cx) / c.z).toFixed(1), top: +(c.y - (c.cy - r.top) / c.z).toFixed(1), bottom: +(c.y + (r.bottom - c.cy) / c.z).toFixed(1) }; });
  const home = await cam(); console.log('home', JSON.stringify(home), 'visible', JSON.stringify(await edges()));
  // try to zoom out past the window
  await p.mouse.move(400, 400); for (let i = 0; i < 5; i++) await p.mouse.wheel(0, 400); await p.waitForTimeout(200);
  console.log('after zooming out', JSON.stringify(await cam()));
  // zoom in with the wheel, then drag hard toward one corner: the view should stop at the map edge
  for (let i = 0; i < 4; i++) await p.mouse.wheel(0, -300); await p.waitForTimeout(100);
  await p.mouse.move(300, 300); await p.mouse.down(); for (let i = 1; i <= 30; i++) await p.mouse.move(300 + i * 40, 300 + i * 30); await p.mouse.up();
  await p.waitForTimeout(800);
  console.log('dragged to the corner', JSON.stringify(await cam()), 'visible', JSON.stringify(await edges()));
  // a quick flick keeps gliding after the finger lifts
  await p.evaluate(() => { const T = window.__tugboat; Object.assign(T.cam, T.homeView()); T.cam.z *= 3; T.clampCam(); });
  await p.mouse.move(500, 400); await p.mouse.down(); for (let i = 1; i <= 6; i++) { await p.mouse.move(500 - i * 25, 400); await p.waitForTimeout(8); } await p.mouse.up();
  const atRelease = await cam(); await p.waitForTimeout(600); const later = await cam();
  console.log('flick: x at release', atRelease.x, 'then', later.x);
  // double-tap on open water zooms in
  const z0 = (await cam()).z; await p.mouse.click(200, 500); await p.waitForTimeout(120); await p.mouse.click(200, 500); await p.waitForTimeout(500);
  console.log('double-tap zoom', z0, '->', (await cam()).z);
  // whole-map button returns home
  await p.click('[data-act="home"]'); await p.waitForTimeout(600);
  console.log('home button', JSON.stringify(await cam()));
  console.log('errors', errs);
  await b.close();
})();
