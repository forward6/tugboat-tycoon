// The plans in the game: node tools/plans.js <outdir>. Checks the side view on a boat's page and a ship's page and in the shipyard, the viewer's zoom, drag and close
const { chromium } = require('playwright');
const path = require('path');
const outdir = process.argv[2] || '.';
(async () => {
  for (const [vw, vh, tag] of [[1194, 834, 'ipad'], [390, 844, 'phone']]) {
    const b = await chromium.launch(); const ctx = await b.newContext({ viewport: { width: vw, height: vh }, hasTouch: true, isMobile: vw < 900, deviceScaleFactor: 2 });
    const p = await ctx.newPage(); await p.addInitScript(() => { try { localStorage.setItem('tugboat-tour-v1', '1'); } catch (e) {} });
    const errs = []; p.on('pageerror', e => errs.push(e.message + ' ' + (e.stack || '').split('\n')[1]));
    await p.goto('file://' + path.resolve(__dirname, '..', 'index.html')); await p.waitForTimeout(900); await p.tap('[data-act="play"]'); await p.waitForTimeout(400);
    const out = [];
    // a boat's page
    await p.evaluate(() => { const T = window.__tugboat; T.ui.speed = 1; T.select({ t: 'tug', id: T.S.tugs.find(t => t.owner === 'p').id }); });
    await p.waitForTimeout(500); await p.screenshot({ path: `${outdir}/${tag}-1-page.png` });
    out.push('thumb on page: ' + await p.isVisible('#panel .planthumb'));
    const day0 = await p.evaluate(() => window.__tugboat.S.day);
    await p.tap('#panel .planthumb'); await p.waitForTimeout(500);
    await p.screenshot({ path: `${outdir}/${tag}-2-viewer.png` });
    const st = await p.evaluate(() => { const pv = window.__tugboat.pv, r = document.getElementById('pvStage').getBoundingClientRect(), s = document.querySelector('#pvSheet svg').getBoundingClientRect(); return { on: pv.on, z: +pv.z.toFixed(3), fits: s.width <= r.width + 1 && s.height <= r.height + 1, title: document.getElementById('pvTitle').textContent }; });
    out.push('viewer: ' + JSON.stringify(st));
    // double-tap to zoom in on the engine room, then drag
    const r = await p.evaluate(() => { const r = document.getElementById('pvStage').getBoundingClientRect(); return [r.left, r.top, r.width, r.height]; });
    const at = [r[0] + r[2] * .35, r[1] + r[3] * .4];
    await p.touchscreen.tap(at[0], at[1]); await p.waitForTimeout(90); await p.touchscreen.tap(at[0], at[1]); await p.waitForTimeout(400);
    const z1 = await p.evaluate(() => window.__tugboat.pv.z);
    await p.screenshot({ path: `${outdir}/${tag}-3-zoomed.png` });
    const x0 = await p.evaluate(() => window.__tugboat.pv.x);
    await p.mouse.move(at[0], at[1]); await p.mouse.down(); await p.mouse.move(at[0] - 120, at[1] - 40, { steps: 6 }); await p.mouse.up(); await p.waitForTimeout(200);
    const x1 = await p.evaluate(() => window.__tugboat.pv.x);
    await p.tap('[data-act="pvZoom"][data-v="1"]'); const z2 = await p.evaluate(() => window.__tugboat.pv.z);
    await p.mouse.move(at[0], at[1]); await p.mouse.wheel(0, 300); await p.waitForTimeout(150); const z3 = await p.evaluate(() => window.__tugboat.pv.z);
    await p.tap('[data-act="pvFit"]'); const z4 = await p.evaluate(() => window.__tugboat.pv.z);
    out.push(`zoom: fit ${st.z} → double-tap ${z1.toFixed(3)} → + ${z2.toFixed(3)} → wheel out ${z3.toFixed(3)} → whole sheet ${z4.toFixed(3)}; dragged x by ${Math.round(x1 - x0)}`);
    const day1 = await p.evaluate(() => window.__tugboat.S.day);
    out.push('clock stopped while open: ' + (day1 === day0 || day1 - day0 < .02));
    await p.tap('[data-act="pvClose"]'); await p.waitForTimeout(200);
    out.push('closed: ' + await p.evaluate(() => document.getElementById('planView').hidden && !window.__tugboat.pv.on));
    // a lake ship's page
    const ship = await p.evaluate(() => { const T = window.__tugboat; T.ui.speed = 0; for (let i = 0; i < 40 && !T.vehicles.some(v => v.ship); i++) T.shipsDay(); const v = T.vehicles.find(v => v.ship); if (v) T.select({ t: 'ship', id: v.id }); return v && v.type; });
    await p.waitForTimeout(400);
    if (ship) { await p.screenshot({ path: `${outdir}/${tag}-4-ship.png` }); await p.tap('#panel .planthumb'); await p.waitForTimeout(400); await p.screenshot({ path: `${outdir}/${tag}-5-shipviewer.png` }); out.push('ship ' + ship + ' viewer: ' + await p.evaluate(() => window.__tugboat.pv.on)); await p.tap('[data-act="pvClose"]'); }
    else out.push('no lake ship on the map to test');
    // the shipyard, and the plans from it, over the shipyard
    await p.evaluate(() => window.__tugboat.select(null)); await p.waitForTimeout(300);
    await p.tap('#panel [data-act="shipyard"]'); await p.waitForTimeout(500);
    out.push('shipyard thumbs: ' + await p.evaluate(() => document.querySelectorAll('#modalBody .planthumb').length));
    await p.screenshot({ path: `${outdir}/${tag}-6-shipyard.png` });
    await p.tap('#modalBody .model:nth-child(2) .planthumb'); await p.waitForTimeout(400);
    await p.screenshot({ path: `${outdir}/${tag}-7-yardviewer.png` });
    await p.keyboard.press('Escape'); await p.waitForTimeout(200);
    out.push('Escape closes the plans, shipyard still open: ' + await p.evaluate(() => document.getElementById('planView').hidden && !document.getElementById('modal').hidden));
    console.log(`== ${tag}\n${out.join('\n')}\nerrors ${JSON.stringify(errs)}`);
    await b.close();
  }
})();
