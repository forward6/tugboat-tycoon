// The first-play tour: node tools/tour.js <outdir>. Walks it by touch at iPad and phone size: every step screenshotted, the boats tapped for real, and it doesn't come back on the next visit
const { chromium } = require('playwright');
const path = require('path');
const out = process.argv[2] || '.';
(async () => {
  for (const [vw, vh, tag] of [[1194, 834, 'ipad'], [820, 1180, 'portrait'], [390, 844, 'phone']]) {
    const b = await chromium.launch(); const ctx = await b.newContext({ viewport: { width: vw, height: vh }, hasTouch: true, isMobile: vw < 900, deviceScaleFactor: 2 });
    const p = await ctx.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message + ' ' + (e.stack || '').split('\n')[1]));
    await p.goto('file://' + path.resolve(__dirname, '..', 'index.html')); await p.waitForTimeout(900);
    await p.tap('[data-act="play"]'); await p.waitForTimeout(500);
    const n = await p.evaluate(() => window.__tugboat.TOUR.length);
    const log = [];
    for (let i = 0; i < n + 2; i++) {
      const st = await p.evaluate(() => { const T = window.__tugboat; return T.tour ? { i: T.tour.i, title: document.getElementById('cmTitle').textContent, speed: T.ui.speed } : null; });
      if (!st) break;
      await p.waitForTimeout(750);
      await p.screenshot({ path: `${out}/${tag}-${String(st.i).padStart(2, '0')}.png` });
      // the card must sit inside the screen and not on the ring
      const lay = await p.evaluate(() => { const c = document.querySelector('#coach .cm-card').getBoundingClientRect(), r = document.querySelector('#coach .cm-ring'), rr = r.style.display === 'none' ? null : r.getBoundingClientRect();
        const inside = c.left >= 0 && c.top >= 0 && c.right <= innerWidth + .5 && c.bottom <= innerHeight + .5;
        const ov = rr ? Math.max(0, Math.min(c.right, rr.right) - Math.max(c.left, rr.left)) * Math.max(0, Math.min(c.bottom, rr.bottom) - Math.max(c.top, rr.top)) / (rr.width * rr.height) : 0;
        return { inside, overlap: Math.round(ov * 100), ring: rr ? [Math.round(rr.width), Math.round(rr.height)] : null }; });
      log.push(`${st.i + 1} ${st.title} | speed ${st.speed} | card inside ${lay.inside} | covers ${lay.overlap}% of ring ${lay.ring || ''}`);
      if (st.title === 'Your boats') {
        const at = await p.evaluate(() => { const r = document.querySelector('#coach .cm-ring').getBoundingClientRect(); return [r.left + r.width / 2, r.top + r.height / 2]; });
        await p.touchscreen.tap(at[0], at[1]); await p.waitForTimeout(500);
        await p.screenshot({ path: `${out}/${tag}-02b-menu.png` });
        const tugId = await p.evaluate(() => window.__tugboat.S.tugs.find(t => t.name === 'Mary Ellen Carter').id);
        if (await p.isVisible('#picker')) await p.tap(`#picker [data-id="${tugId}"]`);
        await p.waitForTimeout(1300);
        log.push('   after tapping the boats: step ' + await p.evaluate(() => window.__tugboat.tour && window.__tugboat.tour.i + 1));
        continue;
      }
      await p.tap('#coach .cm-next'); await p.waitForTimeout(400);
    }
    const after = await p.evaluate(() => ({ tour: !!window.__tugboat.tour, speed: window.__tugboat.ui.speed }));
    // reload: no tour the second time
    await p.reload(); await p.waitForTimeout(900);
    if (await p.isVisible('[data-act="continue"]')) await p.tap('[data-act="continue"]'); else if (await p.isVisible('[data-act="play"]')) await p.tap('[data-act="play"]');
    await p.waitForTimeout(500);
    const again = await p.evaluate(() => !!window.__tugboat.tour);
    console.log(`== ${tag}\n` + log.join('\n') + `\nended: ${JSON.stringify(after)} | tour on second visit: ${again} | errors ${JSON.stringify(errs)}`);
    await b.close();
  }
})();
