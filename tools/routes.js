// One small tug alone on each candidate route for one season (1870 and 1886 conditions): what does it earn?
const { chromium } = require('playwright');
const path = require('path');
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 1180, height: 820 } });
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto('file://' + path.resolve(__dirname, '..', 'index.html'));
  await p.waitForTimeout(800);
  const res = await p.evaluate((YEARSJSON) => { process = { env: { YEARS: YEARSJSON } };
    const T = window.__tugboat;
    const routes = [['collingwood', 'parrysound'], ['collingwood', 'parrysound', 'french'], ['french', 'waubaushene'], ['french', 'midland'], ['spanish', 'midland'],
      ['owensound', 'killarney', 'littlecurrent'], ['gateway', 'owensound'], ['gateway', 'collingwood'], ['byng', 'collingwood'], ['moonriver', 'waubaushene', 'collingwood'],
      ['french', 'baycity'], ['owensound', 'byng', 'french', 'parrysound'], ['collingwood', 'littlecurrent', 'spanish'], ['gateway', 'mcnicoll'], ['spanish', 'gateway'], ['depot', 'gateway']];
    const out = [];
    const YEARS = JSON.parse(process.env.YEARS || '[[1870,["woodsimple"]],[1886,["woodsimple","woodcompound"]]]');
    for (const [yr, models] of YEARS) for (const model of models) for (const r of routes) {
      T.newGame(5);
      const S = T.S;
      S.tugs = [];
      if (yr > 1870) { for (let y = 1870; y < yr; y++) { while (S.season) T.simAdvance(1); T.startSeason(); } S.tugs = S.tugs.filter(t => t.owner === 'p' ? false : true); }
      S.tugs = S.tugs.filter(t => t.owner === 'r');
      S.cash = 1e6; T.buyTug(model, 'collingwood'); const t = S.tugs[S.tugs.length - 1]; T.saveRoute(t, r); T.ui.mode = null;
      const L0 = JSON.parse(JSON.stringify(S.ledger));
      while (S.season) T.simAdvance(1);
      const L = S.ledger;
      const rev = ['logs', 'lumber', 'coal', 'supplies', 'tows', 'salvage'].reduce((s, k) => s + L[k] - L0[k], 0);
      out.push({ yr, model, r: r.join('>'), rev: Math.round(rev), run: Math.round(L.running - L0.running), sank: !S.tugs.includes(t), by: ['logs','lumber','coal','supplies','tows','salvage'].map(k => k[0] + Math.round((L[k] - L0[k]) / 100)).join(' ') });
    }
    return out;
  }, process.env.YEARS || '[[1870,["woodsimple"]],[1886,["woodsimple","woodcompound"]]]');
  for (const r of res) console.log(r.yr, r.model.padEnd(9), String(r.rev).padStart(6), 'run', r.run, r.sank ? 'SANK' : '', r.r.padEnd(40), r.by);
  console.log('errors', errs);
  await b.close();
})();
