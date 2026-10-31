// List railway and highway segments that run across open water (beyond what a bridge or shoreline wobble explains).
const { chromium } = require('playwright');
const path = require('path');
(async () => {
  const b = await chromium.launch(); const p = await b.newPage();
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto('file://' + path.resolve(__dirname, '..', 'index.html')); await p.waitForTimeout(800);
  const bad = await p.evaluate(() => {
    const T = window.__tugboat, out = [];
    for (const [kind, segs] of [['rail', T.RAIL_SEGS], ['road', T.ROAD_SEGS]]) for (const sg of segs) {
      const A = T.NETPOS[sg.a], B = T.NETPOS[sg.b], L = Math.hypot(B[0] - A[0], B[1] - A[1]);
      let wet = 0, run = 0, worst = 0;
      for (let d = 1.2; d < L - 1.2; d += .3) { const x = A[0] + (B[0] - A[0]) * d / L, y = A[1] + (B[1] - A[1]) * d / L; if (T.isWet(x, y)) { run += .3; wet += .3; worst = Math.max(worst, run); } else run = 0; }
      if (worst > .7) out.push(`${kind} ${sg.a} -> ${sg.b}: ${worst.toFixed(1)} km of water in a row (${wet.toFixed(1)} km total, segment ${L.toFixed(0)} km)`);
    }
    return out;
  });
  console.log(bad.join('\n') || 'no water crossings'); console.log('errors', errs);
  await b.close();
})();
