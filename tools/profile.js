// CPU profile of the draw loop: which functions take the frame time, at a chosen spot and zoom.
// node tools/profile.js [lat,lon,zoom]   (0,0,1 is the whole-map view)
const { chromium } = require('playwright');
const path = require('path');
(async () => {
  const [lat, lon, z] = (process.argv[2] || '0,0,1').split(',').map(Number);
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1194, height: 834 }, deviceScaleFactor: 2 }); await p.addInitScript(() => { try { localStorage.setItem('tugboat-tour-v1', '1'); } catch (e) {} });
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto('file://' + path.resolve(__dirname, '..', 'index.html')); await p.waitForTimeout(800); await p.click('[data-act="play"]');
  await p.evaluate(([lat, lon, z]) => { const T = window.__tugboat, S = T.S; T.ui.speed = 0; while (S.year < 1925) { while (S.season) T.simAdvance(1); T.startSeason(); } T.advance(2); T.ui.queue.length = 0; document.getElementById('modal').hidden = true; T.ui.modalOpen = false;
    const c = T.cam; if (lat) { const w = T.ll(lat, lon); c.x = w[0]; c.y = w[1]; c.z = c.fitZ * z; } else Object.assign(c, T.homeView()); T.clampCam(); T.ui.speed = 1; }, [lat, lon, z]);
  await p.waitForTimeout(600);
  const cdp = await p.context().newCDPSession(p);
  await cdp.send('Profiler.enable'); await cdp.send('Profiler.setSamplingInterval', { interval: 200 }); await cdp.send('Profiler.start');
  await p.waitForTimeout(4000);
  const { profile } = await cdp.send('Profiler.stop');
  const self = new Map(), byId = new Map(); let total = 0;
  for (const n of profile.nodes) byId.set(n.id, n);
  const dts = profile.timeDeltas; const counts = new Map();
  profile.samples.forEach((id, i) => counts.set(id, (counts.get(id) || 0) + (dts[i] || 0)));
  // inclusive time: walk parents
  const parent = new Map(); for (const n of profile.nodes) for (const c of n.children || []) parent.set(c, n.id);
  const incl = new Map();
  for (const [id, t] of counts) {
    total += t; const n = byId.get(id); const k = n.callFrame.functionName || '(' + n.callFrame.url.split('/').pop() + ')';
    self.set(k, (self.get(k) || 0) + t);
    const seen = new Set(); let cur = id;
    while (cur != null) { const f = byId.get(cur).callFrame.functionName; if (f && !seen.has(f)) { seen.add(f); incl.set(f, (incl.get(f) || 0) + t); } cur = parent.get(cur); }
  }
  const top = (m, n) => [...m].sort((a, b) => b[1] - a[1]).slice(0, n).map(([k, t]) => `${(t / 1000).toFixed(0).padStart(6)} ms  ${(100 * t / total).toFixed(1).padStart(5)}%  ${k}`).join('\n');
  console.log(`total ${(total / 1000).toFixed(0)} ms sampled over 4 s\n-- self --\n${top(self, 18)}\n-- inclusive --\n${top(incl, 30)}`);
  const fr = await p.evaluate(() => new Promise(done => { const times = []; let last = performance.now(), n = 0; const tick = t => { times.push(t - last); last = t; if (++n < 60) requestAnimationFrame(tick); else { times.sort((a, b) => a - b); done(times[30].toFixed(1)); } }; requestAnimationFrame(tick); }));
  console.log('frame median', fr, 'ms; errors', errs); await b.close();
})();
