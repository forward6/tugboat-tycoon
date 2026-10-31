// Drive the game with touch taps at iPad size and screenshot each step.
const { chromium } = require('playwright');
const path = require('path');
const out = process.argv[2];
(async () => {
  const b = await chromium.launch();
  const ctx = await b.newContext({ viewport: { width: 1194, height: 834 }, deviceScaleFactor: 1, hasTouch: true, isMobile: true });
  const p = await ctx.newPage();
  await p.addInitScript(() => { try { localStorage.setItem('tugboat-tour-v1', '1'); } catch (e) {} });
  const errs = []; p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  await p.goto('file://' + path.resolve(__dirname, '..', 'index.html'));
  await p.waitForTimeout(1500);
  const shot = async n => { await p.waitForTimeout(500); await p.screenshot({ path: `${out}/t-${n}.png` }); };
  const scr = async (kind, id) => p.evaluate(([kind, id]) => {
    const T = window.__tugboat, c = T.cam;
    const w = kind === 'tug' ? (t => [t.x, t.y])(T.S.tugs.find(t => t.name === id)) : kind === 'job' ? T.S.jobs[0].pos : T.nodePos((kind === 'port' ? 'p:' : 'g:') + id);
    return [(w[0] - c.x) * c.z + c.cx, (w[1] - c.y) * c.z + c.cy];
  }, [kind, id]);
  const tapAt = async xy => { await p.touchscreen.tap(xy[0], xy[1]); await p.waitForTimeout(250); };
  const tapBtn = async sel => { await p.tap(sel); await p.waitForTimeout(450); };
  await tapBtn('[data-act="play"]');
  await p.evaluate(() => { window.__tugboat.ui.speed = 0; });
  // the tug lies at Collingwood with the skiff, so a tap there asks which one
  await tapAt(await scr('tug', 'Mary Ellen Carter')); await p.waitForTimeout(300); await shot('1-which');
  const tugId = await p.evaluate(() => window.__tugboat.S.tugs.find(t => t.name === 'Mary Ellen Carter').id);
  if (await p.isVisible('#picker')) await tapBtn(`#picker [data-id="${tugId}"]`);
  await shot('1-tug');
  await tapBtn('[data-act="editRoute"]');
  for (const id of ['collingwood', 'byng', 'french']) await tapAt(await scr('port', id));
  await shot('2-route-edit');
  await tapBtn('[data-act="routeSave"]');
  await tapAt(await scr('port', 'parrysound')); await shot('3-port');
  await tapAt(await scr('ground', 'midbay')); await shot('4-ground');
  await tapBtn('[data-act="back"]');
  await tapBtn('#panel [data-act="shipyard"]'); await shot('5-shipyard');
  await tapBtn('[data-act="buy"][data-model="woodsimple"]');
  for (const id of ['owensound', 'tobermory', 'killarney', 'littlecurrent']) await tapAt(await scr('port', id));
  await tapBtn('[data-act="routeSave"]');
  // run until a tow is wanted
  await p.evaluate(() => { const T = window.__tugboat; let g = 0; while (!T.S.jobs.some(j => j.state === 'open') && g++ < 60) T.simAdvance(1); T.ui.speed = 0; });
  await tapAt(await scr('job')); await shot('6-job');
  const send = await p.$('[data-act="sendJob"]:not([disabled])'); if (send) { await send.tap(); await p.waitForTimeout(400); }
  await p.evaluate(() => { window.__tugboat.ui.speed = 2; }); await p.waitForTimeout(2500); await p.evaluate(() => { window.__tugboat.ui.speed = 0; });
  await shot('7-running');
  // to Chicago fire newspaper
  await p.evaluate(() => { const T = window.__tugboat; while (T.S.season) T.simAdvance(1); });
  await p.waitForTimeout(400);
  // close any queued notices until the winter report shows
  // past the season's letters: a rival's tender is answered by letting it go, anything else is closed
  for (let i = 0; i < 6; i++) { if (await p.$('#modalBody [data-act="startSeason"]')) break; const c = await p.$('#modalBody [data-act="tPass"], #modalBody [data-act="tDone"], #modalBody [data-act="closeModal"]'); if (c) await c.tap(); await p.waitForTimeout(300); }
  await shot('8-winter');
  await tapBtn('[data-act="startSeason"]');
  await p.evaluate(() => { const T = window.__tugboat; T.ui.speed = 0; while (T.S.season && !T.ui.modalOpen) T.simAdvance(.5); });
  await shot('9-newspaper');
  console.log('errors', errs);
  await b.close();
})();
