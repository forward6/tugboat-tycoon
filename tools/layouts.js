// Screenshots at other sizes and in dark mode.
const { chromium } = require('playwright');
const path = require('path');
const out = process.argv[2];
(async () => {
  const b = await chromium.launch();
  const errs = [];
  for (const [name, w, h, scheme, sel] of [['portrait', 834, 1194, 'light', 'tug'], ['phone', 390, 844, 'light', 'port'], ['dark', 1194, 834, 'dark', 'tug']]) {
    const ctx = await b.newContext({ viewport: { width: w, height: h }, hasTouch: true, isMobile: true, colorScheme: scheme });
    const p = await ctx.newPage(); p.on('pageerror', e => errs.push(name + ': ' + e.message));
    await p.addInitScript(() => { try { localStorage.setItem('tugboat-tour-v1', '1'); } catch (e) {} });
    await p.goto('file://' + path.resolve(__dirname, '..', 'index.html'));
    await p.waitForTimeout(1200);
    if (name === 'phone') await p.screenshot({ path: `${out}/l-${name}-title.png` });
    await p.tap('[data-act="play"]');
    await p.evaluate(sel => { const T = window.__tugboat; T.simAdvance(3); T.ui.speed = 0; T.select(sel === 'tug' ? { t: 'tug', id: T.S.tugs[0].id } : { t: 'port', id: 'collingwood' }); }, sel);
    await p.waitForTimeout(800);
    await p.screenshot({ path: `${out}/l-${name}.png` });
    const overflow = await p.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
    console.log(name, 'horizontal overflow:', overflow);
    await ctx.close();
  }
  console.log('errors', errs);
  await b.close();
})();
