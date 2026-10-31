// Route every railway and highway segment over land (bridging water only where it must), simplify, and save to data/routes.json.
const { chromium } = require('playwright');
const path = require('path'), fs = require('fs');
(async () => {
  const b = await chromium.launch(); const p = await b.newPage();
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto('file://' + path.resolve(__dirname, '..', 'index.html')); await p.waitForTimeout(800);
  const out = await p.evaluate(() => {
    const T = window.__tugboat, WET = T.WET, GW = T.GW, GH = T.GH, C = T.CELL, M = window.__tugboatMap;
    const N = GW * GH, g = new Float32Array(N), came = new Int32Array(N), st = new Uint8Array(N);
    // distance to water, so lines keep a little way back from the shore
    const dw = new Uint8Array(N).fill(255), q = new Int32Array(N); let qh = 0, qt = 0;
    for (let i = 0; i < N; i++) if (WET[i]) { dw[i] = 0; q[qt++] = i; }
    while (qh < qt) { const i = q[qh++], x = i % GW, y = (i / GW) | 0, nd = dw[i] + 1; if (nd > 4) continue;
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) { const nx = x + dx, ny = y + dy; if (nx < 0 || ny < 0 || nx >= GW || ny >= GH) continue; const j = ny * GW + nx; if (dw[j] > nd) { dw[j] = nd; q[qt++] = j; } } }
    const cost = j => WET[j] ? 40 : 1 + (dw[j] === 1 ? 1.5 : dw[j] === 2 ? .4 : 0);
    const cell = (x, y) => clampI(Math.floor(y / C), GH) * GW + clampI(Math.floor(x / C), GW);
    function clampI(v, n) { return v < 0 ? 0 : v >= n ? n - 1 : v; }
    function nearLand(i) { if (!WET[i]) return i; const x0 = i % GW, y0 = (i / GW) | 0; for (let r = 1; r < 30; r++) for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) { const nx = x0 + dx, ny = y0 + dy; if (nx < 0 || ny < 0 || nx >= GW || ny >= GH) continue; const j = ny * GW + nx; if (!WET[j]) return j; } return i; }
    function route(A, B) {
      const s0 = nearLand(cell(A[0], A[1])), goal = nearLand(cell(B[0], B[1])), tx = goal % GW, ty = (goal / GW) | 0;
      g.fill(1e30); st.fill(0); const hi = [], hf = [];
      const push = (i, f) => { hi.push(i); hf.push(f); let k = hi.length - 1; while (k > 0) { const pa = (k - 1) >> 1; if (hf[pa] <= f) break; hi[k] = hi[pa]; hf[k] = hf[pa]; k = pa; } hi[k] = i; hf[k] = f; };
      const pop = () => { const top = hi[0], li = hi.pop(), lf = hf.pop(), n = hi.length; if (n) { let k = 0; for (;;) { const l = 2 * k + 1; if (l >= n) break; const r = l + 1; const m = (r < n && hf[r] < hf[l]) ? r : l; if (hf[m] >= lf) break; hi[k] = hi[m]; hf[k] = hf[m]; k = m; } hi[k] = li; hf[k] = lf; } return top; };
      const h = i => Math.hypot(i % GW - tx, ((i / GW) | 0) - ty);
      g[s0] = 0; came[s0] = -1; push(s0, h(s0));
      while (hi.length) { const i = pop(); if (st[i]) continue; st[i] = 1; if (i === goal) break; const x = i % GW, y = (i / GW) | 0;
        for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) { if (!dx && !dy) continue; const nx = x + dx, ny = y + dy; if (nx < 0 || ny < 0 || nx >= GW || ny >= GH) continue; const j = ny * GW + nx; if (st[j]) continue;
          const ng = g[i] + (dx && dy ? 1.4142 : 1) * cost(j); if (ng < g[j]) { g[j] = ng; came[j] = i; push(j, ng + h(j)); } } }
      if (!st[goal]) return [A, B];
      const cells = []; for (let i = goal; i !== -1; i = came[i]) cells.push(i); cells.reverse();
      const pts = cells.map(i => [(i % GW + .5) * C, (((i / GW) | 0) + .5) * C]);
      pts[0] = A.slice(); pts[pts.length - 1] = B.slice();
      return pts;
    }
    function dp(pts, eps) { if (pts.length < 3) return pts; const a = pts[0], b = pts[pts.length - 1], dx = b[0] - a[0], dy = b[1] - a[1], L = Math.hypot(dx, dy) || 1e-9; let idx = 0, dm = 0;
      for (let i = 1; i < pts.length - 1; i++) { const d = Math.abs(dy * (pts[i][0] - a[0]) - dx * (pts[i][1] - a[1])) / L; if (d > dm) { dm = d; idx = i; } }
      return dm > eps ? dp(pts.slice(0, idx + 1), eps).slice(0, -1).concat(dp(pts.slice(idx), eps)) : [a, b]; }
    // gentle smoothing so routes curve rather than step
    function smooth(pts) { for (let k = 0; k < 2; k++) { const o = [pts[0]]; for (let i = 0; i < pts.length - 1; i++) { const a = pts[i], b = pts[i + 1]; o.push([a[0] * .75 + b[0] * .25, a[1] * .75 + b[1] * .25], [a[0] * .25 + b[0] * .75, a[1] * .25 + b[1] * .75]); } o.push(pts[pts.length - 1]); pts = o; } return pts; }
    const res = {}, seen = new Set();
    for (const sg of [...T.RAIL_SEGS, ...T.ROAD_SEGS]) {
      const key = [sg.a, sg.b].sort().join('|'); if (seen.has(key)) continue; seen.add(key);
      const A = T.NETPOS[sg.a], B = T.NETPOS[sg.b];
      let pts = smooth(dp(route(A, B), .9));
      pts = dp(pts, .12);
      res[key] = { a: sg.a, pts: pts.map(([x, y]) => [+(M.N - y / M.KY).toFixed(4), +(M.W + x / M.KX).toFixed(4)]) };
    }
    return res;
  });
  fs.writeFileSync(path.resolve(__dirname, '..', 'data', 'routes.json'), JSON.stringify(out));
  console.log('segments', Object.keys(out).length, 'points', Object.values(out).reduce((s, r) => s + r.pts.length, 0), 'errors', errs);
  await b.close();
})();
